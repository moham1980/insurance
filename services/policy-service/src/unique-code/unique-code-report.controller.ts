import { Controller, Get, Headers, Query, Req, UseGuards } from '@nestjs/common';
import { UniqueCodeService } from './unique-code.service';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { PermissionsGuard } from '../permissions.guard';
import { AbacGuard } from '../abac.guard';
import { TenantGuard } from '../tenant.guard';
import { RequirePermissions } from '../permissions.decorator';
import { auditLogger } from '../audit.logger';

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
export class UniqueCodeReportController {
  constructor(private readonly uniqueCodeService: UniqueCodeService) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `ucr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  @Get('/api/v1/reports/policies-without-unique-code')
  @RequirePermissions('policy:view')
  async policiesWithoutUniqueCode(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
    @Query('distributionOrganizationId') distributionOrganizationId?: string,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actorUserId = req?.user?.userId as string | undefined;
    const lim = parseInt(limit, 10);
    const off = parseInt(offset, 10);

    auditLogger.info('unique_code.report.policies_without', {
      correlationId,
      tenantId,
      actorUserId,
      distributionOrganizationId,
    });

    const result = await this.uniqueCodeService.findPoliciesWithoutUniqueCode(
      tenantId,
      Number.isFinite(lim) ? lim : 50,
      Number.isFinite(off) ? off : 0,
      distributionOrganizationId,
    );

    return {
      success: true,
      data: result.rows,
      pagination: { total: result.total, limit: Number.isFinite(lim) ? lim : 50, offset: Number.isFinite(off) ? off : 0 },
      correlationId,
    };
  }

  @Get('/api/v1/reports/duplicate-unique-codes')
  @RequirePermissions('policy:view')
  async duplicateUniqueCodes(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actorUserId = req?.user?.userId as string | undefined;

    auditLogger.info('unique_code.report.duplicates', {
      correlationId,
      tenantId,
      actorUserId,
    });

    const rows = await this.uniqueCodeService.findDuplicateUniqueCodes(tenantId);

    return {
      success: true,
      data: rows,
      count: rows.length,
      correlationId,
    };
  }
}
