import { Body, Controller, Get, Headers, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DeadLetterEvent, DeadLetterQueueService } from '@insurance/shared';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermissions } from './permissions.decorator';
import { auditLogger } from './audit.logger';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';

@Controller()
export class DlqController {
  constructor(
    private readonly dataSource: DataSource,
    @Inject('DLQ_SERVICE') private readonly dlqService: DeadLetterQueueService
  ) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private isNonEmptyString(x: any): x is string {
    return typeof x === 'string' && x.trim().length > 0;
  }

  @Get('/dlq/stats')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('dlq:stats')
  async stats(@Req() req: any, @Headers() headers: Record<string, any>) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user?.userId as string | undefined;

    auditLogger.info('dlq.stats.request', { correlationId, tenantId, actor, action: 'dlq:stats' });

    try {
      const stats = await this.dlqService.getDLQStats();
      return { success: true, data: stats, correlationId };
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('dlq.stats.failed', err, { correlationId, tenantId, actor, action: 'dlq:stats' });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to load DLQ stats' }, correlationId };
    }
  }

  @Get('/dlq')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('dlq:list')
  async list(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('status') status?: string,
    @Query('topic') topic?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user?.userId as string | undefined;

    const lim = Math.min(parseInt(limit, 10) || 50, 200);
    const off = parseInt(offset, 10) || 0;

    auditLogger.info('dlq.list.request', { correlationId, tenantId, actor, action: 'dlq:list' });

    try {
      const repo = this.dataSource.getRepository(DeadLetterEvent);
      const qb = repo.createQueryBuilder('d');
      if (this.isNonEmptyString(status)) qb.andWhere('d.status = :status', { status });
      if (this.isNonEmptyString(topic)) qb.andWhere('d.topic = :topic', { topic });

      qb.orderBy('d.created_at', 'DESC').limit(lim).offset(off);

      const [rows, total] = await qb.getManyAndCount();
      return { success: true, data: rows, pagination: { total, limit: lim, offset: off }, correlationId };
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('dlq.list.failed', err, { correlationId, tenantId, actor, action: 'dlq:list' });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list DLQ entries' }, correlationId };
    }
  }

  @Post('/dlq/:dlqId/resolve')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('dlq:resolve')
  async resolve(@Req() req: any, @Headers() headers: Record<string, any>, @Param('dlqId') dlqId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user?.userId as string | undefined;

    auditLogger.info('dlq.resolve.request', { correlationId, tenantId, actor, action: 'dlq:resolve', dlqId });

    const resolution = body?.resolution;
    if (resolution !== 'manual' && resolution !== 'auto') {
      auditLogger.warn('dlq.resolve.validation_failed', { correlationId, tenantId, actor, action: 'dlq:resolve', dlqId });
      return { success: false, error: { code: 'VALIDATION_ERROR', message: "resolution must be 'manual' or 'auto'" }, correlationId };
    }

    try {
      await this.dlqService.resolveDLQEntry(dlqId, resolution);
      return { success: true, data: { dlqId, status: 'resolved' }, correlationId };
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(String(e));
      const msg = err.message || 'Failed to resolve DLQ entry';
      auditLogger.error('dlq.resolve.failed', err, { correlationId, tenantId, actor, action: 'dlq:resolve', dlqId });
      if (msg.toLowerCase().includes('not found')) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'DLQ entry not found' }, correlationId };
      }
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to resolve DLQ entry' }, correlationId };
    }
  }
}
