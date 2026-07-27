import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository, Inject } from '@nestjs/typeorm';
import { Repository, DataSource, LessThanOrEqual } from 'typeorm';
import { OutboxPublisher } from '@insurance/shared';
import { v4 as uuidv4 } from 'uuid';
import { Parser } from 'expr-eval';
import jwt from 'jsonwebtoken';
import { ProcessDefinition, ProcessNode, ProcessDefinitionStatus } from './entities/process-definition.entity';
import { ProcessInstance, ProcessInstanceStatus } from './entities/process-instance.entity';
import { ProcessToken, TokenStatus } from './entities/process-token.entity';
import { ProcessVariable } from './entities/process-variable.entity';
import { ProcessHistory, HistoryEventType } from './entities/process-history.entity';
import { ProcessTimer, TimerStatus } from './entities/process-timer.entity';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface StartProcessParams {
  definitionKey: string;
  definitionVersion?: number;
  businessKey: string;
  tenantId: string;
  initialVariables?: Record<string, any>;
  startedBy?: string;
  metadata?: Record<string, any>;
}

export interface SignalParams {
  instanceId: string;
  signalName: string;
  nodeId?: string;
  tenantId: string;
  data?: Record<string, any>;
  userId?: string;
}

export interface NodeExecutionResult {
  success: boolean;
  nextNodes: string[];
  outputVariables?: Record<string, any>;
  consumeToken?: boolean;
  error?: Error;
}

@Injectable()
export class WorkflowEngineService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkflowEngineService.name);
  private readonly expressionParser = new Parser();
  private timerPoller: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(ProcessDefinition)
    private readonly definitionRepository: Repository<ProcessDefinition>,
    @InjectRepository(ProcessInstance)
    private readonly instanceRepository: Repository<ProcessInstance>,
    @InjectRepository(ProcessToken)
    private readonly tokenRepository: Repository<ProcessToken>,
    @InjectRepository(ProcessVariable)
    private readonly variableRepository: Repository<ProcessVariable>,
    @InjectRepository(ProcessHistory)
    private readonly historyRepository: Repository<ProcessHistory>,
    @InjectRepository(ProcessTimer)
    private readonly timerRepository: Repository<ProcessTimer>,
    private readonly httpService: HttpService,
    private readonly dataSource: DataSource,
    @Inject('TIMER_POLL_INTERVAL_MS')
    private readonly timerPollIntervalMs: number,
  ) {}

  onModuleInit() {
    if (this.timerPollIntervalMs > 0) {
      this.timerPoller = setInterval(() => {
        this.processPendingTimers().catch(err => {
          this.logger.error('Timer poller error', err);
        });
      }, this.timerPollIntervalMs);
    }
  }

  onModuleDestroy() {
    if (this.timerPoller) {
      clearInterval(this.timerPoller);
      this.timerPoller = null;
    }
  }

  async startProcess(params: StartProcessParams): Promise<ProcessInstance> {
    this.logger.log(`Starting process: ${params.definitionKey} for ${params.businessKey}`);

    if (!params.tenantId) {
      throw new Error('tenantId is required to start a process instance');
    }

    const definition = await this.findActiveDefinition(params.definitionKey, params.tenantId, params.definitionVersion);
    if (!definition) {
      throw new Error(`Active process definition not found: ${params.definitionKey}`);
    }

    const { instance, token, startNode } = await this.dataSource.transaction(async (manager) => {
      const instance = manager.create(ProcessInstance, {
        tenantId: params.tenantId,
        definitionId: definition.id,
        businessKey: params.businessKey,
        status: ProcessInstanceStatus.RUNNING,
        context: { ...definition.variables, ...params.initialVariables },
        startedAt: new Date(),
        startedBy: params.startedBy,
        metadata: params.metadata,
      });
      await manager.save(instance);

      for (const [key, value] of Object.entries(params.initialVariables || {})) {
        const variable = manager.create(ProcessVariable, {
          tenantId: params.tenantId,
          instanceId: instance.id,
          name: key,
          value: JSON.stringify(value),
          type: typeof value,
          scope: 'global',
        });
        await manager.save(variable);
      }

      const startNode = definition.graph.nodes.find(n => n.type === 'start');
      if (!startNode) {
        throw new Error(`Process definition ${definition.key} has no start node`);
      }

      const token = manager.create(ProcessToken, {
        tenantId: params.tenantId,
        instanceId: instance.id,
        nodeId: startNode.id,
        status: TokenStatus.ACTIVE,
      });
      await manager.save(token);

      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.workflow_engine.process.started',
        eventType: 'ProcessStarted',
        eventVersion: 1,
        correlationId: uuidv4(),
        subject: { instanceId: instance.id, definitionKey: definition.key },
        payload: {
          tenantId: params.tenantId,
          instanceId: instance.id,
          definitionKey: definition.key,
          businessKey: params.businessKey,
          status: instance.status,
          startedBy: params.startedBy || null,
        },
      });

      await this.recordHistory(instance.id, HistoryEventType.PROCESS_START, null, null, {
        definitionKey: definition.key,
        definitionVersion: definition.version,
      }, null, null, null, 0, params.tenantId, manager);

      return { instance, token, startNode };
    });

    await this.executeNode(instance, startNode, token, undefined, definition);
    return instance;
  }

  async signal(signalParams: SignalParams): Promise<ProcessInstance> {
    this.logger.log(`Signaling instance ${signalParams.instanceId} with ${signalParams.signalName}`);

    if (!signalParams.tenantId) {
      throw new Error('tenantId is required to signal a process instance');
    }

    const instance = await this.instanceRepository.findOne({
      where: { id: signalParams.instanceId, tenantId: signalParams.tenantId },
      relations: ['tokens'],
    });

    if (!instance) {
      throw new Error(`Process instance not found: ${signalParams.instanceId}`);
    }

    if (instance.status !== ProcessInstanceStatus.RUNNING && instance.status !== ProcessInstanceStatus.SUSPENDED) {
      throw new Error(`Cannot signal instance with status: ${instance.status}`);
    }

    const definition = await this.definitionRepository.findOne({
      where: { id: instance.definitionId, tenantId: signalParams.tenantId },
    });
    if (!definition) {
      throw new Error(`Process definition not found for instance ${instance.id}`);
    }

    await this.recordHistory(instance.id, HistoryEventType.SIGNAL_RECEIVED, null, null, {
      signalName: signalParams.signalName,
      nodeId: signalParams.nodeId,
    }, null, null, signalParams.userId, 0, instance.tenantId);

    const waitingTokens = instance.tokens.filter(t => t.status === TokenStatus.ACTIVE);
    const matched: { token: ProcessToken; node: ProcessNode }[] = [];

    for (const token of waitingTokens) {
      const node = definition.graph.nodes.find(n => n.id === token.nodeId);
      if (!node) continue;

      if (signalParams.nodeId) {
        if (token.nodeId === signalParams.nodeId && (node.type === 'human_task' || node.type === 'event_wait')) {
          matched.push({ token, node });
        }
      } else if (node.type === 'human_task' || node.type === 'event_wait') {
        const expectedSignal = node.config?.signalName;
        if (!expectedSignal || expectedSignal === signalParams.signalName) {
          matched.push({ token, node });
        }
      }
    }

    if (matched.length === 0) {
      throw new Error(`No waiting human_task or event_wait node matches signal ${signalParams.signalName}`);
    }

    for (const { token, node } of matched) {
      await this.executeNode(instance, node, token, signalParams.data, definition);
    }

    return instance;
  }

  async cancelInstance(instanceId: string, cancelledBy: string, tenantId: string, reason?: string): Promise<ProcessInstance> {
    this.logger.log(`Cancelling instance ${instanceId}`);

    const instance = await this.instanceRepository.findOne({
      where: { id: instanceId, tenantId },
      relations: ['tokens'],
    });

    if (!instance) {
      throw new Error(`Process instance not found: ${instanceId}`);
    }

    if (instance.status !== ProcessInstanceStatus.RUNNING && instance.status !== ProcessInstanceStatus.SUSPENDED) {
      throw new Error(`Cannot cancel instance with status: ${instance.status}`);
    }

    return await this.dataSource.transaction(async (manager) => {
      for (const token of instance.tokens) {
        if (token.status === TokenStatus.ACTIVE) {
          token.status = TokenStatus.TERMINATED;
          token.consumedAt = new Date();
          await manager.save(token);
        }
      }

      instance.status = ProcessInstanceStatus.CANCELLED;
      instance.cancelledAt = new Date();
      instance.cancelledBy = cancelledBy;
      instance.error = reason ? { message: reason, timestamp: new Date() } : null;
      await manager.save(instance);

      await this.recordHistory(instance.id, HistoryEventType.PROCESS_CANCEL, null, null, { reason }, null, null, cancelledBy, 0, instance.tenantId, manager);

      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.workflow_engine.process.cancelled',
        eventType: 'ProcessCancelled',
        eventVersion: 1,
        correlationId: uuidv4(),
        subject: { instanceId: instance.id },
        payload: {
          tenantId: instance.tenantId,
          instanceId: instance.id,
          status: instance.status,
          cancelledBy,
          reason: reason || null,
        },
      });

      return instance;
    });
  }

  private async executeNode(
    instance: ProcessInstance,
    node: ProcessNode,
    token: ProcessToken,
    inputData?: Record<string, any>,
    definition?: ProcessDefinition,
  ): Promise<void> {
    const startTime = Date.now();
    const activeDefinition = definition || await this.definitionRepository.findOne({
      where: { id: instance.definitionId, tenantId: instance.tenantId },
    });
    if (!activeDefinition) {
      throw new Error(`Definition not found for instance ${instance.id}`);
    }

    await this.recordHistory(instance.id, HistoryEventType.NODE_ENTER, node.id, node.name, { nodeType: node.type, config: node.config }, null, null, null, 0, instance.tenantId);

    let result: NodeExecutionResult;

    try {
      switch (node.type) {
        case 'start':
          result = await this.executeStartNode(instance, node, activeDefinition);
          break;
        case 'end':
          result = await this.executeEndNode(instance, node, activeDefinition);
          break;
        case 'api_call':
          result = await this.executeApiCallNode(instance, node, token, activeDefinition, inputData);
          break;
        case 'decision':
          result = await this.executeDecisionNode(instance, node, activeDefinition);
          break;
        case 'human_task':
          result = await this.executeHumanTaskNode(instance, node, activeDefinition, inputData);
          break;
        case 'timer':
          result = await this.executeTimerNode(instance, node, token, activeDefinition, inputData);
          break;
        case 'parallel':
          result = await this.executeParallelNode(instance, node, activeDefinition);
          break;
        case 'event_wait':
          result = await this.executeEventWaitNode(instance, node, activeDefinition, inputData);
          break;
        case 'transform':
          result = await this.executeTransformNode(instance, node, activeDefinition);
          break;
        default:
          throw new Error(`Unknown node type: ${node.type}`);
      }

      if (result.outputVariables) {
        for (const [key, value] of Object.entries(result.outputVariables)) {
          await this.setVariable(instance.id, key, value, 'global', instance.tenantId);
          instance.context[key] = value;
        }
      }

      await this.recordHistory(instance.id, HistoryEventType.NODE_EXIT, node.id, node.name, { nextNodes: result.nextNodes }, result.outputVariables, null, null, Date.now() - startTime, instance.tenantId);

      if (result.consumeToken !== false) {
        token.status = TokenStatus.CONSUMED;
        token.consumedAt = new Date();
        await this.tokenRepository.save(token);
      }

      if (result.nextNodes.length > 0) {
        for (const nextNodeId of result.nextNodes) {
          const newToken = this.tokenRepository.create({
            tenantId: instance.tenantId,
            instanceId: instance.id,
            nodeId: nextNodeId,
            status: TokenStatus.ACTIVE,
            parentNodeId: node.id,
          });
          await this.tokenRepository.save(newToken);

          const nextNode = activeDefinition.graph.nodes.find(n => n.id === nextNodeId);
          if (nextNode) {
            await this.executeNode(instance, nextNode, newToken, undefined, activeDefinition);
          }
        }
      }

      instance.currentNode = result.nextNodes[0] || node.id;
      await this.instanceRepository.save(instance);

    } catch (error) {
      this.logger.error(`Error executing node ${node.id}:`, error);

      await this.recordHistory(instance.id, HistoryEventType.NODE_ERROR, node.id, node.name, null, null, {
        message: error.message,
        code: error.code,
        details: error.details,
      }, null, Date.now() - startTime, instance.tenantId);

      instance.status = ProcessInstanceStatus.FAILED;
      instance.error = {
        message: error.message,
        code: error.code,
        details: error.details,
        timestamp: new Date(),
      };
      await this.instanceRepository.save(instance);

      const activeTokens = await this.tokenRepository.find({
        where: { instanceId: instance.id, status: TokenStatus.ACTIVE, tenantId: instance.tenantId },
      });
      for (const t of activeTokens) {
        t.status = TokenStatus.TERMINATED;
        t.consumedAt = new Date();
        await this.tokenRepository.save(t);
      }

      throw error;
    }
  }

  private async executeStartNode(instance: ProcessInstance, node: ProcessNode, definition: ProcessDefinition): Promise<NodeExecutionResult> {
    const nextNodes = this.evaluateEdges(node.id, definition, instance.context);
    return { success: true, nextNodes };
  }

  private async executeEndNode(instance: ProcessInstance, node: ProcessNode, definition: ProcessDefinition): Promise<NodeExecutionResult> {
    instance.status = ProcessInstanceStatus.COMPLETED;
    instance.completedAt = new Date();
    await this.instanceRepository.save(instance);

    await this.recordHistory(instance.id, HistoryEventType.PROCESS_END, node.id, node.name, null, null, null, null, 0, instance.tenantId);

    const outbox = new OutboxPublisher(this.dataSource);
    await outbox.publish({
      topic: 'insurance.workflow_engine.process.completed',
      eventType: 'ProcessCompleted',
      eventVersion: 1,
      correlationId: uuidv4(),
      subject: { instanceId: instance.id },
      payload: {
        tenantId: instance.tenantId,
        instanceId: instance.id,
        businessKey: instance.businessKey,
      },
    });

    return { success: true, nextNodes: [] };
  }

  private async executeApiCallNode(
    instance: ProcessInstance,
    node: ProcessNode,
    token: ProcessToken,
    definition: ProcessDefinition,
    inputData?: Record<string, any>,
  ): Promise<NodeExecutionResult> {
    const config = node.config;
    const url = this.interpolateTemplate(config.url, { ...instance.context, ...inputData });
    const method = config.method || 'GET';
    const headers = this.interpolateObject(config.headers || {}, { ...instance.context, ...inputData });
    const body = config.body ? this.interpolateObject(config.body, { ...instance.context, ...inputData }) : undefined;

    if (!this.isUrlAllowed(url)) {
      throw new Error(`URL not allowed by workflow API allow-list: ${url}`);
    }

    const serviceToken = this.createServiceToken();
    const finalHeaders = { ...headers, Authorization: `Bearer ${serviceToken}` };

    const response = await firstValueFrom(
      this.httpService.request({
        method,
        url,
        headers: finalHeaders,
        data: body,
        timeout: config.timeout || 30000,
      }),
    );

    const nextNodes = this.evaluateEdges(node.id, definition, instance.context);

    return {
      success: true,
      nextNodes,
      outputVariables: config.outputVariable ? { [config.outputVariable]: response.data } : undefined,
    };
  }

  private async executeDecisionNode(instance: ProcessInstance, node: ProcessNode, definition: ProcessDefinition): Promise<NodeExecutionResult> {
    const config = node.config;
    const expression = config.expression;
    const result = this.evaluateExpression(expression, instance.context);
    const nextNodes = this.evaluateEdges(node.id, definition, instance.context);

    return {
      success: true,
      nextNodes,
      outputVariables: config.outputVariable ? { [config.outputVariable]: result } : undefined,
    };
  }

  private async executeHumanTaskNode(
    instance: ProcessInstance,
    node: ProcessNode,
    definition: ProcessDefinition,
    inputData?: Record<string, any>,
  ): Promise<NodeExecutionResult> {
    if (inputData) {
      const nextNodes = this.evaluateEdges(node.id, definition, instance.context);
      return { success: true, nextNodes, outputVariables: inputData };
    }

    const outbox = new OutboxPublisher(this.dataSource);
    await outbox.publish({
      topic: 'insurance.workflow_engine.human_task.created',
      eventType: 'HumanTaskCreated',
      eventVersion: 1,
      correlationId: uuidv4(),
      subject: { instanceId: instance.id, nodeId: node.id },
      payload: {
        tenantId: instance.tenantId,
        instanceId: instance.id,
        nodeId: node.id,
        nodeName: node.name,
        assignees: node.config?.assignees || [],
      },
    });

    return { success: true, nextNodes: [], consumeToken: false };
  }

  private async executeTimerNode(
    instance: ProcessInstance,
    node: ProcessNode,
    token: ProcessToken,
    definition: ProcessDefinition,
    inputData?: Record<string, any>,
  ): Promise<NodeExecutionResult> {
    if (inputData?.__timerFired) {
      await this.recordHistory(instance.id, HistoryEventType.TIMER_TRIGGERED, node.id, node.name, { duration: node.config?.duration }, null, null, null, 0, instance.tenantId);
      const nextNodes = this.evaluateEdges(node.id, definition, instance.context);
      return { success: true, nextNodes };
    }

    const duration = node.config?.duration;
    if (typeof duration !== 'number' || duration <= 0) {
      throw new Error(`Invalid timer duration for node ${node.id}`);
    }

    const fireAt = new Date(Date.now() + duration);
    const timer = this.timerRepository.create({
      tenantId: instance.tenantId,
      instanceId: instance.id,
      nodeId: node.id,
      fireAt,
      status: TimerStatus.PENDING,
      metadata: { duration },
    });
    await this.timerRepository.save(timer);

    return { success: true, nextNodes: [], consumeToken: false };
  }

  private async executeParallelNode(instance: ProcessInstance, node: ProcessNode, definition: ProcessDefinition): Promise<NodeExecutionResult> {
    const nextNodes = this.evaluateEdges(node.id, definition, instance.context);

    await this.recordHistory(instance.id, HistoryEventType.PARALLEL_FORK, node.id, node.name, { branchCount: nextNodes.length }, null, null, null, 0, instance.tenantId);

    return { success: true, nextNodes };
  }

  private async executeEventWaitNode(
    instance: ProcessInstance,
    node: ProcessNode,
    definition: ProcessDefinition,
    inputData?: Record<string, any>,
  ): Promise<NodeExecutionResult> {
    if (inputData) {
      const nextNodes = this.evaluateEdges(node.id, definition, instance.context);
      return { success: true, nextNodes, outputVariables: inputData };
    }

    return { success: true, nextNodes: [], consumeToken: false };
  }

  private async executeTransformNode(instance: ProcessInstance, node: ProcessNode, definition: ProcessDefinition): Promise<NodeExecutionResult> {
    const config = node.config;
    const transformations = config.transformations || [];
    const outputVariables: Record<string, any> = {};

    for (const transformation of transformations) {
      const target = transformation.target;
      const expression = transformation.expression;
      const value = this.evaluateExpression(expression, instance.context);
      outputVariables[target] = value;
    }

    const nextNodes = this.evaluateEdges(node.id, definition, instance.context);

    return { success: true, nextNodes, outputVariables };
  }

  private evaluateEdges(nodeId: string, definition: ProcessDefinition, context: Record<string, any>): string[] {
    const edges = definition.graph.edges.filter(e => e.from === nodeId);
    const matches = edges.filter(e => {
      if (!e.condition || e.condition.trim().length === 0) return true;
      return Boolean(this.evaluateExpression(e.condition, context));
    });
    return matches.map(e => e.to);
  }

  private evaluateExpression(expression: string, context: Record<string, any>): any {
    try {
      const sanitized = this.sanitizeExpression(expression);
      return this.expressionParser.evaluate(sanitized, context);
    } catch (error) {
      this.logger.error(`Error evaluating expression: ${expression}`, error);
      return false;
    }
  }

  private sanitizeExpression(expression: string): string {
    if (!expression) return '';
    return expression
      .replace(/===/g, '==')
      .replace(/!==/g, '!=')
      .replace(/\$\{(\w+)\}/g, '$1');
  }

  private interpolateTemplate(template: string, context: Record<string, any>): string {
    let result = String(template || '');
    for (const [key, value] of Object.entries(context)) {
      const replacement = value === undefined || value === null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
      result = result.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), replacement);
    }
    return result;
  }

  private interpolateObject(obj: any, context: Record<string, any>): any {
    if (typeof obj === 'string') {
      return this.interpolateTemplate(obj, context);
    }
    if (Array.isArray(obj)) {
      return obj.map(item => this.interpolateObject(item, context));
    }
    if (typeof obj === 'object' && obj !== null) {
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.interpolateObject(value, context);
      }
      return result;
    }
    return obj;
  }

  private async setVariable(instanceId: string, name: string, value: any, scope: string, tenantId: string, manager?: any): Promise<void> {
    const variable = this.variableRepository.create({
      tenantId,
      instanceId,
      name,
      value: JSON.stringify(value),
      type: typeof value,
      scope,
    });
    if (manager) {
      await manager.save(variable);
    } else {
      await this.variableRepository.save(variable);
    }
  }

  private async recordHistory(
    instanceId: string,
    eventType: HistoryEventType,
    nodeId: any = null,
    nodeName: any = null,
    data: any = null,
    result: any = null,
    error: any = null,
    userId: any = null,
    executionTime: number = 0,
    tenantId?: string,
    manager?: any,
  ): Promise<void> {
    const history = this.historyRepository.create({
      tenantId,
      instanceId,
      eventType,
      nodeId,
      nodeName,
      data,
      result,
      error,
      executionTime,
      userId,
    });
    if (manager) {
      await manager.save(history);
    } else {
      await this.historyRepository.save(history);
    }
  }

  private async findActiveDefinition(key: string, tenantId: string, version?: number): Promise<ProcessDefinition | null> {
    const where: any = { key, tenantId, status: ProcessDefinitionStatus.ACTIVE, deletedAt: null };
    if (version !== undefined) {
      where.version = version;
    }
    const defs = await this.definitionRepository.find({
      where,
      order: { version: 'DESC', createdAt: 'DESC' },
      take: 1,
    });
    return defs[0] || null;
  }

  private createServiceToken(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is required to sign workflow API service tokens');
    }
    return jwt.sign(
      {
        sub: 'workflow-engine-service',
        iss: 'workflow-engine-service',
        aud: process.env.JWT_AUDIENCES || 'insurance-platform',
        scope: 'workflow:invoke',
      },
      secret,
      { expiresIn: '1m', algorithm: 'HS256' },
    );
  }

  private isUrlAllowed(url: string): boolean {
    const allowList = process.env.WORKFLOW_API_ALLOW_LIST;
    if (!allowList || allowList.trim().length === 0) {
      this.logger.warn('WORKFLOW_API_ALLOW_LIST is not configured; allowing all workflow API URLs');
      return true;
    }
    const allowed = allowList.split(',').map(s => s.trim()).filter(Boolean);
    return allowed.some(prefix => url.startsWith(prefix));
  }

  private async processPendingTimers(): Promise<void> {
    const now = new Date();
    const pendingTimers = await this.timerRepository.find({
      where: { status: TimerStatus.PENDING, fireAt: LessThanOrEqual(now) },
      relations: ['instance'],
      take: 100,
    });

    for (const timer of pendingTimers) {
      try {
        timer.status = TimerStatus.FIRED;
        timer.firedAt = new Date();
        await this.timerRepository.save(timer);

        const instance = timer.instance;
        if (!instance) {
          this.logger.warn(`Timer ${timer.id} has no associated instance`);
          continue;
        }

        const token = await this.tokenRepository.findOne({
          where: { instanceId: instance.id, nodeId: timer.nodeId, status: TokenStatus.ACTIVE, tenantId: instance.tenantId },
        });
        if (!token) {
          this.logger.warn(`No active token for timer ${timer.id}`);
          continue;
        }

        const definition = await this.definitionRepository.findOne({
          where: { id: instance.definitionId, tenantId: instance.tenantId },
        });
        if (!definition) {
          this.logger.warn(`Definition not found for timer ${timer.id}`);
          continue;
        }

        const node = definition.graph.nodes.find(n => n.id === timer.nodeId);
        if (!node) {
          this.logger.warn(`Node not found for timer ${timer.id}`);
          continue;
        }

        await this.executeNode(instance, node, token, { __timerFired: true }, definition);
      } catch (error) {
        this.logger.error(`Error processing timer ${timer.id}:`, error);
      }
    }
  }

  async createDefinition(params: {
    key: string;
    name: string;
    description?: string;
    graph: any;
    variables?: Record<string, any>;
    version?: number;
    effectiveFrom?: string;
    effectiveTo?: string;
    metadata?: Record<string, any>;
    tenantId: string;
    createdBy?: string;
  }): Promise<ProcessDefinition> {
    const version = params.version ?? 1;
    const definition = this.definitionRepository.create({
      tenantId: params.tenantId,
      key: params.key,
      name: params.name,
      description: params.description,
      graph: params.graph,
      variables: params.variables,
      version,
      status: ProcessDefinitionStatus.DRAFT,
      effectiveFrom: params.effectiveFrom ? new Date(params.effectiveFrom) : null,
      effectiveTo: params.effectiveTo ? new Date(params.effectiveTo) : null,
      metadata: { ...params.metadata, createdBy: params.createdBy },
    });
    return this.definitionRepository.save(definition);
  }

  async listDefinitions(tenantId: string, status?: ProcessDefinitionStatus, key?: string, limit: number = 50, offset: number = 0): Promise<ProcessDefinition[]> {
    const where: any = { tenantId, deletedAt: null };
    if (status) where.status = status;
    if (key) where.key = key;
    return this.definitionRepository.find({
      where,
      order: { version: 'DESC', createdAt: 'DESC' },
      take: Math.min(limit, 200),
      skip: offset,
    });
  }

  async getDefinition(id: string, tenantId: string): Promise<ProcessDefinition> {
    const def = await this.definitionRepository.findOne({ where: { id, tenantId, deletedAt: null } });
    if (!def) throw new Error(`Process definition not found: ${id}`);
    return def;
  }

  async updateDefinition(id: string, tenantId: string, body: Partial<ProcessDefinition>): Promise<ProcessDefinition> {
    const def = await this.getDefinition(id, tenantId);
    Object.assign(def, body);
    return this.definitionRepository.save(def);
  }

  async deleteDefinition(id: string, tenantId: string): Promise<void> {
    const def = await this.getDefinition(id, tenantId);
    def.deletedAt = new Date();
    def.status = ProcessDefinitionStatus.DEPRECATED;
    await this.definitionRepository.save(def);
  }

  async getInstance(instanceId: string, tenantId: string): Promise<ProcessInstance> {
    const instance = await this.instanceRepository.findOne({
      where: { id: instanceId, tenantId },
      relations: ['definition', 'tokens', 'variables', 'history'],
    });
    if (!instance) throw new Error(`Process instance not found: ${instanceId}`);
    return instance;
  }

  async getInstancesByBusinessKey(tenantId: string, businessKey: string): Promise<ProcessInstance[]> {
    return this.instanceRepository.find({
      where: { tenantId, businessKey },
      relations: ['definition'],
      order: { createdAt: 'DESC' },
    });
  }

  async listInstances(tenantId: string, status?: string, limit: number = 50, offset: number = 0): Promise<ProcessInstance[]> {
    const where: any = { tenantId };
    if (status) where.status = status;
    return this.instanceRepository.find({
      where,
      relations: ['definition'],
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 200),
      skip: offset,
    });
  }

  async getInstanceHistory(instanceId: string, tenantId: string): Promise<ProcessHistory[]> {
    return this.historyRepository.find({
      where: { instanceId, tenantId },
      order: { timestamp: 'ASC' },
    });
  }

  async checkDbConnection(): Promise<void> {
    await this.dataSource.query('SELECT 1');
  }
}
