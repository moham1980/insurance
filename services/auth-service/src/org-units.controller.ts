import { Body, Controller, ForbiddenException, Get, Headers, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { OrgUnitsService } from './org-units.service';
import { OrganizationUnitType } from './entities/OrganizationUnit';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Permissions } from './permissions.decorator';
import { PermissionsGuard } from './permissions.guard';
import { auditLogger } from './audit.logger';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';
import { Resource, ResourceAction } from './resource.decorator';

@Controller()
export class OrgUnitsController {
  constructor(private readonly orgUnitsService: OrgUnitsService) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return uuidv4();
  }

  @Post('/org-units')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Resource('orgUnit')
  @ResourceAction('create')
  @Permissions('org_units:create')
  async create(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;
    auditLogger.info('iam.org_units.create.request', { correlationId, tenantId, action: 'org_units:create', actorUserId: actor?.userId });

    if (!body?.name || !body?.code) {
      auditLogger.warn('iam.org_units.create.validation_failed', { correlationId, tenantId, action: 'org_units:create', actorUserId: actor?.userId });
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'name, code are required' },
        correlationId,
      };
    }

    try {
      const user = req?.user as any;
      const roles: string[] = Array.isArray(user?.roles) ? user.roles : [];
      const isUnscoped = roles.includes('insurer_admin') || roles.includes('head_office_ops');

      if (!isUnscoped) {
        if (typeof user?.orgUnitId !== 'string' || user.orgUnitId.length === 0) {
          throw new ForbiddenException({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Forbidden' },
            correlationId,
          });
        }

        const parent = body.parentOrgUnitId;
        if (typeof parent !== 'string' || parent.length === 0) {
          throw new ForbiddenException({
            success: false,
            error: { code: 'FORBIDDEN', message: 'parentOrgUnitId is required for scoped users' },
            correlationId,
          });
        }

        const allowed = await this.orgUnitsService.getSubtreeOrgUnitIds(user.orgUnitId, tenantId);
        if (!allowed.includes(parent)) {
          throw new ForbiddenException({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Forbidden' },
            correlationId,
          });
        }
      }

      const orgUnit = await this.orgUnitsService.create({
        type: (body.type as OrganizationUnitType) || 'branch',
        name: body.name,
        code: body.code,
        parentOrgUnitId: body.parentOrgUnitId,
        tenantId,
        metadata: {
          ...(body.metadata || {}),
          ...(body.capabilities ? { capabilities: body.capabilities } : {}),
        },
      });

      return {
        success: true,
        data: {
          orgUnitId: orgUnit.orgUnitId,
          type: orgUnit.type,
          name: orgUnit.name,
          code: orgUnit.code,
          parentOrgUnitId: orgUnit.parentOrgUnitId,
          metadata: orgUnit.metadata,
          isActive: orgUnit.isActive,
          createdAt: orgUnit.createdAt,
        },
        correlationId,
      };
    } catch (e: any) {
      if (e?.code === 'DUPLICATE_CODE') {
        auditLogger.warn('iam.org_units.create.duplicate_code', { correlationId, tenantId, action: 'org_units:create', code: body?.code });
        return { success: false, error: { code: 'DUPLICATE_CODE', message: 'Organization unit code already exists' }, correlationId };
      }
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('iam.org_units.create.failed', err, { correlationId, tenantId, action: 'org_units:create' });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create organization unit' }, correlationId };
    }
  }

  @Get('/org-units/:orgUnitId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Resource('orgUnit')
  @ResourceAction('read')
  @Permissions('org_units:get')
  async get(@Req() req: any, @Headers() headers: Record<string, any>, @Param('orgUnitId') orgUnitId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;
    auditLogger.info('iam.org_units.get.request', { correlationId, tenantId, action: 'org_units:get', actorUserId: actor?.userId, orgUnitId });

    const user = req?.user as any;
    const roles: string[] = Array.isArray(user?.roles) ? user.roles : [];
    const isUnscoped = roles.includes('insurer_admin') || roles.includes('head_office_ops');
    if (!isUnscoped) {
      if (typeof user?.orgUnitId === 'string' && user.orgUnitId.length > 0) {
        const allowed = await this.orgUnitsService.getSubtreeOrgUnitIds(user.orgUnitId, tenantId);
        if (!allowed.includes(orgUnitId)) {
          throw new ForbiddenException({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Forbidden' },
            correlationId,
          });
        }
      } else {
        throw new ForbiddenException({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Forbidden' },
          correlationId,
        });
      }
    }

    const orgUnit = await this.orgUnitsService.get(orgUnitId, tenantId);
    if (!orgUnit) {
      auditLogger.warn('iam.org_units.get.not_found', { correlationId, tenantId, action: 'org_units:get', orgUnitId });
      return { success: false, error: { code: 'NOT_FOUND', message: 'Organization unit not found' }, correlationId };
    }

    return {
      success: true,
      data: {
        orgUnitId: orgUnit.orgUnitId,
        type: orgUnit.type,
        name: orgUnit.name,
        code: orgUnit.code,
        parentOrgUnitId: orgUnit.parentOrgUnitId,
        metadata: orgUnit.metadata,
        isActive: orgUnit.isActive,
        createdAt: orgUnit.createdAt,
      },
      correlationId,
    };
  }

  @Get('/org-units')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Resource('orgUnit')
  @Permissions('org_units:list')
  async list(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('type') type?: OrganizationUnitType,
    @Query('parentOrgUnitId') parentOrgUnitId?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;
    auditLogger.info('iam.org_units.list.request', { correlationId, tenantId, action: 'org_units:list', actorUserId: actor?.userId });

    const lim = Math.min(parseInt(limit, 10) || 50, 200);
    const off = parseInt(offset, 10);

    const user = req?.user as any;
    const roles: string[] = Array.isArray(user?.roles) ? user.roles : [];
    const isUnscoped = roles.includes('insurer_admin') || roles.includes('head_office_ops');

    let allowedOrgUnitIds: string[] | undefined;
    if (!isUnscoped) {
      if (typeof user?.orgUnitId === 'string' && user.orgUnitId.length > 0) {
        allowedOrgUnitIds = await this.orgUnitsService.getSubtreeOrgUnitIds(user.orgUnitId, tenantId);
      } else {
        allowedOrgUnitIds = [];
      }
    }

    const { rows, total } = await this.orgUnitsService.list({
      type,
      parentOrgUnitId,
      limit: Number.isFinite(lim) ? lim : 50,
      offset: Number.isFinite(off) ? off : 0,
      allowedOrgUnitIds,
      tenantId,
    });

    return {
      success: true,
      data: rows.map((orgUnit) => ({
        orgUnitId: orgUnit.orgUnitId,
        type: orgUnit.type,
        name: orgUnit.name,
        code: orgUnit.code,
        parentOrgUnitId: orgUnit.parentOrgUnitId,
        isActive: orgUnit.isActive,
        createdAt: orgUnit.createdAt,
      })),
      pagination: {
        total,
        limit: Number.isFinite(lim) ? lim : 50,
        offset: Number.isFinite(off) ? off : 0,
      },
      correlationId,
    };
  }
}
