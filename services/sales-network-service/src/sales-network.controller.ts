// @ts-nocheck
import { Body, Controller, Get, Headers, Param, Post, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { SalesNetworkService } from './sales-network.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';
import { RequirePermissions } from './permissions.decorator';
import { auditLogger } from './audit.logger';

@Controller()
export class SalesNetworkController {
  constructor(private readonly service: SalesNetworkService) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private parsePagination(limit: string, offset: string): { limit: number; offset: number } {
    const lim = parseInt(limit, 10);
    const off = parseInt(offset, 10);
    return {
      limit: Number.isFinite(lim) ? Math.min(Math.max(lim, 1), 200) : 50,
      offset: Number.isFinite(off) ? Math.max(off, 0) : 0,
    };
  }

  @Get('/sales-network/partners')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('sales_network:partners:view')
  async listPartners(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('kind') kind?: string,
    @Query('status') status?: string,
    @Query('organizationId') organizationId?: string,
    @Query('parentPartnerId') parentPartnerId?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('sales_network.partners.list.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'sales_network:partners:view',
    });

    const { limit: lim, offset: off } = this.parsePagination(limit, offset);

    const roles: string[] = Array.isArray(actor?.roles) ? actor.roles : [];
    const allowAll = roles.includes('insurer_admin') || roles.includes('head_office_ops') || roles.includes('auditor');

    const { rows, total } = await this.service.listPartners({
      kind: kind as any,
      status: status as any,
      organizationId,
      parentPartnerId,
      limit: lim,
      offset: off,
      actorOrgUnitId: actor?.orgUnitId ?? null,
      actorOrganizationId: actor?.organizationId ?? null,
      allowAll,
    });

    return { success: true, data: rows, pagination: { total, limit: lim, offset: off }, correlationId };
  }

  @Post('/sales-network/ledger/:ledgerEntryId/void')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('sales_network:ledger:manage')
  async voidLedgerEntry(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('ledgerEntryId') ledgerEntryId: string,
    @Body() body: any
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
    if (!reason) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'reason is required' }, correlationId };
    }

    auditLogger.info('sales_network.ledger.void.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'sales_network:ledger:manage',
      ledgerEntryId,
    });

    try {
      const row = await this.service.voidLedgerEntry({ ledgerEntryId, reason, actorUserId: actor?.userId ?? null });
      if (!row) return { success: false, error: { code: 'NOT_FOUND', message: 'Ledger entry not found' }, correlationId };
      return { success: true, data: row, correlationId };
    } catch (e: any) {
      return { success: false, error: { code: e?.code || 'INTERNAL_ERROR', message: e?.message || 'Failed to void' }, correlationId };
    }
  }

  @Post('/sales-network/ledger/:ledgerEntryId/pay')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('sales_network:ledger:manage')
  async payLedgerEntry(@Req() req: any, @Headers() headers: Record<string, any>, @Param('ledgerEntryId') ledgerEntryId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('sales_network.ledger.pay.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'sales_network:ledger:manage',
      ledgerEntryId,
    });

    try {
      const row = await this.service.markLedgerEntryPaid({ ledgerEntryId, actorUserId: actor?.userId ?? null });
      if (!row) return { success: false, error: { code: 'NOT_FOUND', message: 'Ledger entry not found' }, correlationId };
      return { success: true, data: row, correlationId };
    } catch (e: any) {
      return { success: false, error: { code: e?.code || 'INTERNAL_ERROR', message: e?.message || 'Failed to pay' }, correlationId };
    }
  }

  @Post('/sales-network/partners')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('sales_network:partners:manage')
  async upsertPartner(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('sales_network.partners.upsert.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'sales_network:partners:manage',
      orgUnitId: body?.orgUnitId,
    });

    if (typeof body?.orgUnitId !== 'string' || typeof body?.kind !== 'string' || typeof body?.displayName !== 'string') {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'orgUnitId, kind, displayName are required' }, correlationId };
    }

    const p = await this.service.upsertPartner({
      orgUnitId: body.orgUnitId,
      kind: body.kind,
      displayName: body.displayName,
      organizationId: body?.organizationId ?? null,
      parentPartnerId: body?.parentPartnerId ?? null,
      legalNationalId: body?.legalNationalId ?? null,
      licenseCode: body?.licenseCode ?? null,
      contactMobile: body?.contactMobile ?? null,
      contactEmail: body?.contactEmail ?? null,
      bankIban: body?.bankIban ?? null,
      metadata: body?.metadata && typeof body.metadata === 'object' ? body.metadata : null,
      actorUserId: actor?.userId ?? null,
    });

    return { success: true, data: p, correlationId };
  }

  @Post('/sales-network/partners/:orgUnitId/verify')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('sales_network:partners:manage')
  async verifyPartner(@Req() req: any, @Headers() headers: Record<string, any>, @Param('orgUnitId') orgUnitId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('sales_network.partners.verify.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'sales_network:partners:manage',
      orgUnitId,
    });

    const p = await this.service.verifyPartner({ orgUnitId, actorUserId: actor?.userId ?? null });
    if (!p) return { success: false, error: { code: 'NOT_FOUND', message: 'Partner not found' }, correlationId };
    return { success: true, data: p, correlationId };
  }

  @Post('/sales-network/partners/:orgUnitId/status')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('sales_network:partners:manage')
  async setPartnerStatus(@Req() req: any, @Headers() headers: Record<string, any>, @Param('orgUnitId') orgUnitId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    if (typeof body?.status !== 'string') {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'status is required' }, correlationId };
    }

    auditLogger.info('sales_network.partners.status.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'sales_network:partners:manage',
      orgUnitId,
      status: body.status,
    });

    const p = await this.service.setPartnerStatus({ orgUnitId, status: body.status, actorUserId: actor?.userId ?? null });
    if (!p) return { success: false, error: { code: 'NOT_FOUND', message: 'Partner not found' }, correlationId };
    return { success: true, data: p, correlationId };
  }

  @Get('/sales-network/contracts')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('sales_network:contracts:view')
  async listContracts(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('orgUnitId') orgUnitId?: string,
    @Query('status') status?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('sales_network.contracts.list.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'sales_network:contracts:view',
    });

    const { limit: lim, offset: off } = this.parsePagination(limit, offset);

    const roles: string[] = Array.isArray(actor?.roles) ? actor.roles : [];
    const allowAll = roles.includes('insurer_admin') || roles.includes('head_office_ops') || roles.includes('auditor');

    const { rows, total } = await this.service.listContracts({
      orgUnitId,
      status,
      limit: lim,
      offset: off,
      actorOrgUnitId: actor?.orgUnitId ?? null,
      allowAll,
    });

    return { success: true, data: rows, pagination: { total, limit: lim, offset: off }, correlationId };
  }

  @Post('/sales-network/contracts')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('sales_network:contracts:manage')
  async createContract(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    if (typeof body?.orgUnitId !== 'string' || typeof body?.base !== 'string' || typeof body?.effectiveFrom !== 'string') {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'orgUnitId, base, effectiveFrom are required' }, correlationId };
    }

    auditLogger.info('sales_network.contracts.create.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'sales_network:contracts:manage',
      orgUnitId: body.orgUnitId,
    });

    const c = await this.service.createContract({
      orgUnitId: body.orgUnitId,
      distributionAgreementId: body?.distributionAgreementId ?? null,
      lineOfBusiness: body?.lineOfBusiness ?? null,
      base: body.base,
      rateBps: typeof body?.rateBps === 'number' ? body.rateBps : null,
      fixedFeeAmount: body?.fixedFeeAmount !== undefined && body?.fixedFeeAmount !== null ? String(body.fixedFeeAmount) : null,
      splitPercentBps: typeof body?.splitPercentBps === 'number' ? body.splitPercentBps : null,
      capAmountMinor: body?.capAmountMinor !== undefined && body?.capAmountMinor !== null ? String(body.capAmountMinor) : null,
      floorAmountMinor: body?.floorAmountMinor !== undefined && body?.floorAmountMinor !== null ? String(body.floorAmountMinor) : null,
      currency: body?.currency ?? null,
      effectiveFrom: body.effectiveFrom,
      effectiveTo: body?.effectiveTo ?? null,
      rules: body?.rules && typeof body.rules === 'object' ? body.rules : null,
      notes: body?.notes ?? null,
      actorUserId: actor?.userId ?? null,
    });

    return { success: true, data: c, correlationId };
  }

  @Post('/sales-network/contracts/:contractId/activate')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('sales_network:contracts:manage')
  async activateContract(@Req() req: any, @Headers() headers: Record<string, any>, @Param('contractId') contractId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('sales_network.contracts.activate.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'sales_network:contracts:manage',
      contractId,
    });

    const c = await this.service.activateContract(contractId);
    if (!c) return { success: false, error: { code: 'NOT_FOUND', message: 'Contract not found' }, correlationId };
    return { success: true, data: c, correlationId };
  }

  @Get('/sales-network/ledger')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('sales_network:ledger:view')
  async listLedger(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('orgUnitId') orgUnitId?: string,
    @Query('status') status?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('sales_network.ledger.list.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'sales_network:ledger:view',
    });

    const { limit: lim, offset: off } = this.parsePagination(limit, offset);

    const roles: string[] = Array.isArray(actor?.roles) ? actor.roles : [];
    const allowAll = roles.includes('insurer_admin') || roles.includes('head_office_ops') || roles.includes('auditor');

    const { rows, total } = await this.service.listLedger({
      orgUnitId,
      status,
      limit: lim,
      offset: off,
      actorOrgUnitId: actor?.orgUnitId ?? null,
      allowAll,
    });

    return { success: true, data: rows, pagination: { total, limit: lim, offset: off }, correlationId };
  }

  @Get('/sales-network/kpi/daily')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('sales_network:kpi:view')
  async listKpiDaily(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('orgUnitId') orgUnitId?: string,
    @Query('dayFrom') dayFrom?: string,
    @Query('dayTo') dayTo?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('sales_network.kpi.daily.list.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'sales_network:kpi:view',
    });

    const { limit: lim, offset: off } = this.parsePagination(limit, offset);

    const roles: string[] = Array.isArray(actor?.roles) ? actor.roles : [];
    const allowAll = roles.includes('insurer_admin') || roles.includes('head_office_ops') || roles.includes('auditor');

    const { rows, total } = await this.service.listKpiDaily({
      orgUnitId,
      dayFrom,
      dayTo,
      limit: lim,
      offset: off,
      actorOrgUnitId: actor?.orgUnitId ?? null,
      allowAll,
    });

    return { success: true, data: rows, pagination: { total, limit: lim, offset: off }, correlationId };
  }

  @Get('/sales-network/agent/summary')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('sales_network:agent:view')
  async getAgentSummary(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('orgUnitId') orgUnitId?: string
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('sales_network.agent.summary.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'sales_network:agent:view',
      orgUnitId,
    });

    if (!orgUnitId) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'orgUnitId is required' }, correlationId };
    }

    const roles: string[] = Array.isArray(actor?.roles) ? actor.roles : [];
    const allowAll = roles.includes('insurer_admin') || roles.includes('head_office_ops') || roles.includes('auditor');

    const summary = await this.service.getAgentSummary({
      orgUnitId,
      actorOrgUnitId: actor?.orgUnitId ?? null,
      allowAll,
    });

    if (!summary) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Agent not found or access denied' }, correlationId };
    }

    return { success: true, data: summary, correlationId };
  }

  @Get('/sales-network/agent/policies')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('sales_network:agent:view')
  async getAgentPolicies(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('orgUnitId') orgUnitId?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('sales_network.agent.policies.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'sales_network:agent:view',
      orgUnitId,
    });

    if (!orgUnitId) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'orgUnitId is required' }, correlationId };
    }

    const { limit: lim, offset: off } = this.parsePagination(limit, offset);

    const roles: string[] = Array.isArray(actor?.roles) ? actor.roles : [];
    const allowAll = roles.includes('insurer_admin') || roles.includes('head_office_ops') || roles.includes('auditor');

    const { rows, total } = await this.service.getAgentPolicies({
      orgUnitId,
      limit: lim,
      offset: off,
      actorOrgUnitId: actor?.orgUnitId ?? null,
      allowAll,
    });

    return { success: true, data: rows, pagination: { total, limit: lim, offset: off }, correlationId };
  }

  @Post('/sales-network/commission/calculate')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('sales_network:ledger:view')
  async calculateCommission(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Body() body: any
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('sales_network.commission.calculate.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'sales_network:ledger:view',
    });

    if (!body?.policyId || !body?.orgUnitId || typeof body?.premiumAmount !== 'number') {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'policyId, orgUnitId, premiumAmount are required' }, correlationId };
    }

    try {
      const result = await this.service.calculateCommissionForPolicy({
        policyId: body.policyId,
        orgUnitId: body.orgUnitId,
        lineOfBusiness: body.lineOfBusiness || null,
        premiumAmount: body.premiumAmount,
        currency: body.currency,
        occurredAt: body.occurredAt ? new Date(body.occurredAt) : undefined,
      });

      return { success: true, data: result, correlationId };
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('sales_network.commission.calculate.failed', err, {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'sales_network:ledger:view',
      });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to calculate commission' }, correlationId };
    }
  }

  @Post('/sales-network/commission/recalculate')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('sales_network:ledger:manage')
  async recalculateCommission(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Body() body: any
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('sales_network.commission.recalculate.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'sales_network:ledger:manage',
    });

    if (!body?.policyId) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'policyId is required' }, correlationId };
    }

    try {
      const result = await this.service.recalculateCommissionForPolicy({
        policyId: body.policyId,
        actorUserId: actor?.userId,
      });

      if (!result.ledgerEntry) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Policy attribution or ledger entry not found' }, correlationId };
      }

      return { success: true, data: result, correlationId };
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('sales_network.commission.recalculate.failed', err, {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'sales_network:ledger:manage',
      });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to recalculate commission' }, correlationId };
    }
  }

  // Advanced performance reporting endpoints
  @Get('/sales-network/performance/trend')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('sales_network:kpi:view')
  async getPerformanceTrend(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('orgUnitId') orgUnitId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('metric') metric: string,
    @Query('granularity') granularity?: string
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('sales_network.performance.trend.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'sales_network:kpi:view',
      orgUnitId,
      metric,
    });

    const validMetrics = ['policiesIssued', 'policiesRenewed', 'policiesCancelled', 'complaintsCreated', 'premiumIssued', 'commissionAccrued'];
    if (!orgUnitId || !startDate || !endDate || !metric || !validMetrics.includes(metric)) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'orgUnitId, startDate, endDate, and valid metric are required' }, correlationId };
    }

    try {
      const result = await this.service.getPerformanceTrend({
        orgUnitId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        metric: metric as any,
        granularity: granularity as any,
      });

      return { success: true, data: result, correlationId };
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('sales_network.performance.trend.failed', err, {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'sales_network:kpi:view',
      });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get performance trend' }, correlationId };
    }
  }

  @Get('/sales-network/performance/compare-periods')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('sales_network:kpi:view')
  async comparePeriods(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('orgUnitId') orgUnitId: string,
    @Query('currentPeriodStart') currentPeriodStart: string,
    @Query('currentPeriodEnd') currentPeriodEnd: string,
    @Query('previousPeriodStart') previousPeriodStart: string,
    @Query('previousPeriodEnd') previousPeriodEnd: string
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('sales_network.performance.compare_periods.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'sales_network:kpi:view',
      orgUnitId,
    });

    if (!orgUnitId || !currentPeriodStart || !currentPeriodEnd || !previousPeriodStart || !previousPeriodEnd) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'All period parameters are required' }, correlationId };
    }

    try {
      const result = await this.service.comparePeriods({
        orgUnitId,
        currentPeriodStart: new Date(currentPeriodStart),
        currentPeriodEnd: new Date(currentPeriodEnd),
        previousPeriodStart: new Date(previousPeriodStart),
        previousPeriodEnd: new Date(previousPeriodEnd),
      });

      return { success: true, data: result, correlationId };
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('sales_network.performance.compare_periods.failed', err, {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'sales_network:kpi:view',
      });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to compare periods' }, correlationId };
    }
  }

  @Get('/sales-network/performance/top-performers')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('sales_network:kpi:view')
  async getTopPerformers(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('metric') metric: string,
    @Query('limit') limit?: string
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('sales_network.performance.top_performers.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'sales_network:kpi:view',
      metric,
    });

    const validMetrics = ['policiesIssued', 'policiesRenewed', 'premiumIssued', 'commissionAccrued'];
    if (!startDate || !endDate || !metric || !validMetrics.includes(metric)) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'startDate, endDate, and valid metric are required' }, correlationId };
    }

    try {
      const result = await this.service.getTopPerformers({
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        metric: metric as any,
        limit: limit ? parseInt(limit, 10) : undefined,
      });

      return { success: true, data: result, correlationId };
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('sales_network.performance.top_performers.failed', err, {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'sales_network:kpi:view',
      });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get top performers' }, correlationId };
    }
  }

  // ========== Agent Portal Endpoints ==========

  @Get('/sales-network/agents/:agentId/stats')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('sales_network:agents:view')
  async getAgentStats(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('agentId') agentId: string,
    @Query('organizationId') organizationId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('lineOfBusiness') lineOfBusiness?: string,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const partnerId = (headers['x-partner-id'] || headers['X-Partner-Id']) as string | undefined;
    const actor = req?.user as any;

    if (!partnerId) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'x-partner-id header is required' }, correlationId };
    }

    auditLogger.info('sales_network.agents.stats.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'sales_network:agents:view',
      agentId,
      partnerId,
    });

    try {
      const stats = await this.service.getAgentStats({ agentId, partnerId, organizationId: organizationId || actor?.organizationId || null, startDate, endDate, lineOfBusiness });
      return { success: true, data: stats, correlationId };
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('sales_network.agents.stats.failed', err, {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'sales_network:agents:view',
      });
      return { success: false, error: { code: e?.code || 'INTERNAL_ERROR', message: e?.message || 'Failed to get agent stats' }, correlationId };
    }
  }

  @Get('/sales-network/agents/:agentId/policies')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('sales_network:agents:view')
  async getAgentPolicies(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('agentId') agentId: string,
    @Query('organizationId') organizationId?: string,
    @Query('status') status?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const partnerId = (headers['x-partner-id'] || headers['X-Partner-Id']) as string | undefined;
    const actor = req?.user as any;

    if (!partnerId) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'x-partner-id header is required' }, correlationId };
    }

    auditLogger.info('sales_network.agents.policies.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'sales_network:agents:view',
      agentId,
      partnerId,
    });

    const { limit: lim, offset: off } = this.parsePagination(limit, offset);

    try {
      const { rows, total } = await this.service.getAgentPolicies({
        agentId,
        partnerId,
        organizationId: organizationId || actor?.organizationId || null,
        status,
        fromDate,
        toDate,
        limit: lim,
        offset: off,
      });
      return { success: true, data: rows, pagination: { total, limit: lim, offset: off }, correlationId };
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('sales_network.agents.policies.failed', err, {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'sales_network:agents:view',
      });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get agent policies' }, correlationId };
    }
  }

  @Get('/sales-network/agents/:agentId/claims')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('sales_network:agents:view')
  async getAgentClaims(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('agentId') agentId: string,
    @Query('organizationId') organizationId?: string,
    @Query('status') status?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const partnerId = (headers['x-partner-id'] || headers['X-Partner-Id']) as string | undefined;
    const actor = req?.user as any;

    if (!partnerId) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'x-partner-id header is required' }, correlationId };
    }

    auditLogger.info('sales_network.agents.claims.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'sales_network:agents:view',
      agentId,
      partnerId,
    });

    const { limit: lim, offset: off } = this.parsePagination(limit, offset);

    try {
      const { rows, total } = await this.service.getAgentClaims({
        agentId,
        partnerId,
        organizationId: organizationId || actor?.organizationId || null,
        status,
        fromDate,
        toDate,
        limit: lim,
        offset: off,
      });
      return { success: true, data: rows, pagination: { total, limit: lim, offset: off }, correlationId };
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('sales_network.agents.claims.failed', err, {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'sales_network:agents:view',
      });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get agent claims' }, correlationId };
    }
  }

  @Get('/sales-network/agents/:agentId/customers')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('sales_network:agents:view')
  async getAgentCustomers(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('agentId') agentId: string,
    @Query('organizationId') organizationId?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const partnerId = (headers['x-partner-id'] || headers['X-Partner-Id']) as string | undefined;
    const actor = req?.user as any;

    if (!partnerId) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'x-partner-id header is required' }, correlationId };
    }

    auditLogger.info('sales_network.agents.customers.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'sales_network:agents:view',
      agentId,
      partnerId,
    });

    const { limit: lim, offset: off } = this.parsePagination(limit, offset);

    try {
      const { rows, total } = await this.service.getAgentCustomers({
        agentId,
        partnerId,
        organizationId: organizationId || actor?.organizationId || null,
        limit: lim,
        offset: off,
      });
      return { success: true, data: rows, pagination: { total, limit: lim, offset: off }, correlationId };
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('sales_network.agents.customers.failed', err, {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'sales_network:agents:view',
      });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get agent customers' }, correlationId };
    }
  }

  @Get('/sales-network/agents/:agentId/commissions')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('sales_network:agents:view')
  async getAgentCommissions(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('agentId') agentId: string,
    @Query('organizationId') organizationId?: string,
    @Query('status') status?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const partnerId = (headers['x-partner-id'] || headers['X-Partner-Id']) as string | undefined;
    const actor = req?.user as any;

    if (!partnerId) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'x-partner-id header is required' }, correlationId };
    }

    auditLogger.info('sales_network.agents.commissions.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'sales_network:agents:view',
      agentId,
      partnerId,
    });

    const { limit: lim, offset: off } = this.parsePagination(limit, offset);

    try {
      const { rows, total } = await this.service.getAgentCommissions({
        agentId,
        partnerId,
        organizationId: organizationId || actor?.organizationId || null,
        status,
        fromDate,
        toDate,
        limit: lim,
        offset: off,
      });
      return { success: true, data: rows, pagination: { total, limit: lim, offset: off }, correlationId };
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('sales_network.agents.commissions.failed', err, {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'sales_network:agents:view',
      });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get agent commissions' }, correlationId };
    }
  }

  @Get('/sales-network/agents/:agentId/kpis')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('sales_network:agents:view')
  async getAgentKpis(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('agentId') agentId: string,
    @Query('organizationId') organizationId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('granularity') granularity?: string
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const partnerId = (headers['x-partner-id'] || headers['X-Partner-Id']) as string | undefined;
    const actor = req?.user as any;

    if (!partnerId) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'x-partner-id header is required' }, correlationId };
    }

    auditLogger.info('sales_network.agents.kpis.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'sales_network:agents:view',
      agentId,
      partnerId,
    });

    try {
      const kpis = await this.service.getAgentKpis({
        agentId,
        partnerId,
        organizationId: organizationId || actor?.organizationId || null,
        fromDate,
        toDate,
        granularity: granularity as 'daily' | 'monthly' | undefined,
      });
      return { success: true, data: kpis, correlationId };
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('sales_network.agents.kpis.failed', err, {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 'sales_network:agents:view',
      });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get agent kpis' }, correlationId };
    }
  }

  // ========== Distribution Agreement Management Endpoints ==========

  @Get('/sales-network/agreements')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('sales_network:agreements:view')
  async listDistributionAgreements(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('carrierOrganizationId') carrierOrganizationId?: string,
    @Query('distributorOrganizationId') distributorOrganizationId?: string,
    @Query('status') status?: string,
    @Query('agreementType') agreementType?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;
    const lim = Math.min(parseInt(limit || '20', 10) || 20, 100);
    const off = parseInt(offset || '0', 10) || 0;

    auditLogger.info('sales_network.agreements.list.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'sales_network:agreements:view',
    });

    try {
      const result = await this.service.listDistributionAgreements({
        carrierOrganizationId,
        distributorOrganizationId,
        status,
        agreementType,
        limit: lim,
        offset: off,
      });
      return { success: true, data: result.rows, pagination: { total: result.total, limit: lim, offset: off }, correlationId };
    } catch (e: any) {
      return { success: false, error: { code: 'INTERNAL_ERROR', message: e?.message || 'Failed to list distribution agreements' }, correlationId };
    }
  }

  @Get('/sales-network/agreements/:agreementId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('sales_network:agreements:view')
  async getDistributionAgreement(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('agreementId') agreementId: string,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('sales_network.agreements.get.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'sales_network:agreements:view',
      agreementId,
    });

    try {
      const agreement = await this.service.getDistributionAgreement(agreementId);
      if (!agreement) return { success: false, error: { code: 'NOT_FOUND', message: 'Distribution agreement not found' }, correlationId };
      return { success: true, data: agreement, correlationId };
    } catch (e: any) {
      return { success: false, error: { code: 'INTERNAL_ERROR', message: e?.message || 'Failed to get distribution agreement' }, correlationId };
    }
  }

  @Post('/sales-network/agreements')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('sales_network:agreements:manage')
  async createDistributionAgreement(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Body() body: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    if (!body?.carrierOrganizationId || !body?.distributorOrganizationId || !body?.agreementType || !body?.effectiveFrom || !body?.bindingAuthorityAmountMinor) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'carrierOrganizationId, distributorOrganizationId, agreementType, effectiveFrom, and bindingAuthorityAmountMinor are required' }, correlationId };
    }

    auditLogger.info('sales_network.agreements.create.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'sales_network:agreements:manage',
    });

    try {
      const agreement = await this.service.createDistributionAgreement({
        tenantId: tenantId || 'default',
        carrierOrganizationId: body.carrierOrganizationId,
        distributorOrganizationId: body.distributorOrganizationId,
        agreementType: body.agreementType,
        effectiveFrom: body.effectiveFrom,
        effectiveTo: body?.effectiveTo ?? null,
        linesOfBusiness: body?.linesOfBusiness,
        productScope: body?.productScope,
        territories: body?.territories,
        bindingAuthorityAmountMinor: body.bindingAuthorityAmountMinor,
        bindingAuthorityCurrency: body?.bindingAuthorityCurrency,
        settlementTerms: body?.settlementTerms,
        documentRefs: body?.documentRefs,
        actorUserId: actor?.userId ?? null,
        correlationId,
      });
      return { success: true, data: agreement, correlationId };
    } catch (e: any) {
      return { success: false, error: { code: e?.code || 'INTERNAL_ERROR', message: e?.message || 'Failed to create distribution agreement' }, correlationId };
    }
  }

  @Post('/sales-network/agreements/:agreementId/activate')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('sales_network:agreements:manage')
  async activateDistributionAgreement(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('agreementId') agreementId: string,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('sales_network.agreements.activate.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'sales_network:agreements:manage',
      agreementId,
    });

    try {
      const result = await this.service.activateDistributionAgreement({
        agreementId,
        actorUserId: actor?.userId ?? null,
        correlationId,
      });
      if (!result) return { success: false, error: { code: 'NOT_FOUND', message: 'Distribution agreement not found' }, correlationId };
      return { success: true, data: result, correlationId };
    } catch (e: any) {
      return { success: false, error: { code: 'INTERNAL_ERROR', message: e?.message || 'Failed to activate distribution agreement' }, correlationId };
    }
  }

  @Post('/sales-network/agreements/:agreementId/terminate')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('sales_network:agreements:manage')
  async terminateDistributionAgreement(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('agreementId') agreementId: string,
    @Body() body: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('sales_network.agreements.terminate.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'sales_network:agreements:manage',
      agreementId,
    });

    try {
      const result = await this.service.terminateDistributionAgreement({
        agreementId,
        reason: body?.reason,
        actorUserId: actor?.userId ?? null,
        correlationId,
      });
      if (!result) return { success: false, error: { code: 'NOT_FOUND', message: 'Distribution agreement not found' }, correlationId };
      return { success: true, data: result, correlationId };
    } catch (e: any) {
      return { success: false, error: { code: 'INTERNAL_ERROR', message: e?.message || 'Failed to terminate distribution agreement' }, correlationId };
    }
  }

  // ========== Commission Tier Management Endpoints ==========

  @Get('/sales-network/agreements/:agreementId/tiers')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('sales_network:agreements:view')
  async listCommissionTiers(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('agreementId') agreementId: string,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const actor = req?.user as any;

    auditLogger.info('sales_network.tiers.list.request', {
      correlationId,
      actorUserId: actor?.userId,
      action: 'sales_network:agreements:view',
      agreementId,
    });

    try {
      const tiers = await this.service.listCommissionTiers(agreementId);
      return { success: true, data: tiers, correlationId };
    } catch (e: any) {
      return { success: false, error: { code: 'INTERNAL_ERROR', message: e?.message || 'Failed to list commission tiers' }, correlationId };
    }
  }

  @Post('/sales-network/agreements/:agreementId/tiers')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('sales_network:agreements:manage')
  async createCommissionTier(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('agreementId') agreementId: string,
    @Body() body: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const actor = req?.user as any;

    if (!body?.tierType) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'tierType is required' }, correlationId };
    }

    auditLogger.info('sales_network.tiers.create.request', {
      correlationId,
      actorUserId: actor?.userId,
      action: 'sales_network:agreements:manage',
      agreementId,
    });

    try {
      const tier = await this.service.createCommissionTier({
        agreementId,
        tierType: body.tierType,
        lineOfBusiness: body?.lineOfBusiness,
        minPremiumAmountMinor: body?.minPremiumAmountMinor,
        maxPremiumAmountMinor: body?.maxPremiumAmountMinor,
        rateBps: body?.rateBps,
        fixedAmountMinor: body?.fixedAmountMinor,
        capAmountMinor: body?.capAmountMinor,
        floorAmountMinor: body?.floorAmountMinor,
        splitPercentBps: body?.splitPercentBps,
        hierarchyLevel: body?.hierarchyLevel,
        currency: body?.currency,
        rules: body?.rules,
      });
      return { success: true, data: tier, correlationId };
    } catch (e: any) {
      return { success: false, error: { code: 'INTERNAL_ERROR', message: e?.message || 'Failed to create commission tier' }, correlationId };
    }
  }

  @Post('/sales-network/tiers/:tierId/delete')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('sales_network:agreements:manage')
  async deleteCommissionTier(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('tierId') tierId: string,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const actor = req?.user as any;

    auditLogger.info('sales_network.tiers.delete.request', {
      correlationId,
      actorUserId: actor?.userId,
      action: 'sales_network:agreements:manage',
      tierId,
    });

    try {
      await this.service.deleteCommissionTier(tierId);
      return { success: true, correlationId };
    } catch (e: any) {
      return { success: false, error: { code: 'INTERNAL_ERROR', message: e?.message || 'Failed to delete commission tier' }, correlationId };
    }
  }

  // ========== Clawback Rule Management Endpoints ==========

  @Get('/sales-network/agreements/:agreementId/clawback-rules')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('sales_network:agreements:view')
  async listClawbackRules(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('agreementId') agreementId: string,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const actor = req?.user as any;

    auditLogger.info('sales_network.clawback_rules.list.request', {
      correlationId,
      actorUserId: actor?.userId,
      action: 'sales_network:agreements:view',
      agreementId,
    });

    try {
      const rules = await this.service.listClawbackRules(agreementId);
      return { success: true, data: rules, correlationId };
    } catch (e: any) {
      return { success: false, error: { code: 'INTERNAL_ERROR', message: e?.message || 'Failed to list clawback rules' }, correlationId };
    }
  }

  @Post('/sales-network/agreements/:agreementId/clawback-rules')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('sales_network:agreements:manage')
  async createClawbackRule(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('agreementId') agreementId: string,
    @Body() body: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const actor = req?.user as any;

    if (!body?.triggerEvent) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'triggerEvent is required' }, correlationId };
    }

    auditLogger.info('sales_network.clawback_rules.create.request', {
      correlationId,
      actorUserId: actor?.userId,
      action: 'sales_network:agreements:manage',
      agreementId,
    });

    try {
      const rule = await this.service.createClawbackRule({
        agreementId,
        triggerEvent: body.triggerEvent,
        windowDays: body?.windowDays,
        rateBps: body?.rateBps,
        fixedAmountMinor: body?.fixedAmountMinor,
        currency: body?.currency,
        rules: body?.rules,
      });
      return { success: true, data: rule, correlationId };
    } catch (e: any) {
      return { success: false, error: { code: 'INTERNAL_ERROR', message: e?.message || 'Failed to create clawback rule' }, correlationId };
    }
  }

  @Post('/sales-network/clawback-rules/:ruleId/delete')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('sales_network:agreements:manage')
  async deleteClawbackRule(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('ruleId') ruleId: string,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const actor = req?.user as any;

    auditLogger.info('sales_network.clawback_rules.delete.request', {
      correlationId,
      actorUserId: actor?.userId,
      action: 'sales_network:agreements:manage',
      ruleId,
    });

    try {
      await this.service.deleteClawbackRule(ruleId);
      return { success: true, correlationId };
    } catch (e: any) {
      return { success: false, error: { code: 'INTERNAL_ERROR', message: e?.message || 'Failed to delete clawback rule' }, correlationId };
    }
  }

  // ========== Broker Sub-Agent Management Endpoints ==========

  @Get('/sales-network/broker/:brokerPartnerId/sub-agents')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('sales_network:broker:sub_agents:view')
  async listSubAgents(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('brokerPartnerId') brokerPartnerId: string,
    @Query('status') status?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('sales_network.broker.sub_agents.list.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'sales_network:broker:sub_agents:view',
      brokerPartnerId,
    });

    const { limit: lim, offset: off } = this.parsePagination(limit, offset);

    try {
      const { rows, total } = await this.service.listSubAgents({
        brokerPartnerId,
        status: status as any,
        limit: lim,
        offset: off,
      });
      return { success: true, data: rows, pagination: { total, limit: lim, offset: off }, correlationId };
    } catch (e: any) {
      return { success: false, error: { code: e?.code || 'INTERNAL_ERROR', message: e?.message || 'Failed to list sub-agents' }, correlationId };
    }
  }

  @Post('/sales-network/broker/:brokerPartnerId/sub-agents')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('sales_network:broker:sub_agents:manage')
  async createSubAgent(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('brokerPartnerId') brokerPartnerId: string,
    @Body() body: any
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    if (typeof body?.orgUnitId !== 'string' || typeof body?.displayName !== 'string') {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'orgUnitId and displayName are required' }, correlationId };
    }

    auditLogger.info('sales_network.broker.sub_agents.create.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'sales_network:broker:sub_agents:manage',
      brokerPartnerId,
    });

    try {
      const subAgent = await this.service.createSubAgent({
        brokerPartnerId,
        orgUnitId: body.orgUnitId,
        displayName: body.displayName,
        organizationId: body?.organizationId ?? null,
        legalNationalId: body?.legalNationalId ?? null,
        licenseCode: body?.licenseCode ?? null,
        contactMobile: body?.contactMobile ?? null,
        contactEmail: body?.contactEmail ?? null,
        bankIban: body?.bankIban ?? null,
        metadata: body?.metadata && typeof body.metadata === 'object' ? body.metadata : null,
        actorUserId: actor?.userId ?? null,
        correlationId,
      });
      return { success: true, data: subAgent, correlationId };
    } catch (e: any) {
      return { success: false, error: { code: e?.code || 'INTERNAL_ERROR', message: e?.message || 'Failed to create sub-agent' }, correlationId };
    }
  }

  @Post('/sales-network/broker/:brokerPartnerId/sub-agents/:subAgentPartnerId/suspend')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('sales_network:broker:sub_agents:manage')
  async suspendSubAgent(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('brokerPartnerId') brokerPartnerId: string,
    @Param('subAgentPartnerId') subAgentPartnerId: string
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('sales_network.broker.sub_agents.suspend.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'sales_network:broker:sub_agents:manage',
      brokerPartnerId,
      subAgentPartnerId,
    });

    try {
      const result = await this.service.suspendSubAgent({
        brokerPartnerId,
        subAgentPartnerId,
        actorUserId: actor?.userId ?? null,
        correlationId,
      });
      if (!result) return { success: false, error: { code: 'NOT_FOUND', message: 'Sub-agent not found or not under this broker' }, correlationId };
      return { success: true, data: result, correlationId };
    } catch (e: any) {
      return { success: false, error: { code: e?.code || 'INTERNAL_ERROR', message: e?.message || 'Failed to suspend sub-agent' }, correlationId };
    }
  }

  @Post('/sales-network/broker/:brokerPartnerId/sub-agents/:subAgentPartnerId/terminate')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('sales_network:broker:sub_agents:manage')
  async terminateSubAgent(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('brokerPartnerId') brokerPartnerId: string,
    @Param('subAgentPartnerId') subAgentPartnerId: string
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('sales_network.broker.sub_agents.terminate.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'sales_network:broker:sub_agents:manage',
      brokerPartnerId,
      subAgentPartnerId,
    });

    try {
      const result = await this.service.terminateSubAgent({
        brokerPartnerId,
        subAgentPartnerId,
        actorUserId: actor?.userId ?? null,
        correlationId,
      });
      if (!result) return { success: false, error: { code: 'NOT_FOUND', message: 'Sub-agent not found or not under this broker' }, correlationId };
      return { success: true, data: result, correlationId };
    } catch (e: any) {
      return { success: false, error: { code: e?.code || 'INTERNAL_ERROR', message: e?.message || 'Failed to terminate sub-agent' }, correlationId };
    }
  }

  // ========== Broker Dashboard Endpoint ==========

  @Get('/sales-network/broker/:brokerPartnerId/dashboard')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('sales_network:broker:dashboard:view')
  async getBrokerDashboard(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('brokerPartnerId') brokerPartnerId: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('sales_network.broker.dashboard.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'sales_network:broker:dashboard:view',
      brokerPartnerId,
    });

    try {
      const dashboard = await this.service.getBrokerDashboard({
        brokerPartnerId,
        fromDate,
        toDate,
      });
      return { success: true, data: dashboard, correlationId };
    } catch (e: any) {
      return { success: false, error: { code: e?.code || 'INTERNAL_ERROR', message: e?.message || 'Failed to get broker dashboard' }, correlationId };
    }
  }

  // ========== Contract Termination Endpoint ==========

  @Post('/sales-network/contracts/:contractId/terminate')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('sales_network:contracts:manage')
  async terminateContract(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('contractId') contractId: string,
    @Body() body: any
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
    if (!reason) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'reason is required' }, correlationId };
    }

    auditLogger.info('sales_network.contracts.terminate.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'sales_network:contracts:manage',
      contractId,
    });

    const c = await this.service.terminateContract(contractId, reason, actor?.userId ?? null, correlationId);
    if (!c) return { success: false, error: { code: 'NOT_FOUND', message: 'Contract not found' }, correlationId };
    return { success: true, data: c, correlationId };
  }

  // ========== Ledger Reconciliation Endpoint ==========

  @Get('/sales-network/ledger/reconciliation')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('sales_network:ledger:view')
  async getLedgerReconciliation(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('orgUnitId') orgUnitId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('sales_network.ledger.reconciliation.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 'sales_network:ledger:view',
      orgUnitId,
    });

    try {
      const result = await this.service.getLedgerReconciliation({
        orgUnitId,
        fromDate,
        toDate,
      });
      return { success: true, data: result, correlationId };
    } catch (e: any) {
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get ledger reconciliation' }, correlationId };
    }
  }

  // ========== Lead Management Endpoints ==========

  @Post('/sales-network/leads')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('sales_network:leads:manage')
  async createLead(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Body() body: {
      partnerId: string;
      agentId?: string;
      customerName: string;
      phone: string;
      email?: string;
      productInterest: string;
      priority?: string;
      notes?: string;
    },
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string;
    try {
      const lead = await this.service.createLead({
        tenantId,
        partnerId: body.partnerId,
        agentId: body.agentId,
        organizationId: req?.user?.organizationId,
        customerName: body.customerName,
        phone: body.phone,
        email: body.email,
        productInterest: body.productInterest,
        priority: body.priority as any,
        notes: body.notes,
        correlationId,
      });
      return { success: true, data: lead, correlationId };
    } catch (e: any) {
      return { success: false, error: { code: e?.code || 'INTERNAL_ERROR', message: e?.message || 'Failed to create lead' }, correlationId };
    }
  }

  @Get('/sales-network/leads')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('sales_network:leads:view')
  async listLeads(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('agentId') agentId?: string,
    @Query('partnerId') partnerId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string;
    const result = await this.service.listLeads({
      agentId,
      partnerId,
      tenantId,
      status: status as any,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
    return { success: true, data: result.rows, pagination: { total: result.total }, correlationId };
  }

  @Patch('/sales-network/leads/:leadId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('sales_network:leads:manage')
  async updateLead(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('leadId') leadId: string,
    @Body() body: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string;
    const lead = await this.service.updateLead({ leadId, tenantId, ...body });
    if (!lead) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Lead not found' }, correlationId };
    }
    return { success: true, data: lead, correlationId };
  }

  @Post('/sales-network/leads/:leadId/assign')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('sales_network:leads:manage')
  async assignLead(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('leadId') leadId: string,
    @Body() body: { assignedTo: string },
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string;
    const lead = await this.service.assignLead({ leadId, tenantId, assignedTo: body.assignedTo });
    if (!lead) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Lead not found' }, correlationId };
    }
    return { success: true, data: lead, correlationId };
  }

  @Post('/sales-network/leads/:leadId/convert')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('sales_network:leads:manage')
  async convertLead(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('leadId') leadId: string,
    @Body() body: { submissionId: string },
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string;
    const lead = await this.service.convertLead({ leadId, tenantId, submissionId: body.submissionId });
    if (!lead) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Lead not found' }, correlationId };
    }
    return { success: true, data: lead, correlationId };
  }
}
