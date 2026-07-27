import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository, Inject } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { OutboxPublisher } from '@insurance/shared';
import { v4 as uuidv4 } from 'uuid';
import { Parser } from 'expr-eval';
import jwt from 'jsonwebtoken';
import { ProcessDefinition, ProcessNode, ProcessEdge, ProcessDefinitionStatus } from './entities/process-definition.entity';
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
  tenantId?: string;
  initialVariables?: Record<string, any>;
  startedBy?: string;
  metadata?: Record<string, any>;
}

export interface SignalParams {
  instanceId: string;
  signalName: string;
  nodeId?: string;
  tenantId?: string;
  data?: Record<string, any>;
  userId?: string;
}

export interface NodeExecutionResult {
  success: boolean;
  nextNodes: string[];
  outputVariables?: Record<string, any>;
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

    const tenantId = params.tenantId;
    if (!tenantId) {
      throw new Error('tenantId is required to start a process instance');
    }

    // Find active definition scoped to tenant and version (latest active by default)
    const definition = await this.findActiveDefinition(params.definitionKey, tenantId, params.definitionVersion);

    if (!definition) {
      throw new Error(`Active process definition not found: ${params.definitionKey}`);
    }

    return await this.dataSource.transaction(async (manager) => {
      // Create instance
      const instance = manager.create(ProcessInstance, {
        tenantId,
        definitionId: definition.id,
        businessKey: params.businessKey,
        status: ProcessInstanceStatus.RUNNING,
        context: { ...definition.variables, ...params.initialVariables },
        startedAt: new Date(),
        startedBy: params.startedBy,
        metadata: params.metadata,
      });

      await manager.save(instance);

      // Initialize variables
      for (const [key, value] of Object.entries(params.initialVariables || {})) {
        await this.setVariable(instance.id, key, value, 'global', tenantId);
      }

      // Find start node
      const startNode = definition.graph.nodes.find(n => n.type === 'start');
      if (!startNode) {
        throw new Error(`Process definition ${definition.key} has no start node`);
      }

      // Create initial token
      const token = manager.create(ProcessToken, {
        tenantId,
        instanceId: instance.id,
        nodeId: startNode.id,
        status: TokenStatus.ACTIVE,
      });
      await manager.save(token);

      // Publish event
      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.workflow_engine.process.started',
        eventType: 'ProcessStarted',
        eventVersion: 1,
        correlationId: uuidv4(),
        subject: { instanceId: instance.id, definitionKey: definition.key },
        payload: {
          tenantId,
          instanceId: instance.id,
          definitionKey: definition.key,
          businessKey: params.businessKey,
          status: instance.status,
          startedBy: params.startedBy || null,
        },
      });

      // Record history
      await this.recordHistory(instance.id, HistoryEventType.PROCESS_START, null, null, {
        definitionKey: definition.key,
        definitionVersion: definition.version,
      }, null, null, null, 0, tenantId);

      return instance;
    });
  }

  async signal(signalParams: SignalParams): Promise<ProcessInstance> {
    this.logger.log(`Signaling instance ${signalParams.instanceId} with ${signalParams.signalName}`);

    const instance = await this.instanceRepository.findOne({
      where: { id: signalParams.instanceId },
      relations: ['tokens'],
    });

    if (!instance) {
      throw new Error(`Process instance not found: ${signalParams.instanceId}`);
    }

    if (instance.status !== ProcessInstanceStatus.RUNNING && instance.status !== ProcessInstanceStatus.SUSPENDED) {
      throw new Error(`Cannot signal instance with status: ${instance.status}`);
    }

    // Record history
    await this.recordHistory(
      instance.id,
      HistoryEventType.SIGNAL_RECEIVED,
      null,
      { signalName: signalParams.signalName },
      null,
      null,
      signalParams.userId,
    );

    // Find waiting human_task nodes
    const waitingTokens = instance.tokens.filter(t => t.status === TokenStatus.ACTIVE);
    
    for (const token of waitingTokens) {
      const definition = await this.definitionRepository.findOne({
        where: { id: instance.definitionId },
      });
      const node = definition.graph.nodes.find(n => n.id === token.nodeId);
      
      if (node && node.type === 'human_task') {
        // Resume execution
        await this.executeNode(instance, node, token, signalParams.data);
      }
    }

    return instance;
  }

  async cancelInstance(instanceId: string, cancelledBy: string, reason?: string): Promise<ProcessInstance> {
    this.logger.log(`Cancelling instance ${instanceId}`);

    const instance = await this.instanceRepository.findOne({
      where: { id: instanceId },
      relations: ['tokens'],
    });

    if (!instance) {
      throw new Error(`Process instance not found: ${instanceId}`);
    }

    if (instance.status !== ProcessInstanceStatus.RUNNING && instance.status !== ProcessInstanceStatus.SUSPENDED) {
      throw new Error(`Cannot cancel instance with status: ${instance.status}`);
    }

    return await this.dataSource.transaction(async (manager) => {
      // Terminate all active tokens
      for (const token of instance.tokens) {
        if (token.status === TokenStatus.ACTIVE) {
          token.status = TokenStatus.TERMINATED;
          token.consumedAt = new Date();
          await manager.save(token);
        }
      }

      // Update instance
      instance.status = ProcessInstanceStatus.CANCELLED;
      instance.cancelledAt = new Date();
      instance.cancelledBy = cancelledBy;
      instance.error = reason ? { message: reason, timestamp: new Date() } : null;
      await manager.save(instance);

      // Record history
      await this.recordHistory(
        instance.id,
        HistoryEventType.PROCESS_CANCEL,
        null,
        { reason },
        null,
        null,
        cancelledBy,
      );

      // Publish event
      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.workflow_engine.process.cancelled',
        eventType: 'ProcessCancelled',
        eventVersion: 1,
        correlationId: uuidv4(),
        subject: { instanceId: instance.id },
        payload: {
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
  ): Promise<void> {
    const startTime = Date.now();

    // Record node enter
    await this.recordHistory(
      instance.id,
      HistoryEventType.NODE_ENTER,
      node.id,
      node.name,
      { nodeType: node.type, config: node.config },
    );

    let result: NodeExecutionResult;

    try {
      switch (node.type) {
        case 'start':
          result = await this.executeStartNode(instance, node, token);
          break;
        case 'end':
          result = await this.executeEndNode(instance, node, token);
          break;
        case 'api_call':
          result = await this.executeApiCallNode(instance, node, token, inputData);
          break;
        case 'decision':
          result = await this.executeDecisionNode(instance, node, token);
          break;
        case 'human_task':
          result = await this.executeHumanTaskNode(instance, node, token, inputData);
          break;
        case 'timer':
          result = await this.executeTimerNode(instance, node, token);
          break;
        case 'parallel':
          result = await this.executeParallelNode(instance, node, token);
          break;
        case 'event_wait':
          result = await this.executeEventWaitNode(instance, node, token);
          break;
        case 'transform':
          result = await this.executeTransformNode(instance, node, token);
          break;
        default:
          throw new Error(`Unknown node type: ${node.type}`);
      }

      // Update output variables
      if (result.outputVariables) {
        for (const [key, value] of Object.entries(result.outputVariables)) {
          await this.setVariable(instance.id, key, value, 'global');
          instance.context[key] = value;
        }
      }

      // Record node exit
      await this.recordHistory(
        instance.id,
        HistoryEventType.NODE_EXIT,
        node.id,
        node.name,
        { nextNodes: result.nextNodes },
        result.outputVariables,
        null,
        null,
        Date.now() - startTime,
      );

      // Consume current token
      token.status = TokenStatus.CONSUMED;
      token.consumedAt = new Date();
      await this.tokenRepository.save(token);

      // Advance tokens to next nodes
      if (result.nextNodes.length > 0) {
        for (const nextNodeId of result.nextNodes) {
          const newToken = this.tokenRepository.create({
            instanceId: instance.id,
            nodeId: nextNodeId,
            status: TokenStatus.ACTIVE,
            parentNodeId: node.id,
          });
          await this.tokenRepository.save(newToken);

          // Execute next node (async for parallel)
          if (node.type === 'parallel') {
            this.executeNode(instance, node, newToken).catch(err => {
              this.logger.error(`Error executing parallel node ${nextNodeId}:`, err);
            });
          } else {
            const definition = await this.definitionRepository.findOne({
              where: { id: instance.definitionId },
            });
            const nextNode = definition.graph.nodes.find(n => n.id === nextNodeId);
            if (nextNode) {
              await this.executeNode(instance, nextNode, newToken);
            }
          }
        }
      }

      // Update current node
      instance.currentNode = result.nextNodes[0] || null;
      await this.instanceRepository.save(instance);

    } catch (error) {
      this.logger.error(`Error executing node ${node.id}:`, error);

      // Record error
      await this.recordHistory(
        instance.id,
        HistoryEventType.NODE_ERROR,
        node.id,
        node.name,
        null,
        null,
        {
          message: error.message,
          code: error.code,
          details: error.details,
        },
        null,
        Date.now() - startTime,
      );

      // Mark instance as failed
      instance.status = ProcessInstanceStatus.FAILED;
      instance.error = {
        message: error.message,
        code: error.code,
        details: error.details,
        timestamp: new Date(),
      };
      await this.instanceRepository.save(instance);

      // Terminate all active tokens
      const activeTokens = await this.tokenRepository.find({
        where: { instanceId: instance.id, status: TokenStatus.ACTIVE },
      });
      for (const t of activeTokens) {
        t.status = TokenStatus.TERMINATED;
        t.consumedAt = new Date();
        await this.tokenRepository.save(t);
      }

      throw error;
    }
  }

  private async executeStartNode(
    instance: ProcessInstance,
    node: ProcessNode,
    token: ProcessToken,
  ): Promise<NodeExecutionResult> {
    // Start node just passes through to next nodes
    const definition = await this.definitionRepository.findOne({
      where: { id: instance.definitionId },
    });
    const nextNodes = definition.graph.edges
      .filter(e => e.from === node.id)
      .map(e => e.to);

    return { success: true, nextNodes };
  }

  private async executeEndNode(
    instance: ProcessInstance,
    node: ProcessNode,
    token: ProcessToken,
  ): Promise<NodeExecutionResult> {
    // Mark instance as completed
    instance.status = ProcessInstanceStatus.COMPLETED;
    instance.completedAt = new Date();
    await this.instanceRepository.save(instance);

    // Record history
    await this.recordHistory(
      instance.id,
      HistoryEventType.PROCESS_END,
      node.id,
      node.name,
      null,
      null,
      null,
      null,
    );

    return { success: true, nextNodes: [] };
  }

  private async executeApiCallNode(
    instance: ProcessInstance,
    node: ProcessNode,
    token: ProcessToken,
    inputData?: Record<string, any>,
  ): Promise<NodeExecutionResult> {
    const config = node.config;
    const url = this.interpolateTemplate(config.url, instance.context);
    const method = config.method || 'GET';
    const headers = this.interpolateObject(config.headers || {}, instance.context);
    const body = config.body ? this.interpolateObject(config.body, instance.context) : undefined;

    const response = await firstValueFrom(
      this.httpService.request({
        method,
        url,
        headers,
        data: body,
        timeout: config.timeout || 30000,
      }),
    );

    const nextNodes = this.evaluateEdges(node.id, instance.definitionId, instance.context);

    return {
      success: true,
      nextNodes,
      outputVariables: config.outputVariable ? { [config.outputVariable]: response.data } : undefined,
    };
  }

  private async executeDecisionNode(
    instance: ProcessInstance,
    node: ProcessNode,
    token: ProcessToken,
  ): Promise<NodeExecutionResult> {
    const config = node.config;
    const expression = config.expression;
    
    // Evaluate expression
    const result = this.evaluateExpression(expression, instance.context);
    
    // Find matching edge
    const definition = await this.definitionRepository.findOne({
      where: { id: instance.definitionId },
    });
    
    const matchingEdge = definition.graph.edges.find(
      e => e.from === node.id && e.condition && this.evaluateExpression(e.condition, instance.context)
    );

    const nextNodes = matchingEdge ? [matchingEdge.to] : [];

    return {
      success: true,
      nextNodes,
      outputVariables: config.outputVariable ? { [config.outputVariable]: result } : undefined,
    };
  }

  private async executeHumanTaskNode(
    instance: ProcessInstance,
    node: ProcessNode,
    token: ProcessToken,
    inputData?: Record<string, any>,
  ): Promise<NodeExecutionResult> {
    const config = node.config;

    if (inputData) {
      // Task completed with data
      const nextNodes = this.evaluateEdges(node.id, instance.definitionId, instance.context);
      return {
        success: true,
        nextNodes,
        outputVariables: inputData,
      };
    }

    // Create work item (would integrate with Work Item Service in production)
    // For now, keep token active and wait for signal
    return {
      success: true,
      nextNodes: [], // Wait for signal
    };
  }

  private async executeTimerNode(
    instance: ProcessInstance,
    node: ProcessNode,
    token: ProcessToken,
  ): Promise<NodeExecutionResult> {
    const config = node.config;
    const duration = config.duration; // in milliseconds

    // Schedule timer (in production, use a job scheduler)
    setTimeout(async () => {
      try {
        const nextNodes = this.evaluateEdges(node.id, instance.definitionId, instance.context);
        
        await this.recordHistory(
          instance.id,
          HistoryEventType.TIMER_TRIGGERED,
          node.id,
          node.name,
          { duration },
        );

        // Resume execution
        for (const nextNodeId of nextNodes) {
          const newToken = this.tokenRepository.create({
            instanceId: instance.id,
            nodeId: nextNodeId,
            status: TokenStatus.ACTIVE,
            parentNodeId: node.id,
          });
          await this.tokenRepository.save(newToken);

          const definition = await this.definitionRepository.findOne({
            where: { id: instance.definitionId },
          });
          const nextNode = definition.graph.nodes.find(n => n.id === nextNodeId);
          if (nextNode) {
            await this.executeNode(instance, nextNode, newToken);
          }
        }
      } catch (error) {
        this.logger.error(`Error in timer callback for node ${node.id}:`, error);
      }
    }, duration);

    return {
      success: true,
      nextNodes: [], // Timer will resume later
    };
  }

  private async executeParallelNode(
    instance: ProcessInstance,
    node: ProcessNode,
    token: ProcessToken,
  ): Promise<NodeExecutionResult> {
    const definition = await this.definitionRepository.findOne({
      where: { id: instance.definitionId },
    });

    // Get all outgoing edges for parallel execution
    const nextNodes = definition.graph.edges
      .filter(e => e.from === node.id)
      .map(e => e.to);

    await this.recordHistory(
      instance.id,
      HistoryEventType.PARALLEL_FORK,
      node.id,
      node.name,
      { branchCount: nextNodes.length },
    );

    return {
      success: true,
      nextNodes,
    };
  }

  private async executeEventWaitNode(
    instance: ProcessInstance,
    node: ProcessNode,
    token: ProcessToken,
  ): Promise<NodeExecutionResult> {
    const config = node.config;
    const eventType = config.eventType;
    const topic = config.topic;

    // In production, subscribe to Kafka topic and wait for event
    // For now, keep token active
    return {
      success: true,
      nextNodes: [], // Wait for event
    };
  }

  private async executeTransformNode(
    instance: ProcessInstance,
    node: ProcessNode,
    token: ProcessToken,
  ): Promise<NodeExecutionResult> {
    const config = node.config;
    const transformations = config.transformations || [];

    const outputVariables: Record<string, any> = {};

    for (const transformation of transformations) {
      const target = transformation.target;
      const expression = transformation.expression;
      const value = this.evaluateExpression(expression, instance.context);
      outputVariables[target] = value;
    }

    const nextNodes = this.evaluateEdges(node.id, instance.definitionId, instance.context);

    return {
      success: true,
      nextNodes,
      outputVariables,
    };
  }

  private evaluateEdges(nodeId: string, definitionId: string, context: Record<string, any>): string[] {
    // This would need to fetch definition and evaluate edges
    // For simplicity, return empty array
    return [];
  }

  private evaluateExpression(expression: string, context: Record<string, any>): any {
    // Simple expression evaluation (in production, use a proper expression engine like JSONata)
    try {
      // Replace variables
      let evalExpr = expression;
      for (const [key, value] of Object.entries(context)) {
        evalExpr = evalExpr.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), JSON.stringify(value));
      }
      // eslint-disable-next-line no-eval
      return eval(evalExpr);
    } catch (error) {
      this.logger.error(`Error evaluating expression: ${expression}`, error);
      return false;
    }
  }

  private interpolateTemplate(template: string, context: Record<string, any>): string {
    let result = template;
    for (const [key, value] of Object.entries(context)) {
      result = result.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), String(value));
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

  private async setVariable(instanceId: string, name: string, value: any, scope: string, tenantId?: string): Promise<void> {
    const variable = this.variableRepository.create({
      tenantId,
      instanceId,
      name,
      value: JSON.stringify(value),
      type: typeof value,
      scope,
    });
    await this.variableRepository.save(variable);
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
    executionTime?: number,
    tenantId?: string,
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
      executionTime: executionTime || 0,
      userId,
    });
    await this.historyRepository.save(history);
  }

  // ── Process Definition CRUD ──

  async createDefinition(params: {
    key: string;
    name: string;
    description?: string;
    graph: any;
    variables?: Record<string, any>;
    effectiveFrom?: string;
    effectiveTo?: string;
    metadata?: Record<string, any>;
  }): Promise<ProcessDefinition> {
    const definition = this.definitionRepository.create({
      key: params.key,
      name: params.name,
      description: params.description,
      graph: params.graph,
      variables: params.variables,
      status: ProcessDefinitionStatus.DRAFT,
      effectiveFrom: params.effectiveFrom ? new Date(params.effectiveFrom) : null,
      effectiveTo: params.effectiveTo ? new Date(params.effectiveTo) : null,
      metadata: params.metadata,
    });
    return this.definitionRepository.save(definition);
  }

  async listDefinitions(status?: ProcessDefinitionStatus, key?: string, limit: number = 50, offset: number = 0): Promise<ProcessDefinition[]> {
    const where: any = {};
    if (status) where.status = status;
    if (key) where.key = key;
    return this.definitionRepository.find({ where, order: { createdAt: 'DESC' }, take: Math.min(limit, 200), skip: offset });
  }

  async getDefinition(id: string): Promise<ProcessDefinition> {
    const def = await this.definitionRepository.findOne({ where: { id } });
    if (!def) throw new Error(`Process definition not found: ${id}`);
    return def;
  }

  async updateDefinition(id: string, body: Partial<ProcessDefinition>): Promise<ProcessDefinition> {
    const def = await this.getDefinition(id);
    Object.assign(def, body);
    return this.definitionRepository.save(def);
  }

  async deleteDefinition(id: string): Promise<void> {
    await this.definitionRepository.delete(id);
  }

  // ── Instance queries ──

  async getInstance(instanceId: string): Promise<ProcessInstance> {
    const instance = await this.instanceRepository.findOne({
      where: { id: instanceId },
      relations: ['definition', 'tokens', 'variables', 'history'],
    });
    if (!instance) throw new Error(`Process instance not found: ${instanceId}`);
    return instance;
  }

  async getInstancesByBusinessKey(businessKey: string): Promise<ProcessInstance[]> {
    return this.instanceRepository.find({
      where: { businessKey },
      relations: ['definition'],
      order: { createdAt: 'DESC' },
    });
  }

  async listInstances(status?: string, limit: number = 50, offset: number = 0): Promise<ProcessInstance[]> {
    const where: any = {};
    if (status) where.status = status;
    return this.instanceRepository.find({
      where,
      relations: ['definition'],
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 200),
      skip: offset,
    });
  }

  async getInstanceHistory(instanceId: string): Promise<ProcessHistory[]> {
    return this.historyRepository.find({
      where: { instanceId },
      order: { timestamp: 'ASC' },
    });
  }

  async checkDbConnection(): Promise<void> {
    await this.dataSource.query('SELECT 1');
  }
}
