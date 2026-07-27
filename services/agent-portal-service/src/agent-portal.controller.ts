import { Controller, Post, Body, Param, Headers, Get, Query, UseGuards, Req } from '@nestjs/common';
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
  async revokeAllAgentSessions(@Param('agentId') agentId: string) {
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
    @Req() req: any,
  ) {
    const authToken = req?.headers?.authorization?.replace('Bearer ', '');
    const tenantId = req?.user?.tenantId;
    const stats = await this.service.getDashboardStats(agentId, partnerId, tenantId, authToken);
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
    @Query('status') status?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Req() req?: any,
  ) {
    const authToken = req?.headers?.authorization?.replace('Bearer ', '');
    const tenantId = req?.user?.tenantId;
    const policies = await this.service.getAgentPolicies(agentId, partnerId, {
      status,
      fromDate,
      toDate,
    }, tenantId, authToken);
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
    @Query('status') status?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Req() req?: any,
  ) {
    const authToken = req?.headers?.authorization?.replace('Bearer ', '');
    const tenantId = req?.user?.tenantId;
    const claims = await this.service.getAgentClaims(agentId, partnerId, {
      status,
      fromDate,
      toDate,
    }, tenantId, authToken);
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
    @Query('search') search?: string,
    @Req() req?: any,
  ) {
    const authToken = req?.headers?.authorization?.replace('Bearer ', '');
    const tenantId = req?.user?.tenantId;
    const customers = await this.service.getAgentCustomers(agentId, partnerId, search, tenantId, authToken);
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
    @Query('status') status?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Req() req?: any,
  ) {
    const authToken = req?.headers?.authorization?.replace('Bearer ', '');
    const tenantId = req?.user?.tenantId;
    const commissions = await this.service.getAgentCommissions(agentId, partnerId, {
      status,
      fromDate,
      toDate,
    }, tenantId, authToken);
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
}
