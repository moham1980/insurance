import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { AbacPolicy } from './entities/AbacPolicy';
import { PolicyRule, evaluatePolicies, ABAC_POLICIES, type PolicyEvaluationContext } from './abac.policy';

@Injectable()
export class PolicyAdminService {
  private readonly logger = new Logger(PolicyAdminService.name);
  private cachedPolicies: PolicyRule[] | null = null;
  private cacheTimestamp: number = 0;
  private readonly cacheTtlMs = 60000; // 1 minute cache

  constructor(
    @InjectRepository(AbacPolicy)
    private readonly policyRepo: Repository<AbacPolicy>,
  ) {}

  async createPolicy(dto: {
    id: string;
    name: string;
    description?: string | null;
    effect?: 'allow' | 'deny';
    conditions: { attribute: string; operator: string; value: any }[];
    priority?: number;
    enabled?: boolean;
    status?: 'active' | 'draft' | 'deprecated';
    createdBy: string;
    updatedBy?: string | null;
  }): Promise<AbacPolicy> {
    if (!dto.id || !dto.name || !dto.conditions || dto.conditions.length === 0) {
      throw new BadRequestException('Policy id, name, and conditions are required');
    }
    const exists = await this.policyRepo.findOne({ where: { id: dto.id } });
    if (exists) {
      throw new BadRequestException(`Policy ${dto.id} already exists`);
    }
    const policy = this.policyRepo.create({
      ...dto,
      status: dto.status || 'active',
      enabled: dto.enabled !== false,
      priority: dto.priority ?? 0,
    });
    const saved = await this.policyRepo.save(policy);
    this.invalidateCache();
    this.logger.log('ABAC policy created', { policyId: saved.id });
    return saved;
  }

  async updatePolicy(id: string, dto: Partial<AbacPolicy> & { updatedBy: string }): Promise<AbacPolicy> {
    const policy = await this.policyRepo.findOne({ where: { id } });
    if (!policy) {
      throw new NotFoundException(`Policy ${id} not found`);
    }
    Object.assign(policy, dto);
    const saved = await this.policyRepo.save(policy);
    this.invalidateCache();
    this.logger.log('ABAC policy updated', { policyId: id });
    return saved;
  }

  async deletePolicy(id: string): Promise<void> {
    const result = await this.policyRepo.delete({ id });
    if (result.affected === 0) {
      throw new NotFoundException(`Policy ${id} not found`);
    }
    this.invalidateCache();
    this.logger.log('ABAC policy deleted', { policyId: id });
  }

  async getPolicy(id: string): Promise<AbacPolicy> {
    const policy = await this.policyRepo.findOne({ where: { id } });
    if (!policy) throw new NotFoundException(`Policy ${id} not found`);
    return policy;
  }

  async listPolicies(options?: { enabled?: boolean; status?: string; page?: number; limit?: number }): Promise<{ items: AbacPolicy[]; total: number }> {
    const query = this.policyRepo.createQueryBuilder('p');
    if (options?.enabled !== undefined) {
      query.andWhere('p.enabled = :enabled', { enabled: options.enabled });
    }
    if (options?.status) {
      query.andWhere('p.status = :status', { status: options.status });
    }
    query.orderBy('p.priority', 'DESC').addOrderBy('p.createdAt', 'ASC');
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 50;
    query.skip((page - 1) * limit).take(limit);
    const [items, total] = await query.getManyAndCount();
    return { items, total };
  }

  /**
   * Load active policies from DB, falling back to hardcoded ABAC_POLICIES
   */
  async getActivePolicies(): Promise<PolicyRule[]> {
    const now = Date.now();
    if (this.cachedPolicies && now - this.cacheTimestamp < this.cacheTtlMs) {
      return this.cachedPolicies;
    }

    const dbPolicies = await this.policyRepo.find({
      where: { enabled: true, status: 'active' },
      order: { priority: 'DESC' },
    });

    const rules: PolicyRule[] = dbPolicies.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description || '',
      effect: p.effect,
      conditions: p.conditions as any,
      priority: p.priority,
    }));

    // Merge DB policies with hardcoded defaults (DB takes precedence by ID)
    const hardcoded = ABAC_POLICIES.filter((hp) => !dbPolicies.some((dp) => dp.id === hp.id));
    const merged = [...rules, ...hardcoded].sort((a, b) => b.priority - a.priority);

    this.cachedPolicies = merged;
    this.cacheTimestamp = now;
    return merged;
  }

  invalidateCache(): void {
    this.cachedPolicies = null;
    this.cacheTimestamp = 0;
  }

  async evaluateWithDbPolicies(context: PolicyEvaluationContext): Promise<{ allowed: boolean; matchedPolicy?: PolicyRule }> {
    const policies = await this.getActivePolicies();
    return evaluatePolicies(context, policies);
  }
}
