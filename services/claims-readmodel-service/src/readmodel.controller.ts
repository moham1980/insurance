import { Controller, Get, Headers, Param, Query, Req, UseGuards, ForbiddenException, Post, Body } from '@nestjs/common';
import { ReadModelService } from './readmodel.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermissions } from './permissions.decorator';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';

interface AuthenticatedRequest {
  headers: Record<string, any>;
  user?: any;
  tenantId?: string;
  url?: string;
  method?: string;
}

const PII_FIELDS = ['complainantMobile', 'policyNumber', 'assignedTo', 'adjusterId'];

@Controller()
export class ReadModelController {
  constructor(private readonly readModelService: ReadModelService) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getTenantId(req: AuthenticatedRequest): string {
    const tenantId = req.tenantId;
    if (!tenantId) throw new ForbiddenException({ success: false, error: { code: 'TENANT_REQUIRED', message: 'Tenant context required' } });
    return tenantId;
  }

  private canViewPii(user: any): boolean {
    if (!user) return false;
    const allowed = ['insurer_admin', 'head_office_ops', 'compliance_aml', 'auditor', 'system_admin'];
    const roles: string[] = user.roles || [];
    return allowed.some((r) => roles.includes(r));
  }

  private maskPii(value: string | null | undefined): string | null {
    if (!value || typeof value !== 'string') return null;
    if (value.length <= 4) return '****';
    return value.substring(0, 2) + '*'.repeat(Math.max(4, value.length - 4)) + value.substring(value.length - 2);
  }

  private maskObjectPii(row: any, user: any): any {
    if (!row || typeof row !== 'object') return row;
    const mask = !this.canViewPii(user);
    const out: any = {};
    for (const [key, value] of Object.entries(row)) {
      if (mask && PII_FIELDS.includes(key)) {
        out[key] = typeof value === 'string' ? this.maskPii(value) : value;
      } else {
        out[key] = value;
      }
    }
    return out;
  }

  private maskRowsPii(rows: any[], user: any): any[] {
    return rows.map((row) => this.maskObjectPii(row, user));
  }

  @Get('/rm/claims')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard, AbacGuard)
  @RequirePermissions('rm:claims:view')
  async list(
    @Req() req: AuthenticatedRequest,
    @Headers() headers: Record<string, any>,
    @Query('policyId') policyId?: string,
    @Query('status') status?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
    @Query('cursor') cursor?: string, // P1 #8: cursor-based pagination (backward compatible)
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = this.getTenantId(req);
    const lim = Math.min(parseInt(limit, 10) || 50, 200);
    const off = parseInt(offset, 10) || 0;

    const result = await this.readModelService.listClaims({
      tenantId,
      policyId,
      status,
      limit: lim,
      offset: off,
      cursor, // P1 #8: pass cursor if provided
    });

    // P1 #8: return cursor-based pagination info when cursor is used
    if (cursor && (result as any).hasNext !== undefined) {
      return {
        success: true,
        data: this.maskRowsPii(result.rows, req.user),
        pagination: { limit: lim, hasNext: (result as any).hasNext, nextCursor: (result as any).nextCursor },
        correlationId,
      };
    }

    return {
      success: true,
      data: this.maskRowsPii(result.rows, req.user),
      pagination: { total: result.total, limit: lim, offset: off },
      correlationId,
    };
  }

  @Get('/rm/claims/:claimId')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard, AbacGuard)
  @RequirePermissions('rm:claims:view')
  async get(@Req() req: AuthenticatedRequest, @Headers() headers: Record<string, any>, @Param('claimId') claimId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = this.getTenantId(req);

    const row = await this.readModelService.getClaim(claimId, tenantId);
    if (!row) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Not found' }, correlationId };
    }

    return { success: true, data: this.maskObjectPii(row, req.user), correlationId };
  }

  @Get('/rm/claims/summary')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard, AbacGuard)
  @RequirePermissions('rm:claims:summary')
  async summary(@Req() req: AuthenticatedRequest, @Headers() headers: Record<string, any>) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = this.getTenantId(req);

    const data = await this.readModelService.getSummary(tenantId);
    return { success: true, data, correlationId };
  }

  @Get('/rm/fraud/cases')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard, AbacGuard)
  @RequirePermissions('rm:fraud:view')
  async listFraudCases(
    @Req() req: AuthenticatedRequest,
    @Headers() headers: Record<string, any>,
    @Query('status') status?: string,
    @Query('minScore') minScore?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
    @Query('cursor') cursor?: string, // P1 #8: cursor-based pagination
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = this.getTenantId(req);
    const lim = Math.min(parseInt(limit, 10) || 50, 200);
    const off = parseInt(offset, 10) || 0;
    const min = minScore !== undefined ? parseInt(minScore, 10) : undefined;

    const result = await this.readModelService.listFraudCases({
      tenantId,
      status,
      minScore: typeof min === 'number' && Number.isFinite(min) ? min : undefined,
      limit: lim,
      offset: off,
      cursor,
    });

    if (cursor && (result as any).hasNext !== undefined) {
      return {
        success: true,
        data: this.maskRowsPii(result.rows, req.user),
        pagination: { limit: lim, hasNext: (result as any).hasNext, nextCursor: (result as any).nextCursor },
        correlationId,
      };
    }

    return {
      success: true,
      data: this.maskRowsPii(result.rows, req.user),
      pagination: { total: result.total, limit: lim, offset: off },
      correlationId,
    };
  }

  @Get('/rm/complaints')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard, AbacGuard)
  @RequirePermissions('rm:complaints:view')
  async listComplaintsOps(
    @Req() req: AuthenticatedRequest,
    @Headers() headers: Record<string, any>,
    @Query('status') status?: string,
    @Query('complaintType') complaintType?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
    @Query('cursor') cursor?: string, // P1 #8: cursor-based pagination
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = this.getTenantId(req);
    const lim = Math.min(parseInt(limit, 10) || 50, 200);
    const off = parseInt(offset, 10) || 0;

    const result = await this.readModelService.listComplaintsOps({
      tenantId,
      status,
      complaintType,
      limit: lim,
      offset: off,
      cursor,
    });

    if (cursor && (result as any).hasNext !== undefined) {
      return {
        success: true,
        data: this.maskRowsPii(result.rows, req.user),
        pagination: { limit: lim, hasNext: (result as any).hasNext, nextCursor: (result as any).nextCursor },
        correlationId,
      };
    }

    return {
      success: true,
      data: this.maskRowsPii(result.rows, req.user),
      pagination: { total: result.total, limit: lim, offset: off },
      correlationId,
    };
  }

  @Post('/rm/admin/rebuild')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard, AbacGuard)
  @RequirePermissions('rm:claims:summary')
  async rebuild(
    @Req() req: AuthenticatedRequest,
    @Headers() headers: Record<string, any>,
    @Body() body?: { aggregateId?: string }
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = this.getTenantId(req);
    const result = await this.readModelService.rebuildProjection(body?.aggregateId, tenantId);
    return { success: true, data: result, correlationId };
  }
}
