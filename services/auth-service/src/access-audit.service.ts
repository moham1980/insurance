import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccessAudit } from './entities/AccessAudit';

export interface AuditLogParams {
  userId: string;
  username?: string;
  roles?: string[];
  orgUnitId?: string;
  resourceType: string;
  resourceId?: string;
  resourceOwner?: string;
  resourceOrgUnitId?: string;
  tenantId?: string;
  action: string;
  decision: 'allow' | 'deny';
  decisionReason?: string;
  policyId?: string;
  policyName?: string;
  context?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
}

@Injectable()
export class AccessAuditService {
  constructor(
    @InjectRepository(AccessAudit)
    private readonly auditRepo: Repository<AccessAudit>,
  ) {}

  /**
   * Log an access decision
   */
  async logAccess(params: AuditLogParams): Promise<AccessAudit> {
    const audit = this.auditRepo.create({
      userId: params.userId,
      username: params.username,
      roles: params.roles,
      orgUnitId: params.orgUnitId,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      resourceOwner: params.resourceOwner,
      resourceOrgUnitId: params.resourceOrgUnitId,
      tenantId: params.tenantId,
      action: params.action,
      decision: params.decision,
      decisionReason: params.decisionReason,
      policyId: params.policyId,
      policyName: params.policyName,
      context: params.context,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      location: params.location,
    });

    return this.auditRepo.save(audit);
  }

  /**
   * Get access logs for a user
   */
  async getUserAccessLogs(
    userId: string,
    params: { limit: number; offset: number },
  ): Promise<{ logs: AccessAudit[]; total: number }> {
    const qb = this.auditRepo.createQueryBuilder('audit');
    qb.where('audit.userId = :userId', { userId });
    qb.orderBy('audit.timestamp', 'DESC');
    qb.limit(params.limit).offset(params.offset);

    const [logs, total] = await qb.getManyAndCount();
    return { logs, total };
  }

  /**
   * Get access logs for a resource
   */
  async getResourceAccessLogs(
    resourceType: string,
    resourceId: string,
    params: { limit: number; offset: number },
  ): Promise<{ logs: AccessAudit[]; total: number }> {
    const qb = this.auditRepo.createQueryBuilder('audit');
    qb.where('audit.resourceType = :resourceType', { resourceType });
    qb.andWhere('audit.resourceId = :resourceId', { resourceId });
    qb.orderBy('audit.timestamp', 'DESC');
    qb.limit(params.limit).offset(params.offset);

    const [logs, total] = await qb.getManyAndCount();
    return { logs, total };
  }

  /**
   * Get denied access attempts
   */
  async getDeniedAccessAttempts(
    params: { limit: number; offset: number; startDate?: Date; endDate?: Date },
  ): Promise<{ logs: AccessAudit[]; total: number }> {
    const qb = this.auditRepo.createQueryBuilder('audit');
    qb.where('audit.decision = :decision', { decision: 'deny' });

    if (params.startDate) {
      qb.andWhere('audit.timestamp >= :startDate', { startDate: params.startDate });
    }
    if (params.endDate) {
      qb.andWhere('audit.timestamp <= :endDate', { endDate: params.endDate });
    }

    qb.orderBy('audit.timestamp', 'DESC');
    qb.limit(params.limit).offset(params.offset);

    const [logs, total] = await qb.getManyAndCount();
    return { logs, total };
  }

  /**
   * Get access statistics
   */
  async getAccessStats(params: { startDate?: Date; endDate?: Date }): Promise<{
    totalRequests: number;
    allowedRequests: number;
    deniedRequests: number;
    denyRate: number;
    topDeniedResources: Array<{ resourceType: string; count: number }>;
    topDeniedUsers: Array<{ userId: string; username: string; count: number }>;
  }> {
    const qb = this.auditRepo.createQueryBuilder('audit');

    if (params.startDate) {
      qb.andWhere('audit.timestamp >= :startDate', { startDate: params.startDate });
    }
    if (params.endDate) {
      qb.andWhere('audit.timestamp <= :endDate', { endDate: params.endDate });
    }

    const totalRequests = await qb.getCount();
    const allowedRequests = await qb.andWhere('audit.decision = :decision', { decision: 'allow' }).getCount();
    const deniedRequests = totalRequests - allowedRequests;

    // Get top denied resources
    const topDeniedResources = await this.auditRepo
      .createQueryBuilder('audit')
      .select('audit.resourceType', 'resourceType')
      .addSelect('COUNT(*)', 'count')
      .where('audit.decision = :decision', { decision: 'deny' })
      .groupBy('audit.resourceType')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    // Get top denied users
    const topDeniedUsers = await this.auditRepo
      .createQueryBuilder('audit')
      .select('audit.userId', 'userId')
      .addSelect('audit.username', 'username')
      .addSelect('COUNT(*)', 'count')
      .where('audit.decision = :decision', { decision: 'deny' })
      .groupBy('audit.userId, audit.username')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      totalRequests,
      allowedRequests,
      deniedRequests,
      denyRate: totalRequests > 0 ? deniedRequests / totalRequests : 0,
      topDeniedResources: topDeniedResources.map(r => ({ resourceType: r.resourceType, count: parseInt(r.count) })),
      topDeniedUsers: topDeniedUsers.map(u => ({ userId: u.userId, username: u.username, count: parseInt(u.count) })),
    };
  }
}
