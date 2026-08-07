import { Body, Controller, Get, Headers, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { EcosystemJwtGuard } from './ecosystem-jwt.guard';
import { PermissionsGuard } from './permissions.guard';
import { AbacGuard } from './abac.guard';
import { RequirePermissions } from './permissions.decorator';
import { auditLogger } from './audit.logger';
import { ReinsuranceService } from './reinsurance.service';
import { TenantGuard } from './tenant.guard';
import type { ReTreatyStatus } from './entities/ReTreaty';
import type { ReCessionStatus } from './entities/ReCession';
import type { ReStatementStatus } from './entities/ReStatement';
import type { ReReconciliationStatus } from './entities/ReReconciliation';
import type { ReClaimRecoveryStatus } from './entities/ReClaimRecovery';
import type { ReTicketStatus } from './entities/ReTicket';

@Controller()
export class ReinsuranceController {
  constructor(private readonly reinsuranceService: ReinsuranceService) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  @Post('/re/treaties')
  @UseGuards(EcosystemJwtGuard, AbacGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('re:treaties:create')
  async createTreaty(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('re.treaties.create.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 're:treaties:create',
    });

    const t = await this.reinsuranceService.createTreaty({
      tenantId: tenantId!,
      treatyNumber: body?.treatyNumber,
      reinsurerName: body?.reinsurerName,
      treatyType: body?.treatyType,
      effectiveFrom: body?.effectiveFrom,
      effectiveTo: body?.effectiveTo,
      currency: body?.currency,
      retentionRate: body?.retentionRate,
      cessionRate: body?.cessionRate,
      config: body?.config,
      terms: body?.terms,
      createdBy: actor?.userId,
    });

    return { success: true, data: t, correlationId };
  }

  @Get('/re/treaties/:treatyId')
  @UseGuards(EcosystemJwtGuard, AbacGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('re:treaties:view')
  async getTreaty(@Req() req: any, @Headers() headers: Record<string, any>, @Param('treatyId') treatyId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const t = await this.reinsuranceService.getTreaty(tenantId!, treatyId);
    if (!t) return { success: false, error: { code: 'NOT_FOUND', message: 'Treaty not found' }, correlationId };
    return { success: true, data: t, correlationId };
  }

  @Get('/re/treaties')
  @UseGuards(EcosystemJwtGuard, AbacGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('re:treaties:list')
  async listTreaties(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('status') status?: ReTreatyStatus,
    @Query('reinsurerName') reinsurerName?: string,
    @Query('lineOfBusiness') lineOfBusiness?: string,
    @Query('productCode') productCode?: string,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const paging = this.reinsuranceService.normalizePaging(limit, offset);
    const out = await this.reinsuranceService.listTreaties({
      tenantId: tenantId!,
      status,
      reinsurerName,
      lineOfBusiness,
      productCode,
      q,
      limit: paging.limit,
      offset: paging.offset,
    });
    return { success: true, data: out, correlationId };
  }

  @Patch('/re/treaties/:treatyId')
  @UseGuards(EcosystemJwtGuard, AbacGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('re:treaties:update')
  async updateTreaty(@Req() req: any, @Headers() headers: Record<string, any>, @Param('treatyId') treatyId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const t = await this.reinsuranceService.updateTreaty({
      tenantId: tenantId!,
      treatyId,
      reinsurerName: body?.reinsurerName,
      effectiveFrom: body?.effectiveFrom,
      effectiveTo: body?.effectiveTo,
      currency: body?.currency,
      retentionRate: body?.retentionRate,
      cessionRate: body?.cessionRate,
      config: body?.config,
      terms: body?.terms,
      status: body?.status,
    });
    return { success: true, data: t, correlationId };
  }

  @Patch('/re/treaties/:treatyId/close')
  @UseGuards(EcosystemJwtGuard, AbacGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('re:treaties:close')
  async closeTreaty(@Req() req: any, @Headers() headers: Record<string, any>, @Param('treatyId') treatyId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const t = await this.reinsuranceService.closeTreaty(tenantId!, treatyId);
    return { success: true, data: t, correlationId };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // P1 #5 (SoD): Submit / Approve / Reject / Activate endpoints
  // State machine: draft → pending_approval → approved/rejected → active
  // The submitter cannot be the approver (Segregation of Duties).
  // ──────────────────────────────────────────────────────────────────────────

  @Patch('/re/treaties/:treatyId/submit')
  @UseGuards(EcosystemJwtGuard, AbacGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('re:treaties:submit')
  async submitTreatyForApproval(@Req() req: any, @Headers() headers: Record<string, any>, @Param('treatyId') treatyId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user?.userId as string | undefined;
    const t = await this.reinsuranceService.submitTreatyForApproval(tenantId!, treatyId, actor || 'system');
    return { success: true, data: t, correlationId };
  }

  @Patch('/re/treaties/:treatyId/approve')
  @UseGuards(EcosystemJwtGuard, AbacGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('re:treaties:approve')
  async approveTreaty(@Req() req: any, @Headers() headers: Record<string, any>, @Param('treatyId') treatyId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user?.userId as string | undefined;
    const t = await this.reinsuranceService.approveTreaty(tenantId!, treatyId, actor || 'system');
    return { success: true, data: t, correlationId };
  }

  @Patch('/re/treaties/:treatyId/reject')
  @UseGuards(EcosystemJwtGuard, AbacGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('re:treaties:approve')
  async rejectTreaty(@Req() req: any, @Headers() headers: Record<string, any>, @Param('treatyId') treatyId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user?.userId as string | undefined;
    const t = await this.reinsuranceService.rejectTreaty(tenantId!, treatyId, actor || 'system', body?.reason);
    return { success: true, data: t, correlationId };
  }

  @Patch('/re/treaties/:treatyId/activate')
  @UseGuards(EcosystemJwtGuard, AbacGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('re:treaties:close')
  async activateTreaty(@Req() req: any, @Headers() headers: Record<string, any>, @Param('treatyId') treatyId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const t = await this.reinsuranceService.activateTreaty(tenantId!, treatyId);
    return { success: true, data: t, correlationId };
  }

  @Post('/re/cessions/calculate-automatic')
  @UseGuards(EcosystemJwtGuard, AbacGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('re:cessions:create')
  async calculateAutomaticCessions(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('re.cessions.calculate_automatic.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 're:cessions:create',
      policyId: body?.policyId,
    });

    if (!body?.policyId || !body?.sumInsured || !body?.premium || !body?.productCode || !body?.effectiveDate) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: policyId, sumInsured, premium, productCode, effectiveDate',
        },
        correlationId,
      };
    }

    const result = await this.reinsuranceService.calculateAutomaticCessions({
      tenantId: tenantId!,
      policyId: body.policyId,
      policyNumber: body.policyNumber,
      sumInsured: Number(body.sumInsured),
      premium: Number(body.premium),
      productCode: body.productCode,
      effectiveDate: body.effectiveDate,
      correlationId,
    });

    auditLogger.info('re.cessions.calculate_automatic.success', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 're:cessions:create',
      policyId: body.policyId,
      cessionsCreated: result.cessions.length,
      totalCeded: result.totalCeded,
      totalRetained: result.totalRetained,
    });

    return { success: true, data: result, correlationId };
  }

  @Post('/re/cessions')
  @UseGuards(EcosystemJwtGuard, AbacGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('re:cessions:create')
  async createCession(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('re.cessions.create.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 're:cessions:create',
    });

    const c = await this.reinsuranceService.createCession({
      tenantId: tenantId!,
      treatyId: body?.treatyId,
      policyId: body?.policyId,
      policyNumber: body?.policyNumber,
      riskId: body?.riskId,
      sumInsured: body?.sumInsured,
      premium: body?.premium,
      cessionPercent: body?.cessionPercent,
      cededAmount: body?.cededAmount,
      cededPremium: body?.cededPremium,
      cededSumInsured: body?.cededSumInsured,
      cessionType: body?.cessionType,
      retentionRate: body?.retentionRate,
      cessionRate: body?.cessionRate,
      effectiveFrom: body?.effectiveFrom,
      effectiveTo: body?.effectiveTo,
      currency: body?.currency,
      notes: body?.notes,
      createdBy: actor?.userId,
      correlationId,
    });

    return { success: true, data: c, correlationId };
  }

  @Get('/re/cessions/:cessionId')
  @UseGuards(EcosystemJwtGuard, AbacGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('re:cessions:view')
  async getCession(@Req() req: any, @Headers() headers: Record<string, any>, @Param('cessionId') cessionId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const c = await this.reinsuranceService.getCession(tenantId!, cessionId);
    if (!c) return { success: false, error: { code: 'NOT_FOUND', message: 'Cession not found' }, correlationId };
    return { success: true, data: c, correlationId };
  }

  @Get('/re/cessions')
  @UseGuards(EcosystemJwtGuard, AbacGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('re:cessions:list')
  async listCessions(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('treatyId') treatyId?: string,
    @Query('status') status?: ReCessionStatus,
    @Query('policyId') policyId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const paging = this.reinsuranceService.normalizePaging(limit, offset);
    const out = await this.reinsuranceService.listCessions({
      tenantId: tenantId!,
      treatyId,
      status,
      policyId,
      limit: paging.limit,
      offset: paging.offset,
    });
    return { success: true, data: out, correlationId };
  }

  @Patch('/re/cessions/:cessionId')
  @UseGuards(EcosystemJwtGuard, AbacGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('re:cessions:update')
  async updateCession(@Req() req: any, @Headers() headers: Record<string, any>, @Param('cessionId') cessionId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const c = await this.reinsuranceService.updateCession({
      tenantId: tenantId!,
      cessionId,
      notes: body?.notes,
      sumInsured: body?.sumInsured,
      premium: body?.premium,
      cessionPercent: body?.cessionPercent,
      cededAmount: body?.cededAmount,
      cededPremium: body?.cededPremium,
      cededSumInsured: body?.cededSumInsured,
      status: body?.status,
      correlationId,
    });
    return { success: true, data: c, correlationId };
  }

  @Patch('/re/cessions/:cessionId/approve')
  @UseGuards(EcosystemJwtGuard, AbacGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('re:cessions:approve')
  async approveCession(@Req() req: any, @Headers() headers: Record<string, any>, @Param('cessionId') cessionId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const c = await this.reinsuranceService.approveCession({
      tenantId: tenantId!,
      cessionId,
      approved: Boolean(body?.approved),
      notes: body?.notes,
    });
    return { success: true, data: c, correlationId };
  }

  @Post('/re/statements')
  @UseGuards(EcosystemJwtGuard, AbacGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('re:statements:create')
  async createStatement(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('re.statements.create.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 're:statements:create',
    });

    const s = await this.reinsuranceService.createStatement({
      tenantId: tenantId!,
      treatyId: body?.treatyId,
      statementType: body?.statementType,
      periodStart: body?.periodStart,
      periodEnd: body?.periodEnd,
      totals: body?.totals,
      createdBy: actor?.userId,
    });

    return { success: true, data: s, correlationId };
  }

  @Get('/re/statements/:statementId')
  @UseGuards(EcosystemJwtGuard, AbacGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('re:statements:view')
  async getStatement(@Req() req: any, @Headers() headers: Record<string, any>, @Param('statementId') statementId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const s = await this.reinsuranceService.getStatement(tenantId!, statementId);
    if (!s) return { success: false, error: { code: 'NOT_FOUND', message: 'Statement not found' }, correlationId };
    return { success: true, data: s, correlationId };
  }

  @Get('/re/statements')
  @UseGuards(EcosystemJwtGuard, AbacGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('re:statements:list')
  async listStatements(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('treatyId') treatyId?: string,
    @Query('status') status?: ReStatementStatus,
    @Query('statementType') statementType?: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const paging = this.reinsuranceService.normalizePaging(limit, offset);
    const out = await this.reinsuranceService.listStatements({
      tenantId: tenantId!,
      treatyId,
      status,
      statementType,
      limit: paging.limit,
      offset: paging.offset,
    });
    return { success: true, data: out, correlationId };
  }

  @Patch('/re/statements/:statementId')
  @UseGuards(EcosystemJwtGuard, AbacGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('re:statements:update')
  async updateStatement(@Req() req: any, @Headers() headers: Record<string, any>, @Param('statementId') statementId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const s = await this.reinsuranceService.updateStatement({
      tenantId: tenantId!,
      statementId,
      status: body?.status,
      totals: body?.totals,
    });
    return { success: true, data: s, correlationId };
  }

  @Post('/re/reconciliations')
  @UseGuards(EcosystemJwtGuard, AbacGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('re:reconciliations:create')
  async createReconciliation(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('re.reconciliations.create.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 're:reconciliations:create',
    });

    const r = await this.reinsuranceService.createReconciliation({
      tenantId: tenantId!,
      statementId: body?.statementId,
      summary: body?.summary,
      details: body?.details,
      createdBy: actor?.userId,
    });

    return { success: true, data: r, correlationId };
  }

  @Post('/re/recoveries')
  @UseGuards(EcosystemJwtGuard, AbacGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('re:recoveries:create')
  async createRecovery(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;
    auditLogger.info('re.recoveries.create.request', { correlationId, tenantId, actorUserId: actor?.userId, action: 're:recoveries:create' });
    const r = await this.reinsuranceService.createRecovery({
      tenantId: tenantId!,
      treatyId: body?.treatyId,
      claimId: body?.claimId,
      policyId: body?.policyId,
      lossDate: body?.lossDate,
      grossLossAmount: body?.grossLossAmount,
      cededLossAmount: body?.cededLossAmount,
      recoveredAmount: body?.recoveredAmount,
      currency: body?.currency,
      status: body?.status,
      nextFollowUpAt: body?.nextFollowUpAt,
      notes: body?.notes,
      createdBy: actor?.userId,
      correlationId,
    });
    return { success: true, data: r, correlationId };
  }

  @Get('/re/recoveries/:recoveryId')
  @UseGuards(EcosystemJwtGuard, AbacGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('re:recoveries:view')
  async getRecovery(@Req() req: any, @Headers() headers: Record<string, any>, @Param('recoveryId') recoveryId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const r = await this.reinsuranceService.getRecovery(tenantId!, recoveryId);
    if (!r) return { success: false, error: { code: 'NOT_FOUND', message: 'Recovery not found' }, correlationId };
    return { success: true, data: r, correlationId };
  }

  @Get('/re/recoveries')
  @UseGuards(EcosystemJwtGuard, AbacGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('re:recoveries:list')
  async listRecoveries(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('treatyId') treatyId?: string,
    @Query('status') status?: ReClaimRecoveryStatus,
    @Query('claimId') claimId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const paging = this.reinsuranceService.normalizePaging(limit, offset);
    const out = await this.reinsuranceService.listRecoveries({
      tenantId: tenantId!,
      treatyId,
      status,
      claimId,
      limit: paging.limit,
      offset: paging.offset,
    });
    return { success: true, data: out, correlationId };
  }

  @Patch('/re/recoveries/:recoveryId')
  @UseGuards(EcosystemJwtGuard, AbacGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('re:recoveries:update')
  async updateRecovery(@Req() req: any, @Headers() headers: Record<string, any>, @Param('recoveryId') recoveryId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const r = await this.reinsuranceService.updateRecovery({
      tenantId: tenantId!,
      recoveryId,
      status: body?.status,
      recoveredAmount: body?.recoveredAmount,
      nextFollowUpAt: body?.nextFollowUpAt,
      notes: body?.notes,
      correlationId,
    });
    return { success: true, data: r, correlationId };
  }

  @Post('/re/tickets')
  @UseGuards(EcosystemJwtGuard, AbacGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('re:tickets:create')
  async createTicket(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;
    auditLogger.info('re.tickets.create.request', { correlationId, tenantId, actorUserId: actor?.userId, action: 're:tickets:create' });
    const t = await this.reinsuranceService.createTicket({
      tenantId: tenantId!,
      reconciliationId: body?.reconciliationId,
      reasonCode: body?.reasonCode,
      summary: body?.summary,
      assignedTo: body?.assignedTo,
      slaResponseDueAt: body?.slaResponseDueAt,
      createdBy: actor?.userId,
    });
    return { success: true, data: t, correlationId };
  }

  @Get('/re/tickets/:ticketId')
  @UseGuards(EcosystemJwtGuard, AbacGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('re:tickets:view')
  async getTicket(@Req() req: any, @Headers() headers: Record<string, any>, @Param('ticketId') ticketId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const t = await this.reinsuranceService.getTicket(tenantId!, ticketId);
    if (!t) return { success: false, error: { code: 'NOT_FOUND', message: 'Ticket not found' }, correlationId };
    const messages = await this.reinsuranceService.listTicketMessages(tenantId!, ticketId);
    const attachments = await this.reinsuranceService.listTicketAttachments(tenantId!, ticketId);
    return { success: true, data: { ticket: t, messages, attachments }, correlationId };
  }

  @Get('/re/tickets')
  @UseGuards(EcosystemJwtGuard, AbacGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('re:tickets:list')
  async listTickets(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('reconciliationId') reconciliationId?: string,
    @Query('status') status?: ReTicketStatus,
    @Query('assignedTo') assignedTo?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const paging = this.reinsuranceService.normalizePaging(limit, offset);
    const out = await this.reinsuranceService.listTickets({
      tenantId: tenantId!,
      reconciliationId,
      status,
      assignedTo,
      limit: paging.limit,
      offset: paging.offset,
    });
    return { success: true, data: out, correlationId };
  }

  @Patch('/re/tickets/:ticketId')
  @UseGuards(EcosystemJwtGuard, AbacGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('re:tickets:update')
  async updateTicket(@Req() req: any, @Headers() headers: Record<string, any>, @Param('ticketId') ticketId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const t = await this.reinsuranceService.updateTicket({
      tenantId: tenantId!,
      ticketId,
      status: body?.status,
      summary: body?.summary,
    });
    return { success: true, data: t, correlationId };
  }

  @Patch('/re/tickets/:ticketId/assign')
  @UseGuards(EcosystemJwtGuard, AbacGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('re:tickets:assign')
  async assignTicket(@Req() req: any, @Headers() headers: Record<string, any>, @Param('ticketId') ticketId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const t = await this.reinsuranceService.assignTicket({
      tenantId: tenantId!,
      ticketId,
      assignedTo: body?.assignedTo ?? null,
    });
    return { success: true, data: t, correlationId };
  }

  @Post('/re/tickets/:ticketId/messages')
  @UseGuards(EcosystemJwtGuard, AbacGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('re:tickets:add_message')
  async addTicketMessage(@Req() req: any, @Headers() headers: Record<string, any>, @Param('ticketId') ticketId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;
    auditLogger.info('re.tickets.messages.create.request', { correlationId, tenantId, actorUserId: actor?.userId, action: 're:tickets:add_message', ticketId });
    const m = await this.reinsuranceService.addTicketMessage({
      tenantId: tenantId!,
      ticketId,
      messageType: body?.messageType,
      body: body?.body,
      createdBy: actor?.userId,
    });
    return { success: true, data: m, correlationId };
  }

  @Post('/re/tickets/:ticketId/attachments')
  @UseGuards(EcosystemJwtGuard, AbacGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('re:tickets:add_attachment')
  async addTicketAttachment(@Req() req: any, @Headers() headers: Record<string, any>, @Param('ticketId') ticketId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;
    auditLogger.info('re.tickets.attachments.create.request', { correlationId, tenantId, actorUserId: actor?.userId, action: 're:tickets:add_attachment', ticketId });
    const a = await this.reinsuranceService.addTicketAttachment({
      tenantId: tenantId!,
      ticketId,
      documentId: body?.documentId,
      notes: body?.notes,
      createdBy: actor?.userId,
    });
    return { success: true, data: a, correlationId };
  }

  @Get('/re/reconciliations/:reconciliationId')
  @UseGuards(EcosystemJwtGuard, AbacGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('re:reconciliations:view')
  async getReconciliation(@Req() req: any, @Headers() headers: Record<string, any>, @Param('reconciliationId') reconciliationId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const r = await this.reinsuranceService.getReconciliation(tenantId!, reconciliationId);
    if (!r) return { success: false, error: { code: 'NOT_FOUND', message: 'Reconciliation not found' }, correlationId };
    return { success: true, data: r, correlationId };
  }

  @Get('/re/reconciliations')
  @UseGuards(EcosystemJwtGuard, AbacGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('re:reconciliations:list')
  async listReconciliations(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('statementId') statementId?: string,
    @Query('status') status?: ReReconciliationStatus,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const paging = this.reinsuranceService.normalizePaging(limit, offset);
    const out = await this.reinsuranceService.listReconciliations({
      tenantId: tenantId!,
      statementId,
      status,
      limit: paging.limit,
      offset: paging.offset,
    });
    return { success: true, data: out, correlationId };
  }

  @Patch('/re/reconciliations/:reconciliationId')
  @UseGuards(EcosystemJwtGuard, AbacGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('re:reconciliations:update')
  async updateReconciliation(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('reconciliationId') reconciliationId: string,
    @Body() body: any
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const r = await this.reinsuranceService.updateReconciliation({
      tenantId: tenantId!,
      reconciliationId,
      status: body?.status,
      summary: body?.summary,
      details: body?.details,
    });
    return { success: true, data: r, correlationId };
  }

  @Get('/re/export')
  @UseGuards(EcosystemJwtGuard, AbacGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('re:export')
  async exportSnapshot(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('treatiesLimit') treatiesLimit?: string,
    @Query('cessionsLimit') cessionsLimit?: string,
    @Query('statementsLimit') statementsLimit?: string,
    @Query('reconciliationsLimit') reconciliationsLimit?: string,
    @Query('recoveriesLimit') recoveriesLimit?: string,
    @Query('ticketsLimit') ticketsLimit?: string
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('re.export.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 're:export',
    });

    const out = await this.reinsuranceService.exportSnapshot({
      tenantId: tenantId!,
      treatiesLimit: parseInt(treatiesLimit || '200', 10),
      cessionsLimit: parseInt(cessionsLimit || '200', 10),
      statementsLimit: parseInt(statementsLimit || '200', 10),
      reconciliationsLimit: parseInt(reconciliationsLimit || '200', 10),
      recoveriesLimit: parseInt(recoveriesLimit || '200', 10),
      ticketsLimit: parseInt(ticketsLimit || '200', 10),
    });

    return { success: true, data: out, correlationId };
  }

  @Post('/re/periods/close')
  @UseGuards(EcosystemJwtGuard, AbacGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('re:periods:close')
  async closePeriod(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('re.periods.close.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 're:periods:close',
    });

    if (!body?.treatyId || !body?.periodEnd) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'treatyId and periodEnd are required' },
        correlationId,
      };
    }

    try {
      const result = await this.reinsuranceService.closePeriod({
        tenantId: tenantId!,
        treatyId: body.treatyId,
        periodEnd: body.periodEnd,
        notes: body.notes,
        actorUserId: actor?.userId,
        correlationId,
      });

      return { success: true, data: result, correlationId };
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('re.periods.close.failed', err, {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 're:periods:close',
      });
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to close period' },
        correlationId,
      };
    }
  }

  @Post('/re/reconciliations/invoice/register')
  @UseGuards(EcosystemJwtGuard, AbacGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('re:reconciliations:update')
  async registerExternalInvoice(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Body() body: any
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('re.reconciliations.invoice.register.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 're:reconciliations:update',
    });

    if (!body?.statementId || !body?.invoiceNumber || !body?.invoiceDate || typeof body?.invoiceAmount !== 'number' || !body?.receivedFrom) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'statementId, invoiceNumber, invoiceDate, invoiceAmount, receivedFrom are required' },
        correlationId,
      };
    }

    try {
      const reconciliation = await this.reinsuranceService.registerExternalInvoice({
        tenantId: tenantId!,
        statementId: body.statementId,
        invoiceNumber: body.invoiceNumber,
        invoiceDate: body.invoiceDate,
        invoiceAmount: body.invoiceAmount,
        invoiceCurrency: body.invoiceCurrency,
        receivedFrom: body.receivedFrom,
        createdBy: actor?.userId,
      });

      return { success: true, data: reconciliation, correlationId };
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('re.reconciliations.invoice.register.failed', err, {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 're:reconciliations:update',
      });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to register invoice' }, correlationId };
    }
  }

  @Post('/re/reconciliations/:reconciliationId/auto-match')
  @UseGuards(EcosystemJwtGuard, AbacGuard, PermissionsGuard, TenantGuard)
  @RequirePermissions('re:reconciliations:update')
  async autoMatchInvoice(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('reconciliationId') reconciliationId: string,
    @Body() body: any
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;

    auditLogger.info('re.reconciliations.auto-match.request', {
      correlationId,
      tenantId,
      actorUserId: actor?.userId,
      action: 're:reconciliations:update',
      reconciliationId,
    });

    try {
      const result = await this.reinsuranceService.autoMatchInvoice({
        tenantId: tenantId!,
        reconciliationId,
        tolerancePercent: body?.tolerancePercent,
      });

      return { success: true, data: result, correlationId };
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('re.reconciliations.auto-match.failed', err, {
        correlationId,
        tenantId,
        actorUserId: actor?.userId,
        action: 're:reconciliations:update',
        reconciliationId,
      });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to auto-match invoice' }, correlationId };
    }
  }
}
