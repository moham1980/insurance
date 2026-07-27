import { Body, Controller, Get, Headers, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermissions } from './permissions.decorator';
import { auditLogger } from './audit.logger';
import { ReinsuranceService } from './reinsurance.service';
import type { ReTreatyStatus } from './entities/ReTreaty';
import type { ReCessionStatus } from './entities/ReCession';
import type { ReStatementStatus } from './entities/ReStatement';
import type { ReReconciliationStatus } from './entities/ReReconciliation';
import type { ReClaimRecoveryStatus } from './entities/ReClaimRecovery';
import type { ReTicketStatus } from './entities/ReTicket';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';

@Controller()
export class ReinsuranceController {
  constructor(private readonly reinsuranceService: ReinsuranceService) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  @Post('/re/treaties')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
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
      treatyNumber: body?.treatyNumber,
      reinsurerName: body?.reinsurerName,
      treatyType: body?.treatyType,
      effectiveFrom: body?.effectiveFrom,
      effectiveTo: body?.effectiveTo,
      currency: body?.currency,
      terms: body?.terms,
      createdBy: actor?.userId,
    });

    return { success: true, data: t, correlationId };
  }

  @Get('/re/treaties/:treatyId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('re:treaties:view')
  async getTreaty(@Headers() headers: Record<string, any>, @Param('treatyId') treatyId: string) {
    const correlationId = this.getCorrelationId(headers);
    const t = await this.reinsuranceService.getTreaty(treatyId);
    if (!t) return { success: false, error: { code: 'NOT_FOUND', message: 'Treaty not found' }, correlationId };
    return { success: true, data: t, correlationId };
  }

  @Get('/re/treaties')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('re:treaties:list')
  async listTreaties(
    @Headers() headers: Record<string, any>,
    @Query('status') status?: ReTreatyStatus,
    @Query('reinsurerName') reinsurerName?: string,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const correlationId = this.getCorrelationId(headers);
    const paging = this.reinsuranceService.normalizePaging(limit, offset);
    const out = await this.reinsuranceService.listTreaties({
      status,
      reinsurerName,
      q,
      limit: paging.limit,
      offset: paging.offset,
    });
    return { success: true, data: out, correlationId };
  }

  @Patch('/re/treaties/:treatyId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('re:treaties:update')
  async updateTreaty(@Headers() headers: Record<string, any>, @Param('treatyId') treatyId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const t = await this.reinsuranceService.updateTreaty({
      treatyId,
      reinsurerName: body?.reinsurerName,
      effectiveFrom: body?.effectiveFrom,
      effectiveTo: body?.effectiveTo,
      currency: body?.currency,
      terms: body?.terms,
      status: body?.status,
    });
    return { success: true, data: t, correlationId };
  }

  @Patch('/re/treaties/:treatyId/close')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('re:treaties:close')
  async closeTreaty(@Headers() headers: Record<string, any>, @Param('treatyId') treatyId: string) {
    const correlationId = this.getCorrelationId(headers);
    const t = await this.reinsuranceService.closeTreaty(treatyId);
    return { success: true, data: t, correlationId };
  }

  @Post('/re/cessions/calculate-automatic')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
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
      policyId: body.policyId,
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
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
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
      treatyId: body?.treatyId,
      policyId: body?.policyId,
      riskId: body?.riskId,
      sumInsured: body?.sumInsured,
      premium: body?.premium,
      cessionPercent: body?.cessionPercent,
      cededAmount: body?.cededAmount,
      notes: body?.notes,
      createdBy: actor?.userId,
      correlationId,
    });

    return { success: true, data: c, correlationId };
  }

  @Get('/re/cessions/:cessionId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('re:cessions:view')
  async getCession(@Headers() headers: Record<string, any>, @Param('cessionId') cessionId: string) {
    const correlationId = this.getCorrelationId(headers);
    const c = await this.reinsuranceService.getCession(cessionId);
    if (!c) return { success: false, error: { code: 'NOT_FOUND', message: 'Cession not found' }, correlationId };
    return { success: true, data: c, correlationId };
  }

  @Get('/re/cessions')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('re:cessions:list')
  async listCessions(
    @Headers() headers: Record<string, any>,
    @Query('treatyId') treatyId?: string,
    @Query('status') status?: ReCessionStatus,
    @Query('policyId') policyId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const correlationId = this.getCorrelationId(headers);
    const paging = this.reinsuranceService.normalizePaging(limit, offset);
    const out = await this.reinsuranceService.listCessions({
      treatyId,
      status,
      policyId,
      limit: paging.limit,
      offset: paging.offset,
    });
    return { success: true, data: out, correlationId };
  }

  @Patch('/re/cessions/:cessionId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('re:cessions:update')
  async updateCession(@Headers() headers: Record<string, any>, @Param('cessionId') cessionId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const c = await this.reinsuranceService.updateCession({
      cessionId,
      notes: body?.notes,
      sumInsured: body?.sumInsured,
      premium: body?.premium,
      cessionPercent: body?.cessionPercent,
      cededAmount: body?.cededAmount,
      status: body?.status,
      correlationId,
    });
    return { success: true, data: c, correlationId };
  }

  @Patch('/re/cessions/:cessionId/approve')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('re:cessions:approve')
  async approveCession(@Headers() headers: Record<string, any>, @Param('cessionId') cessionId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const c = await this.reinsuranceService.approveCession({
      cessionId,
      approved: Boolean(body?.approved),
      notes: body?.notes,
    });
    return { success: true, data: c, correlationId };
  }

  @Post('/re/statements')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
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
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('re:statements:view')
  async getStatement(@Headers() headers: Record<string, any>, @Param('statementId') statementId: string) {
    const correlationId = this.getCorrelationId(headers);
    const s = await this.reinsuranceService.getStatement(statementId);
    if (!s) return { success: false, error: { code: 'NOT_FOUND', message: 'Statement not found' }, correlationId };
    return { success: true, data: s, correlationId };
  }

  @Get('/re/statements')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('re:statements:list')
  async listStatements(
    @Headers() headers: Record<string, any>,
    @Query('treatyId') treatyId?: string,
    @Query('status') status?: ReStatementStatus,
    @Query('statementType') statementType?: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const correlationId = this.getCorrelationId(headers);
    const paging = this.reinsuranceService.normalizePaging(limit, offset);
    const out = await this.reinsuranceService.listStatements({
      treatyId,
      status,
      statementType,
      limit: paging.limit,
      offset: paging.offset,
    });
    return { success: true, data: out, correlationId };
  }

  @Patch('/re/statements/:statementId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('re:statements:update')
  async updateStatement(@Headers() headers: Record<string, any>, @Param('statementId') statementId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const s = await this.reinsuranceService.updateStatement({
      statementId,
      status: body?.status,
      totals: body?.totals,
    });
    return { success: true, data: s, correlationId };
  }

  @Post('/re/reconciliations')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
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
      statementId: body?.statementId,
      summary: body?.summary,
      details: body?.details,
      createdBy: actor?.userId,
    });

    return { success: true, data: r, correlationId };
  }

  @Post('/re/recoveries')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('re:recoveries:create')
  async createRecovery(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;
    auditLogger.info('re.recoveries.create.request', { correlationId, tenantId, actorUserId: actor?.userId, action: 're:recoveries:create' });
    const r = await this.reinsuranceService.createRecovery({
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
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('re:recoveries:view')
  async getRecovery(@Headers() headers: Record<string, any>, @Param('recoveryId') recoveryId: string) {
    const correlationId = this.getCorrelationId(headers);
    const r = await this.reinsuranceService.getRecovery(recoveryId);
    if (!r) return { success: false, error: { code: 'NOT_FOUND', message: 'Recovery not found' }, correlationId };
    return { success: true, data: r, correlationId };
  }

  @Get('/re/recoveries')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('re:recoveries:list')
  async listRecoveries(
    @Headers() headers: Record<string, any>,
    @Query('treatyId') treatyId?: string,
    @Query('status') status?: ReClaimRecoveryStatus,
    @Query('claimId') claimId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const correlationId = this.getCorrelationId(headers);
    const paging = this.reinsuranceService.normalizePaging(limit, offset);
    const out = await this.reinsuranceService.listRecoveries({ treatyId, status, claimId, limit: paging.limit, offset: paging.offset });
    return { success: true, data: out, correlationId };
  }

  @Patch('/re/recoveries/:recoveryId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('re:recoveries:update')
  async updateRecovery(@Headers() headers: Record<string, any>, @Param('recoveryId') recoveryId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const r = await this.reinsuranceService.updateRecovery({
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
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('re:tickets:create')
  async createTicket(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;
    auditLogger.info('re.tickets.create.request', { correlationId, tenantId, actorUserId: actor?.userId, action: 're:tickets:create' });
    const t = await this.reinsuranceService.createTicket({
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
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('re:tickets:view')
  async getTicket(@Headers() headers: Record<string, any>, @Param('ticketId') ticketId: string) {
    const correlationId = this.getCorrelationId(headers);
    const t = await this.reinsuranceService.getTicket(ticketId);
    if (!t) return { success: false, error: { code: 'NOT_FOUND', message: 'Ticket not found' }, correlationId };
    const messages = await this.reinsuranceService.listTicketMessages(ticketId);
    const attachments = await this.reinsuranceService.listTicketAttachments(ticketId);
    return { success: true, data: { ticket: t, messages, attachments }, correlationId };
  }

  @Get('/re/tickets')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('re:tickets:list')
  async listTickets(
    @Headers() headers: Record<string, any>,
    @Query('reconciliationId') reconciliationId?: string,
    @Query('status') status?: ReTicketStatus,
    @Query('assignedTo') assignedTo?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const correlationId = this.getCorrelationId(headers);
    const paging = this.reinsuranceService.normalizePaging(limit, offset);
    const out = await this.reinsuranceService.listTickets({ reconciliationId, status, assignedTo, limit: paging.limit, offset: paging.offset });
    return { success: true, data: out, correlationId };
  }

  @Patch('/re/tickets/:ticketId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('re:tickets:update')
  async updateTicket(@Headers() headers: Record<string, any>, @Param('ticketId') ticketId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const t = await this.reinsuranceService.updateTicket({ ticketId, status: body?.status, summary: body?.summary });
    return { success: true, data: t, correlationId };
  }

  @Patch('/re/tickets/:ticketId/assign')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('re:tickets:assign')
  async assignTicket(@Headers() headers: Record<string, any>, @Param('ticketId') ticketId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const t = await this.reinsuranceService.assignTicket({ ticketId, assignedTo: body?.assignedTo ?? null });
    return { success: true, data: t, correlationId };
  }

  @Post('/re/tickets/:ticketId/messages')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('re:tickets:add_message')
  async addTicketMessage(@Req() req: any, @Headers() headers: Record<string, any>, @Param('ticketId') ticketId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;
    auditLogger.info('re.tickets.messages.create.request', { correlationId, tenantId, actorUserId: actor?.userId, action: 're:tickets:add_message', ticketId });
    const m = await this.reinsuranceService.addTicketMessage({
      ticketId,
      messageType: body?.messageType,
      body: body?.body,
      createdBy: actor?.userId,
    });
    return { success: true, data: m, correlationId };
  }

  @Post('/re/tickets/:ticketId/attachments')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('re:tickets:add_attachment')
  async addTicketAttachment(@Req() req: any, @Headers() headers: Record<string, any>, @Param('ticketId') ticketId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;
    auditLogger.info('re.tickets.attachments.create.request', { correlationId, tenantId, actorUserId: actor?.userId, action: 're:tickets:add_attachment', ticketId });
    const a = await this.reinsuranceService.addTicketAttachment({
      ticketId,
      documentId: body?.documentId,
      notes: body?.notes,
      createdBy: actor?.userId,
    });
    return { success: true, data: a, correlationId };
  }

  @Get('/re/reconciliations/:reconciliationId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('re:reconciliations:view')
  async getReconciliation(@Headers() headers: Record<string, any>, @Param('reconciliationId') reconciliationId: string) {
    const correlationId = this.getCorrelationId(headers);
    const r = await this.reinsuranceService.getReconciliation(reconciliationId);
    if (!r) return { success: false, error: { code: 'NOT_FOUND', message: 'Reconciliation not found' }, correlationId };
    return { success: true, data: r, correlationId };
  }

  @Get('/re/reconciliations')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('re:reconciliations:list')
  async listReconciliations(
    @Headers() headers: Record<string, any>,
    @Query('statementId') statementId?: string,
    @Query('status') status?: ReReconciliationStatus,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const correlationId = this.getCorrelationId(headers);
    const paging = this.reinsuranceService.normalizePaging(limit, offset);
    const out = await this.reinsuranceService.listReconciliations({
      statementId,
      status,
      limit: paging.limit,
      offset: paging.offset,
    });
    return { success: true, data: out, correlationId };
  }

  @Patch('/re/reconciliations/:reconciliationId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('re:reconciliations:update')
  async updateReconciliation(
    @Headers() headers: Record<string, any>,
    @Param('reconciliationId') reconciliationId: string,
    @Body() body: any
  ) {
    const correlationId = this.getCorrelationId(headers);
    const r = await this.reinsuranceService.updateReconciliation({
      reconciliationId,
      status: body?.status,
      summary: body?.summary,
      details: body?.details,
    });
    return { success: true, data: r, correlationId };
  }

  @Get('/re/export')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
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
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
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
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
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
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
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
