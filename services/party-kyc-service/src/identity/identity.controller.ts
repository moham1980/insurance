import { Body, Controller, Delete, Get, Headers, Param, Post, Req, UseGuards } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { IdentityService, PartyKycContext } from './identity.service';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { PermissionsGuard } from '../permissions.guard';
import { RequirePermissions } from '../permissions.decorator';
import { AbacGuard } from '../abac.guard';
import { TenantGuard } from '../tenant.guard';
import { auditLogger } from '../audit.logger';

function buildContext(req: any, correlationId: string): PartyKycContext {
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

@Controller('/api/v1')
@UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    return typeof cid === 'string' && cid.length > 0 ? cid : uuidv4();
  }

  @Post('/parties/:partyId/roles')
  @RequirePermissions('party:role:manage')
  async createRole(@Req() req: any, @Headers() headers: Record<string, any>, @Param('partyId') partyId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = buildContext(req, correlationId);
    try {
      const role = await this.identityService.createPartyRole(ctx, partyId, body);
      return ok(role, correlationId);
    } catch (e: any) { return err(e, correlationId); }
  }

  @Get('/parties/:partyId/roles')
  @RequirePermissions('party:view')
  async listRoles(@Req() req: any, @Headers() headers: Record<string, any>, @Param('partyId') partyId: string) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = buildContext(req, correlationId);
    try {
      const roles = await this.identityService.listPartyRoles(ctx, partyId);
      return ok(roles, correlationId);
    } catch (e: any) { return err(e, correlationId); }
  }

  @Delete('/parties/:partyId/roles/:assignmentId')
  @RequirePermissions('party:role:manage')
  async revokeRole(@Req() req: any, @Headers() headers: Record<string, any>, @Param('partyId') partyId: string, @Param('assignmentId') assignmentId: string) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = buildContext(req, correlationId);
    try {
      const role = await this.identityService.revokePartyRole(ctx, partyId, assignmentId);
      return ok(role, correlationId);
    } catch (e: any) { return err(e, correlationId); }
  }

  @Post('/global-subjects')
  @RequirePermissions('party:manage')
  async createGlobalSubject(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = buildContext(req, correlationId);
    try {
      const subject = await this.identityService.createGlobalSubject(ctx, body);
      return ok(subject, correlationId);
    } catch (e: any) { return err(e, correlationId); }
  }

  @Post('/global-subjects/:globalSubjectId/links')
  @RequirePermissions('party:manage')
  async createLink(@Req() req: any, @Headers() headers: Record<string, any>, @Param('globalSubjectId') globalSubjectId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = buildContext(req, correlationId);
    try {
      const link = await this.identityService.createIdentityLink(ctx, globalSubjectId, body);
      return ok(link, correlationId);
    } catch (e: any) { return err(e, correlationId); }
  }

  @Post('/global-subjects/:globalSubjectId/links/:linkId/revoke')
  @RequirePermissions('party:manage')
  async revokeLink(@Req() req: any, @Headers() headers: Record<string, any>, @Param('globalSubjectId') globalSubjectId: string, @Param('linkId') linkId: string) {
    const correlationId = this.getCorrelationId(headers);
    const ctx = buildContext(req, correlationId);
    try {
      const link = await this.identityService.revokeIdentityLink(ctx, globalSubjectId, linkId);
      return ok(link, correlationId);
    } catch (e: any) { return err(e, correlationId); }
  }
}
