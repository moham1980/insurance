import { Controller, Get, Headers, Query, Req, UseGuards } from '@nestjs/common';
import { PolicyLedgerReconciliation } from './policy-ledger-reconciliation';
import { PaymentLedgerReconciliation } from './payment-ledger-reconciliation';
import { DataQualityService } from '../data-quality/data-quality.service';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { PermissionsGuard } from '../permissions.guard';
import { TenantGuard } from '../tenant.guard';
import { RequirePermissions } from '../permissions.decorator';
import { AbacGuard } from '../abac.guard';

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard, AbacGuard)
export class ReconciliationController {
  constructor(
    private readonly policyLedgerReconciliation: PolicyLedgerReconciliation,
    private readonly paymentLedgerReconciliation: PaymentLedgerReconciliation,
    private readonly dataQualityService: DataQualityService,
  ) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `recon-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  @Get('/reporting/reconciliation/policy-ledger')
  @RequirePermissions('reporting:manage')
  async policyLedger(@Req() req: any, @Headers() headers: Record<string, any>) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const data = await this.policyLedgerReconciliation.reconcile(tenantId);
    return { success: true, data, correlationId };
  }

  @Get('/reporting/reconciliation/payment-ledger')
  @RequirePermissions('reporting:manage')
  async paymentLedger(@Req() req: any, @Headers() headers: Record<string, any>) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const data = await this.paymentLedgerReconciliation.reconcile(tenantId);
    return { success: true, data, correlationId };
  }

  @Get('/reporting/reconciliation/run-all')
  @RequirePermissions('reporting:manage')
  async runAll(@Req() req: any, @Headers() headers: Record<string, any>) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const policyLedger = await this.policyLedgerReconciliation.reconcile(tenantId);
    const paymentLedger = await this.paymentLedgerReconciliation.reconcile(tenantId);
    const dataQuality = await this.dataQualityService.runReconciliation(tenantId);
    return {
      success: true,
      data: { policyLedger, paymentLedger, dataQuality },
      correlationId,
    };
  }
}
