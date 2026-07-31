import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { PremiumInvoiceService } from './invoice.service';
import { CustomerPaymentService } from '../payments/customer-payment.service';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { PermissionsGuard } from '../permissions.guard';
import { TenantGuard } from '../tenant.guard';
import { RequirePermissions } from '../permissions.decorator';
import {
  CreatePremiumInvoiceDto,
  IssuePremiumInvoiceDto,
  CancelPremiumInvoiceDto,
  CreateInstallmentPlanDto,
  PayInstallmentDto,
} from './invoice.dtos';

@Controller('invoicing')
@UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
export class PremiumInvoiceController {
  constructor(
    private readonly service: PremiumInvoiceService,
    private readonly customerPayment: CustomerPaymentService,
  ) {}

  private getCorrelationId(headers: Record<string, any>): string {
    return headers['x-correlation-id'] || `inv-${Date.now()}`;
  }

  @Post('policies/:policyId/invoices')
  @RequirePermissions('billing:invoices:create')
  async createInvoice(
    @Param('policyId') policyId: string,
    @Body(new ValidationPipe({ transform: true })) body: CreatePremiumInvoiceDto,
    @Headers() headers: Record<string, any>,
    @Req() req: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req.user.tenantId as string;
    const organizationId = (req.user.organizationId as string) || body.organizationId || tenantId;
    const result = await this.service.createInvoice({
      ...body,
      policyId,
      tenantId,
      organizationId,
      idempotencyKey: headers['x-idempotency-key'],
      correlationId,
    });
    return { success: true, data: result, correlationId };
  }

  @Get('policies/:policyId/invoices')
  @RequirePermissions('billing:invoices:view')
  async listInvoicesByPolicy(
    @Param('policyId') policyId: string,
    @Req() req: any,
  ) {
    const tenantId = req.user.tenantId as string;
    const result = await this.service.listInvoicesByPolicy(tenantId, policyId);
    return { success: true, data: result };
  }

  @Get('invoices/:invoiceId')
  @RequirePermissions('billing:invoices:view')
  async getInvoice(@Param('invoiceId') invoiceId: string, @Req() req: any) {
    const tenantId = req.user.tenantId as string;
    const result = await this.service.getInvoice(tenantId, invoiceId);
    if (!result) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found' } };
    }
    return { success: true, data: result };
  }

  @Post('invoices/:invoiceId/issue')
  @RequirePermissions('billing:invoices:manage')
  async issueInvoice(
    @Param('invoiceId') invoiceId: string,
    @Headers() headers: Record<string, any>,
    @Req() req: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req.user.tenantId as string;
    const result = await this.service.issueInvoice(tenantId, invoiceId, correlationId);
    return { success: true, data: result, correlationId };
  }

  @Post('invoices/:invoiceId/cancel')
  @RequirePermissions('billing:invoices:manage')
  async cancelInvoice(
    @Param('invoiceId') invoiceId: string,
    @Body(new ValidationPipe({ transform: true })) body: CancelPremiumInvoiceDto,
    @Headers() headers: Record<string, any>,
    @Req() req: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req.user.tenantId as string;
    const result = await this.service.cancelInvoice(tenantId, invoiceId, body.reason, correlationId);
    return { success: true, data: result, correlationId };
  }

  @Post('invoices/:invoiceId/installments')
  @RequirePermissions('billing:invoices:manage')
  async createInstallmentPlan(
    @Param('invoiceId') invoiceId: string,
    @Body(new ValidationPipe({ transform: true })) body: CreateInstallmentPlanDto,
    @Headers() headers: Record<string, any>,
    @Req() req: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req.user.tenantId as string;
    const result = await this.service.createInstallmentPlan({
      tenantId,
      invoiceId,
      numberOfInstallments: body.numberOfInstallments,
      firstDueDate: body.firstDueDate,
      correlationId,
    });
    return { success: true, data: result, correlationId };
  }

  @Post('installments/:itemId/pay')
  @RequirePermissions('billing:payments:initiate')
  async payInstallment(
    @Param('itemId') itemId: string,
    @Body(new ValidationPipe({ transform: true })) body: PayInstallmentDto,
    @Headers() headers: Record<string, any>,
    @Req() req: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req.user.tenantId as string;
    const organizationId = (req.user.organizationId as string) || req.user.tenantId;

    const result = await this.customerPayment.payInstallment({
      tenantId,
      organizationId,
      itemId,
      sourceAccount: body.sourceAccount,
      paymentMethod: body.paymentMethod,
      correlationId,
    });

    return { success: true, data: result, correlationId };
  }
}
