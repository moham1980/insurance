import { Body, Controller, Get, Headers, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { PolicyProjectionService } from './policy-projection.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermissions } from './permissions.decorator';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';
import { auditLogger } from './audit.logger';

@Controller('api/v1')
@UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
export class PolicyProjectionController {
  constructor(private readonly service: PolicyProjectionService) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  @Post('/policies/projections')
  @RequirePermissions('policy:project')
  async project(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;
    auditLogger.info('policy.projection.request', { correlationId, tenantId, actorUserId: actor?.userId, action: 'policy:project' });

    if (!body?.placementId || !body?.policyNumber) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'placementId and policyNumber are required' }, correlationId };
    }

    const projection = await this.service.createProjection({
      tenantId: tenantId!,
      brokerOrganizationId: body.brokerOrganizationId,
      issuerOrganizationId: body.issuerOrganizationId,
      policyId: body.policyId || body.placementId,
      policyNumber: body.policyNumber,
      uniqueCode: body.uniqueCode,
      placementId: body.placementId,
      sourceSystemId: body.sourceSystemId,
      sourceVersion: body.sourceVersion,
      receivedAt: body.receivedAt ? new Date(body.receivedAt) : new Date(),
      payload: body.payload,
      status: body.status || 'active',
      correlationId,
      actorUserId: actor?.userId,
      idempotencyKey: body.idempotencyKey,
    });

    return { success: true, data: projection, correlationId };
  }

  @Get('/policies/projections')
  @RequirePermissions('policy:view')
  async listByPlacement(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('placementId') placementId: string,
    @Query('brokerOrganizationId') brokerOrganizationId?: string,
    @Query('issuerOrganizationId') issuerOrganizationId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    if (!tenantId) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'tenantId is required' }, correlationId };
    }

    const lim = Math.min(parseInt(limit ?? '50', 10) || 50, 200);
    const off = Math.max(parseInt(offset ?? '0', 10) || 0, 0);

    // If brokerOrganizationId is provided, return broker-specific projections
    if (brokerOrganizationId) {
      const { rows, total } = await this.service.findByBrokerOrganization(tenantId, brokerOrganizationId, lim, off);
      return { success: true, data: rows, correlationId, pagination: { total, limit: lim, offset: off } };
    }

    // If issuerOrganizationId is provided, return issuer-specific projections
    if (issuerOrganizationId) {
      const { rows, total } = await this.service.findByIssuerOrganization(tenantId, issuerOrganizationId, lim, off);
      return { success: true, data: rows, correlationId, pagination: { total, limit: lim, offset: off } };
    }

    // Default: filter by placementId (required if no org filter)
    if (!placementId) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'placementId, brokerOrganizationId, or issuerOrganizationId is required' }, correlationId };
    }
    const data = await this.service.findByPlacement(tenantId, placementId);
    return { success: true, data, correlationId };
  }

  @Get('/policies/projections/:policyId')
  @RequirePermissions('policy:view')
  async getByPolicyId(@Req() req: any, @Headers() headers: Record<string, any>, @Param('policyId') policyId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const data = await this.service.findByPolicyId(tenantId!, policyId);
    if (!data) return { success: false, error: { code: 'NOT_FOUND', message: 'Projection not found' }, correlationId };
    return { success: true, data, correlationId };
  }
}
