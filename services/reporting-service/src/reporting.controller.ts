import { Body, Controller, Get, Headers, Param, Post, Put, Query, UseGuards , Req} from '@nestjs/common';
import { ReportingService } from './reporting.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermissions } from './permissions.decorator';
import { auditLogger } from './audit.logger';
import { TenantGuard } from './tenant.guard';

@Controller()
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  private readonly GOVERNED_GAP_KPIS = new Set<string>([
    'customer_satisfaction_rate',
    'financial_solvency_ratio',
    'market_share_percent',
  ]);

  private isUtcBoundary(d: Date, hour: number, minute: number, second: number, ms: number): boolean {
    return d.getUTCHours() === hour && d.getUTCMinutes() === minute && d.getUTCSeconds() === second && d.getUTCMilliseconds() === ms;
  }

  private isStartOfUtcDay(d: Date): boolean {
    return this.isUtcBoundary(d, 0, 0, 0, 0);
  }

  private isStartOfUtcWeek(d: Date): boolean {
    // ISO week start: Monday 00:00:00.000 UTC
    // JS getUTCDay(): 0=Sun, 1=Mon, ... 6=Sat
    return d.getUTCDay() === 1 && this.isStartOfUtcDay(d);
  }

  private isStartOfUtcMonth(d: Date): boolean {
    return d.getUTCDate() === 1 && this.isStartOfUtcDay(d);
  }

  private isStartOfUtcYear(d: Date): boolean {
    return d.getUTCMonth() === 0 && this.isStartOfUtcMonth(d);
  }

  private isStartOfUtcQuarter(d: Date): boolean {
    const m = d.getUTCMonth();
    const isQuarterMonth = m === 0 || m === 3 || m === 6 || m === 9;
    return isQuarterMonth && this.isStartOfUtcMonth(d);
  }

  private startOfNextUtcMonth(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  }

  private startOfNextUtcDay(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 0, 0, 0));
  }

  private startOfNextUtcWeek(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 7, 0, 0, 0, 0));
  }

  private startOfNextUtcQuarter(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 3, 1, 0, 0, 0, 0));
  }

  private startOfNextUtcYear(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear() + 1, 0, 1, 0, 0, 0, 0));
  }

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  @Get('/reporting/kpis/ready')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions('reporting:view')
  async readyKpis(@Headers() headers: Record<string, any>, @Req() req: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user?.userId as string | undefined;

    auditLogger.info('reporting.kpis.ready.request', {
      correlationId,
      tenantId,
      actorUserId: actor,
      action: 'reporting:view',
    });

    const data = await this.reportingService.getReadyKpis({ now: new Date() });
    return { success: true, data, correlationId };
  }

  @Get('/reporting/ri/ceded')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions('reporting:view')
  async listRiCeded(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Query('contractId') contractId?: string,
    @Query('policyId') policyId?: string,
    @Query('claimId') claimId?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user?.userId as string | undefined;

    const lim = parseInt(limit, 10);
    const off = parseInt(offset, 10);

    auditLogger.info('reporting.ri.ceded.list.request', {
      correlationId,
      tenantId,
      actorUserId: actor,
      action: 'reporting:view',
      contractId,
      policyId,
      claimId,
      limit: lim,
      offset: off,
    });

    const { rows, total } = await this.reportingService.listRiCeded({
      contractId,
      policyId,
      claimId,
      limit: Number.isFinite(lim) ? lim : 50,
      offset: Number.isFinite(off) ? off : 0,
    });

    return {
      success: true,
      data: rows,
      pagination: {
        total,
        limit: Number.isFinite(lim) ? lim : 50,
        offset: Number.isFinite(off) ? off : 0,
      },
      correlationId,
    };
  }

  @Get('/reporting/claims/payments')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions('reporting:view')
  async listClaimPayments(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Query('claimId') claimId?: string,
    @Query('policyId') policyId?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user?.userId as string | undefined;
    const lim = parseInt(limit, 10);
    const off = parseInt(offset, 10);

    auditLogger.info('reporting.claim.payments.list.request', {
      correlationId,
      tenantId,
      actorUserId: actor,
      action: 'reporting:view',
      claimId,
      policyId,
      limit: lim,
      offset: off,
    });

    const { rows, total } = await this.reportingService.listClaimPayments({
      claimId,
      policyId,
      limit: Number.isFinite(lim) ? lim : 50,
      offset: Number.isFinite(off) ? off : 0,
    });

    return {
      success: true,
      data: rows,
      pagination: {
        total,
        limit: Number.isFinite(lim) ? lim : 50,
        offset: Number.isFinite(off) ? off : 0,
      },
      correlationId,
    };
  }

  @Get('/reporting/fraud/case-escalations')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions('reporting:view')
  async listFraudCaseEscalations(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Query('claimId') claimId?: string,
    @Query('fraudCaseId') fraudCaseId?: string,
    @Query('toUnit') toUnit?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user?.userId as string | undefined;
    const lim = parseInt(limit, 10);
    const off = parseInt(offset, 10);

    auditLogger.info('reporting.fraud.case_escalations.list.request', {
      correlationId,
      tenantId,
      actorUserId: actor,
      action: 'reporting:view',
      claimId,
      fraudCaseId,
      toUnit,
      limit: lim,
      offset: off,
    });

    const { rows, total } = await this.reportingService.listFraudCaseEscalations({
      claimId,
      fraudCaseId,
      toUnit,
      limit: Number.isFinite(lim) ? lim : 50,
      offset: Number.isFinite(off) ? off : 0,
    });

    return {
      success: true,
      data: rows,
      pagination: {
        total,
        limit: Number.isFinite(lim) ? lim : 50,
        offset: Number.isFinite(off) ? off : 0,
      },
      correlationId,
    };
  }

  @Get('/reporting/complaints/sla-breaches')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions('reporting:view')
  async listComplaintSlaBreaches(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Query('complaintId') complaintId?: string,
    @Query('claimId') claimId?: string,
    @Query('policyId') policyId?: string,
    @Query('status') status?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user?.userId as string | undefined;
    const lim = parseInt(limit, 10);
    const off = parseInt(offset, 10);

    auditLogger.info('reporting.complaints.sla_breaches.list.request', {
      correlationId,
      tenantId,
      actorUserId: actor,
      action: 'reporting:view',
      complaintId,
      claimId,
      policyId,
      status,
      assignedTo,
      limit: lim,
      offset: off,
    });

    const { rows, total } = await this.reportingService.listComplaintSlaBreaches({
      complaintId,
      claimId,
      policyId,
      status,
      assignedTo,
      limit: Number.isFinite(lim) ? lim : 50,
      offset: Number.isFinite(off) ? off : 0,
    });

    return {
      success: true,
      data: rows,
      pagination: {
        total,
        limit: Number.isFinite(lim) ? lim : 50,
        offset: Number.isFinite(off) ? off : 0,
      },
      correlationId,
    };
  }

  @Get('/reporting/claims/documents-attached')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions('reporting:view')
  async listClaimDocumentsAttached(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Query('claimId') claimId?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user?.userId as string | undefined;
    const lim = parseInt(limit, 10);
    const off = parseInt(offset, 10);

    auditLogger.info('reporting.claim.documents_attached.list.request', {
      correlationId,
      tenantId,
      actorUserId: actor,
      action: 'reporting:view',
      claimId,
      limit: lim,
      offset: off,
    });

    const { rows, total } = await this.reportingService.listClaimDocumentsAttached({
      claimId,
      limit: Number.isFinite(lim) ? lim : 50,
      offset: Number.isFinite(off) ? off : 0,
    });

    return {
      success: true,
      data: rows,
      pagination: {
        total,
        limit: Number.isFinite(lim) ? lim : 50,
        offset: Number.isFinite(off) ? off : 0,
      },
      correlationId,
    };
  }

  @Get('/reporting/ri/borderaux')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions('reporting:view')
  async listRiBorderaux(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Query('contractId') contractId?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user?.userId as string | undefined;
    const lim = parseInt(limit, 10);
    const off = parseInt(offset, 10);

    auditLogger.info('reporting.ri.borderaux.list.request', {
      correlationId,
      tenantId,
      actorUserId: actor,
      action: 'reporting:view',
      contractId,
      limit: lim,
      offset: off,
    });

    const { rows, total } = await this.reportingService.listRiBorderaux({
      contractId,
      limit: Number.isFinite(lim) ? lim : 50,
      offset: Number.isFinite(off) ? off : 0,
    });

    return {
      success: true,
      data: rows,
      pagination: {
        total,
        limit: Number.isFinite(lim) ? lim : 50,
        offset: Number.isFinite(off) ? off : 0,
      },
      correlationId,
    };
  }

  @Get('/reporting/ri/recoveries')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions('reporting:view')
  async listRiRecoveries(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Query('contractId') contractId?: string,
    @Query('claimId') claimId?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user?.userId as string | undefined;
    const lim = parseInt(limit, 10);
    const off = parseInt(offset, 10);

    auditLogger.info('reporting.ri.recoveries.list.request', {
      correlationId,
      tenantId,
      actorUserId: actor,
      action: 'reporting:view',
      contractId,
      claimId,
      limit: lim,
      offset: off,
    });

    const { rows, total } = await this.reportingService.listRiRecoveries({
      contractId,
      claimId,
      limit: Number.isFinite(lim) ? lim : 50,
      offset: Number.isFinite(off) ? off : 0,
    });

    return {
      success: true,
      data: rows,
      pagination: {
        total,
        limit: Number.isFinite(lim) ? lim : 50,
        offset: Number.isFinite(off) ? off : 0,
      },
      correlationId,
    };
  }

  @Get('/reporting/kpis/governance')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions('reporting:projections:admin')
  async listGovernancePolicies(@Headers() headers: Record<string, any>, @Req() req: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user?.userId as string | undefined;

    auditLogger.info('reporting.kpis.governance.list.request', {
      correlationId,
      tenantId,
      actorUserId: actor,
      action: 'reporting:projections:admin',
    });

    const rows = await this.reportingService.listGovernancePolicies();
    return { success: true, data: rows, correlationId };
  }

  @Get('/reporting/kpis/governance/:kpiKey')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions('reporting:projections:admin')
  async getGovernancePolicy(@Headers() headers: Record<string, any>, @Req() req: any, @Param('kpiKey') kpiKey: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user?.userId as string | undefined;

    const rec = await this.reportingService.getGovernancePolicy(kpiKey);
    if (!rec) {
      auditLogger.warn('reporting.kpis.governance.get.not_found', {
        correlationId,
        tenantId,
        actorUserId: actor,
        action: 'reporting:projections:admin',
        kpiKey,
      });
      return { success: false, error: { code: 'NOT_FOUND', message: 'Governance policy not found' }, correlationId };
    }

    return { success: true, data: rec, correlationId };
  }

  @Put('/reporting/kpis/governance/:kpiKey')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions('reporting:projections:admin')
  async upsertGovernancePolicy(@Headers() headers: Record<string, any>, @Req() req: any, @Param('kpiKey') kpiKey: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user?.userId as string | undefined;

    const errors: string[] = [];
    const allowedPeriodGranularities = Array.isArray(body?.allowedPeriodGranularities)
      ? body.allowedPeriodGranularities.filter((x: any) => typeof x === 'string' && x.trim().length > 0)
      : null;
    const allowedSourceSystems = Array.isArray(body?.allowedSourceSystems)
      ? body.allowedSourceSystems.filter((x: any) => typeof x === 'string' && x.trim().length > 0)
      : null;

    if (!kpiKey || typeof kpiKey !== 'string' || kpiKey.trim().length === 0) errors.push('kpiKey is required (path param)');
    if (!allowedPeriodGranularities || allowedPeriodGranularities.length === 0) errors.push('allowedPeriodGranularities is required (string[])');
    if (!allowedSourceSystems || allowedSourceSystems.length === 0) errors.push('allowedSourceSystems is required (string[])');

    const expectedUnit =
      body?.expectedUnit === undefined || body?.expectedUnit === null || typeof body?.expectedUnit === 'string'
        ? body.expectedUnit
        : '__invalid__';
    if (expectedUnit === '__invalid__') errors.push('expectedUnit must be string, null, or omitted');

    const minValue = body?.minValue === null || typeof body?.minValue === 'number' ? body.minValue : undefined;
    const maxValue = body?.maxValue === null || typeof body?.maxValue === 'number' ? body.maxValue : undefined;
    if (minValue === undefined) errors.push('minValue must be number or null');
    if (maxValue === undefined) errors.push('maxValue must be number or null');
    if (typeof minValue === 'number' && typeof maxValue === 'number' && minValue > maxValue) errors.push('minValue must be <= maxValue');

    const enforced = typeof body?.enforced === 'boolean' ? body.enforced : undefined;
    if (enforced === undefined) errors.push('enforced is required (boolean)');

    if (errors.length > 0) {
      auditLogger.warn('reporting.kpis.governance.upsert.validation_failed', {
        correlationId,
        tenantId,
        actorUserId: actor,
        action: 'reporting:projections:admin',
        kpiKey,
        errors,
      });
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid governance policy', details: { errors } }, correlationId };
    }

    auditLogger.info('reporting.kpis.governance.upsert.request', {
      correlationId,
      tenantId,
      actorUserId: actor,
      action: 'reporting:projections:admin',
      kpiKey,
    });

    const rec = await this.reportingService.upsertGovernancePolicy({
      kpiKey: kpiKey.trim(),
      allowedPeriodGranularities: allowedPeriodGranularities!,
      allowedSourceSystems: allowedSourceSystems!,
      expectedUnit: expectedUnit === undefined ? null : (expectedUnit as any),
      minValue: minValue as any,
      maxValue: maxValue as any,
      enforced: enforced!,
    });

    return { success: true, data: rec, correlationId };
  }

  @Post('/reporting/kpis/snapshots')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions('reporting:ingest')
  async ingestSnapshot(@Headers() headers: Record<string, any>, @Req() req: any, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user?.userId as string | undefined;
    const idempotencyKey = (headers['idempotency-key'] || headers['Idempotency-Key']) as string | undefined;

    auditLogger.info('reporting.kpis.snapshots.ingest.request', {
      correlationId,
      tenantId,
      actorUserId: actor,
      action: 'reporting:ingest',
    });

    const errors: string[] = [];
    if (!idempotencyKey || typeof idempotencyKey !== 'string' || idempotencyKey.trim().length < 8) {
      errors.push('Idempotency-Key header is required (min length 8)');
    }
    if (!body?.kpiKey || typeof body.kpiKey !== 'string') errors.push('kpiKey is required (string)');
    if (typeof body?.value !== 'number' || !Number.isFinite(body.value)) errors.push('value is required (number)');
    if (!body?.periodStart || typeof body.periodStart !== 'string') errors.push('periodStart is required (ISO string)');
    if (!body?.periodEnd || typeof body.periodEnd !== 'string') errors.push('periodEnd is required (ISO string)');

    const isGovernedGapKpi = typeof body?.kpiKey === 'string' ? this.GOVERNED_GAP_KPIS.has(body.kpiKey) : false;
    const periodGranularity = typeof body?.periodGranularity === 'string' ? body.periodGranularity : null;
    const officialSourceSystem = typeof body?.officialSourceSystem === 'string' ? body.officialSourceSystem : null;

    const governancePolicy = isGovernedGapKpi && typeof body?.kpiKey === 'string'
      ? await this.reportingService.getGovernancePolicy(body.kpiKey)
      : null;

    if (isGovernedGapKpi && !governancePolicy) {
      errors.push('KPI governance policy is not configured for this kpiKey; ingestion is blocked');
    }

    if (isGovernedGapKpi && governancePolicy) {
      if (!periodGranularity) errors.push('periodGranularity is required for this kpiKey');
      if (!officialSourceSystem) errors.push('officialSourceSystem is required for this kpiKey');
    }

    if (governancePolicy?.enforced) {
      if (periodGranularity && !governancePolicy.allowedPeriodGranularities.includes(periodGranularity)) {
        errors.push(`periodGranularity must be one of: ${governancePolicy.allowedPeriodGranularities.join(', ')}`);
      }

      const src = typeof body?.sourceSystem === 'string' ? body.sourceSystem : null;
      if (src && !governancePolicy.allowedSourceSystems.includes(src)) {
        errors.push(`sourceSystem is not allowed for this kpiKey (allowed: ${governancePolicy.allowedSourceSystems.join(', ')})`);
      }

      if (officialSourceSystem && !governancePolicy.allowedSourceSystems.includes(officialSourceSystem)) {
        errors.push(`officialSourceSystem is not allowed for this kpiKey (allowed: ${governancePolicy.allowedSourceSystems.join(', ')})`);
      }

      const u = typeof body?.unit === 'string' ? body.unit : null;
      if (governancePolicy.expectedUnit !== null && governancePolicy.expectedUnit !== undefined) {
        if (u !== governancePolicy.expectedUnit) errors.push(`unit must be "${governancePolicy.expectedUnit}" for this kpiKey`);
      }

      if (typeof governancePolicy.minValue === 'number' && typeof body?.value === 'number' && Number.isFinite(body.value)) {
        if (body.value < governancePolicy.minValue) errors.push(`value must be >= ${governancePolicy.minValue}`);
      }
      if (typeof governancePolicy.maxValue === 'number' && typeof body?.value === 'number' && Number.isFinite(body.value)) {
        if (body.value > governancePolicy.maxValue) errors.push(`value must be <= ${governancePolicy.maxValue}`);
      }
    }

    const ps = body?.periodStart ? new Date(body.periodStart) : null;
    const pe = body?.periodEnd ? new Date(body.periodEnd) : null;
    if (ps && Number.isNaN(ps.getTime())) errors.push('periodStart must be a valid date');
    if (pe && Number.isNaN(pe.getTime())) errors.push('periodEnd must be a valid date');
    if (ps && pe && ps.getTime() >= pe.getTime()) errors.push('periodStart must be < periodEnd');

    if (governancePolicy?.enforced && ps && pe && periodGranularity && !Number.isNaN(ps.getTime()) && !Number.isNaN(pe.getTime())) {
      if (periodGranularity === 'day') {
        if (!this.isStartOfUtcDay(ps)) errors.push('periodStart must be start of UTC day for periodGranularity=day');
        const expectedEnd = this.startOfNextUtcDay(ps);
        if (pe.getTime() !== expectedEnd.getTime()) errors.push('periodEnd must be start of next UTC day for periodGranularity=day');
      }
      if (periodGranularity === 'week') {
        if (!this.isStartOfUtcWeek(ps)) errors.push('periodStart must be start of ISO week (Mon 00:00 UTC) for periodGranularity=week');
        const expectedEnd = this.startOfNextUtcWeek(ps);
        if (pe.getTime() !== expectedEnd.getTime()) errors.push('periodEnd must be start of next ISO week for periodGranularity=week');
      }
      if (periodGranularity === 'month') {
        if (!this.isStartOfUtcMonth(ps)) errors.push('periodStart must be start of UTC month for periodGranularity=month');
        const expectedEnd = this.startOfNextUtcMonth(ps);
        if (pe.getTime() !== expectedEnd.getTime()) errors.push('periodEnd must be start of next UTC month for periodGranularity=month');
      }
      if (periodGranularity === 'quarter') {
        if (!this.isStartOfUtcQuarter(ps)) errors.push('periodStart must be start of UTC quarter for periodGranularity=quarter');
        const expectedEnd = this.startOfNextUtcQuarter(ps);
        if (pe.getTime() !== expectedEnd.getTime()) errors.push('periodEnd must be start of next UTC quarter for periodGranularity=quarter');
      }
      if (periodGranularity === 'year') {
        if (!this.isStartOfUtcYear(ps)) errors.push('periodStart must be start of UTC year for periodGranularity=year');
        const expectedEnd = this.startOfNextUtcYear(ps);
        if (pe.getTime() !== expectedEnd.getTime()) errors.push('periodEnd must be start of next UTC year for periodGranularity=year');
      }
    }

    if (errors.length > 0) {
      auditLogger.warn('reporting.kpis.snapshots.ingest.validation_failed', {
        correlationId,
        tenantId,
        actorUserId: actor,
        action: 'reporting:ingest',
        errors,
      });
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid KPI snapshot', details: { errors } }, correlationId };
    }

    const snapshot = await this.reportingService.ingestKpiSnapshot({
      idempotencyKey: idempotencyKey!.trim(),
      correlationId,
      tenantId,
      actorUserId: actor,
      kpiKey: body.kpiKey,
      periodStart: ps!,
      periodEnd: pe!,
      value: body.value,
      unit: typeof body.unit === 'string' ? body.unit : null,
      sourceSystem:
        typeof body.sourceSystem === 'string'
          ? body.sourceSystem
          : officialSourceSystem,
      periodGranularity,
      officialSourceSystem,
      metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : null,
    });

    return { success: true, data: snapshot, correlationId };
  }

  @Get('/reporting/kpis/snapshots')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions('reporting:view')
  async listSnapshots(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Query('kpiKey') kpiKey?: string,
    @Query('periodStart') periodStart?: string,
    @Query('periodEnd') periodEnd?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user?.userId as string | undefined;

    const lim = parseInt(limit, 10);
    const off = parseInt(offset, 10);
    const limitN = Number.isFinite(lim) ? Math.min(Math.max(lim, 1), 200) : 50;
    const offsetN = Number.isFinite(off) ? Math.max(off, 0) : 0;

    const ps = typeof periodStart === 'string' && periodStart.trim().length > 0 ? new Date(periodStart) : undefined;
    const pe = typeof periodEnd === 'string' && periodEnd.trim().length > 0 ? new Date(periodEnd) : undefined;
    const errors: string[] = [];
    if (ps && Number.isNaN(ps.getTime())) errors.push('periodStart must be a valid date');
    if (pe && Number.isNaN(pe.getTime())) errors.push('periodEnd must be a valid date');

    if (errors.length > 0) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid query', details: { errors } }, correlationId };
    }

    auditLogger.info('reporting.kpis.snapshots.list.request', {
      correlationId,
      tenantId,
      actorUserId: actor,
      action: 'reporting:view',
    });

    const { rows, total } = await this.reportingService.listKpiSnapshots({
      kpiKey: typeof kpiKey === 'string' && kpiKey.trim().length > 0 ? kpiKey : undefined,
      periodStart: ps,
      periodEnd: pe,
      limit: limitN,
      offset: offsetN,
    });

    return {
      success: true,
      data: rows,
      pagination: { total, limit: limitN, offset: offsetN },
      correlationId,
    };
  }

  @Get('/reporting/dashboard/executive')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions('reporting:view')
  async getExecutiveDashboard(@Headers() headers: Record<string, any>, @Req() req: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user?.userId as string | undefined;

    auditLogger.info('reporting.dashboard.executive.request', {
      correlationId,
      tenantId,
      actorUserId: actor,
      action: 'reporting:view',
    });

    const data = await this.reportingService.getExecutiveDashboard();
    return { success: true, data, correlationId };
  }

  @Get('/reporting/policies')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions('reporting:view')
  async listPolicies(
    @Headers() headers: Record<string, any>,
    @Query('policyId') policyId?: string,
    @Query('policyNumber') policyNumber?: string,
    @Query('status') status?: string,
    @Query('holderPartyId') holderPartyId?: string,
    @Query('insuredPartyId') insuredPartyId?: string,
    @Query('lineOfBusiness') lineOfBusiness?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);
    const lim = parseInt(limit, 10);
    const off = parseInt(offset, 10);

    auditLogger.info('reporting.policies.list.request', {
      correlationId,
      action: 'reporting:view',
      policyId,
      policyNumber,
      status,
      limit: lim,
      offset: off,
    });

    const { rows, total } = await this.reportingService.listPolicies({
      policyId,
      policyNumber,
      status,
      holderPartyId,
      insuredPartyId,
      lineOfBusiness,
      limit: Number.isFinite(lim) ? lim : 50,
      offset: Number.isFinite(off) ? off : 0,
    });

    return {
      success: true,
      data: rows,
      pagination: { total, limit: Number.isFinite(lim) ? lim : 50, offset: Number.isFinite(off) ? off : 0 },
      correlationId,
    };
  }

  @Get('/reporting/policies/:policyId')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions('reporting:view')
  async getPolicy(@Headers() headers: Record<string, any>, @Param('policyId') policyId: string) {
    const correlationId = this.getCorrelationId(headers);

    auditLogger.info('reporting.policies.get.request', {
      correlationId,
      action: 'reporting:view',
      policyId,
    });

    const data = await this.reportingService.getPolicy(policyId);
    if (!data) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Policy not found' }, correlationId };
    }

    return { success: true, data, correlationId };
  }

  @Get('/reporting/payments')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions('reporting:view')
  async listPayments(
    @Headers() headers: Record<string, any>,
    @Query('paymentId') paymentId?: string,
    @Query('paymentNumber') paymentNumber?: string,
    @Query('policyId') policyId?: string,
    @Query('claimId') claimId?: string,
    @Query('status') status?: string,
    @Query('paymentType') paymentType?: string,
    @Query('partyId') partyId?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);
    const lim = parseInt(limit, 10);
    const off = parseInt(offset, 10);

    auditLogger.info('reporting.payments.list.request', {
      correlationId,
      action: 'reporting:view',
      paymentId,
      policyId,
      claimId,
      limit: lim,
      offset: off,
    });

    const { rows, total } = await this.reportingService.listPayments({
      paymentId,
      paymentNumber,
      policyId,
      claimId,
      status,
      paymentType,
      partyId,
      limit: Number.isFinite(lim) ? lim : 50,
      offset: Number.isFinite(off) ? off : 0,
    });

    return {
      success: true,
      data: rows,
      pagination: { total, limit: Number.isFinite(lim) ? lim : 50, offset: Number.isFinite(off) ? off : 0 },
      correlationId,
    };
  }

  @Get('/reporting/payments/:paymentId')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions('reporting:view')
  async getPayment(@Headers() headers: Record<string, any>, @Param('paymentId') paymentId: string) {
    const correlationId = this.getCorrelationId(headers);

    auditLogger.info('reporting.payments.get.request', {
      correlationId,
      action: 'reporting:view',
      paymentId,
    });

    const data = await this.reportingService.getPayment(paymentId);
    if (!data) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Payment not found' }, correlationId };
    }

    return { success: true, data, correlationId };
  }

  @Get('/reporting/sales-partners')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions('reporting:view')
  async listSalesPartners(
    @Headers() headers: Record<string, any>,
    @Query('partnerId') partnerId?: string,
    @Query('orgUnitId') orgUnitId?: string,
    @Query('status') status?: string,
    @Query('partnerType') partnerType?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);
    const lim = parseInt(limit, 10);
    const off = parseInt(offset, 10);

    auditLogger.info('reporting.sales-partners.list.request', {
      correlationId,
      action: 'reporting:view',
      partnerId,
      orgUnitId,
      limit: lim,
      offset: off,
    });

    const { rows, total } = await this.reportingService.listSalesPartners({
      partnerId,
      orgUnitId,
      status,
      partnerType,
      limit: Number.isFinite(lim) ? lim : 50,
      offset: Number.isFinite(off) ? off : 0,
    });

    return {
      success: true,
      data: rows,
      pagination: { total, limit: Number.isFinite(lim) ? lim : 50, offset: Number.isFinite(off) ? off : 0 },
      correlationId,
    };
  }

  @Get('/reporting/sales-partners/:partnerId')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions('reporting:view')
  async getSalesPartner(@Headers() headers: Record<string, any>, @Param('partnerId') partnerId: string) {
    const correlationId = this.getCorrelationId(headers);

    auditLogger.info('reporting.sales-partners.get.request', {
      correlationId,
      action: 'reporting:view',
      partnerId,
    });

    const data = await this.reportingService.getSalesPartner(partnerId);
    if (!data) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Sales partner not found' }, correlationId };
    }

    return { success: true, data, correlationId };
  }

  @Get('/reporting/aml-transactions')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions('reporting:view')
  async listAmlTransactions(
    @Headers() headers: Record<string, any>,
    @Query('transactionId') transactionId?: string,
    @Query('partyId') partyId?: string,
    @Query('status') status?: string,
    @Query('riskLevel') riskLevel?: string,
    @Query('transactionType') transactionType?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);
    const lim = parseInt(limit, 10);
    const off = parseInt(offset, 10);

    auditLogger.info('reporting.aml.list.request', {
      correlationId,
      action: 'reporting:view',
      transactionId,
      partyId,
      limit: lim,
      offset: off,
    });

    const { rows, total } = await this.reportingService.listAmlTransactions({
      transactionId,
      partyId,
      status,
      riskLevel,
      transactionType,
      limit: Number.isFinite(lim) ? lim : 50,
      offset: Number.isFinite(off) ? off : 0,
    });

    return {
      success: true,
      data: rows,
      pagination: { total, limit: Number.isFinite(lim) ? lim : 50, offset: Number.isFinite(off) ? off : 0 },
      correlationId,
    };
  }

  @Get('/reporting/aml-transactions/:transactionId')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions('reporting:view')
  async getAmlTransaction(@Headers() headers: Record<string, any>, @Param('transactionId') transactionId: string) {
    const correlationId = this.getCorrelationId(headers);

    auditLogger.info('reporting.aml.get.request', {
      correlationId,
      action: 'reporting:view',
      transactionId,
    });

    const data = await this.reportingService.getAmlTransaction(transactionId);
    if (!data) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'AML transaction not found' }, correlationId };
    }

    return { success: true, data, correlationId };
  }

  @Get('/reporting/underwriting-requests')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions('reporting:view')
  async listUnderwritingRequests(
    @Headers() headers: Record<string, any>,
    @Query('requestId') requestId?: string,
    @Query('policyId') policyId?: string,
    @Query('status') status?: string,
    @Query('riskLevel') riskLevel?: string,
    @Query('underwriterId') underwriterId?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);
    const lim = parseInt(limit, 10);
    const off = parseInt(offset, 10);

    auditLogger.info('reporting.underwriting.list.request', {
      correlationId,
      action: 'reporting:view',
      requestId,
      policyId,
      limit: lim,
      offset: off,
    });

    const { rows, total } = await this.reportingService.listUnderwritingRequests({
      requestId,
      policyId,
      status,
      riskLevel,
      underwriterId,
      limit: Number.isFinite(lim) ? lim : 50,
      offset: Number.isFinite(off) ? off : 0,
    });

    return {
      success: true,
      data: rows,
      pagination: { total, limit: Number.isFinite(lim) ? lim : 50, offset: Number.isFinite(off) ? off : 0 },
      correlationId,
    };
  }

  @Get('/reporting/underwriting-requests/:requestId')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions('reporting:view')
  async getUnderwritingRequest(@Headers() headers: Record<string, any>, @Param('requestId') requestId: string) {
    const correlationId = this.getCorrelationId(headers);

    auditLogger.info('reporting.underwriting.get.request', {
      correlationId,
      action: 'reporting:view',
      requestId,
    });

    const data = await this.reportingService.getUnderwritingRequest(requestId);
    if (!data) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Underwriting request not found' }, correlationId };
    }

    return { success: true, data, correlationId };
  }

  // External system connection endpoints
  @Post('/reporting/external-systems')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions('reporting:manage')
  async createExternalSystemConnection(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Body() body: any
  ) {
    const correlationId = this.getCorrelationId(headers);
    const actor = req?.user?.userId as string | undefined;

    auditLogger.info('reporting.external_system.create.request', {
      correlationId,
      action: 'reporting:manage',
      systemName: body?.systemName,
    });

    if (!body?.systemName || !body?.systemType || !body?.connectionConfig) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'systemName, systemType, and connectionConfig are required' },
        correlationId,
      };
    }

    try {
      const connection = await this.reportingService.createExternalSystemConnection({
        systemName: body.systemName,
        systemType: body.systemType,
        connectionConfig: body.connectionConfig,
        syncFrequencyMinutes: body.syncFrequencyMinutes,
        enabledDataTypes: body.enabledDataTypes,
        createdBy: actor,
      });

      auditLogger.info('reporting.external_system.create.success', {
        correlationId,
        action: 'reporting:manage',
        connectionId: connection.connectionId,
      });

      return { success: true, data: connection, correlationId };
    } catch (e: any) {
      auditLogger.error('reporting.external_system.create.error', e, {
        correlationId,
        action: 'reporting:manage',
      });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: e.message || 'Failed to create connection' }, correlationId };
    }
  }

  @Put('/reporting/external-systems/:connectionId')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions('reporting:manage')
  async updateExternalSystemConnection(
    @Headers() headers: Record<string, any>,
    @Param('connectionId') connectionId: string,
    @Body() body: any
  ) {
    const correlationId = this.getCorrelationId(headers);

    auditLogger.info('reporting.external_system.update.request', {
      correlationId,
      action: 'reporting:manage',
      connectionId,
    });

    try {
      const connection = await this.reportingService.updateExternalSystemConnection(connectionId, {
        systemName: body.systemName,
        connectionConfig: body.connectionConfig,
        syncFrequencyMinutes: body.syncFrequencyMinutes,
        enabledDataTypes: body.enabledDataTypes,
        status: body.status,
      });

      if (!connection) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Connection not found' }, correlationId };
      }

      auditLogger.info('reporting.external_system.update.success', {
        correlationId,
        action: 'reporting:manage',
        connectionId,
      });

      return { success: true, data: connection, correlationId };
    } catch (e: any) {
      auditLogger.error('reporting.external_system.update.error', e, {
        correlationId,
        action: 'reporting:manage',
      });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: e.message || 'Failed to update connection' }, correlationId };
    }
  }

  @Get('/reporting/external-systems/:connectionId')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions('reporting:view')
  async getExternalSystemConnection(
    @Headers() headers: Record<string, any>,
    @Param('connectionId') connectionId: string
  ) {
    const correlationId = this.getCorrelationId(headers);

    auditLogger.info('reporting.external_system.get.request', {
      correlationId,
      action: 'reporting:view',
      connectionId,
    });

    const connection = await this.reportingService.getExternalSystemConnection(connectionId);
    if (!connection) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Connection not found' }, correlationId };
    }

    return { success: true, data: connection, correlationId };
  }

  @Get('/reporting/external-systems')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions('reporting:view')
  async listExternalSystemConnections(
    @Headers() headers: Record<string, any>,
    @Query('systemType') systemType?: string,
    @Query('status') status?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);
    const lim = parseInt(limit, 10);
    const off = parseInt(offset, 10);

    auditLogger.info('reporting.external_system.list.request', {
      correlationId,
      action: 'reporting:view',
      systemType,
      status,
    });

    const { rows, total } = await this.reportingService.listExternalSystemConnections({
      systemType: systemType as any,
      status: status as any,
      limit: Number.isFinite(lim) ? lim : 50,
      offset: Number.isFinite(off) ? off : 0,
    });

    return {
      success: true,
      data: rows,
      pagination: { total, limit: Number.isFinite(lim) ? lim : 50, offset: Number.isFinite(off) ? off : 0 },
      correlationId,
    };
  }

  @Post('/reporting/external-systems/:connectionId/sync')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions('reporting:manage')
  async syncToExternalSystem(
    @Headers() headers: Record<string, any>,
    @Param('connectionId') connectionId: string,
    @Body() body: any
  ) {
    const correlationId = this.getCorrelationId(headers);

    auditLogger.info('reporting.external_system.sync.request', {
      correlationId,
      action: 'reporting:manage',
      connectionId,
    });

    try {
      const result = await this.reportingService.syncToExternalSystem(connectionId, {
        dataType: body.dataType,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
      });

      auditLogger.info('reporting.external_system.sync.result', {
        correlationId,
        action: 'reporting:manage',
        connectionId,
        success: result.success,
        syncedRecords: result.syncedRecords,
      });

      return { success: result.success, data: result, correlationId };
    } catch (e: any) {
      auditLogger.error('reporting.external_system.sync.error', e, {
        correlationId,
        action: 'reporting:manage',
      });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: e.message || 'Failed to sync' }, correlationId };
    }
  }

  @Get('/reporting/external-systems/:connectionId/sync-status')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions('reporting:view')
  async getExternalSystemSyncStatus(
    @Headers() headers: Record<string, any>,
    @Param('connectionId') connectionId: string
  ) {
    const correlationId = this.getCorrelationId(headers);

    auditLogger.info('reporting.external_system.sync_status.request', {
      correlationId,
      action: 'reporting:view',
      connectionId,
    });

    const status = await this.reportingService.getExternalSystemSyncStatus(connectionId);
    if (!status) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Connection not found' }, correlationId };
    }

    return { success: true, data: status, correlationId };
  }

  @Post('/reporting/external-systems/:connectionId/delete')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions('reporting:manage')
  async deleteExternalSystemConnection(
    @Headers() headers: Record<string, any>,
    @Param('connectionId') connectionId: string
  ) {
    const correlationId = this.getCorrelationId(headers);

    auditLogger.info('reporting.external_system.delete.request', {
      correlationId,
      action: 'reporting:manage',
      connectionId,
    });

    const result = await this.reportingService.deleteExternalSystemConnection(connectionId);

    auditLogger.info('reporting.external_system.delete.result', {
      correlationId,
      action: 'reporting:manage',
      connectionId,
      success: result,
    });

    return { success: result, data: { deleted: result }, correlationId };
  }

  // Financial, Market Share, and Satisfaction KPIs endpoints
  @Get('/reporting/kpis/financial')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions('reporting:view')
  async getFinancialKPIs(
    @Headers() headers: Record<string, any>,
    @Query('startDate') startDateStr: string,
    @Query('endDate') endDateStr: string
  ) {
    const correlationId = this.getCorrelationId(headers);

    auditLogger.info('reporting.kpis.financial.request', {
      correlationId,
      action: 'reporting:view',
      startDate: startDateStr,
      endDate: endDateStr,
    });

    try {
      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'startDate and endDate must be valid dates' },
          correlationId,
        };
      }

      const kpis = await this.reportingService.getFinancialKPIs({ startDate, endDate });

      return { success: true, data: kpis, correlationId };
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('reporting.kpis.financial.error', err, {
        correlationId,
        action: 'reporting:view',
      });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to get financial KPIs' }, correlationId };
    }
  }

  @Get('/reporting/kpis/market-share')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions('reporting:view')
  async getMarketShareKPIs(
    @Headers() headers: Record<string, any>,
    @Query('startDate') startDateStr: string,
    @Query('endDate') endDateStr: string
  ) {
    const correlationId = this.getCorrelationId(headers);

    auditLogger.info('reporting.kpis.market_share.request', {
      correlationId,
      action: 'reporting:view',
      startDate: startDateStr,
      endDate: endDateStr,
    });

    try {
      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'startDate and endDate must be valid dates' },
          correlationId,
        };
      }

      const kpis = await this.reportingService.getMarketShareKPIs({ startDate, endDate });

      return { success: true, data: kpis, correlationId };
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('reporting.kpis.market_share.error', err, {
        correlationId,
        action: 'reporting:view',
      });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to get market share KPIs' }, correlationId };
    }
  }

  @Get('/reporting/kpis/satisfaction')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions('reporting:view')
  async getSatisfactionKPIs(
    @Headers() headers: Record<string, any>,
    @Query('startDate') startDateStr: string,
    @Query('endDate') endDateStr: string
  ) {
    const correlationId = this.getCorrelationId(headers);

    auditLogger.info('reporting.kpis.satisfaction.request', {
      correlationId,
      action: 'reporting:view',
      startDate: startDateStr,
      endDate: endDateStr,
    });

    try {
      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'startDate and endDate must be valid dates' },
          correlationId,
        };
      }

      const kpis = await this.reportingService.getSatisfactionKPIs({ startDate, endDate });

      return { success: true, data: kpis, correlationId };
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('reporting.kpis.satisfaction.error', err, {
        correlationId,
        action: 'reporting:view',
      });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to get satisfaction KPIs' }, correlationId };
    }
  }
}
