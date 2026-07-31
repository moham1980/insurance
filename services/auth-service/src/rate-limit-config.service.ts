import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrgRateLimit } from './entities/OrgRateLimit';

@Injectable()
export class RateLimitConfigService {
  constructor(
    @InjectRepository(OrgRateLimit)
    private readonly rateLimitRepo: Repository<OrgRateLimit>,
  ) {}

  async upsertRateLimit(
    organizationId: string,
    tenantId: string,
    config: {
      agreementId?: string;
      requestsPerMinute?: number;
      requestsPerHour?: number;
      requestsPerDay?: number;
      burstLimit?: number;
      isActive?: boolean;
    },
  ): Promise<OrgRateLimit> {
    let existing = await this.rateLimitRepo.findOne({ where: { organizationId } });
    if (existing) {
      Object.assign(existing, {
        agreementId: config.agreementId ?? existing.agreementId,
        requestsPerMinute: config.requestsPerMinute ?? existing.requestsPerMinute,
        requestsPerHour: config.requestsPerHour ?? existing.requestsPerHour,
        requestsPerDay: config.requestsPerDay ?? existing.requestsPerDay,
        burstLimit: config.burstLimit ?? existing.burstLimit,
        isActive: config.isActive ?? existing.isActive,
      });
      return this.rateLimitRepo.save(existing);
    }
    const created = this.rateLimitRepo.create({
      organizationId,
      tenantId,
      agreementId: config.agreementId || null,
      requestsPerMinute: config.requestsPerMinute ?? 600,
      requestsPerHour: config.requestsPerHour ?? 10000,
      requestsPerDay: config.requestsPerDay ?? 100000,
      burstLimit: config.burstLimit ?? 100,
      isActive: config.isActive ?? true,
    });
    return this.rateLimitRepo.save(created);
  }

  async getRateLimit(organizationId: string): Promise<OrgRateLimit> {
    const config = await this.rateLimitRepo.findOne({ where: { organizationId } });
    if (!config) {
      throw new NotFoundException('Rate limit configuration not found for organization');
    }
    return config;
  }
}
