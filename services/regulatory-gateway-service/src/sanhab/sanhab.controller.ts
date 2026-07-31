import { Body, Controller, Get, Headers, Param, Post, Req, UseGuards } from '@nestjs/common';
import { SanhabIssuanceService, SanhabSubmitResult } from './sanhab-issuance.service';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { PermissionsGuard } from '../permissions.guard';
import { RequirePermissions } from '../permissions.decorator';
import { TenantGuard } from '../tenant.guard';
import { AbacGuard } from '../abac.guard';

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
export class SanhabController {
  constructor(private readonly sanhabIssuanceService: SanhabIssuanceService) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `san-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  @Post('/api/v1/policies/:policyId/sanhab-submit')
  @RequirePermissions('regulatory:submit')
  async submit(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('policyId') policyId: string,
    @Body() body: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actorUserId = req?.user?.userId as string | undefined;
    const organizationId = req?.user?.organizationId as string | undefined;
    const authorization = (headers['authorization'] || headers['Authorization']) as string | undefined;

    const result = await this.sanhabIssuanceService.submit({
      policyId,
      tenantId,
      organizationId,
      actorUserId,
      authorization,
      correlationId,
      nationalId: body?.nationalId,
      vin: body?.vin,
    });

    return {
      success: result.success,
      data: {
        policyId: result.policyId,
        submissionId: result.submissionId,
        uniqueCode: result.uniqueCode,
        sanhabStatus: result.sanhabStatus,
        resultCode: result.resultCode,
      },
      ...(result.message ? { error: { code: result.resultCode || 'SANHAB_SUBMISSION_FAILED', message: result.message } } : {}),
      correlationId,
    };
  }

  @Get('/api/v1/policies/:policyId/sanhab-status')
  @RequirePermissions('regulatory:inquiry')
  async status(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('policyId') policyId: string,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const authorization = (headers['authorization'] || headers['Authorization']) as string | undefined;

    const result = await this.sanhabIssuanceService.getStatus(policyId, tenantId, authorization, correlationId);
    return { ...result, correlationId };
  }

  @Post('/api/v1/policies/:policyId/sanhab-retry')
  @RequirePermissions('regulatory:retry')
  async retry(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Param('policyId') policyId: string,
    @Body() body: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actorUserId = req?.user?.userId as string | undefined;
    const organizationId = req?.user?.organizationId as string | undefined;
    const authorization = (headers['authorization'] || headers['Authorization']) as string | undefined;

    const result = await this.sanhabIssuanceService.retry({
      policyId,
      tenantId,
      organizationId,
      actorUserId,
      authorization,
      correlationId,
      nationalId: body?.nationalId,
      vin: body?.vin,
    });

    return {
      success: result.success,
      data: {
        policyId: result.policyId,
        submissionId: result.submissionId,
        uniqueCode: result.uniqueCode,
        sanhabStatus: result.sanhabStatus,
        resultCode: result.resultCode,
      },
      ...(result.message ? { error: { code: result.resultCode || 'SANHAB_RETRY_FAILED', message: result.message } } : {}),
      correlationId,
    };
  }

  @Get('/api/v1/sanhab/config')
  @RequirePermissions('regulatory:export')
  async config(@Headers() headers: Record<string, any>) {
    const correlationId = this.getCorrelationId(headers);
    return { success: true, data: this.sanhabIssuanceService.getConfig(), correlationId };
  }
}
