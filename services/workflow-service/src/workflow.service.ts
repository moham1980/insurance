import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import {Repository, DataSource} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { WorkflowDefinition, WorkflowStatus } from './entities/WorkflowDefinition';
import { WorkflowInstance, InstanceStatus } from './entities/WorkflowInstance';
import { WorkflowTemplate } from './entities/WorkflowTemplate';
import { OutboxPublisher } from '@insurance/shared';

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(WorkflowDefinition)
    private definitionRepo: Repository<WorkflowDefinition>,
    @InjectRepository(WorkflowInstance)
    private instanceRepo: Repository<WorkflowInstance>,
    @InjectRepository(WorkflowTemplate)
    private templateRepo: Repository<WorkflowTemplate>
  ) {}

  async createDefinition(params: {
    tenantId: string;
    name: string;
    key: string;
    description?: string;
    definition: any;
    metadata?: Record<string, any>;
    version?: number;
    tags?: string[];
    correlationId?: string;
  }): Promise<WorkflowDefinition> {
    return await this.dataSource.transaction(async (manager) => {
      // Auto-increment version if not provided
      let version = params.version;
      if (!version) {
        const lastDef = await manager.findOne(WorkflowDefinition, {
          where: {
            tenantId: params.tenantId,
            key: params.key,
          },
          order: { version: 'DESC' },
        });
        version = (lastDef?.version || 0) + 1;
      }

      const def = manager.create(WorkflowDefinition, {
        tenantId: params.tenantId,
        name: params.name,
        key: params.key,
        description: params.description || null,
        definition: params.definition,
        status: WorkflowStatus.DRAFT,
        version,
        metadata: params.metadata || null,
        tags: params.tags || [],
      });
      const saved = await manager.save(def);
      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.workflow.definition.created',
        eventType: 'WorkflowDefinitionCreated',
        eventVersion: 1,
        correlationId: params.correlationId || uuidv4(),
        subject: { definitionId: saved.id, key: params.key },
        payload: {
          definitionId: saved.id,
          name: saved.name,
          key: saved.key,
          version: saved.version,
          status: saved.status,
          tenantId: saved.tenantId,
        },
      });
      return saved;
    });
  }

  async activateDefinition(id: string): Promise<WorkflowDefinition> {
    return await this.dataSource.transaction(async (manager) => {
      const def = await manager.findOne(WorkflowDefinition, { where: { id } });
      if (!def) throw new Error('Definition not found');
      def.status = WorkflowStatus.ACTIVE;
      def.activatedAt = new Date();
      const saved = await manager.save(def);
      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.workflow.definition.activated',
        eventType: 'WorkflowDefinitionActivated',
        eventVersion: 1,
        correlationId: uuidv4(),
        subject: { definitionId: saved.id, key: saved.key },
        payload: {
          definitionId: saved.id,
          key: saved.key,
          version: saved.version,
          status: saved.status,
        },
      });
      return saved;
    });
  }

  async deactivateDefinition(id: string): Promise<WorkflowDefinition> {
    return await this.dataSource.transaction(async (manager) => {
      const def = await manager.findOne(WorkflowDefinition, { where: { id } });
      if (!def) throw new Error('Definition not found');
      def.status = WorkflowStatus.INACTIVE;
      def.deactivatedAt = new Date();
      const saved = await manager.save(def);
      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.workflow.definition.deactivated',
        eventType: 'WorkflowDefinitionDeactivated',
        eventVersion: 1,
        correlationId: uuidv4(),
        subject: { definitionId: saved.id, key: saved.key },
        payload: {
          definitionId: saved.id,
          key: saved.key,
          version: saved.version,
          status: saved.status,
        },
      });
      return saved;
    });
  }

  async validateDefinition(definitionId: string): Promise<{ valid: boolean; errors: string[] }> {
    const def = await this.definitionRepo.findOne({ where: { id: definitionId } });
    if (!def) return { valid: false, errors: ['Definition not found'] };

    const errors: string[] = [];
    const definition = def.definition;

    // Check if definition has nodes
    if (!definition.nodes || !Array.isArray(definition.nodes) || definition.nodes.length === 0) {
      errors.push('Workflow must have at least one node');
    }

    // Check if definition has start node
    const startNode = definition.nodes?.find((n: any) => n.type === 'start');
    if (!startNode) {
      errors.push('Workflow must have a start node');
    }

    // Check if definition has end node
    const endNode = definition.nodes?.find((n: any) => n.type === 'end');
    if (!endNode) {
      errors.push('Workflow must have an end node');
    }

    // Check if all edges reference valid nodes
    if (definition.edges && Array.isArray(definition.edges)) {
      const nodeIds = new Set(definition.nodes?.map((n: any) => n.id) || []);
      for (const edge of definition.edges) {
        if (!nodeIds.has(edge.from)) {
          errors.push(`Edge references non-existent source node: ${edge.from}`);
        }
        if (!nodeIds.has(edge.to)) {
          errors.push(`Edge references non-existent target node: ${edge.to}`);
        }
      }
    }

    // Check if all nodes except end have outgoing edges
    if (definition.nodes && definition.edges) {
      const edgeFromIds = new Set(definition.edges.map((e: any) => e.from));
      for (const node of definition.nodes) {
        if (node.type !== 'end' && !edgeFromIds.has(node.id)) {
          errors.push(`Node ${node.id} (${node.name}) has no outgoing edges`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  async startInstance(params: {
    tenantId: string;
    workflowKey: string;
    businessKey?: string;
    variables: Record<string, any>;
    metadata?: Record<string, any>;
    initiatorUserId?: string;
    correlationId?: string;
  }): Promise<WorkflowInstance> {
    const def = await this.definitionRepo.findOne({ 
      where: { key: params.workflowKey, status: WorkflowStatus.ACTIVE } 
    });
    if (!def) throw new Error('Active workflow definition not found');

    const startNode = def.definition.nodes.find((n: any) => n.type === 'start');
    if (!startNode) throw new Error('Workflow must have a start node');

    const saved = await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      const instance = manager.create(WorkflowInstance, {
        tenantId: params.tenantId,
        workflowDefinitionId: def.id,
        workflowKey: params.workflowKey,
        workflowVersion: def.version,
        businessKey: params.businessKey || null,
        status: InstanceStatus.RUNNING,
        variables: params.variables,
        currentNode: {
          nodeId: startNode.id,
          nodeName: startNode.name,
          enteredAt: new Date(),
        },
        history: [{
          nodeId: startNode.id,
          nodeName: startNode.name,
          enteredAt: new Date(),
          status: InstanceStatus.RUNNING,
        }],
        error: null,
        completedAt: null,
        metadata: params.metadata || null,
        initiatorUserId: params.initiatorUserId || null,
      });

      const result = await manager.save(instance);

      await outbox.publish({
        topic: 'insurance.workflow.instance.started',
        eventType: 'WorkflowInstanceStarted',
        eventVersion: 1,
        correlationId: params.correlationId || uuidv4(),
        subject: { instanceId: result.id, workflowKey: params.workflowKey },
        payload: {
          instanceId: result.id,
          workflowKey: params.workflowKey,
          workflowVersion: def.version,
          tenantId: params.tenantId,
          businessKey: params.businessKey || null,
          status: result.status,
          initiatorUserId: params.initiatorUserId || null,
        },
      });

      return result;
    });
    
    // Auto-advance from start node
    await this.advanceInstance(saved.id);
    
    return saved;
  }

  async advanceInstance(instanceId: string, userId?: string): Promise<WorkflowInstance> {
    const instance = await this.instanceRepo.findOne({ where: { id: instanceId } });
    if (!instance) throw new Error('Instance not found');
    if (instance.status !== InstanceStatus.RUNNING) {
      throw new Error(`Instance is ${instance.status}, cannot advance`);
    }

    const def = await this.definitionRepo.findOne({ 
      where: { id: instance.workflowDefinitionId } 
    });
    if (!def) throw new Error('Workflow definition not found');

    const currentNodeId = instance.currentNode.nodeId;
    const currentNode = def.definition.nodes.find((n: any) => n.id === currentNodeId);
    if (!currentNode) throw new Error('Current node not found in definition');

    // Handle end node
    if (currentNode.type === 'end') {
      instance.status = InstanceStatus.COMPLETED;
      instance.completedAt = new Date();
      if (instance.history) {
        const lastEntry = instance.history[instance.history.length - 1];
        if (lastEntry) lastEntry.exitedAt = new Date();
      }
      return this.instanceRepo.save(instance);
    }

    // Handle user task - requires manual completion
    if (currentNode.type === 'userTask') {
      instance.currentNode.assignee = currentNode.config?.assignee || null;
      instance.currentNode.candidateUsers = currentNode.config?.candidateUsers || [];
      instance.currentNode.candidateGroups = currentNode.config?.candidateGroups || [];
      instance.currentNode.dueDate = currentNode.config?.dueDate ? new Date(currentNode.config.dueDate) : null;
      return this.instanceRepo.save(instance);
    }

    // Handle timer event - wait for timer
    if (currentNode.type === 'timerEvent') {
      const timerDuration = currentNode.config?.duration || 'PT0S';
      const dueDate = new Date();
      const durationMatch = timerDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      if (durationMatch) {
        const hours = parseInt(durationMatch[1] || '0', 10);
        const minutes = parseInt(durationMatch[2] || '0', 10);
        const seconds = parseInt(durationMatch[3] || '0', 10);
        dueDate.setHours(dueDate.getHours() + hours);
        dueDate.setMinutes(dueDate.getMinutes() + minutes);
        dueDate.setSeconds(dueDate.getSeconds() + seconds);
      }
      instance.currentNode.dueDate = dueDate;
      return this.instanceRepo.save(instance);
    }

    // Find outgoing edges
    const outgoingEdges = def.definition.edges.filter((e: any) => e.from === currentNodeId);
    if (outgoingEdges.length === 0) {
      // No outgoing edges - treat as end
      instance.status = InstanceStatus.COMPLETED;
      instance.completedAt = new Date();
      return this.instanceRepo.save(instance);
    }

    // Handle gateway nodes
    if (currentNode.type === 'gateway') {
      const gatewayType = currentNode.config?.type || 'exclusive';
      
      if (gatewayType === 'exclusive') {
        // Evaluate conditions and take first matching
        for (const edge of outgoingEdges) {
          if (this.evaluateCondition(edge.condition, instance.variables)) {
            return this.moveToNode(instance, edge.to, def, userId);
          }
        }
        // No condition matched - take default (no condition)
        const defaultEdge = outgoingEdges.find((e: any) => !e.condition);
        if (defaultEdge) {
          return this.moveToNode(instance, defaultEdge.to, def, userId);
        }
        throw new Error('No matching condition for exclusive gateway');
      } else if (gatewayType === 'parallel') {
        // Create parallel branches by creating child instances
        const branchInstances: WorkflowInstance[] = [];
        for (const edge of outgoingEdges) {
          const branchInstance = await this.createBranchInstance(instance, edge.to, def);
          branchInstances.push(branchInstance);
        }
        // Store branch references in parent
        instance.currentNode.branches = branchInstances.map(b => b.id);
        instance.status = InstanceStatus.WAITING;
        return this.instanceRepo.save(instance);
      } else if (gatewayType === 'inclusive') {
        // Evaluate all conditions and take all that match
        const matchingEdges = outgoingEdges.filter((e: any) => 
          !e.condition || this.evaluateCondition(e.condition, instance.variables)
        );
        if (matchingEdges.length === 0) {
          throw new Error('No matching condition for inclusive gateway');
        }
        if (matchingEdges.length === 1) {
          return this.moveToNode(instance, matchingEdges[0].to, def, userId);
        }
        // Create branches for all matching paths
        const branchInstances: WorkflowInstance[] = [];
        for (const edge of matchingEdges) {
          const branchInstance = await this.createBranchInstance(instance, edge.to, def);
          branchInstances.push(branchInstance);
        }
        instance.currentNode.branches = branchInstances.map(b => b.id);
        instance.status = InstanceStatus.WAITING;
        return this.instanceRepo.save(instance);
      }
    }

    // For task and event nodes, take the first outgoing edge
    return this.moveToNode(instance, outgoingEdges[0].to, def, userId);
  }

  private async createBranchInstance(
    parentInstance: WorkflowInstance,
    targetNodeId: string,
    def: WorkflowDefinition
  ): Promise<WorkflowInstance> {
    const targetNode = def.definition.nodes.find((n: any) => n.id === targetNodeId);
    if (!targetNode) throw new Error('Target node not found');

    const branchInstance = this.instanceRepo.create({
      tenantId: parentInstance.tenantId,
      workflowDefinitionId: parentInstance.workflowDefinitionId,
      workflowKey: parentInstance.workflowKey,
      workflowVersion: parentInstance.workflowVersion,
      businessKey: parentInstance.businessKey,
      parentInstanceId: parentInstance.id,
      status: InstanceStatus.RUNNING,
      variables: { ...parentInstance.variables },
      currentNode: {
        nodeId: targetNodeId,
        nodeName: targetNode.name,
        enteredAt: new Date(),
      },
      history: [{
        nodeId: targetNodeId,
        nodeName: targetNode.name,
        enteredAt: new Date(),
        status: InstanceStatus.RUNNING,
      }],
      error: null,
      completedAt: null,
      metadata: parentInstance.metadata,
      initiatorUserId: parentInstance.initiatorUserId,
    });

    return this.instanceRepo.save(branchInstance);
  }

  async completeTask(instanceId: string, taskId: string, userId: string, variables?: Record<string, any>): Promise<WorkflowInstance> {
    const instance = await this.instanceRepo.findOne({ where: { id: instanceId } });
    if (!instance) throw new Error('Instance not found');
    if (instance.status !== InstanceStatus.RUNNING) {
      throw new Error(`Instance is ${instance.status}, cannot complete task`);
    }

    // Check if current node is a user task
    if (instance.currentNode.nodeId !== taskId) {
      throw new Error('Task ID does not match current node');
    }

    // Update variables if provided
    if (variables) {
      instance.variables = { ...instance.variables, ...variables };
    }

    // Record completion
    instance.currentNode.completedBy = userId;
    instance.currentNode.completedAt = new Date();

    return this.advanceInstance(instanceId, userId);
  }

  private async moveToNode(
    instance: WorkflowInstance,
    targetNodeId: string,
    def: WorkflowDefinition,
    userId?: string
  ): Promise<WorkflowInstance> {
    const targetNode = def.definition.nodes.find((n: any) => n.id === targetNodeId);
    if (!targetNode) throw new Error('Target node not found');

    // Update history
    if (instance.history) {
      const lastEntry = instance.history[instance.history.length - 1];
      if (lastEntry) lastEntry.exitedAt = new Date();
      lastEntry.completedBy = userId || lastEntry.completedBy;
      instance.history.push({
        nodeId: targetNodeId,
        nodeName: targetNode.name,
        enteredAt: new Date(),
        status: InstanceStatus.RUNNING,
      });
    }

    // Update current node
    instance.currentNode = {
      nodeId: targetNodeId,
      nodeName: targetNode.name,
      enteredAt: new Date(),
    };

    // Execute task if needed
    if (targetNode.type === 'task') {
      await this.executeTask(instance, targetNode);
    }

    return this.instanceRepo.save(instance);
  }

  private async executeTask(instance: WorkflowInstance, node: any): Promise<void> {
    this.logger.log(`Executing task ${node.name} for instance ${instance.id}`);
    
    // Task execution logic
    if (node.config?.service) {
      this.logger.log(`Would call service: ${node.config.service}`, node.config.params);
    }

    // Update variables based on task output
    if (node.config?.outputMapping) {
      for (const [target, source] of Object.entries(node.config.outputMapping)) {
        this.setNestedValue(instance.variables, target, this.getNestedValue(node.config.output, source as string) as any);
      }
    }
  }

  private evaluateCondition(condition: string | undefined, variables: Record<string, any>): boolean {
    if (!condition) return true;
    
    try {
      // Enhanced condition evaluation with support for operators
      const match = condition.match(/^(\w+(?:\.\w+)*)\s*(==|!=|>|<|>=|<=|in|contains|startsWith|endsWith)\s*(.+)$/);
      if (!match) return true;

      const [, varPath, operator, valueStr] = match;
      const varValue = this.getNestedValue(variables, varPath);
      let value: any = valueStr;

      // Parse value
      if (valueStr === 'true') value = true;
      else if (valueStr === 'false') value = false;
      else if (valueStr === 'null') value = null;
      else if (!isNaN(parseFloat(valueStr))) value = parseFloat(valueStr);
      else if (valueStr.startsWith('[') && valueStr.endsWith(']')) {
        value = valueStr.slice(1, -1).split(',').map((v) => v.trim());
      }

      switch (operator) {
        case '==': return varValue == value;
        case '!=': return varValue != value;
        case '>': return varValue > value;
        case '<': return varValue < value;
        case '>=': return varValue >= value;
        case '<=': return varValue <= value;
        case 'in': return Array.isArray(value) && value.includes(varValue);
        case 'contains': return typeof varValue === 'string' && varValue.includes(value);
        case 'startsWith': return typeof varValue === 'string' && varValue.startsWith(value);
        case 'endsWith': return typeof varValue === 'string' && varValue.endsWith(value);
        default: return true;
      }
    } catch (e) {
      this.logger.error(`Condition evaluation failed: ${condition}`, e);
      return true; // If evaluation fails, proceed
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((o, p) => o?.[p], obj);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((o, p) => o[p] = o[p] || {}, obj);
    target[lastKey] = value;
  }

  async getInstance(instanceId: string): Promise<WorkflowInstance | null> {
    return this.instanceRepo.findOne({ where: { id: instanceId } });
  }

  async listInstances(params: {
    tenantId: string;
    workflowKey?: string;
    businessKey?: string;
    status?: InstanceStatus;
    initiatorUserId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: WorkflowInstance[]; total: number }> {
    const qb = this.instanceRepo.createQueryBuilder('i')
      .innerJoin('i.workflowDefinition', 'd')
      .where('i.tenantId = :tenantId', { tenantId: params.tenantId });

    if (params.workflowKey) {
      qb.andWhere('d.key = :workflowKey', { workflowKey: params.workflowKey });
    }
    if (params.businessKey) {
      qb.andWhere('i.businessKey = :businessKey', { businessKey: params.businessKey });
    }
    if (params.status) {
      qb.andWhere('i.status = :status', { status: params.status });
    }
    if (params.initiatorUserId) {
      qb.andWhere('i.initiatorUserId = :initiatorUserId', { initiatorUserId: params.initiatorUserId });
    }

    const limit = Math.min(params.limit || 50, 200);
    const offset = params.offset || 0;

    qb.orderBy('i.createdAt', 'DESC').take(limit).skip(offset);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async cancelInstance(instanceId: string, reason?: string): Promise<void> {
    await this.instanceRepo.update(
      { id: instanceId },
      { 
        status: InstanceStatus.CANCELLED,
        completedAt: new Date(),
        error: reason ? { message: reason } : null,
      }
    );
  }

  async getDefinition(id: string): Promise<WorkflowDefinition | null> {
    return this.definitionRepo.findOne({ where: { id } });
  }

  async listDefinitions(params: {
    tenantId: string;
    key?: string;
    status?: WorkflowStatus;
    tags?: string[];
    limit?: number;
    offset?: number;
  }): Promise<{ items: WorkflowDefinition[]; total: number }> {
    const qb = this.definitionRepo.createQueryBuilder('d')
      .where('d.tenantId = :tenantId', { tenantId: params.tenantId });

    if (params.key) {
      qb.andWhere('d.key = :key', { key: params.key });
    }
    if (params.status) {
      qb.andWhere('d.status = :status', { status: params.status });
    }
    if (params.tags && params.tags.length > 0) {
      qb.andWhere(':tag = ANY(d.tags)', { tag: params.tags[0] });
    }

    const limit = Math.min(params.limit || 50, 200);
    const offset = params.offset || 0;

    qb.orderBy('d.version', 'DESC').addOrderBy('d.createdAt', 'DESC')
      .take(limit).skip(offset);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async updateDefinition(id: string, patch: {
    name?: string;
    description?: string;
    definition?: any;
    metadata?: Record<string, any>;
    tags?: string[];
  }): Promise<WorkflowDefinition | null> {
    const def = await this.definitionRepo.findOne({ where: { id } });
    if (!def) return null;

    if (patch.name) def.name = patch.name;
    if (patch.description !== undefined) def.description = patch.description;
    if (patch.definition) def.definition = patch.definition;
    if (patch.metadata !== undefined) def.metadata = patch.metadata;
    if (patch.tags !== undefined) def.tags = patch.tags;
    def.updatedAt = new Date();

    return this.definitionRepo.save(def);
  }

  async deleteDefinition(id: string): Promise<boolean> {
    const result = await this.definitionRepo.delete({ id });
    return (result.affected ?? 0) > 0;
  }

  async getInstanceMetrics(params: {
    tenantId: string;
    workflowKey?: string;
    fromDate?: Date;
    toDate?: Date;
  }): Promise<{
    totalInstances: number;
    completedInstances: number;
    runningInstances: number;
    cancelledInstances: number;
    avgCompletionTimeMs: number;
    mostUsedWorkflows: Array<{ workflowKey: string; workflowName: string; count: number }>;
  }> {
    const qb = this.instanceRepo.createQueryBuilder('i')
      .where('i.tenantId = :tenantId', { tenantId: params.tenantId });

    if (params.workflowKey) {
      qb.andWhere('i.workflowKey = :workflowKey', { workflowKey: params.workflowKey });
    }
    if (params.fromDate) {
      qb.andWhere('i.createdAt >= :fromDate', { fromDate: params.fromDate });
    }
    if (params.toDate) {
      qb.andWhere('i.createdAt <= :toDate', { toDate: params.toDate });
    }

    const instances = await qb.getMany();

    const totalInstances = instances.length;
    const completedInstances = instances.filter(i => i.status === InstanceStatus.COMPLETED).length;
    const runningInstances = instances.filter(i => i.status === InstanceStatus.RUNNING).length;
    const cancelledInstances = instances.filter(i => i.status === InstanceStatus.CANCELLED).length;

    const completedWithTime = instances.filter(i => 
      i.status === InstanceStatus.COMPLETED && i.completedAt && i.createdAt
    );
    const avgCompletionTimeMs = completedWithTime.length > 0
      ? completedWithTime.reduce((sum, i) => sum + (i.completedAt!.getTime() - i.createdAt.getTime()), 0) / completedWithTime.length
      : 0;

    const workflowCount = new Map<string, { workflowName: string; count: number }>();
    for (const instance of instances) {
      const existing = workflowCount.get(instance.workflowKey);
      if (existing) {
        existing.count++;
      } else {
        workflowCount.set(instance.workflowKey, { workflowName: instance.currentNode.nodeName, count: 1 });
      }
    }

    const mostUsedWorkflows = Array.from(workflowCount.entries())
      .map(([workflowKey, data]) => ({ workflowKey, workflowName: data.workflowName, count: data.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalInstances,
      completedInstances,
      runningInstances,
      cancelledInstances,
      avgCompletionTimeMs,
      mostUsedWorkflows,
    };
  }

  async createTemplate(params: {
    tenantId: string;
    name: string;
    category: string;
    description?: string;
    definitionTemplate: any;
    variables: string[];
    correlationId?: string;
  }): Promise<WorkflowTemplate> {
    return await this.dataSource.transaction(async (manager) => {
      const template = manager.create(WorkflowTemplate, {
        tenantId: params.tenantId,
        name: params.name,
        category: params.category,
        description: params.description || null,
        definitionTemplate: params.definitionTemplate,
        variables: params.variables,
      });
      const saved = await manager.save(template);
      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.workflow.template.created',
        eventType: 'WorkflowTemplateCreated',
        eventVersion: 1,
        correlationId: params.correlationId || uuidv4(),
        subject: { templateId: saved.id, category: params.category },
        payload: {
          templateId: saved.id,
          name: saved.name,
          category: saved.category,
          tenantId: saved.tenantId,
        },
      });
      return saved;
    });
  }

  async listTemplates(params: {
    tenantId: string;
    category?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: WorkflowTemplate[]; total: number }> {
    const qb = this.templateRepo.createQueryBuilder('t')
      .where('t.tenantId = :tenantId', { tenantId: params.tenantId });

    if (params.category) {
      qb.andWhere('t.category = :category', { category: params.category });
    }

    const limit = Math.min(params.limit || 50, 200);
    const offset = params.offset || 0;

    qb.orderBy('t.createdAt', 'DESC').take(limit).skip(offset);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async createDefinitionFromTemplate(params: {
    tenantId: string;
    templateId: string;
    name: string;
    key: string;
    variableValues: Record<string, any>;
  }): Promise<WorkflowDefinition> {
    const template = await this.templateRepo.findOne({ where: { id: params.templateId } });
    if (!template) throw new Error('Template not found');

    // Replace variables in definition template
    let definitionTemplate = JSON.stringify(template.definitionTemplate);
    for (const [key, value] of Object.entries(params.variableValues)) {
      definitionTemplate = definitionTemplate.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    }

    return this.createDefinition({
      tenantId: params.tenantId,
      name: params.name,
      key: params.key,
      description: `Created from template: ${template.name}`,
      definition: JSON.parse(definitionTemplate),
    });
  }
}
