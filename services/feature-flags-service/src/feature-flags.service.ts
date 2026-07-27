import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeatureFlag } from './entities/FeatureFlag';
import { AiToggle } from './entities/AiToggle';
import { auditLogger } from './audit.logger';

@Injectable()
export class FeatureFlagsService implements OnModuleInit {
  private flagCache = new Map<string, { data: FeatureFlag; expiresAt: number }>();
  private listCache: { data: FeatureFlag[]; expiresAt: number } | null = null;
  private readonly cacheTtlMs = parseInt(process.env.CACHE_TTL_MS || '30000', 10);

  constructor(
    @InjectRepository(FeatureFlag) private readonly featureFlagsRepo: Repository<FeatureFlag>,
    @InjectRepository(AiToggle) private readonly aiTogglesRepo: Repository<AiToggle>
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
  }): Promise<FeatureFlag> {
    if (params.rolloutPercentage !== undefined && (params.rolloutPercentage < 0 || params.rolloutPercentage > 100)) {
      const err: any = new Error('rolloutPercentage must be between 0 and 100');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const now = new Date();
    const existing = await this.featureFlagsRepo.findOne({ where: { name: params.name } });

    if (existing) {
      await this.featureFlagsRepo.update(
        { name: params.name },
        {
          isEnabled: params.isEnabled,
          description: params.description ?? existing.description,
          rolloutPercentage: params.rolloutPercentage ?? existing.rolloutPercentage,
          targetAudience: params.targetAudience ?? existing.targetAudience,
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
      return updated;
    }

    const entity = this.featureFlagsRepo.create({
      name: params.name,
      description: params.description ?? null,
      isEnabled: params.isEnabled,
      rolloutPercentage: params.rolloutPercentage ?? 0,
      targetAudience: params.targetAudience ?? null,
      createdAt: now,
      updatedAt: now,
    });
    await this.featureFlagsRepo.save(entity);
    this.invalidateCache(params.name);
    return entity;
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
}
