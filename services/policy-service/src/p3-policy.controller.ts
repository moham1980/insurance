import { Body, Controller, Get, Headers, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { P3PolicyLifecycleService } from './p3-policy-lifecycle.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermissions } from './permissions.decorator';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';
import { auditLogger } from './audit.logger';

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
export class P3PolicyController {
  constructor(private readonly p3Service: P3PolicyLifecycleService) {}

  private ok<T>(data: T, correlationId: string) {
    return { success: true as const, data, correlationId };
  }

  private fail(code: string, message: string, correlationId: string) {
    return { success: false as const, error: { code, message }, correlationId };
  }

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    return typeof cid === 'string' && cid.length > 0 ? cid : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private isUuid(v: any): boolean {
    return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
  }

  private getRoles(user: any): string[] {
    return user?.roles || [];
  }

  private isBrokerRole(roles: string[]): boolean {
    return roles.some(r => ['broker_owner', 'broker_staff', 'agency_owner', 'agency_staff'].includes(r));
  }

  private isInsurerRole(roles: string[]): boolean {
    return roles.some(r => ['insurer_admin', 'head_office_ops', 'underwriter', 'branch_manager', 'branch_staff'].includes(r));
  }

  // Fields that broker roles are allowed to patch
  private static BROKER_PATCHABLE_FIELDS = new Set([
    'productId',
    'productVersion',
    'salesChannelType',
    'customerPartyId',
    'placementId',
    'marketerPartyId',
    'subAgentPartyId',
  ]);

  // Fields that insurer roles are allowed to patch (superset of broker fields)
  private static INSURER_PATCHABLE_FIELDS = new Set([
    'productId',
    'productVersion',
    'salesChannelType',
    'customerPartyId',
    'recordOwnerOrganizationId',
    'authoritativeTenantId',
    'sourceSystemId',
    'externalPolicyId',
    'placementId',
    'marketerPartyId',
    'subAgentPartyId',
  ]);

  // Fields visible to broker roles in getDetails (excludes sensitive insurer-only fields)
  private static BROKER_VISIBLE_POLICY_FIELDS = new Set([
    'policyId', 'policyNumber', 'uniqueCode', 'status', 'partyId', 'customerPartyId',
    'producerOrgUnitId', 'distributionOrganizationId', 'issuerOrganizationId',
    'lineOfBusiness', 'salesChannelType', 'startDate', 'endDate',
    'premiumAmount', 'premiumCurrency', 'totalPayableAmount', 'taxesAmount',
    'coverages', 'deductibles', 'installments', 'applicationData',
    'brokerLicenseId', 'commissionSplitSnapshot', 'autoRenew', 'renewalCount',
    'maxRenewals', 'renewalParentId', 'placementId', 'submissionId', 'productId',
    'createdAt', 'updatedAt', 'sanhabStatus',
  ]);

  private filterPolicyForBroker(policy: any): any {
    const filtered: Record<string, any> = {};
    for (const key of Object.keys(policy)) {
      if (P3PolicyController.BROKER_VISIBLE_POLICY_FIELDS.has(key)) {
        filtered[key] = policy[key];
      }
    }
    return filtered;
  }

  @Get('/policies/:policyId/details')
  @RequirePermissions('policy:view')
  async getDetails(@Req() req: any, @Headers() headers: Record<string, any>, @Param('policyId') policyId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const roles = this.getRoles(req?.user);
    const result = await this.p3Service.getPolicyWithDetails(policyId, tenantId);
    if (!result) return this.fail('NOT_FOUND', 'Policy not found', correlationId);

    // Apply field-level ACL: broker roles see a filtered view of the policy
    if (this.isBrokerRole(roles) && !this.isInsurerRole(roles)) {
      result.policy = this.filterPolicyForBroker(result.policy);
    }

    return this.ok(result, correlationId);
  }

  @Patch('/policies/:policyId')
  @RequirePermissions('policy:endorse')
  async patchPolicy(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('policyId') policyId: string,
    @Body() body: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actorUserId = req?.user?.userId as string | undefined;
    const roles = this.getRoles(req?.user);

    if (!this.isUuid(policyId)) {
      return this.fail('VALIDATION_ERROR', 'policyId must be a UUID', correlationId);
    }

    auditLogger.info('policy.patch.request', { correlationId, tenantId, actorUserId, action: 'policy:endorse', policyId, roles });

    // Field-level ACL: determine which fields the user is allowed to patch based on role
    const requestedPatch = body.patch || {};
    const allowedFields = this.isInsurerRole(roles)
      ? P3PolicyController.INSURER_PATCHABLE_FIELDS
      : this.isBrokerRole(roles)
        ? P3PolicyController.BROKER_PATCHABLE_FIELDS
        : new Set<string>(); // unknown roles get no patch access

    const filteredPatch: Record<string, any> = {};
    const deniedFields: string[] = [];
    for (const [key, value] of Object.entries(requestedPatch)) {
      if (allowedFields.has(key)) {
        filteredPatch[key] = value;
      } else {
        deniedFields.push(key);
      }
    }

    if (deniedFields.length > 0) {
      auditLogger.warn('policy.patch.denied_fields', { correlationId, tenantId, actorUserId, policyId, deniedFields, roles });
      return this.fail('FORBIDDEN', `You do not have permission to patch the following fields: ${deniedFields.join(', ')}`, correlationId);
    }

    if (Object.keys(filteredPatch).length === 0) {
      return this.fail('VALIDATION_ERROR', 'No valid fields to patch', correlationId);
    }

    try {
      const policy = await this.p3Service.patchPolicy({
        policyId,
        tenantId,
        actorUserId,
        patch: filteredPatch,
        correlationId,
      });
      if (!policy) return this.fail('NOT_FOUND', 'Policy not found', correlationId);

      // Apply field-level ACL on response too
      if (this.isBrokerRole(roles) && !this.isInsurerRole(roles)) {
        return this.ok(this.filterPolicyForBroker(policy), correlationId);
      }
      return this.ok(policy, correlationId);
    } catch (e: any) {
      return this.fail('PATCH_FAILED', e.message, correlationId);
    }
  }

  @Get('/policies/:policyId/coverages')
  @RequirePermissions('policy:view')
  async getCoverages(@Req() req: any, @Headers() headers: Record<string, any>, @Param('policyId') policyId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    if (!this.isUuid(policyId)) {
      return this.fail('VALIDATION_ERROR', 'policyId must be a UUID', correlationId);
    }
    const rows = await this.p3Service.getCoverages(policyId, tenantId);
    return this.ok({ rows }, correlationId);
  }

  @Post('/policies/:policyId/coverages')
  @RequirePermissions('policy:endorse')
  async addCoverage(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('policyId') policyId: string,
    @Body() body: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;

    try {
      const coverage = await this.p3Service.createCoverage({
        tenantId,
        policyId,
        coverageCode: body.coverageCode,
        limitAmount: Number(body.limitAmount),
        limitCurrency: body.limitCurrency || 'IRR',
        deductibleAmount: Number(body.deductibleAmount || 0),
        deductibleCurrency: body.deductibleCurrency || 'IRR',
        premiumAmount: Number(body.premiumAmount || 0),
        premiumCurrency: body.premiumCurrency || 'IRR',
        correlationId,
      });
      return this.ok(coverage, correlationId);
    } catch (e: any) {
      return this.fail('COVERAGE_CREATE_FAILED', e.message, correlationId);
    }
  }

  @Get('/policies/:policyId/history')
  @RequirePermissions('policy:changes_view')
  async getHistory(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('policyId') policyId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const lim = Math.min(parseInt(limit ?? '50', 10) || 50, 200);
    const off = Math.max(parseInt(offset ?? '0', 10) || 0, 0);
    const result = await this.p3Service.getHistory(policyId, tenantId, lim, off);
    return this.ok(result, correlationId);
  }

  @Post('/policies/:policyId/endorsements')
  @RequirePermissions('policy:endorse')
  async createEndorsement(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('policyId') policyId: string,
    @Body() body: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actorUserId = req?.user?.userId as string | undefined;

    try {
      const endorsement = await this.p3Service.createEndorsement({
        policyId,
        tenantId,
        endorsementType: body.endorsementType,
        effectiveDate: new Date(body.effectiveDate),
        requestedByPartyId: body.requestedByPartyId,
        reason: body.reason,
        payload: body.payload || {},
        actorUserId,
        correlationId,
      });
      if (!endorsement) return this.fail('NOT_FOUND', 'Policy not found', correlationId);
      return this.ok(endorsement, correlationId);
    } catch (e: any) {
      return this.fail('ENDORSEMENT_FAILED', e.message, correlationId);
    }
  }

  @Post('/endorsements/:endorsementId/apply')
  @RequirePermissions('policy:endorse')
  async applyEndorsement(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('endorsementId') endorsementId: string,
    @Body() body: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actorUserId = req?.user?.userId as string | undefined;

    try {
      const result = await this.p3Service.applyEndorsement({
        endorsementId,
        tenantId,
        actorUserId,
        approvedByPartyId: body.approvedByPartyId,
        correlationId,
      });
      if (!result) return this.fail('NOT_FOUND', 'Endorsement not found', correlationId);
      return this.ok(result, correlationId);
    } catch (e: any) {
      return this.fail('APPLY_FAILED', e.message, correlationId);
    }
  }

  @Post('/endorsements/:endorsementId/submit')
  @RequirePermissions('policy:endorse')
  async submitEndorsement(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('endorsementId') endorsementId: string,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actorUserId = req?.user?.userId as string | undefined;

    try {
      const result = await this.p3Service.submitEndorsement({
        endorsementId,
        tenantId,
        actorUserId,
        correlationId,
      });
      if (!result) return this.fail('NOT_FOUND', 'Endorsement not found', correlationId);
      return this.ok(result, correlationId);
    } catch (e: any) {
      return this.fail('SUBMIT_FAILED', e.message, correlationId);
    }
  }

  @Post('/endorsements/:endorsementId/approve')
  @RequirePermissions('policy:endorse')
  async approveEndorsement(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('endorsementId') endorsementId: string,
    @Body() body: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actorUserId = req?.user?.userId as string | undefined;

    if (!body.approvedByPartyId) {
      return this.fail('VALIDATION_ERROR', 'approvedByPartyId is required', correlationId);
    }

    try {
      const result = await this.p3Service.approveEndorsement({
        endorsementId,
        tenantId,
        actorUserId,
        approvedByPartyId: body.approvedByPartyId,
        correlationId,
      });
      if (!result) return this.fail('NOT_FOUND', 'Endorsement not found', correlationId);
      return this.ok(result, correlationId);
    } catch (e: any) {
      return this.fail('APPROVE_FAILED', e.message, correlationId);
    }
  }

  @Post('/endorsements/:endorsementId/reject')
  @RequirePermissions('policy:endorse')
  async rejectEndorsement(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('endorsementId') endorsementId: string,
    @Body() body: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actorUserId = req?.user?.userId as string | undefined;

    if (!body.rejectionReason) {
      return this.fail('VALIDATION_ERROR', 'rejectionReason is required', correlationId);
    }

    try {
      const result = await this.p3Service.rejectEndorsement({
        endorsementId,
        tenantId,
        actorUserId,
        rejectionReason: body.rejectionReason,
        correlationId,
      });
      if (!result) return this.fail('NOT_FOUND', 'Endorsement not found', correlationId);
      return this.ok(result, correlationId);
    } catch (e: any) {
      return this.fail('REJECT_FAILED', e.message, correlationId);
    }
  }
}
