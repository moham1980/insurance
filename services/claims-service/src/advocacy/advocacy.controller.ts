import { Body, Controller, Get, Headers, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ClaimAdvocacyService } from './advocacy.service';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { PermissionsGuard } from '../permissions.guard';
import { RequirePermissions } from '../permissions.decorator';
import { AbacGuard } from '../abac.guard';
import { TenantGuard } from '../tenant.guard';
import { auditLogger } from '../audit.logger';

function getUserInfo(req: any) {
  const user = req?.user || {};
  return {
    tenantId: user.tenantId || user.tenant_id,
    actor: user.userId || user.sub,
    organizationId: user.organizationId || user.organization_id,
    roles: Array.isArray(user.roles) ? user.roles : [],
  };
}

function getCorrelationId(headers: Record<string, any>): string {
  const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
  if (typeof cid === 'string' && cid.length > 0) return cid;
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function formatError(e: any, correlationId: string, fallbackMessage: string): any {
  const code = e?.code || 'INTERNAL_ERROR';
  const knownClientCodes = new Set([
    'VALIDATION_ERROR',
    'NOT_FOUND',
    'ACCESS_DENIED',
    'INVALID_STATE',
    'CROSS_TENANT_ACCESS_DENIED',
    'AMOUNT_LIMIT_EXCEEDED',
  ]);
  return {
    success: false,
    error: {
      code: knownClientCodes.has(code) ? code : 'INTERNAL_ERROR',
      message: knownClientCodes.has(code) ? (e?.message || fallbackMessage) : fallbackMessage,
    },
    correlationId,
  };
}

@Controller()
export class ClaimAdvocacyController {
  constructor(private readonly advocacyService: ClaimAdvocacyService) {}

  @Post('/claims/:claimId/advocacy-cases')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('claims:advocacy:manage')
  async openAdvocacyCase(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Param('claimId') claimId: string,
    @Body() body: any
  ) {
    const correlationId = getCorrelationId(headers);
    const { tenantId, actor, organizationId } = getUserInfo(req);

    if (!tenantId || !organizationId) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'tenantId and organizationId are required' }, correlationId };
    }

    try {
      const c = await this.advocacyService.openAdvocacyCase({
        correlationId,
        tenantId,
        actorUserId: actor,
        claimId,
        brokerOrganizationId: body.brokerOrganizationId || organizationId,
        customerPartyId: body.customerPartyId,
        carrierOrganizationId: body.carrierOrganizationId,
        priority: body.priority,
      });
      return { success: true, data: { caseId: c.caseId, status: c.status, openedAt: c.openedAt }, correlationId };
    } catch (e: any) {
      auditLogger.error('claims.advocacy.open.failed', e, { correlationId, tenantId, claimId });
      return formatError(e, correlationId, 'Failed to open advocacy case');
    }
  }

  @Get('/advocacy-cases')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('claims:advocacy:view')
  async listAdvocacyCases(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Query() query: any
  ) {
    const correlationId = getCorrelationId(headers);
    const { tenantId, organizationId } = getUserInfo(req);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10) || 20));
    const offset = Math.max(0, parseInt(query.offset || '0', 10) || 0);

    try {
      const result = await this.advocacyService.listAdvocacyCases({
        tenantId,
        brokerOrganizationId: query.scope === 'mine' ? organizationId : undefined,
        customerPartyId: query.customerPartyId,
        status: query.status,
        limit,
        offset,
      });
      return { success: true, data: result, correlationId };
    } catch (e: any) {
      return formatError(e, correlationId, 'Failed to list advocacy cases');
    }
  }

  @Get('/advocacy-cases/:caseId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('claims:advocacy:view')
  async getAdvocacyCase(@Headers() headers: Record<string, any>, @Req() req: any, @Param('caseId') caseId: string) {
    const correlationId = getCorrelationId(headers);
    const { tenantId } = getUserInfo(req);

    try {
      const c = await this.advocacyService.getAdvocacyCase({ caseId, tenantId });
      if (!c) return { success: false, error: { code: 'NOT_FOUND', message: `Case ${caseId} not found` }, correlationId };
      return { success: true, data: c, correlationId };
    } catch (e: any) {
      return formatError(e, correlationId, 'Failed to get advocacy case');
    }
  }

  @Get('/advocacy-cases/:caseId/tasks')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('claims:advocacy:manage')
  async listTasks(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Param('caseId') caseId: string,
    @Query('status') status?: string,
  ) {
    const correlationId = getCorrelationId(headers);
    const { tenantId } = getUserInfo(req);

    try {
      const tasks = await this.advocacyService.listTasks({ tenantId, caseId, status });
      return { success: true, data: tasks, correlationId };
    } catch (e: any) {
      return formatError(e, correlationId, 'Failed to list advocacy tasks');
    }
  }

  @Post('/advocacy-cases/:caseId/tasks')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('claims:advocacy:manage')
  async createTask(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Param('caseId') caseId: string,
    @Body() body: any
  ) {
    const correlationId = getCorrelationId(headers);
    const { tenantId } = getUserInfo(req);

    if (!tenantId || !body.taskType || !body.assignedToPartyId || !body.dueDate) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' }, correlationId };
    }

    try {
      const t = await this.advocacyService.createTask({
        correlationId,
        tenantId,
        caseId,
        taskType: body.taskType,
        assignedToPartyId: body.assignedToPartyId,
        dueDate: body.dueDate,
      });
      return { success: true, data: { taskId: t.taskId, status: t.status }, correlationId };
    } catch (e: any) {
      return formatError(e, correlationId, 'Failed to create advocacy task');
    }
  }

  @Patch('/advocacy-cases/:caseId/tasks/:taskId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('claims:advocacy:manage')
  async updateTask(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Param('caseId') caseId: string,
    @Param('taskId') taskId: string,
    @Body() body: any
  ) {
    const correlationId = getCorrelationId(headers);
    const { tenantId } = getUserInfo(req);

    try {
      const t = await this.advocacyService.updateTask({
        correlationId,
        tenantId,
        caseId,
        taskId,
        status: body.status,
        outcome: body.outcome,
      });
      if (!t) return { success: false, error: { code: 'NOT_FOUND', message: 'Task not found' }, correlationId };
      return { success: true, data: { taskId, status: t.status }, correlationId };
    } catch (e: any) {
      return formatError(e, correlationId, 'Failed to update advocacy task');
    }
  }

  @Post('/advocacy-cases/:caseId/communications')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('claims:advocacy:manage')
  async addCommunication(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Param('caseId') caseId: string,
    @Body() body: any
  ) {
    const correlationId = getCorrelationId(headers);
    const { tenantId } = getUserInfo(req);

    if (!body.channel || !body.direction || !body.contentRef) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' }, correlationId };
    }

    try {
      const c = await this.advocacyService.addCommunication({
        correlationId,
        tenantId,
        caseId,
        channel: body.channel,
        direction: body.direction,
        contentRef: body.contentRef,
        partyId: body.partyId,
        subject: body.subject,
        summary: body.summary,
        isPii: body.isPii,
        timestamp: body.timestamp,
      });
      return { success: true, data: { communicationId: c.communicationId }, correlationId };
    } catch (e: any) {
      return formatError(e, correlationId, 'Failed to add communication');
    }
  }

  @Post('/advocacy-cases/:caseId/escalate')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('claims:advocacy:manage')
  async escalate(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Param('caseId') caseId: string,
    @Body() body: any
  ) {
    const correlationId = getCorrelationId(headers);
    const { tenantId, actor } = getUserInfo(req);

    try {
      const c = await this.advocacyService.escalate({
        correlationId,
        tenantId,
        caseId,
        reason: body.reason,
        actorUserId: actor,
      });
      if (!c) return { success: false, error: { code: 'NOT_FOUND', message: 'Case not found' }, correlationId };
      return { success: true, data: { caseId, status: c.status }, correlationId };
    } catch (e: any) {
      return formatError(e, correlationId, 'Failed to escalate case');
    }
  }

  @Post('/advocacy-cases/:caseId/close')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('claims:advocacy:manage')
  async closeCase(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Param('caseId') caseId: string
  ) {
    const correlationId = getCorrelationId(headers);
    const { tenantId, actor } = getUserInfo(req);

    try {
      const c = await this.advocacyService.closeCase({
        correlationId,
        tenantId,
        caseId,
        actorUserId: actor,
      });
      if (!c) return { success: false, error: { code: 'NOT_FOUND', message: 'Case not found' }, correlationId };
      return { success: true, data: { caseId, status: c.status, closedAt: c.closedAt }, correlationId };
    } catch (e: any) {
      return formatError(e, correlationId, 'Failed to close case');
    }
  }

  @Post('/claims/:claimId/adjuster-referrals')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('claims:adjuster:refer')
  async createAdjusterReferral(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Param('claimId') claimId: string,
    @Body() body: any
  ) {
    const correlationId = getCorrelationId(headers);
    const { tenantId } = getUserInfo(req);

    if (!body.caseId || !body.adjusterOrganizationId || !body.adjusterPartyId) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' }, correlationId };
    }

    try {
      const r = await this.advocacyService.createAdjusterReferral({
        correlationId,
        tenantId,
        claimId,
        caseId: body.caseId,
        adjusterOrganizationId: body.adjusterOrganizationId,
        adjusterPartyId: body.adjusterPartyId,
        estimatedFeeAmount: body.estimatedFeeAmount,
        estimatedFeeCurrency: body.estimatedFeeCurrency,
      });
      return { success: true, data: { referralId: r.referralId, status: r.status }, correlationId };
    } catch (e: any) {
      return formatError(e, correlationId, 'Failed to create adjuster referral');
    }
  }

  @Get('/claims/:claimId/adjuster-referrals')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('claims:adjuster:refer')
  async listAdjusterReferrals(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Param('claimId') claimId: string,
    @Query() query: any
  ) {
    const correlationId = getCorrelationId(headers);
    const { tenantId } = getUserInfo(req);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10) || 20));
    const offset = Math.max(0, parseInt(query.offset || '0', 10) || 0);

    try {
      const result = await this.advocacyService.listAdjusterReferrals({
        correlationId,
        tenantId,
        claimId,
        limit,
        offset,
      });
      return { success: true, data: result, correlationId };
    } catch (e: any) {
      return formatError(e, correlationId, 'Failed to list adjuster referrals');
    }
  }

  @Post('/adjuster-referrals/:referralId/accept')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('claims:adjuster:respond')
  async acceptReferral(@Headers() headers: Record<string, any>, @Req() req: any, @Param('referralId') referralId: string) {
    const correlationId = getCorrelationId(headers);
    const { tenantId } = getUserInfo(req);

    try {
      const r = await this.advocacyService.acceptAdjusterReferral({ correlationId, tenantId, referralId });
      if (!r) return { success: false, error: { code: 'NOT_FOUND', message: 'Referral not found' }, correlationId };
      return { success: true, data: { referralId, status: r.status }, correlationId };
    } catch (e: any) {
      return formatError(e, correlationId, 'Failed to accept referral');
    }
  }

  @Post('/adjuster-referrals/:referralId/reject')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('claims:adjuster:respond')
  async rejectReferral(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Param('referralId') referralId: string,
    @Body() body: any
  ) {
    const correlationId = getCorrelationId(headers);
    const { tenantId } = getUserInfo(req);

    try {
      const r = await this.advocacyService.rejectAdjusterReferral({
        correlationId,
        tenantId,
        referralId,
        reason: body.reason,
      });
      if (!r) return { success: false, error: { code: 'NOT_FOUND', message: 'Referral not found' }, correlationId };
      return { success: true, data: { referralId, status: r.status }, correlationId };
    } catch (e: any) {
      return formatError(e, correlationId, 'Failed to reject referral');
    }
  }

  @Post('/adjuster-referrals/:referralId/submit-report')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('claims:adjuster:submit_report')
  async submitReport(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Param('referralId') referralId: string,
    @Body() body: any
  ) {
    const correlationId = getCorrelationId(headers);
    const { tenantId } = getUserInfo(req);

    if (!body.reportRef || !body.reportChecksum) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'reportRef and reportChecksum required' }, correlationId };
    }

    try {
      const r = await this.advocacyService.submitAdjusterReport({
        correlationId,
        tenantId,
        referralId,
        reportRef: body.reportRef,
        reportChecksum: body.reportChecksum,
        reportMetadata: body.reportMetadata,
      });
      if (!r) return { success: false, error: { code: 'NOT_FOUND', message: 'Referral not found' }, correlationId };
      return { success: true, data: { referralId, status: r.status, reportReceivedAt: r.reportReceivedAt }, correlationId };
    } catch (e: any) {
      return formatError(e, correlationId, 'Failed to submit adjuster report');
    }
  }

  @Post('/adjuster-referrals/:referralId/communications')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('claims:advocacy:manage')
  async addAdjusterCommunication(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Param('referralId') referralId: string,
    @Body() body: {
      channel: 'email' | 'sms' | 'call' | 'web' | 'mobile_app';
      direction: 'inbound' | 'outbound';
      contentRef: string;
      partyId?: string;
      subject?: string;
      summary?: string;
      isPii?: boolean;
    },
  ) {
    const correlationId = getCorrelationId(headers);
    const { tenantId } = getUserInfo(req);

    try {
      const c = await this.advocacyService.addAdjusterCommunication({
        correlationId,
        tenantId,
        referralId,
        channel: body.channel,
        direction: body.direction,
        contentRef: body.contentRef,
        partyId: body.partyId,
        subject: body.subject,
        summary: body.summary,
        isPii: body.isPii,
      });
      return { success: true, data: { communicationId: c.communicationId, caseId: c.caseId }, correlationId };
    } catch (e: any) {
      return formatError(e, correlationId, 'Failed to add adjuster communication');
    }
  }

  @Get('/claims/:claimId/projections')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('claims:projection:view')
  async listProjections(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Param('claimId') claimId: string,
    @Query() query: any
  ) {
    const correlationId = getCorrelationId(headers);
    const { tenantId } = getUserInfo(req);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10) || 20));
    const offset = Math.max(0, parseInt(query.offset || '0', 10) || 0);

    try {
      const result = await this.advocacyService.listClaimProjections({ claimId, tenantId, limit, offset });
      return { success: true, data: result, correlationId };
    } catch (e: any) {
      return formatError(e, correlationId, 'Failed to list projections');
    }
  }

  @Post('/claims/:claimId/projections')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('claims:projection:write')
  async addProjection(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Param('claimId') claimId: string,
    @Body() body: any
  ) {
    const correlationId = getCorrelationId(headers);
    const { tenantId } = getUserInfo(req);

    if (!body.brokerOrganizationId || !body.carrierOrganizationId || !body.externalClaimId || !body.sourceSystemId || !body.payload) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' }, correlationId };
    }

    try {
      const p = await this.advocacyService.addClaimProjection({
        correlationId,
        tenantId,
        brokerOrganizationId: body.brokerOrganizationId,
        carrierOrganizationId: body.carrierOrganizationId,
        claimId,
        externalClaimId: body.externalClaimId,
        sourceSystemId: body.sourceSystemId,
        sourceVersion: body.sourceVersion || 1,
        payload: body.payload,
      });
      return { success: true, data: { projectionId: p.projectionId, status: p.status }, correlationId };
    } catch (e: any) {
      return formatError(e, correlationId, 'Failed to add projection');
    }
  }

  @Post('/claims/:claimId/recovery')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('claims:recovery:manage')
  async createRecoveryCase(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Param('claimId') claimId: string,
    @Body() body: any
  ) {
    const correlationId = getCorrelationId(headers);
    const { tenantId } = getUserInfo(req);

    if (typeof body.expectedRecoveryAmount !== 'number') {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'expectedRecoveryAmount required' }, correlationId };
    }

    try {
      const r = await this.advocacyService.createRecoveryCase({
        correlationId,
        tenantId,
        claimId,
        responsiblePartyId: body.responsiblePartyId,
        expectedRecoveryAmount: body.expectedRecoveryAmount,
        expectedRecoveryCurrency: body.expectedRecoveryCurrency,
      });
      return { success: true, data: { recoveryId: r.recoveryId, status: r.status }, correlationId };
    } catch (e: any) {
      return formatError(e, correlationId, 'Failed to create recovery case');
    }
  }

  @Get('/recovery/:recoveryId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('claims:recovery:manage')
  async getRecoveryCase(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Param('recoveryId') recoveryId: string,
  ) {
    const correlationId = getCorrelationId(headers);
    const { tenantId } = getUserInfo(req);

    try {
      const r = await this.advocacyService.getRecoveryCase({ tenantId, recoveryId });
      if (!r) return { success: false, error: { code: 'NOT_FOUND', message: 'Recovery case not found' }, correlationId };
      return { success: true, data: r, correlationId };
    } catch (e: any) {
      return formatError(e, correlationId, 'Failed to get recovery case');
    }
  }

  @Get('/claims/:claimId/recovery')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('claims:recovery:manage')
  async listRecoveryCases(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Param('claimId') claimId: string,
    @Query('status') status?: string,
  ) {
    const correlationId = getCorrelationId(headers);
    const { tenantId } = getUserInfo(req);

    try {
      const rows = await this.advocacyService.listRecoveryCases({ tenantId, claimId, status });
      return { success: true, data: rows, correlationId };
    } catch (e: any) {
      return formatError(e, correlationId, 'Failed to list recovery cases');
    }
  }

  @Patch('/recovery/:recoveryId/status')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('claims:recovery:manage')
  async updateRecoveryStatus(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Param('recoveryId') recoveryId: string,
    @Body() body: { status: string },
  ) {
    const correlationId = getCorrelationId(headers);
    const { tenantId } = getUserInfo(req);

    try {
      const r = await this.advocacyService.updateRecoveryStatus({
        correlationId,
        tenantId,
        recoveryId,
        status: body.status,
      });
      if (!r) return { success: false, error: { code: 'NOT_FOUND', message: 'Recovery case not found' }, correlationId };
      return { success: true, data: { recoveryId, status: r.status }, correlationId };
    } catch (e: any) {
      return formatError(e, correlationId, 'Failed to update recovery status');
    }
  }

  @Post('/claims/:claimId/documents')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('claims:document:attach')
  async attachDocument(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Param('claimId') claimId: string,
    @Body() body: any
  ) {
    const correlationId = getCorrelationId(headers);
    const { tenantId, actor, organizationId } = getUserInfo(req);

    if (!body.documentId || !body.uploadedByPartyId) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'documentId and uploadedByPartyId required' }, correlationId };
    }

    try {
      const d = await this.advocacyService.attachClaimDocument({
        correlationId,
        tenantId,
        actorUserId: actor,
        claimId,
        caseId: body.caseId,
        documentId: body.documentId,
        documentType: body.documentType,
        uploadedByPartyId: body.uploadedByPartyId,
        uploadedByOrganizationId: organizationId,
      });
      return { success: true, data: { documentId: d.documentId, documentType: d.documentType, virusScanStatus: d.virusScanStatus, piiScanStatus: d.piiScanStatus, classification: d.classification }, correlationId };
    } catch (e: any) {
      return formatError(e, correlationId, 'Failed to attach document');
    }
  }

  @Get('/claims/:claimId/documents')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('claims:document:view')
  async listDocuments(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Param('claimId') claimId: string
  ) {
    const correlationId = getCorrelationId(headers);
    const { tenantId, organizationId, roles } = getUserInfo(req);
    const isBroker = roles.some(r => r.includes('broker'));

    try {
      const result = await this.advocacyService.listClaimDocuments({ claimId, tenantId, organizationId, isBroker });
      return { success: true, data: result, correlationId };
    } catch (e: any) {
      return formatError(e, correlationId, 'Failed to list documents');
    }
  }

  @Get('/claims/:claimId/documents/:documentId/download')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('claims:document:download')
  async getDocumentDownloadUrl(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Param('claimId') claimId: string,
    @Param('documentId') documentId: string
  ) {
    const correlationId = getCorrelationId(headers);
    const { tenantId, organizationId, roles } = getUserInfo(req);
    const isBroker = roles.some(r => r.includes('broker'));

    try {
      const result = await this.advocacyService.getClaimDocumentDownloadUrl({ correlationId, tenantId, claimId, documentId, organizationId, isBroker });
      if (!result) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Download URL not available' }, correlationId };
      }
      return { success: true, data: result, correlationId };
    } catch (e: any) {
      return formatError(e, correlationId, 'Failed to get download URL');
    }
  }

  @Get('/claims/:claimId/documents/:documentId/scan-status')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('claims:document:view')
  async getDocumentScanStatus(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Param('claimId') claimId: string,
    @Param('documentId') documentId: string,
  ) {
    const correlationId = getCorrelationId(headers);
    const { tenantId } = getUserInfo(req);

    try {
      const result = await this.advocacyService.getClaimDocumentScanStatus({ tenantId, claimId, documentId });
      if (!result) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Document not found' }, correlationId };
      }
      return { success: true, data: result, correlationId };
    } catch (e: any) {
      return formatError(e, correlationId, 'Failed to get scan status');
    }
  }
}
