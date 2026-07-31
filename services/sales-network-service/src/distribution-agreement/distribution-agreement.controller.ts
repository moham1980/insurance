import { Body, Controller, Get, Headers, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DistributionAgreementService, SalesContext } from './distribution-agreement.service';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { PermissionsGuard } from '../permissions.guard';
import { RequirePermissions } from '../permissions.decorator';
import { AbacGuard } from '../abac.guard';
import { TenantGuard } from '../tenant.guard';

function buildContext(req: any, correlationId: string): SalesContext {
  const user = req?.user || {};
  return {
    tenantId: user.tenantId || user.tenant_id,
    userId: user.userId || user.sub,
    roles: Array.isArray(user.roles) ? user.roles : [],
    organizationId: user.organizationId || user.organization_id,
    correlationId,
  };
}

function ok(data: any, correlationId: string) {
  return { success: true, data, correlationId };
}

function err(e: any, correlationId: string) {
  return { success: false, error: { code: e.name || 'INTERNAL_ERROR', message: e.message }, correlationId };
}

@Controller('/api/v1/distribution-agreements')
@UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
export class DistributionAgreementController {
  constructor(private readonly agreementService: DistributionAgreementService) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    return typeof cid === 'string' && cid.length > 0 ? cid : uuidv4();
  }

  @Post('/')
  @RequirePermissions('broker:agreements:manage')
  async create(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = buildContext(req, correlationId);
    try {
      const agreement = await this.agreementService.createAgreement(ctx, body);
      return ok(agreement, correlationId);
    } catch (e: any) { return err(e, correlationId); }
  }

  @Get('/')
  @RequirePermissions('broker:agreements:view')
  async list(@Req() req: any, @Headers() headers: Record<string, any>, @Query() query: any) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = buildContext(req, correlationId);
    try {
      const agreements = await this.agreementService.listAgreements(ctx, query);
      return ok(agreements, correlationId);
    } catch (e: any) { return err(e, correlationId); }
  }

  @Get('/:agreementId')
  @RequirePermissions('broker:agreements:view')
  async get(@Req() req: any, @Headers() headers: Record<string, any>, @Param('agreementId') agreementId: string) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = buildContext(req, correlationId);
    try {
      const agreement = await this.agreementService.getAgreement(ctx, agreementId);
      if (!agreement) return err({ name: 'NOT_FOUND', message: 'Agreement not found' }, correlationId);
      return ok(agreement, correlationId);
    } catch (e: any) { return err(e, correlationId); }
  }

  @Post('/:agreementId/versions')
  @RequirePermissions('broker:agreements:manage')
  async createVersion(@Req() req: any, @Headers() headers: Record<string, any>, @Param('agreementId') agreementId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = buildContext(req, correlationId);
    try {
      const agreement = await this.agreementService.createVersion(ctx, agreementId, body);
      return ok(agreement, correlationId);
    } catch (e: any) { return err(e, correlationId); }
  }

  @Post('/:agreementId/activate')
  @RequirePermissions('insurer:agreements:approve')
  async activate(@Req() req: any, @Headers() headers: Record<string, any>, @Param('agreementId') agreementId: string) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = buildContext(req, correlationId);
    try {
      const agreement = await this.agreementService.activateAgreement(ctx, agreementId);
      return ok(agreement, correlationId);
    } catch (e: any) { return err(e, correlationId); }
  }

  @Post('/:agreementId/terminate')
  @RequirePermissions('broker:agreements:manage')
  async terminate(@Req() req: any, @Headers() headers: Record<string, any>, @Param('agreementId') agreementId: string) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = buildContext(req, correlationId);
    try {
      const agreement = await this.agreementService.terminateAgreement(ctx, agreementId);
      return ok(agreement, correlationId);
    } catch (e: any) { return err(e, correlationId); }
  }

  @Get('/:agreementId/eligibility')
  @RequirePermissions('broker:agreements:view')
  async eligibility(@Req() req: any, @Headers() headers: Record<string, any>, @Param('agreementId') agreementId: string, @Query('lineOfBusiness') lineOfBusiness?: string, @Query('riskAmount') riskAmount?: string) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = buildContext(req, correlationId);
    try {
      const result = await this.agreementService.checkEligibility(ctx, agreementId, lineOfBusiness, riskAmount);
      return ok(result, correlationId);
    } catch (e: any) { return err(e, correlationId); }
  }

  @Post('/:agreementId/submit-for-approval')
  @RequirePermissions('broker:agreements:manage')
  async submitForApproval(@Req() req: any, @Headers() headers: Record<string, any>, @Param('agreementId') agreementId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = buildContext(req, correlationId);
    try {
      const agreement = await this.agreementService.submitForApproval(ctx, agreementId, body);
      return ok(agreement, correlationId);
    } catch (e: any) { return err(e, correlationId); }
  }

  @Post('/:agreementId/approve')
  @RequirePermissions('insurer:agreements:approve')
  async approve(@Req() req: any, @Headers() headers: Record<string, any>, @Param('agreementId') agreementId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = buildContext(req, correlationId);
    try {
      const agreement = await this.agreementService.decideApproval(ctx, agreementId, 'approved', body);
      return ok(agreement, correlationId);
    } catch (e: any) { return err(e, correlationId); }
  }

  @Post('/:agreementId/reject')
  @RequirePermissions('insurer:agreements:approve')
  async reject(@Req() req: any, @Headers() headers: Record<string, any>, @Param('agreementId') agreementId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = buildContext(req, correlationId);
    try {
      const agreement = await this.agreementService.decideApproval(ctx, agreementId, 'rejected', body);
      return ok(agreement, correlationId);
    } catch (e: any) { return err(e, correlationId); }
  }

  @Post('/:agreementId/return')
  @RequirePermissions('insurer:agreements:approve')
  async returnForRevision(@Req() req: any, @Headers() headers: Record<string, any>, @Param('agreementId') agreementId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = buildContext(req, correlationId);
    try {
      const agreement = await this.agreementService.decideApproval(ctx, agreementId, 'returned', body);
      return ok(agreement, correlationId);
    } catch (e: any) { return err(e, correlationId); }
  }

  @Get('/:agreementId/approvals')
  @RequirePermissions('broker:agreements:view')
  async getApprovals(@Req() req: any, @Headers() headers: Record<string, any>, @Param('agreementId') agreementId: string) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = buildContext(req, correlationId);
    try {
      const approvals = await this.agreementService.getAgreementApprovals(ctx, agreementId);
      return ok(approvals, correlationId);
    } catch (e: any) { return err(e, correlationId); }
  }

  @Get('/:agreementId/history')
  @RequirePermissions('broker:agreements:view')
  async getHistory(@Req() req: any, @Headers() headers: Record<string, any>, @Param('agreementId') agreementId: string) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = buildContext(req, correlationId);
    try {
      const history = await this.agreementService.getAgreementVersionHistory(ctx, agreementId);
      return ok(history, correlationId);
    } catch (e: any) { return err(e, correlationId); }
  }

  @Get('/:agreementId/binding-authority')
  @RequirePermissions('broker:agreements:view')
  async getBindingAuthority(@Req() req: any, @Headers() headers: Record<string, any>, @Param('agreementId') agreementId: string) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = buildContext(req, correlationId);
    try {
      const result = await this.agreementService.getBindingAuthorityForAgreement(ctx, agreementId);
      return ok(result, correlationId);
    } catch (e: any) { return err(e, correlationId); }
  }

  @Post('/binding-authority-profiles')
  @RequirePermissions('insurer:agreements:approve')
  async createBindingProfile(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = buildContext(req, correlationId);
    try {
      const profile = await this.agreementService.createBindingAuthorityProfile(ctx, body);
      return ok(profile, correlationId);
    } catch (e: any) { return err(e, correlationId); }
  }

  @Get('/binding-authority-profiles')
  @RequirePermissions('broker:agreements:view')
  async listBindingProfiles(@Req() req: any, @Headers() headers: Record<string, any>, @Query() query: any) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = buildContext(req, correlationId);
    try {
      const profiles = await this.agreementService.listBindingAuthorityProfiles(ctx, query);
      return ok(profiles, correlationId);
    } catch (e: any) { return err(e, correlationId); }
  }

  @Get('/binding-authority-profiles/:profileId')
  @RequirePermissions('broker:agreements:view')
  async getBindingProfile(@Req() req: any, @Headers() headers: Record<string, any>, @Param('profileId') profileId: string) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = buildContext(req, correlationId);
    try {
      const profile = await this.agreementService.getBindingAuthorityProfile(ctx, profileId);
      if (!profile) return err({ name: 'NOT_FOUND', message: 'Profile not found' }, correlationId);
      return ok(profile, correlationId);
    } catch (e: any) { return err(e, correlationId); }
  }

  @Post('/binding-authority-profiles/:profileId/activate')
  @RequirePermissions('insurer:agreements:approve')
  async activateBindingProfile(@Req() req: any, @Headers() headers: Record<string, any>, @Param('profileId') profileId: string) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = buildContext(req, correlationId);
    try {
      const profile = await this.agreementService.activateBindingAuthorityProfile(ctx, profileId);
      return ok(profile, correlationId);
    } catch (e: any) { return err(e, correlationId); }
  }
}
