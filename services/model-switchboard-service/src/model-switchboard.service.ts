import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import {Repository, Between, LessThanOrEqual, MoreThanOrEqual, DataSource} from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { OutboxPublisher } from '@insurance/shared';
import { v4 as uuidv4 } from 'uuid';
import { ModelDefinition, ModelStatus, ModelType } from './entities/ModelDefinition';
import { ModelInvocation, InvocationStatus } from './entities/ModelInvocation';
import { RoutePolicy, RoutingStrategy } from './entities/RoutePolicy';
import { UsageRecord } from './entities/UsageRecord';
import { ModelCard, ModelCardStatus } from './entities/ModelCard';
import { auditLogger } from './audit.logger';
import { CircuitBreaker } from './circuit-breaker';

@Injectable()
export class ModelSwitchboardService {
  private readonly logger = new Logger(ModelSwitchboardService.name);
  private readonly circuitBreaker = new CircuitBreaker();

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(ModelDefinition)
    private modelRepo: Repository<ModelDefinition>,
    @InjectRepository(ModelInvocation)
    private invocationRepo: Repository<ModelInvocation>,
    @InjectRepository(RoutePolicy)
    private routePolicyRepo: Repository<RoutePolicy>,
    @InjectRepository(UsageRecord)
    private usageRecordRepo: Repository<UsageRecord>,
    @InjectRepository(ModelCard)
    private modelCardRepo: Repository<ModelCard>,
    private httpService: HttpService,
  ) {}

  async registerModel(params: {
    tenantId: string;
    name: string;
    modelKey: string;
    modelType: ModelType;
    description?: string;
    config: {
      endpoint?: string;
      provider?: string;
      version?: string;
      parameters?: Record<string, any>;
      capabilities?: string[];
    };
    priority?: number;
    metadata?: Record<string, any>;
  }): Promise<ModelDefinition> {
    return await this.dataSource.transaction(async (manager) => {
      const model = manager.create(ModelDefinition, {
        tenantId: params.tenantId,
        name: params.name,
        modelKey: params.modelKey,
        modelType: params.modelType,
        description: params.description || null,
        config: params.config,
        priority: params.priority || 0,
        status: ModelStatus.DRAFT,
        metadata: params.metadata || null,
      });
      const saved = await manager.save(model);
      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.ai.model.registered',
        eventType: 'ModelRegistered',
        eventVersion: 1,
        correlationId: uuidv4(),
        subject: { modelId: saved.id, modelKey: saved.modelKey },
        payload: {
          modelId: saved.id,
          name: saved.name,
          modelKey: saved.modelKey,
          modelType: saved.modelType,
          status: saved.status,
          tenantId: saved.tenantId,
        },
      });
      return saved;
    });
  }

  async activateModel(id: string): Promise<ModelDefinition> {
    return await this.dataSource.transaction(async (manager) => {
      const model = await manager.findOne(ModelDefinition, { where: { id } });
      if (!model) throw new Error('Model not found');
      model.status = ModelStatus.ACTIVE;
      const saved = await manager.save(model);
      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.ai.model.activated',
        eventType: 'ModelActivated',
        eventVersion: 1,
        correlationId: uuidv4(),
        subject: { modelId: saved.id, modelKey: saved.modelKey },
        payload: {
          modelId: saved.id,
          modelKey: saved.modelKey,
          status: saved.status,
        },
      });
      return saved;
    });
  }

  async invokeModel(params: {
    tenantId: string;
    modelType: ModelType;
    capability?: string;
    businessKey?: string;
    input: Record<string, any>;
    metadata?: Record<string, any>;
    selectionCriteria?: {
      maxCost?: number;
      minAccuracy?: number;
      maxRisk?: string;
      prioritizeCost?: boolean;
      prioritizeAccuracy?: boolean;
      prioritizeRisk?: boolean;
    };
    skipGovernance?: boolean;
  }): Promise<ModelInvocation> {
    const startTime = Date.now();

    let selectedModel = await this.selectBestModel({
      tenantId: params.tenantId,
      modelType: params.modelType,
      criteria: params.selectionCriteria,
    });

    // Optional capability-based route policy override
    if (params.capability) {
      try {
        const routed = await this.route({ capability: params.capability, tenantId: params.tenantId });
        const routedModel = await this.modelRepo.findOne({
          where: { modelKey: routed.modelId, tenantId: params.tenantId, status: ModelStatus.ACTIVE },
        });
        if (routedModel) {
          auditLogger.info('Using route policy override', { capability: params.capability, modelKey: routedModel.modelKey, policyId: routed.policyId });
          selectedModel = routedModel;
        }
      } catch (e) {
        // No route policy; fall back to selected model
      }
    }

    // AI Governance: validate model card before invocation unless skipped
    if (selectedModel && !params.skipGovernance) {
      const governance = await this.governanceCheck({
        tenantId: params.tenantId,
        modelKey: selectedModel.modelKey,
      });
      if (!governance.allowed) {
        const invocation = this.invocationRepo.create({
          tenantId: params.tenantId,
          modelKey: selectedModel.modelKey,
          businessKey: params.businessKey || null,
          input: params.input,
          output: null,
          status: InvocationStatus.FAILED,
          error: { message: governance.reason, code: 'GOVERNANCE_REJECTED' },
          latencyMs: Date.now() - startTime,
          invokedAt: new Date(),
        });
        return this.invocationRepo.save(invocation);
      }
    }

    const model = selectedModel;

    if (!model) {
      // No active model found
      const invocation = this.invocationRepo.create({
        tenantId: params.tenantId,
        modelKey: 'none',
        businessKey: params.businessKey || null,
        input: params.input,
        output: null,
        status: InvocationStatus.FAILED,
        error: { message: 'No active model found for this type' },
        latencyMs: Date.now() - startTime,
        invokedAt: new Date(),
      });
      return this.invocationRepo.save(invocation);
    }

    // Call the model via configured endpoint
    let output: Record<string, any> | null = null;
    let error: { message: string; code?: string } | null = null;
    let status = InvocationStatus.SUCCESS;

    try {
      output = await this.callModelEndpoint(model, params.input);
    } catch (e: any) {
      error = { message: e.message, code: e.code };
      status = InvocationStatus.FAILED;
    }

    const latencyMs = Date.now() - startTime;

    const invocation = this.invocationRepo.create({
      tenantId: params.tenantId,
      modelKey: model.modelKey,
      modelVersion: model.config?.version || null,
      businessKey: params.businessKey || null,
      input: params.input,
      output,
      status,
      error,
      latencyMs,
      invokedAt: new Date(),
    });

    return this.invocationRepo.save(invocation);
  }

  private async selectBestModel(params: {
    tenantId: string;
    modelType: ModelType;
    criteria?: {
      maxCost?: number;
      minAccuracy?: number;
      maxRisk?: string;
      prioritizeCost?: boolean;
      prioritizeAccuracy?: boolean;
      prioritizeRisk?: boolean;
    };
  }): Promise<ModelDefinition | null> {
    const qb = this.modelRepo.createQueryBuilder('m')
      .where('m.tenantId = :tenantId', { tenantId: params.tenantId })
      .andWhere('m.modelType = :modelType', { modelType: params.modelType })
      .andWhere('m.status = :status', { status: ModelStatus.ACTIVE });

    const models = await qb.getMany();

    if (models.length === 0) return null;

    // Apply filters based on criteria
    let filteredModels = models;

    if (params.criteria?.maxCost) {
      filteredModels = filteredModels.filter(m => 
        (m.metadata?.costPerCall || 0) <= params.criteria!.maxCost!
      );
    }

    if (params.criteria?.minAccuracy) {
      filteredModels = filteredModels.filter(m => 
        (m.metadata?.accuracy || 0) >= params.criteria!.minAccuracy!
      );
    }

    if (params.criteria?.maxRisk) {
      const riskOrder = ['low', 'medium', 'high', 'critical'];
      const maxRiskIndex = riskOrder.indexOf(params.criteria.maxRisk);
      filteredModels = filteredModels.filter(m => {
        const modelRisk = m.metadata?.riskLevel || 'medium';
        const modelRiskIndex = riskOrder.indexOf(modelRisk);
        return modelRiskIndex <= maxRiskIndex;
      });
    }

    if (filteredModels.length === 0) return null;

    // Sort based on prioritization criteria
    if (params.criteria?.prioritizeCost) {
      filteredModels.sort((a, b) => 
        (a.metadata?.costPerCall || 0) - (b.metadata?.costPerCall || 0)
      );
    } else if (params.criteria?.prioritizeAccuracy) {
      filteredModels.sort((a, b) => 
        (b.metadata?.accuracy || 0) - (a.metadata?.accuracy || 0)
      );
    } else if (params.criteria?.prioritizeRisk) {
      const riskOrder = ['low', 'medium', 'high', 'critical'];
      filteredModels.sort((a, b) => {
        const riskA = riskOrder.indexOf(a.metadata?.riskLevel || 'medium');
        const riskB = riskOrder.indexOf(b.metadata?.riskLevel || 'medium');
        return riskA - riskB;
      });
    } else {
      // Default: sort by priority
      filteredModels.sort((a, b) => b.priority - a.priority);
    }

    return filteredModels[0];
  }

  private async callModelEndpoint(model: ModelDefinition, input: Record<string, any>): Promise<Record<string, any>> {
    const endpoint = model.config.endpoint;
    if (!endpoint) {
      throw new Error(`Model ${model.modelKey} has no endpoint configured`);
    }

    const breakerKey = model.modelKey;

    if (!this.circuitBreaker.canCall(breakerKey)) {
      const state = this.circuitBreaker.getState(breakerKey);
      auditLogger.warn('Circuit breaker OPEN — rejecting call', { modelKey: model.modelKey, state });
      throw new Error(`Circuit breaker open for model ${model.modelKey}. Endpoint temporarily unavailable.`);
    }

    this.logger.log(`Calling model ${model.modelKey} at ${endpoint}`);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (model.config.parameters?.apiKey) {
        headers['Authorization'] = `Bearer ${model.config.parameters.apiKey}`;
      }

      const response: any = await firstValueFrom(
        this.httpService.post(endpoint, input, {
          headers,
          timeout: model.config.parameters?.timeout || 30000,
        }),
      );

      this.circuitBreaker.recordSuccess(breakerKey);
      return response.data || {};
    } catch (error: any) {
      this.circuitBreaker.recordFailure(breakerKey);
      this.logger.error(`Failed to call model ${model.modelKey}`, error);
      throw new Error(`Model invocation failed: ${error.message}`);
    }
  }

  async listModels(params: {
    tenantId: string;
    modelType?: ModelType;
    status?: ModelStatus;
    limit?: number;
    offset?: number;
  }): Promise<{ items: ModelDefinition[]; total: number }> {
    const qb = this.modelRepo.createQueryBuilder('m')
      .where('m.tenantId = :tenantId', { tenantId: params.tenantId });

    if (params.modelType) {
      qb.andWhere('m.modelType = :modelType', { modelType: params.modelType });
    }
    if (params.status) {
      qb.andWhere('m.status = :status', { status: params.status });
    }

    const limit = Math.min(params.limit || 50, 200);
    const offset = params.offset || 0;

    qb.orderBy('m.priority', 'DESC').addOrderBy('m.createdAt', 'DESC')
      .take(limit).skip(offset);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async getModel(id: string): Promise<ModelDefinition | null> {
    return this.modelRepo.findOne({ where: { id } });
  }

  async listInvocations(params: {
    tenantId: string;
    modelKey?: string;
    businessKey?: string;
    status?: InvocationStatus;
    limit?: number;
    offset?: number;
  }): Promise<{ items: ModelInvocation[]; total: number }> {
    const qb = this.invocationRepo.createQueryBuilder('i')
      .where('i.tenantId = :tenantId', { tenantId: params.tenantId });

    if (params.modelKey) {
      qb.andWhere('i.modelKey = :modelKey', { modelKey: params.modelKey });
    }
    if (params.businessKey) {
      qb.andWhere('i.businessKey = :businessKey', { businessKey: params.businessKey });
    }
    if (params.status) {
      qb.andWhere('i.status = :status', { status: params.status });
    }

    const limit = Math.min(params.limit || 50, 200);
    const offset = params.offset || 0;

    qb.orderBy('i.invokedAt', 'DESC').take(limit).skip(offset);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  // ── RoutePolicy CRUD ──────────────────────────────────────────────

  async createRoutePolicy(params: {
    capability: string;
    tenantId?: string;
    primaryModel: string;
    fallbackChain?: string[];
    qualityThreshold?: number;
    costBudgetPerDay?: number;
    routingStrategy?: RoutingStrategy;
    metadata?: Record<string, any>;
    abTestEnabled?: boolean;
    abTestModelId?: string;
    abTestSplitPercent?: number;
    createdBy?: string;
  }): Promise<RoutePolicy> {
    return await this.dataSource.transaction(async (manager) => {
      const policy = manager.create(RoutePolicy, {
        capability: params.capability,
        tenantId: params.tenantId || '*',
        primaryModel: params.primaryModel,
        fallbackChain: params.fallbackChain || [],
        qualityThreshold: params.qualityThreshold || 0,
        costBudgetPerDay: params.costBudgetPerDay || null,
        routingStrategy: params.routingStrategy || RoutingStrategy.BALANCED,
        metadata: params.metadata || null,
        abTestEnabled: params.abTestEnabled || false,
        abTestModelId: params.abTestModelId || null,
        abTestSplitPercent: params.abTestSplitPercent ?? 50,
        isActive: true,
        createdBy: params.createdBy || null,
      });
      const saved = await manager.save(policy);
      auditLogger.info('RoutePolicy created', { policyId: saved.id, capability: params.capability });
      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.ai.route_policy.created',
        eventType: 'RoutePolicyCreated',
        eventVersion: 1,
        correlationId: uuidv4(),
        subject: { policyId: saved.id, capability: params.capability },
        payload: {
          policyId: saved.id,
          capability: saved.capability,
          primaryModel: saved.primaryModel,
          routingStrategy: saved.routingStrategy,
        },
      });
      return saved;
    });
  }

  async updateRoutePolicy(id: string, params: Partial<{
    capability: string;
    tenantId: string;
    primaryModel: string;
    fallbackChain: string[];
    qualityThreshold: number;
    costBudgetPerDay: number;
    routingStrategy: RoutingStrategy;
    metadata: Record<string, any>;
    isActive: boolean;
    abTestEnabled: boolean;
    abTestModelId: string;
    abTestSplitPercent: number;
    updatedBy: string;
  }>): Promise<RoutePolicy> {
    return await this.dataSource.transaction(async (manager) => {
      const policy = await manager.findOne(RoutePolicy, { where: { id } });
      if (!policy) throw new Error('RoutePolicy not found');
      Object.assign(policy, params, { updatedAt: new Date() });
      const saved = await manager.save(policy);
      auditLogger.info('RoutePolicy updated', { policyId: id });
      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.ai.route_policy.updated',
        eventType: 'RoutePolicyUpdated',
        eventVersion: 1,
        correlationId: uuidv4(),
        subject: { policyId: saved.id },
        payload: {
          policyId: saved.id,
          capability: saved.capability,
          primaryModel: saved.primaryModel,
          isActive: saved.isActive,
        },
      });
      return saved;
    });
  }

  async getRoutePolicy(id: string): Promise<RoutePolicy | null> {
    return this.routePolicyRepo.findOne({ where: { id } });
  }

  async listRoutePolicies(params: {
    capability?: string;
    tenantId?: string;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ items: RoutePolicy[]; total: number }> {
    const qb = this.routePolicyRepo.createQueryBuilder('rp');
    if (params.capability) qb.andWhere('rp.capability = :capability', { capability: params.capability });
    if (params.tenantId) qb.andWhere('rp.tenantId = :tenantId OR rp.tenantId = :wildcard', { tenantId: params.tenantId, wildcard: '*' });
    if (params.isActive !== undefined) qb.andWhere('rp.isActive = :isActive', { isActive: params.isActive });
    const limit = Math.min(params.limit || 50, 200);
    const offset = params.offset || 0;
    qb.orderBy('rp.createdAt', 'DESC').take(limit).skip(offset);
    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async deleteRoutePolicy(id: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const policy = await manager.findOne(RoutePolicy, { where: { id } });
      await manager.delete(RoutePolicy, { id });
      if (policy) {
        const outbox = new OutboxPublisher(manager);
        await outbox.publish({
          topic: 'insurance.ai.route_policy.deleted',
          eventType: 'RoutePolicyDeleted',
          eventVersion: 1,
          correlationId: uuidv4(),
          subject: { policyId: id },
          payload: {
            policyId: id,
            capability: policy.capability,
          },
        });
      }
    });
    auditLogger.info('RoutePolicy deleted', { policyId: id });
  }

  // ── Routing Engine ─────────────────────────────────────────────────

  async route(params: {
    capability: string;
    tenantId?: string;
  }): Promise<{ modelId: string; policyId: string; fallbackChain: string[] }> {
    // Find best matching policy: tenant-specific first, then wildcard
    const policies = await this.routePolicyRepo.find({
      where: [
        { capability: params.capability, tenantId: params.tenantId || '*', isActive: true },
        { capability: params.capability, tenantId: '*', isActive: true },
      ],
      order: { tenantId: 'DESC' }, // tenant-specific before wildcard
    });

    if (policies.length === 0) {
      throw new Error(`No active route policy for capability=${params.capability}`);
    }

    const policy = policies[0];

    // A/B Testing: route splitPercent of traffic to the B variant
    if (policy.abTestEnabled && policy.abTestModelId) {
      const roll = Math.random() * 100;
      if (roll < policy.abTestSplitPercent) {
        // Route to B variant
        const abTestModel = await this.modelRepo.findOne({ where: { modelKey: policy.abTestModelId, status: ModelStatus.ACTIVE } });
        if (abTestModel) {
          auditLogger.info('A/B test: routing to B variant', {
            capability: params.capability,
            primaryModel: policy.primaryModel,
            abTestModel: policy.abTestModelId,
            splitPercent: policy.abTestSplitPercent,
            policyId: policy.id,
          });
          return { modelId: policy.abTestModelId, policyId: policy.id, fallbackChain: policy.fallbackChain };
        }
        // B variant unavailable — fall through to primary
        auditLogger.warn('A/B test: B variant unavailable, falling back to primary', { abTestModelId: policy.abTestModelId });
      }
    }

    // Check cost budget
    if (policy.costBudgetPerDay) {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
      const spent = await this.usageRecordRepo
        .createQueryBuilder('ur')
        .select('SUM(ur.costMicroCents)', 'total')
        .where('ur.modelId = :modelId OR ur.modelId IN (:...fallback)', { modelId: policy.primaryModel, fallback: policy.fallbackChain })
        .andWhere('ur.tenantId = :tenantId', { tenantId: params.tenantId || '*' })
        .andWhere('ur.periodStart >= :start', { start: todayStart })
        .andWhere('ur.periodEnd <= :end', { end: todayEnd })
        .getRawOne();
      const totalSpent = parseInt(spent?.total || '0', 10);
      if (totalSpent >= policy.costBudgetPerDay) {
        // Budget exhausted – try cheapest fallback
        if (policy.fallbackChain.length > 0) {
          const fallbackId = policy.fallbackChain[policy.fallbackChain.length - 1];
          auditLogger.warn('Cost budget exhausted, using cheapest fallback', { capability: params.capability, fallbackId });
          return { modelId: fallbackId, policyId: policy.id, fallbackChain: policy.fallbackChain };
        }
        throw new Error('Cost budget exhausted and no fallback available');
      }
    }

    // Verify primary model is active
    const primaryModel = await this.modelRepo.findOne({ where: { modelKey: policy.primaryModel, status: ModelStatus.ACTIVE } });
    if (primaryModel) {
      return { modelId: policy.primaryModel, policyId: policy.id, fallbackChain: policy.fallbackChain };
    }

    // Fallback chain
    for (const fallbackModelId of policy.fallbackChain) {
      const fb = await this.modelRepo.findOne({ where: { modelKey: fallbackModelId, status: ModelStatus.ACTIVE } });
      if (fb) {
        auditLogger.warn('Primary model unavailable, using fallback', { capability: params.capability, fallbackModelId });
        return { modelId: fallbackModelId, policyId: policy.id, fallbackChain: policy.fallbackChain };
      }
    }

    throw new Error(`No active model available for capability=${params.capability} (primary and all fallbacks unavailable)`);
  }

  // ── Usage Recording & Reporting ────────────────────────────────────

  async recordUsage(params: {
    modelId: string;
    modelVersion?: string;
    tenantId?: string;
    capability: string;
    inputTokens: number;
    outputTokens: number;
    costMicroCents: number;
    latencyMs: number;
    qualityScore?: number;
    requestId?: string;
    metadata?: Record<string, any>;
  }): Promise<UsageRecord> {
    const now = new Date();
    const periodStart = new Date(now); periodStart.setHours(0, 0, 0, 0);
    const periodEnd = new Date(now); periodEnd.setHours(23, 59, 59, 999);

    return await this.dataSource.transaction(async (manager) => {
      const record = manager.create(UsageRecord, {
        modelId: params.modelId,
        modelVersion: params.modelVersion || null,
        tenantId: params.tenantId || '*',
        capability: params.capability,
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        totalTokens: params.inputTokens + params.outputTokens,
        costMicroCents: params.costMicroCents,
        latencyMs: params.latencyMs,
        qualityScore: params.qualityScore || null,
        requestId: params.requestId || null,
        metadata: params.metadata || null,
        periodStart,
        periodEnd,
      });
      const saved = await manager.save(record);
      auditLogger.info('Usage recorded', { modelId: params.modelId, costMicroCents: params.costMicroCents });
      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.ai.model.invoked',
        eventType: 'ModelInvoked',
        eventVersion: 1,
        correlationId: params.requestId || uuidv4(),
        subject: { modelId: params.modelId, capability: params.capability },
        payload: {
          modelId: params.modelId,
          capability: params.capability,
          inputTokens: params.inputTokens,
          outputTokens: params.outputTokens,
          costMicroCents: params.costMicroCents,
          latencyMs: params.latencyMs,
        },
      });
      return saved;
    });
  }

  async getUsageReport(params: {
    tenantId?: string;
    modelId?: string;
    capability?: string;
    periodStart?: Date;
    periodEnd?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ items: UsageRecord[]; total: number }> {
    const qb = this.usageRecordRepo.createQueryBuilder('ur');
    if (params.tenantId) qb.andWhere('ur.tenantId = :tenantId', { tenantId: params.tenantId });
    if (params.modelId) qb.andWhere('ur.modelId = :modelId', { modelId: params.modelId });
    if (params.capability) qb.andWhere('ur.capability = :capability', { capability: params.capability });
    if (params.periodStart) qb.andWhere('ur.periodStart >= :start', { start: params.periodStart });
    if (params.periodEnd) qb.andWhere('ur.periodEnd <= :end', { end: params.periodEnd });
    const limit = Math.min(params.limit || 50, 200);
    const offset = params.offset || 0;
    qb.orderBy('ur.createdAt', 'DESC').take(limit).skip(offset);
    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async getUsageSummary(params: {
    tenantId?: string;
    periodStart?: Date;
    periodEnd?: Date;
  }): Promise<Array<{ modelId: string; totalTokens: number; totalCostMicroCents: number; avgLatencyMs: number; avgQualityScore: number; invocationCount: number }>> {
    const qb = this.usageRecordRepo.createQueryBuilder('ur')
      .select('ur.modelId', 'modelId')
      .addSelect('SUM(ur.totalTokens)', 'totalTokens')
      .addSelect('SUM(ur.costMicroCents)', 'totalCostMicroCents')
      .addSelect('AVG(ur.latencyMs)', 'avgLatencyMs')
      .addSelect('AVG(ur.qualityScore)', 'avgQualityScore')
      .addSelect('COUNT(ur.id)', 'invocationCount')
      .groupBy('ur.modelId');
    if (params.tenantId) qb.andWhere('ur.tenantId = :tenantId', { tenantId: params.tenantId });
    if (params.periodStart) qb.andWhere('ur.periodStart >= :start', { start: params.periodStart });
    if (params.periodEnd) qb.andWhere('ur.periodEnd <= :end', { end: params.periodEnd });
    return qb.getRawMany();
  }

  // ── Model Health ────────────────────────────────────────────────────

  async getModelsHealth(): Promise<Array<{ modelId: string; status: string; avgLatencyMs: number; errorRate: number; recentInvocations: number }>> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const models = await this.modelRepo.find({ where: { status: ModelStatus.ACTIVE } });
    const results: Array<{ modelId: string; status: string; avgLatencyMs: number; errorRate: number; recentInvocations: number }> = [];
    for (const model of models) {
      const recent = await this.invocationRepo.find({
        where: { modelKey: model.modelKey, invokedAt: MoreThanOrEqual(oneHourAgo) },
      });
      const total = recent.length;
      const failed = recent.filter(r => r.status === InvocationStatus.FAILED).length;
      const avgLatency = total > 0 ? recent.reduce((s, r) => s + (r.latencyMs || 0), 0) / total : 0;
      results.push({
        modelId: model.modelKey,
        status: model.status,
        avgLatencyMs: Math.round(avgLatency),
        errorRate: total > 0 ? failed / total : 0,
        recentInvocations: total,
      });
    }
    return results;
  }

  // ── Model Card / AI Governance ─────────────────────────────────────

  async createModelCard(params: {
    modelId: string;
    modelName: string;
    purpose?: string;
    intendedUse?: string;
    limitations?: string;
    trainingDataDescription?: string;
    performanceMetrics?: Record<string, number>;
    biasRiskLevel?: 'low' | 'medium' | 'high';
    fairnessAudit?: Record<string, any>;
    explainability?: Record<string, any>;
    version?: string;
  }): Promise<ModelCard> {
    const card = this.modelCardRepo.create({
      modelId: params.modelId,
      modelName: params.modelName,
      purpose: params.purpose || null,
      intendedUse: params.intendedUse || null,
      limitations: params.limitations || null,
      trainingDataDescription: params.trainingDataDescription || null,
      performanceMetrics: params.performanceMetrics || null,
      biasRiskLevel: params.biasRiskLevel || 'low',
      fairnessAudit: params.fairnessAudit || null,
      explainability: params.explainability || null,
      version: params.version || '1.0.0',
      status: 'draft',
    });
    return this.modelCardRepo.save(card);
  }

  async getModelCard(modelId: string): Promise<ModelCard | null> {
    return this.modelCardRepo.findOne({ where: { modelId }, order: { createdAt: 'DESC' as any } });
  }

  async listModelCards(params: {
    status?: ModelCardStatus;
    limit: number;
    offset: number;
  }): Promise<{ rows: ModelCard[]; total: number }> {
    const qb = this.modelCardRepo.createQueryBuilder('c');
    if (params.status) qb.andWhere('c.status = :status', { status: params.status });
    qb.orderBy('c.createdAt', 'DESC');
    qb.take(params.limit).skip(params.offset);
    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async updateModelCard(id: string, updates: Partial<ModelCard>): Promise<ModelCard | null> {
    const card = await this.modelCardRepo.findOne({ where: { id } });
    if (!card) return null;
    Object.assign(card, updates);
    card.updatedAt = new Date();
    return this.modelCardRepo.save(card);
  }

  async approveModelCard(id: string, approverUserId: string): Promise<ModelCard | null> {
    const card = await this.modelCardRepo.findOne({ where: { id } });
    if (!card) return null;
    card.status = 'approved';
    card.approvedBy = approverUserId;
    card.approvedAt = new Date();
    card.updatedAt = new Date();
    return this.modelCardRepo.save(card);
  }

  async deprecateModelCard(id: string): Promise<ModelCard | null> {
    const card = await this.modelCardRepo.findOne({ where: { id } });
    if (!card) return null;
    card.status = 'deprecated';
    card.updatedAt = new Date();
    return this.modelCardRepo.save(card);
  }

  // ── AI Governance ───────────────────────────────────────────────────

  async governanceCheck(params: { tenantId: string; modelKey: string }): Promise<{ allowed: boolean; reason: string; riskLevel?: string; cardStatus?: string }> {
    const model = await this.modelRepo.findOne({ where: { modelKey: params.modelKey, tenantId: params.tenantId } });
    if (!model) {
      return { allowed: false, reason: 'Model not registered for tenant' };
    }

    const card = await this.modelCardRepo.findOne({
      where: { modelId: model.id },
      order: { createdAt: 'DESC' as any },
    });

    if (!card) {
      auditLogger.warn('No model card found; allowing with governance warning', { modelKey: params.modelKey });
      return { allowed: true, reason: 'No model card found; governance review recommended', cardStatus: 'missing', riskLevel: 'unknown' };
    }

    if (card.status === 'deprecated' || card.status === 'archived') {
      return { allowed: false, reason: `Model card status is ${card.status}`, cardStatus: card.status, riskLevel: card.biasRiskLevel };
    }

    if (card.status !== 'approved') {
      return { allowed: false, reason: `Model card not approved (status=${card.status})`, cardStatus: card.status, riskLevel: card.biasRiskLevel };
    }

    return { allowed: true, reason: 'Governance checks passed', cardStatus: card.status, riskLevel: card.biasRiskLevel };
  }

  async getGovernanceReport(params: { tenantId?: string; limit?: number; offset?: number }): Promise<{ modelCards: ModelCard[]; total: number; invocationsSummary: { total: number; failed: number; rejected: number } }> {
    const limit = Math.min(params.limit || 50, 200);
    const offset = params.offset || 0;

    const qb = this.modelCardRepo.createQueryBuilder('mc');
    if (params.tenantId) {
      qb.andWhere('mc.modelId IN (SELECT id FROM model_definitions WHERE tenant_id = :tenantId)', { tenantId: params.tenantId });
    }
    qb.orderBy('mc.createdAt', 'DESC').take(limit).skip(offset);
    const [modelCards, total] = await qb.getManyAndCount();

    const invocationsSummary = await this.invocationRepo
      .createQueryBuilder('i')
      .select('COUNT(i.id)', 'total')
      .addSelect("SUM(CASE WHEN i.status = 'failed' THEN 1 ELSE 0 END)", 'failed')
      .addSelect("SUM(CASE WHEN i.error->>'code' = 'GOVERNANCE_REJECTED' THEN 1 ELSE 0 END)", 'rejected')
      .where(params.tenantId ? 'i.tenantId = :tenantId' : '1=1', { tenantId: params.tenantId })
      .getRawOne();

    return {
      modelCards,
      total,
      invocationsSummary: {
        total: parseInt(invocationsSummary?.total || '0', 10),
        failed: parseInt(invocationsSummary?.failed || '0', 10),
        rejected: parseInt(invocationsSummary?.rejected || '0', 10),
      },
    };
  }

  // ── Circuit Breaker ──────────────────────────────────────────────────

  getCircuitBreakerStats(modelKey: string): { state: string; failureCount: number; successCount: number } | null {
    return this.circuitBreaker.getStats(modelKey);
  }

  // ── A/B Test Reporting ──────────────────────────────────────────────

  async getAbTestReport(policyId: string): Promise<{
    policyId: string;
    abTestEnabled: boolean;
    primaryModel: string;
    abTestModelId: string | null;
    splitPercent: number;
    primaryStats: { invocations: number; successes: number; failures: number; avgLatencyMs: number };
    abTestStats: { invocations: number; successes: number; failures: number; avgLatencyMs: number };
  }> {
    const policy = await this.routePolicyRepo.findOne({ where: { id: policyId } });
    if (!policy) {
      throw new Error(`Route policy ${policyId} not found`);
    }

    const [primaryInvocations, abTestInvocations] = await Promise.all([
      this.invocationRepo.find({
        where: { modelKey: policy.primaryModel },
        order: { invokedAt: 'DESC' },
        take: 1000,
      }),
      policy.abTestModelId
        ? this.invocationRepo.find({
            where: { modelKey: policy.abTestModelId },
            order: { invokedAt: 'DESC' },
            take: 1000,
          })
        : Promise.resolve([]),
    ]);

    const computeStats = (invocations: ModelInvocation[]) => ({
      invocations: invocations.length,
      successes: invocations.filter(i => i.status === InvocationStatus.SUCCESS).length,
      failures: invocations.filter(i => i.status === InvocationStatus.FAILED).length,
      avgLatencyMs: invocations.length > 0
        ? Math.round(invocations.reduce((sum, i) => sum + i.latencyMs, 0) / invocations.length)
        : 0,
    });

    return {
      policyId: policy.id,
      abTestEnabled: policy.abTestEnabled,
      primaryModel: policy.primaryModel,
      abTestModelId: policy.abTestModelId,
      splitPercent: policy.abTestSplitPercent,
      primaryStats: computeStats(primaryInvocations),
      abTestStats: computeStats(abTestInvocations),
    };
  }
}
