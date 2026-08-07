import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import crypto from 'crypto';
import { FeatureFlag, Variant, VariantType } from './entities/FeatureFlag';
import { AiToggle } from './entities/AiToggle';
import { AuditLog } from './entities/AuditLog'; // P1 #10
import { EntityVersion } from './entities/EntityVersion'; // P1 #10
import { auditLogger } from './audit.logger';
import { OutboxPublisher } from '@insurance/shared';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FeatureFlagsService implements OnModuleInit {
  private flagCache = new Map<string, { data: FeatureFlag; expiresAt: number }>();
  private listCache: { data: FeatureFlag[]; expiresAt: number } | null = null;
  private readonly cacheTtlMs = parseInt(process.env.CACHE_TTL_MS || '30000', 10);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(FeatureFlag) private readonly featureFlagsRepo: Repository<FeatureFlag>,
    @InjectRepository(AiToggle) private readonly aiTogglesRepo: Repository<AiToggle>,
    @InjectRepository(AuditLog) private readonly auditLogRepo: Repository<AuditLog>, // P1 #10
    @InjectRepository(EntityVersion) private readonly entityVersionRepo: Repository<EntityVersion>, // P1 #10
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureDefaults();
  }

  private invalidateCache(name?: string): void {
    if (name) {
      this.flagCache.delete(name);
    } else {
      this.flagCache.clear();
    }
    this.listCache = null;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // P1 #10: Audit trail & versioning helpers
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Write an immutable audit log entry within the current transaction.
   */
  private async writeAuditLog(manager: any, params: {
    resourceType: string;
    resourceId: string;
    action: string;
    actor: string;
    before?: Record<string, any> | null;
    after?: Record<string, any> | null;
    correlationId?: string | null;
  }): Promise<void> {
    const entry = manager.create(AuditLog, {
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      action: params.action,
      actor: params.actor,
      before: params.before ?? null,
      after: params.after ?? null,
      correlationId: params.correlationId ?? null,
    });
    await manager.save(entry);
  }

  /**
   * Write an immutable entity version snapshot within the current transaction.
   * The version number is auto-incremented per resource.
   */
  private async writeEntityVersion(manager: any, params: {
    resourceType: string;
    resourceId: string;
    snapshot: Record<string, any>;
    actor: string;
  }): Promise<void> {
    // Find the current max version for this resource
    const versions = await manager.find(EntityVersion, {
      where: { resourceType: params.resourceType, resourceId: params.resourceId },
      order: { version: 'DESC' },
      take: 1,
    });
    const nextVersion = (versions.length > 0 ? versions[0].version : 0) + 1;
    const entry = manager.create(EntityVersion, {
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      version: nextVersion,
      snapshot: params.snapshot,
      actor: params.actor,
    });
    await manager.save(entry);
  }

  async listFeatureFlags(): Promise<FeatureFlag[]> {
    const now = Date.now();
    if (this.listCache && this.listCache.expiresAt > now) {
      return this.listCache.data;
    }
    const data = await this.featureFlagsRepo.find({ order: { name: 'ASC' } });
    this.listCache = { data, expiresAt: now + this.cacheTtlMs };
    return data;
  }

  async getFeatureFlag(name: string): Promise<FeatureFlag | null> {
    const now = Date.now();
    const cached = this.flagCache.get(name);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }
    const data = await this.featureFlagsRepo.findOne({ where: { name } });
    if (data) {
      this.flagCache.set(name, { data, expiresAt: now + this.cacheTtlMs });
    }
    return data;
  }

  async upsertFeatureFlag(params: {
    name: string;
    isEnabled: boolean;
    description?: string | null;
    rolloutPercentage?: number;
    targetAudience?: Record<string, any> | null;
    variantType?: VariantType;
    variants?: Variant[] | null;
  }): Promise<FeatureFlag> {
    if (params.rolloutPercentage !== undefined && (params.rolloutPercentage < 0 || params.rolloutPercentage > 100)) {
      const err: any = new Error('rolloutPercentage must be between 0 and 100');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
    if (params.variantType && !['boolean', 'percentage', 'variant'].includes(params.variantType)) {
      const err: any = new Error('variantType must be one of: boolean, percentage, variant');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const now = new Date();
    const existing = await this.featureFlagsRepo.findOne({ where: { name: params.name } });

    if (existing) {
      return await this.dataSource.transaction(async (manager) => {
        await manager.update(
          FeatureFlag,
          { name: params.name },
          {
            isEnabled: params.isEnabled,
            description: params.description ?? existing.description,
            rolloutPercentage: params.rolloutPercentage ?? existing.rolloutPercentage,
            targetAudience: params.targetAudience ?? existing.targetAudience,
            variantType: params.variantType ?? existing.variantType ?? 'boolean',
            variants: params.variants ?? existing.variants ?? null,
            updatedAt: now,
          }
        );
        this.invalidateCache(params.name);
        const updated = (await this.getFeatureFlag(params.name)) as FeatureFlag;
        auditLogger.log('feature_flag.updated', {
          resource: 'feature_flag',
          resourceId: params.name,
          actor: 'system',
          before: { isEnabled: existing.isEnabled, rolloutPercentage: existing.rolloutPercentage },
          after: { isEnabled: updated.isEnabled, rolloutPercentage: updated.rolloutPercentage },
        });
        // P1 #10: write immutable audit log and entity version
        await this.writeAuditLog(manager, {
          resourceType: 'feature_flag',
          resourceId: params.name,
          action: 'updated',
          actor: 'system',
          before: { isEnabled: existing.isEnabled, rolloutPercentage: existing.rolloutPercentage, description: existing.description, targetAudience: existing.targetAudience, variantType: existing.variantType, variants: existing.variants },
          after: { isEnabled: updated.isEnabled, rolloutPercentage: updated.rolloutPercentage, description: updated.description, targetAudience: updated.targetAudience, variantType: updated.variantType, variants: updated.variants },
        });
        await this.writeEntityVersion(manager, {
          resourceType: 'feature_flag',
          resourceId: params.name,
          snapshot: { name: updated.name, isEnabled: updated.isEnabled, description: updated.description, rolloutPercentage: updated.rolloutPercentage, targetAudience: updated.targetAudience, variantType: updated.variantType, variants: updated.variants, updatedAt: updated.updatedAt },
          actor: 'system',
        });
        const outbox = new OutboxPublisher(manager);
        await outbox.publish({
          topic: 'insurance.feature_flags.flag.updated',
          eventType: 'FeatureFlagUpdated',
          eventVersion: 1,
          correlationId: uuidv4(),
          tenantId: 'default',
          subject: { flagName: updated.name },
          payload: {
            name: updated.name,
            isEnabled: updated.isEnabled,
            rolloutPercentage: updated.rolloutPercentage,
            targetAudience: updated.targetAudience,
            variantType: updated.variantType,
            variants: updated.variants,
          },
        });
        return updated;
      });
    }

    const entity = this.featureFlagsRepo.create({
      name: params.name,
      description: params.description ?? null,
      isEnabled: params.isEnabled,
      rolloutPercentage: params.rolloutPercentage ?? 0,
      targetAudience: params.targetAudience ?? null,
      variantType: params.variantType ?? 'boolean',
      variants: params.variants ?? null,
      createdAt: now,
      updatedAt: now,
    });
    await this.dataSource.transaction(async (manager) => {
      await manager.save(entity);
      this.invalidateCache(params.name);
      // P1 #10: write immutable audit log and entity version
      await this.writeAuditLog(manager, {
        resourceType: 'feature_flag',
        resourceId: entity.name,
        action: 'created',
        actor: 'system',
        before: null,
        after: { name: entity.name, isEnabled: entity.isEnabled, rolloutPercentage: entity.rolloutPercentage, description: entity.description, targetAudience: entity.targetAudience, variantType: entity.variantType, variants: entity.variants },
      });
      await this.writeEntityVersion(manager, {
        resourceType: 'feature_flag',
        resourceId: entity.name,
        snapshot: { name: entity.name, isEnabled: entity.isEnabled, description: entity.description, rolloutPercentage: entity.rolloutPercentage, targetAudience: entity.targetAudience, variantType: entity.variantType, variants: entity.variants, createdAt: entity.createdAt },
        actor: 'system',
      });
      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.feature_flags.flag.created',
        eventType: 'FeatureFlagCreated',
        eventVersion: 1,
        correlationId: uuidv4(),
        tenantId: 'default',
        subject: { flagName: entity.name },
        payload: {
          name: entity.name,
          isEnabled: entity.isEnabled,
          rolloutPercentage: entity.rolloutPercentage,
          targetAudience: entity.targetAudience,
          variantType: entity.variantType,
          variants: entity.variants,
        },
      });
    });
    return entity;
  }

  async deleteFeatureFlag(name: string): Promise<boolean> {
    const existing = await this.featureFlagsRepo.findOne({ where: { name } });
    if (!existing) return false;
    await this.dataSource.transaction(async (manager) => {
      await manager.delete(FeatureFlag, { name });
      this.invalidateCache(name);
      // P1 #10: write immutable audit log
      await this.writeAuditLog(manager, {
        resourceType: 'feature_flag',
        resourceId: name,
        action: 'deleted',
        actor: 'system',
        before: { name: existing.name, isEnabled: existing.isEnabled, rolloutPercentage: existing.rolloutPercentage, description: existing.description, targetAudience: existing.targetAudience },
        after: null,
      });
      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.feature_flags.flag.deleted',
        eventType: 'FeatureFlagDeleted',
        eventVersion: 1,
        correlationId: uuidv4(),
        tenantId: 'default',
        subject: { flagName: name },
        payload: {
          name: existing.name,
          isEnabled: existing.isEnabled,
        },
      });
    });
    return true;
  }

  async ensureDefaults(): Promise<void> {
    const defaults: Array<{ name: string; isEnabled: boolean; description?: string }> = [
      { name: 'ai.enabled', isEnabled: true, description: 'Master switch for AI capabilities' },
      { name: 'copilot.enabled', isEnabled: true, description: 'Enable copilot features' },
      { name: 'document_ai.enabled', isEnabled: true, description: 'Enable document AI features' },
    ];

    for (const d of defaults) {
      const found = await this.featureFlagsRepo.findOne({ where: { name: d.name } });
      if (!found) {
        const now = new Date();
        await this.featureFlagsRepo.save(
          this.featureFlagsRepo.create({
            name: d.name,
            description: d.description ?? null,
            isEnabled: d.isEnabled,
            rolloutPercentage: 0,
            targetAudience: null,
            createdAt: now,
            updatedAt: now,
          })
        );
      }
    }
  }

  async listAiToggles(): Promise<AiToggle[]> {
    return this.aiTogglesRepo.find({ order: { name: 'ASC' } });
  }

  async getAiToggle(name: string): Promise<AiToggle | null> {
    return this.aiTogglesRepo.findOne({ where: { name } });
  }

  async upsertAiToggle(params: {
    name: string;
    isEnabled: boolean;
    description?: string | null;
    modelName?: string | null;
    modelVersion?: string | null;
    config?: Record<string, any> | null;
  }): Promise<AiToggle> {
    const now = new Date();
    const existing = await this.aiTogglesRepo.findOne({ where: { name: params.name } });

    if (existing) {
      await this.aiTogglesRepo.update(
        { name: params.name },
        {
          isEnabled: params.isEnabled,
          description: params.description ?? existing.description,
          modelName: params.modelName ?? existing.modelName,
          modelVersion: params.modelVersion ?? existing.modelVersion,
          config: params.config ?? existing.config,
          updatedAt: now,
        }
      );
      const updated = (await this.getAiToggle(params.name)) as AiToggle;
      auditLogger.log('ai_toggle.updated', {
        resource: 'ai_toggle',
        resourceId: params.name,
        actor: 'system',
        before: { isEnabled: existing.isEnabled, modelName: existing.modelName },
        after: { isEnabled: updated.isEnabled, modelName: updated.modelName },
      });
      return updated;
    }

    const entity = this.aiTogglesRepo.create({
      name: params.name,
      description: params.description ?? null,
      isEnabled: params.isEnabled,
      modelName: params.modelName ?? null,
      modelVersion: params.modelVersion ?? null,
      config: params.config ?? null,
      createdAt: now,
      updatedAt: now,
    });
    await this.aiTogglesRepo.save(entity);
    return entity;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // P2 #9: A/B testing — variant evaluation
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Evaluate a feature flag for a specific user and return the selected variant.
   *
   * - boolean: returns {enabled: boolean} based on isEnabled
   * - percentage: deterministic hash of (userId + flagKey) maps to a bucket;
   *   if bucket < rolloutPercentage, the flag is enabled for this user
   * - variant: weighted random selection (deterministic via hash) from variants array
   */
  async evaluateVariant(flagKey: string, userId: string): Promise<{
    flagKey: string;
    userId: string;
    variantType: VariantType;
    enabled: boolean;
    variant?: string;
    payload?: any;
  }> {
    const flag = await this.getFeatureFlag(flagKey);
    if (!flag) {
      return { flagKey, userId, variantType: 'boolean', enabled: false };
    }

    if (!flag.isEnabled) {
      return { flagKey, userId, variantType: flag.variantType, enabled: false };
    }

    if (flag.variantType === 'boolean' || !flag.variantType) {
      return { flagKey, userId, variantType: 'boolean', enabled: true };
    }

    if (flag.variantType === 'percentage') {
      // Deterministic bucket assignment based on hash of (userId + flagKey)
      const bucket = this.hashToBucket(`${userId}:${flagKey}`, 100);
      const enabled = bucket < flag.rolloutPercentage;
      return { flagKey, userId, variantType: 'percentage', enabled };
    }

    if (flag.variantType === 'variant') {
      const variants = flag.variants || [];
      if (variants.length === 0) {
        return { flagKey, userId, variantType: 'variant', enabled: true };
      }
      const selected = this.selectWeightedVariant(`${userId}:${flagKey}`, variants);
      return {
        flagKey,
        userId,
        variantType: 'variant',
        enabled: true,
        variant: selected.name,
        payload: selected.payload,
      };
    }

    return { flagKey, userId, variantType: flag.variantType, enabled: true };
  }

  /**
   * Hash a string to a bucket in [0, modulus).
   * Uses SHA-256 for a uniform distribution.
   */
  private hashToBucket(input: string, modulus: number): number {
    const hash = crypto.createHash('sha256').update(input).digest();
    // Use the first 4 bytes as an unsigned 32-bit integer
    const num = hash.readUInt32BE(0);
    return num % modulus;
  }

  /**
   * Select a variant deterministically based on a hash of the input.
   * The hash maps to a weighted bucket, ensuring the same user always
   * gets the same variant for a given flag.
   */
  private selectWeightedVariant(input: string, variants: Variant[]): Variant {
    const totalWeight = variants.reduce((sum, v) => sum + Math.max(v.weight, 0), 0);
    if (totalWeight <= 0) {
      // All weights are zero — fall back to uniform selection
      const idx = this.hashToBucket(input, variants.length);
      return variants[idx];
    }
    const bucket = this.hashToBucket(input, 100000) / 100000; // [0, 1)
    let cumulative = 0;
    for (const v of variants) {
      cumulative += Math.max(v.weight, 0) / totalWeight;
      if (bucket < cumulative) {
        return v;
      }
    }
    // Fallback (should not reach here due to floating point, but just in case)
    return variants[variants.length - 1];
  }
}
