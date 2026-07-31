import { Controller, Post, Body, Param, Headers, Get, Query, UseGuards, Req, Patch, Delete } from '@nestjs/common';
import { AgentPortalService } from './agent-portal.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermissions } from './permissions.decorator';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';

@Controller('agent-portal')
@UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
export class AgentPortalController {
  constructor(private readonly service: AgentPortalService) {}

  private readonly BROKER_ROLES = ['broker_owner', 'broker_staff', 'insurer_admin', 'head_office_ops', 'system_admin'];

  private validateAgentAccess(agentId: string, req: any): void {
    const user = req?.user;
    if (!user) return;
    const roles: string[] = user.roles || (user.role ? [user.role] : []);
    const isBrokerOrAdmin = roles.some(r => this.BROKER_ROLES.includes(r));
    if (!isBrokerOrAdmin) {
      const tokenAgentId = user.agentId || user.userId || user.sub;
      if (tokenAgentId && tokenAgentId !== agentId) {
        const err: any = new Error('Access denied: agentId does not match authenticated identity');
        err.code = 'ACCESS_DENIED';
        err.status = 403;
        throw err;
      }
    }
  }

  @Post('session')
  @RequirePermissions('agent_portal:session')
  async createSession(
    @Headers() headers: Record<string, any>,
    @Body() body: {
      tenantId: string;
      agentId: string;
      jwtToken: string;
      expiresIn: string;
    },
  ) {
    const correlationId = headers['x-correlation-id'] || `ap-${Date.now()}`;
    const result = await this.service.createSession({
      tenantId: body.tenantId,
      agentId: body.agentId,
      jwtToken: body.jwtToken,
      expiresIn: body.expiresIn || '8h',
    });
    return {
      success: true,
      data: result,
      correlationId,
    };
  }

  @Get('session/:sessionId/validate')
  @RequirePermissions('agent_portal:session')
  async validateSession(@Param('sessionId') sessionId: string) {
    const result = await this.service.validateSession(sessionId);
    return {
      success: result.valid,
      data: result.valid ? { agentId: result.agentId } : null,
    };
  }

  @Post('session/:sessionId/refresh')
  @RequirePermissions('agent_portal:session')
  async refreshSession(@Param('sessionId') sessionId: string) {
    const result = await this.service.refreshSession(sessionId);
    return {
      success: result.success,
      data: result.success ? { expiresAt: result.expiresAt } : null,
      error: result.error || undefined,
    };
  }

  @Post('session/:sessionId/revoke')
  @RequirePermissions('agent_portal:session')
  async revokeSession(@Param('sessionId') sessionId: string) {
    await this.service.revokeSession(sessionId);
    return {
      success: true,
      data: { revoked: true },
    };
  }

  @Post('agent/:agentId/revoke-all')
  @RequirePermissions('agent_portal:session')
  async revokeAllAgentSessions(@Param('agentId') agentId: string, @Req() req: any) {
    this.validateAgentAccess(agentId, req);
    const count = await this.service.revokeAllAgentSessions(agentId);
    return {
      success: true,
      data: { revokedCount: count },
    };
  }

  @Post('session/validate')
  @RequirePermissions('agent_portal:session')
  async validateSessionPost(@Body() body: { sessionId: string; jwtToken?: string }) {
    const result = await this.service.validateSession(body.sessionId);
    return {
      success: result.valid,
      data: result.valid ? { agentId: result.agentId } : null,
    };
  }

  @Delete('session/:sessionId')
  @RequirePermissions('agent_portal:session')
  async deleteSession(@Param('sessionId') sessionId: string) {
    await this.service.revokeSession(sessionId);
    return {
      success: true,
      data: { revoked: true },
    };
  }

  @Delete('sessions')
  @RequirePermissions('agent_portal:session')
  async deleteAllSessions(@Query('agentId') agentId: string, @Req() req: any) {
    this.validateAgentAccess(agentId, req);
    const count = await this.service.revokeAllAgentSessions(agentId);
    return {
      success: true,
      data: { revokedCount: count },
    };
  }

  // Agent Portal Business Logic Endpoints

  @Get('agent/:agentId/dashboard')
  @RequirePermissions('agent_portal:dashboard')
  async getDashboardStats(
    @Param('agentId') agentId: string,
    @Query('partnerId') partnerId: string,
    @Query('organizationId') organizationId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('lineOfBusiness') lineOfBusiness?: string,
    @Req() req?: any,
  ) {
    this.validateAgentAccess(agentId, req);
    const authToken = req?.headers?.authorization?.replace('Bearer ', '');
    const tenantId = req?.user?.tenantId;
    const orgId = organizationId || req?.user?.organizationId;
    const userRole = req?.user?.role || req?.user?.roles?.[0] || 'agent';
    const stats = await this.service.getDashboardStats(agentId, partnerId, tenantId, authToken, orgId, userRole, startDate, endDate, lineOfBusiness);
    return {
      success: true,
      data: stats,
    };
  }

  @Get('agent/:agentId/policies')
  @RequirePermissions('agent_portal:policies')
  async getAgentPolicies(
    @Param('agentId') agentId: string,
    @Query('partnerId') partnerId: string,
    @Query('organizationId') organizationId?: string,
    @Query('status') status?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Req() req?: any,
  ) {
    this.validateAgentAccess(agentId, req);
    const authToken = req?.headers?.authorization?.replace('Bearer ', '');
    const tenantId = req?.user?.tenantId;
    const orgId = organizationId || req?.user?.organizationId;
    const userRole = req?.user?.role || req?.user?.roles?.[0] || 'agent';
    const policies = await this.service.getAgentPolicies(agentId, partnerId, {
      status,
      fromDate,
      toDate,
      organizationId: orgId,
    }, tenantId, authToken, userRole);
    return {
      success: true,
      data: policies,
    };
  }

  @Get('agent/:agentId/claims')
  @RequirePermissions('agent_portal:claims')
  async getAgentClaims(
    @Param('agentId') agentId: string,
    @Query('partnerId') partnerId: string,
    @Query('organizationId') organizationId?: string,
    @Query('status') status?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Req() req?: any,
  ) {
    this.validateAgentAccess(agentId, req);
    const authToken = req?.headers?.authorization?.replace('Bearer ', '');
    const tenantId = req?.user?.tenantId;
    const orgId = organizationId || req?.user?.organizationId;
    const userRole = req?.user?.role || req?.user?.roles?.[0] || 'agent';
    const claims = await this.service.getAgentClaims(agentId, partnerId, {
      status,
      fromDate,
      toDate,
      organizationId: orgId,
    }, tenantId, authToken, userRole);
    return {
      success: true,
      data: claims,
    };
  }

  @Get('agent/:agentId/customers')
  @RequirePermissions('agent_portal:customers')
  async getAgentCustomers(
    @Param('agentId') agentId: string,
    @Query('partnerId') partnerId: string,
    @Query('organizationId') organizationId?: string,
    @Query('search') search?: string,
    @Req() req?: any,
  ) {
    this.validateAgentAccess(agentId, req);
    const authToken = req?.headers?.authorization?.replace('Bearer ', '');
    const tenantId = req?.user?.tenantId;
    const orgId = organizationId || req?.user?.organizationId;
    const customers = await this.service.getAgentCustomers(agentId, partnerId, search, tenantId, authToken, orgId);
    return {
      success: true,
      data: customers,
    };
  }

  @Get('agent/:agentId/commissions')
  @RequirePermissions('agent_portal:commissions')
  async getAgentCommissions(
    @Param('agentId') agentId: string,
    @Query('partnerId') partnerId: string,
    @Query('organizationId') organizationId?: string,
    @Query('status') status?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Req() req?: any,
  ) {
    this.validateAgentAccess(agentId, req);
    const authToken = req?.headers?.authorization?.replace('Bearer ', '');
    const tenantId = req?.user?.tenantId;
    const orgId = organizationId || req?.user?.organizationId;
    const userRole = req?.user?.role || req?.user?.roles?.[0] || 'agent';
    const commissions = await this.service.getAgentCommissions(agentId, partnerId, {
      status,
      fromDate,
      toDate,
      organizationId: orgId,
    }, tenantId, authToken, userRole);
    return {
      success: true,
      data: commissions,
    };
  }

  @Get('agent/:agentId/kpi')
  @RequirePermissions('agent_portal:kpi')
  async getAgentKPI(
    @Param('agentId') agentId: string,
    @Query('partnerId') partnerId: string,
    @Query('period') period: 'daily' | 'weekly' | 'monthly' = 'daily',
    @Req() req: any,
  ) {
    this.validateAgentAccess(agentId, req);
    const authToken = req?.headers?.authorization?.replace('Bearer ', '');
    const tenantId = req?.user?.tenantId;
    const kpi = await this.service.getAgentKPI(agentId, partnerId, period, tenantId, authToken);
    return {
      success: true,
      data: kpi,
    };
  }

  // Dashboard sub-endpoints matching UI API contract
  @Get('dashboard/premium-trends')
  @RequirePermissions('agent_portal:dashboard')
  async getPremiumTrends(
    @Query('agentId') agentId: string,
    @Query('partnerId') partnerId: string,
    @Query('months') months: number = 12,
    @Req() req: any,
  ) {
    this.validateAgentAccess(agentId, req);
    const authToken = req?.headers?.authorization?.replace('Bearer ', '');
    const tenantId = req?.user?.tenantId;
    const trends = await this.service.getPremiumTrends(agentId, partnerId, months, tenantId, authToken);
    return { success: true, data: trends };
  }

  @Get('dashboard/commission-history')
  @RequirePermissions('agent_portal:commissions')
  async getCommissionHistory(
    @Query('agentId') agentId: string,
    @Query('partnerId') partnerId: string,
    @Query('months') months: number = 12,
    @Req() req: any,
  ) {
    this.validateAgentAccess(agentId, req);
    const authToken = req?.headers?.authorization?.replace('Bearer ', '');
    const tenantId = req?.user?.tenantId;
    const history = await this.service.getCommissionHistory(agentId, partnerId, months, tenantId, authToken);
    return { success: true, data: history };
  }

  @Get('dashboard/policy-portfolio')
  @RequirePermissions('agent_portal:policies')
  async getPolicyPortfolio(
    @Query('agentId') agentId: string,
    @Query('partnerId') partnerId: string,
    @Req() req: any,
  ) {
    this.validateAgentAccess(agentId, req);
    const authToken = req?.headers?.authorization?.replace('Bearer ', '');
    const tenantId = req?.user?.tenantId;
    const portfolio = await this.service.getPolicyPortfolio(agentId, partnerId, tenantId, authToken);
    return { success: true, data: portfolio };
  }

  @Get('leads')
  @RequirePermissions('agent_portal:leads')
  async getLeads(
    @Query('agentId') agentId: string,
    @Query('partnerId') partnerId: string,
    @Req() req: any,
  ) {
    this.validateAgentAccess(agentId, req);
    const authToken = req?.headers?.authorization?.replace('Bearer ', '');
    const tenantId = req?.user?.tenantId;
    const leads = await this.service.getLeads(agentId, partnerId, tenantId, authToken);
    return { success: true, data: leads };
  }

  @Get('health')
  async healthCheck() {
    const health = await this.service.healthCheck();
    return {
      success: true,
      data: health,
    };
  }

  @Get('claims/:claimId/advocacy')
  @RequirePermissions('agent_portal:claims')
  async getClaimAdvocacy(
    @Param('claimId') claimId: string,
    @Req() req: any,
  ) {
    const authToken = req?.headers?.authorization?.replace('Bearer ', '');
    const tenantId = req?.user?.tenantId;
    const correlationId = req?.headers?.['x-correlation-id'] || `ap-${Date.now()}`;

    const result = await this.service.getClaimAdvocacy({ claimId, tenantId, authToken, correlationId });
    return { ...result, correlationId };
  }

  @Post('claims/:claimId/advocacy-cases')
  @RequirePermissions('agent_portal:claims')
  async openAdvocacyCase(
    @Param('claimId') claimId: string,
    @Req() req: any,
    @Body() body: {
      brokerOrganizationId: string;
      customerPartyId: string;
      carrierOrganizationId: string;
      priority?: string;
    },
  ) {
    const authToken = req?.headers?.authorization?.replace('Bearer ', '');
    const tenantId = req?.user?.tenantId;
    const correlationId = req?.headers?.['x-correlation-id'] || `ap-${Date.now()}`;

    const result = await this.service.openAdvocacyCase({
      claimId,
      tenantId,
      ...body,
      authToken,
      correlationId,
    });
    return { ...result, correlationId };
  }

  @Post('advocacy-cases/:caseId/tasks')
  @RequirePermissions('agent_portal:claims')
  async addAdvocacyTask(
    @Param('caseId') caseId: string,
    @Req() req: any,
    @Body() body: {
      title: string;
      description?: string;
      assignedToPartyId: string;
      dueDate: string;
    },
  ) {
    const authToken = req?.headers?.authorization?.replace('Bearer ', '');
    const tenantId = req?.user?.tenantId;
    const correlationId = req?.headers?.['x-correlation-id'] || `ap-${Date.now()}`;

    const result = await this.service.addAdvocacyTask({ caseId, ...body, tenantId, authToken, correlationId });
    return { ...result, correlationId };
  }

  @Post('claims/:claimId/adjuster-referrals')
  @RequirePermissions('agent_portal:claims')
  async createAdjusterReferral(
    @Param('claimId') claimId: string,
    @Req() req: any,
    @Body() body: {
      caseId: string;
      adjusterOrganizationId: string;
      adjusterPartyId: string;
      estimatedFeeAmount?: number;
      estimatedFeeCurrency?: string;
    },
  ) {
    const authToken = req?.headers?.authorization?.replace('Bearer ', '');
    const tenantId = req?.user?.tenantId;
    const correlationId = req?.headers?.['x-correlation-id'] || `ap-${Date.now()}`;

    const result = await this.service.createAdjusterReferral({ claimId, ...body, tenantId, authToken, correlationId });
    return { ...result, correlationId };
  }

  @Post('claims/:claimId/projections')
  @RequirePermissions('agent_portal:claims')
  async addClaimProjection(
    @Param('claimId') claimId: string,
    @Req() req: any,
    @Body() body: {
      brokerOrganizationId: string;
      carrierOrganizationId: string;
      externalClaimId: string;
      sourceSystemId: string;
      payload: Record<string, any>;
    },
  ) {
    const authToken = req?.headers?.authorization?.replace('Bearer ', '');
    const tenantId = req?.user?.tenantId;
    const correlationId = req?.headers?.['x-correlation-id'] || `ap-${Date.now()}`;

    const result = await this.service.addClaimProjection({ claimId, ...body, tenantId, authToken, correlationId });
    return { ...result, correlationId };
  }

  @Post('claims/:claimId/recovery')
  @RequirePermissions('agent_portal:claims')
  async createRecoveryCase(
    @Param('claimId') claimId: string,
    @Req() req: any,
    @Body() body: {
      responsiblePartyId?: string;
      expectedRecoveryAmount: number;
      expectedRecoveryCurrency?: string;
    },
  ) {
    const authToken = req?.headers?.authorization?.replace('Bearer ', '');
    const tenantId = req?.user?.tenantId;
    const correlationId = req?.headers?.['x-correlation-id'] || `ap-${Date.now()}`;

    const result = await this.service.createRecoveryCase({ claimId, ...body, tenantId, authToken, correlationId });
    return { ...result, correlationId };
  }

  @Post('advocacy-cases/:caseId/escalate')
  @RequirePermissions('agent_portal:claims')
  async escalateCase(
    @Param('caseId') caseId: string,
    @Req() req: any,
    @Body() body: { reason: string },
  ) {
    const authToken = req?.headers?.authorization?.replace('Bearer ', '');
    const tenantId = req?.user?.tenantId;
    const correlationId = req?.headers?.['x-correlation-id'] || `ap-${Date.now()}`;

    const result = await this.service.escalateCase({ caseId, ...body, tenantId, authToken, correlationId });
    return { ...result, correlationId };
  }

  @Post('advocacy-cases/:caseId/communications')
  @RequirePermissions('agent_portal:claims')
  async addAdvocacyCommunication(
    @Param('caseId') caseId: string,
    @Req() req: any,
    @Body() body: {
      channel: string;
      direction: string;
      contentRef: string;
      partyId?: string;
      subject?: string;
      summary?: string;
      isPii?: boolean;
    },
  ) {
    const authToken = req?.headers?.authorization?.replace('Bearer ', '');
    const tenantId = req?.user?.tenantId;
    const correlationId = req?.headers?.['x-correlation-id'] || `ap-${Date.now()}`;

    const result = await this.service.addAdvocacyCommunication({ caseId, ...body, tenantId, authToken, correlationId });
    return { ...result, correlationId };
  }

  @Get('agent/:agentId/policies/:policyId')
  @RequirePermissions('agent_portal:policies')
  async getPolicyDetail(
    @Param('agentId') agentId: string,
    @Param('policyId') policyId: string,
    @Req() req: any,
  ) {
    this.validateAgentAccess(agentId, req);
    const authToken = req?.headers?.authorization?.replace('Bearer ', '');
    const tenantId = req?.user?.tenantId;
    const policy = await this.service.getPolicyDetail({ agentId, policyId, tenantId, authToken });
    return { success: true, data: policy };
  }

  @Get('agent/:agentId/claims/:claimId/status')
  @RequirePermissions('agent_portal:claims')
  async getClaimStatus(
    @Param('agentId') agentId: string,
    @Param('claimId') claimId: string,
    @Req() req: any,
  ) {
    this.validateAgentAccess(agentId, req);
    const authToken = req?.headers?.authorization?.replace('Bearer ', '');
    const tenantId = req?.user?.tenantId;
    const claim = await this.service.getClaimStatus({ agentId, claimId, tenantId, authToken });
    return { success: true, data: claim };
  }

  @Get('agent/:agentId/customers/:customerId')
  @RequirePermissions('agent_portal:customers')
  async getCustomerDetail(
    @Param('agentId') agentId: string,
    @Param('customerId') customerId: string,
    @Req() req: any,
  ) {
    this.validateAgentAccess(agentId, req);
    const authToken = req?.headers?.authorization?.replace('Bearer ', '');
    const tenantId = req?.user?.tenantId;
    const customer = await this.service.getCustomerDetail({ agentId, customerId, tenantId, authToken });
    return { success: true, data: customer };
  }

  @Get('agent/:agentId/commissions/:commissionId')
  @RequirePermissions('agent_portal:commissions')
  async getCommissionDetail(
    @Param('agentId') agentId: string,
    @Param('commissionId') commissionId: string,
    @Req() req: any,
  ) {
    this.validateAgentAccess(agentId, req);
    const authToken = req?.headers?.authorization?.replace('Bearer ', '');
    const tenantId = req?.user?.tenantId;
    const commission = await this.service.getCommissionDetail({ agentId, commissionId, tenantId, authToken });
    return { success: true, data: commission };
  }

  @Post('advocacy-cases/:caseId/close')
  @RequirePermissions('agent_portal:claims')
  async closeAdvocacyCase(
    @Param('caseId') caseId: string,
    @Req() req: any,
  ) {
    const authToken = req?.headers?.authorization?.replace('Bearer ', '');
    const tenantId = req?.user?.tenantId;
    const correlationId = req?.headers?.['x-correlation-id'] || `ap-${Date.now()}`;
    const result = await this.service.closeAdvocacyCase({ caseId, tenantId, authToken });
    return { ...result, correlationId };
  }

  @Get('advocacy-cases/:caseId/tasks')
  @RequirePermissions('agent_portal:claims')
  async listAdvocacyTasks(
    @Param('caseId') caseId: string,
    @Req() req: any,
    @Query('status') status?: string,
  ) {
    const authToken = req?.headers?.authorization?.replace('Bearer ', '');
    const tenantId = req?.user?.tenantId;
    const correlationId = req?.headers?.['x-correlation-id'] || `ap-${Date.now()}`;
    const result = await this.service.listAdvocacyTasks({ caseId, status, tenantId, authToken });
    return { ...result, correlationId };
  }

  @Patch('advocacy-cases/:caseId/tasks/:taskId')
  @RequirePermissions('agent_portal:claims')
  async updateAdvocacyTaskStatus(
    @Param('caseId') caseId: string,
    @Param('taskId') taskId: string,
    @Body() body: { status: string; outcome?: string },
    @Req() req: any,
  ) {
    const authToken = req?.headers?.authorization?.replace('Bearer ', '');
    const tenantId = req?.user?.tenantId;
    const correlationId = req?.headers?.['x-correlation-id'] || `ap-${Date.now()}`;
    const result = await this.service.updateAdvocacyTaskStatus({ caseId, taskId, status: body.status, outcome: body.outcome, tenantId, authToken });
    return { ...result, correlationId };
  }

  @Post('adjuster-referrals/:referralId/accept')
  @RequirePermissions('agent_portal:claims')
  async acceptAdjusterReferral(
    @Param('referralId') referralId: string,
    @Req() req: any,
  ) {
    const authToken = req?.headers?.authorization?.replace('Bearer ', '');
    const tenantId = req?.user?.tenantId;
    const correlationId = req?.headers?.['x-correlation-id'] || `ap-${Date.now()}`;
    const result = await this.service.acceptAdjusterReferral({ referralId, tenantId, authToken });
    return { ...result, correlationId };
  }

  @Post('adjuster-referrals/:referralId/reject')
  @RequirePermissions('agent_portal:claims')
  async rejectAdjusterReferral(
    @Param('referralId') referralId: string,
    @Body() body: { reason?: string },
    @Req() req: any,
  ) {
    const authToken = req?.headers?.authorization?.replace('Bearer ', '');
    const tenantId = req?.user?.tenantId;
    const correlationId = req?.headers?.['x-correlation-id'] || `ap-${Date.now()}`;
    const result = await this.service.rejectAdjusterReferral({ referralId, reason: body?.reason, tenantId, authToken });
    return { ...result, correlationId };
  }

  @Post('adjuster-referrals/:referralId/submit-report')
  @RequirePermissions('agent_portal:claims')
  async submitAdjusterReport(
    @Param('referralId') referralId: string,
    @Body() body: { reportContent?: string; reportMetadata?: any },
    @Req() req: any,
  ) {
    const authToken = req?.headers?.authorization?.replace('Bearer ', '');
    const tenantId = req?.user?.tenantId;
    const correlationId = req?.headers?.['x-correlation-id'] || `ap-${Date.now()}`;
    const result = await this.service.submitAdjusterReport({ referralId, reportContent: body?.reportContent, reportMetadata: body?.reportMetadata, tenantId, authToken });
    return { ...result, correlationId };
  }

  @Get('claims/:claimId/recovery')
  @RequirePermissions('agent_portal:claims')
  async listRecoveryCases(
    @Param('claimId') claimId: string,
    @Req() req: any,
    @Query('status') status?: string,
  ) {
    const authToken = req?.headers?.authorization?.replace('Bearer ', '');
    const tenantId = req?.user?.tenantId;
    const correlationId = req?.headers?.['x-correlation-id'] || `ap-${Date.now()}`;
    const result = await this.service.listRecoveryCases({ claimId, status, tenantId, authToken });
    return { ...result, correlationId };
  }

  @Get('recovery/:recoveryId')
  @RequirePermissions('agent_portal:claims')
  async getRecoveryCase(
    @Param('recoveryId') recoveryId: string,
    @Req() req: any,
  ) {
    const authToken = req?.headers?.authorization?.replace('Bearer ', '');
    const tenantId = req?.user?.tenantId;
    const correlationId = req?.headers?.['x-correlation-id'] || `ap-${Date.now()}`;
    const result = await this.service.getRecoveryCase({ recoveryId, tenantId, authToken });
    return { ...result, correlationId };
  }

  @Patch('recovery/:recoveryId/status')
  @RequirePermissions('agent_portal:claims')
  async updateRecoveryStatus(
    @Param('recoveryId') recoveryId: string,
    @Body() body: { status: string },
    @Req() req: any,
  ) {
    const authToken = req?.headers?.authorization?.replace('Bearer ', '');
    const tenantId = req?.user?.tenantId;
    const correlationId = req?.headers?.['x-correlation-id'] || `ap-${Date.now()}`;
    const result = await this.service.updateRecoveryStatus({ recoveryId, status: body.status, tenantId, authToken });
    return { ...result, correlationId };
  }
}
