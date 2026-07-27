import { Controller, Post, Get, Put, Body, Param, Headers, Query, UseGuards, Req, ValidationPipe } from '@nestjs/common';
import { BillingService } from './billing.service';
import { PaymentGatewayService } from './payment-gateway/payment-gateway.service';
import { AutoDepositVerificationService } from './payment-gateway/auto-deposit-verification.service';
import { InvoiceStatus, InvoiceType } from './entities/Invoice';
import { AccountType, AccountCategory } from './entities/Account';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CreateInvoiceDto, RecordPaymentDto, CreateJournalEntryDto, ReverseJournalEntryDto, CreateAccountDto, CreateFinancialPeriodDto, CreateCostCenterDto, InitiatePaymentDto, VerifyPaymentDto, IngestBankTransactionDto, AutoDepositConfigDto, RejectTransactionDto, ReconcileDto } from './dtos';
import { PermissionsGuard } from './permissions.guard';
import { TenantGuard } from './tenant.guard';
import { RequirePermissions } from './permissions.decorator';
import { auditLogger } from './audit.logger';

@UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
@Controller('billing')
export class BillingController {
  constructor(
    private readonly service: BillingService,
    private readonly paymentGatewayService: PaymentGatewayService,
    private readonly autoDepositService: AutoDepositVerificationService
  ) {}

  @Post('invoices')
  @RequirePermissions('billing:invoices:create')
  async createInvoice(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Body() body: CreateInvoiceDto,
  ) {
    const correlationId = headers['x-correlation-id'] || `bl-${Date.now()}`;
    const tenantId = req?.user?.tenantId as string;
    const actor = req?.user?.userId || req?.user?.sub as string | undefined;
    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' }, correlationId };
    }
    auditLogger.info('billing.invoice.create.request', { correlationId, tenantId, actor, action: 'billing:invoices:create' });
    const result = await this.service.createInvoice({
      ...body,
      tenantId,
      correlationId,
      idempotencyKey: headers['x-idempotency-key'],
    });
    auditLogger.info('billing.invoice.create.success', { correlationId, tenantId, actor, action: 'billing:invoices:create', invoiceId: result?.id });
    return { success: true, data: result, correlationId };
  }

  @Put('invoices/:id/issue')
  @RequirePermissions('billing:invoices:manage')
  async issueInvoice(
    @Param('id') id: string,
    @Headers() headers: Record<string, any>,
    @Req() req: any,
  ) {
    const correlationId = headers['x-correlation-id'] || `bl-${Date.now()}`;
    const tenantId = req?.user?.tenantId as string;
    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' }, correlationId };
    }
    const result = await this.service.issueInvoice(id, tenantId, correlationId);
    return { success: true, data: result, correlationId };
  }

  @Post('invoices/:id/payment')
  @RequirePermissions('billing:payments:initiate')
  async recordPayment(
    @Param('id') id: string,
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Body() body: RecordPaymentDto,
  ) {
    const correlationId = headers['x-correlation-id'] || `bl-${Date.now()}`;
    const tenantId = req?.user?.tenantId as string;
    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' }, correlationId };
    }
    const result = await this.service.recordPayment({
      invoiceId: id,
      tenantId,
      ...body,
      correlationId,
    });
    return { success: true, data: result, correlationId };
  }

  @Post('invoices/mark-overdue')
  @RequirePermissions('billing:invoices:manage')
  async markOverdue(@Headers() headers: Record<string, any>, @Req() req: any) {
    const correlationId = headers['x-correlation-id'] || `bl-${Date.now()}`;
    const tenantId = req?.user?.tenantId as string;
    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' }, correlationId };
    }
    const count = await this.service.markOverdue(tenantId);
    return { success: true, data: { markedCount: count }, correlationId };
  }

  @Put('invoices/:id/cancel')
  @RequirePermissions('billing:invoices:manage')
  async cancelInvoice(
    @Param('id') id: string,
    @Headers() headers: Record<string, any>,
    @Req() req: any,
  ) {
    const correlationId = headers['x-correlation-id'] || `bl-${Date.now()}`;
    const tenantId = req?.user?.tenantId as string;
    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' }, correlationId };
    }
    const result = await this.service.cancelInvoice(id, tenantId, correlationId);
    return { success: true, data: result, correlationId };
  }

  @Get('invoices/:id')
  @RequirePermissions('billing:invoices:view')
  async getInvoice(@Param('id') id: string, @Req() req: any) {
    const tenantId = req?.user?.tenantId as string;
    const result = await this.service.getInvoice(id, tenantId);
    if (!result) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found' } };
    }
    return { success: true, data: result };
  }

  @Get('invoices')
  @RequirePermissions('billing:invoices:view')
  async listInvoices(
    @Req() req: any,
    @Query() query: any,
  ) {
    const tenantId = req?.user?.tenantId as string;
    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' } };
    }
    const lim = Math.min(parseInt(query.limit || '50', 10), 200);
    const result = await this.service.listInvoices({
      tenantId,
      customerId: query.customerId,
      policyId: query.policyId,
      status: query.status as InvoiceStatus,
      invoiceType: query.invoiceType as InvoiceType,
      limit: lim,
      offset: query.offset ? parseInt(query.offset, 10) : undefined,
    });
    return {
      success: true,
      data: result.items,
      pagination: { total: result.total, limit: lim, offset: query.offset || 0 },
    };
  }

  @Get('balance/outstanding')
  @RequirePermissions('billing:invoices:view')
  async getOutstandingBalance(
    @Req() req: any,
    @Query() query: any,
  ) {
    const tenantId = req?.user?.tenantId as string;
    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' } };
    }
    const balance = await this.service.getOutstandingBalance({
      tenantId,
      customerId: query.customerId,
    });
    return { success: true, data: { outstandingBalance: balance } };
  }

  // Accounting Endpoints

  @Post('journal-entries')
  @RequirePermissions('billing:accounting:manage')
  async createJournalEntry(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Body() body: CreateJournalEntryDto,
  ) {
    const correlationId = headers['x-correlation-id'] || `bl-${Date.now()}`;
    const tenantId = req?.user?.tenantId as string;
    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' }, correlationId };
    }
    const result = await this.service.createJournalEntry({
      ...body,
      tenantId,
      correlationId,
      idempotencyKey: headers['x-idempotency-key'],
    });
    return { success: true, data: result, correlationId };
  }

  @Put('journal-entries/:id/post')
  @RequirePermissions('billing:accounting:manage')
  async postJournalEntry(
    @Param('id') id: string,
    @Headers() headers: Record<string, any>,
    @Req() req: any,
  ) {
    const correlationId = headers['x-correlation-id'] || `bl-${Date.now()}`;
    const tenantId = req?.user?.tenantId as string;
    const userId = req?.user?.userId || req?.user?.sub || 'system';
    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' }, correlationId };
    }
    const result = await this.service.postJournalEntry(id, tenantId, userId);
    return { success: true, data: result, correlationId };
  }

  @Post('journal-entries/:id/reverse')
  @RequirePermissions('billing:accounting:manage')
  async reverseJournalEntry(
    @Param('id') id: string,
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Body() body: ReverseJournalEntryDto,
  ) {
    const correlationId = headers['x-correlation-id'] || `bl-${Date.now()}`;
    const tenantId = req?.user?.tenantId as string;
    const userId = req?.user?.userId || req?.user?.sub || 'system';
    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' }, correlationId };
    }
    const result = await this.service.reverseJournalEntry(id, tenantId, body.reversalEntryNumber, body.reason, userId);
    return { success: true, data: result, correlationId };
  }

  @Post('accounts')
  @RequirePermissions('billing:manage_accounts')
  async createAccount(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Body() body: CreateAccountDto,
  ) {
    const correlationId = headers['x-correlation-id'] || `bl-${Date.now()}`;
    const tenantId = req?.user?.tenantId as string;
    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' }, correlationId };
    }
    const result = await this.service.createAccount({ ...body, tenantId });
    return { success: true, data: result, correlationId };
  }

  @Get('accounts/:accountCode')
  @RequirePermissions('billing:invoices:view')
  async getAccount(
    @Param('accountCode') accountCode: string,
    @Req() req: any,
  ) {
    const tenantId = req?.user?.tenantId as string;
    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' } };
    }
    const result = await this.service.getAccount(accountCode, tenantId);
    if (!result) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Account not found' } };
    }
    return { success: true, data: result };
  }

  @Get('accounts')
  @RequirePermissions('billing:invoices:view')
  async listAccounts(
    @Req() req: any,
    @Query() query: any,
  ) {
    const tenantId = req?.user?.tenantId as string;
    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' } };
    }
    const lim = Math.min(parseInt(query.limit || '50', 10), 200);
    const result = await this.service.listAccounts({
      tenantId,
      accountType: query.accountType as AccountType,
      category: query.category,
      isActive: query.isActive !== undefined ? query.isActive === 'true' : undefined,
      limit: lim,
      offset: query.offset ? parseInt(query.offset, 10) : undefined,
    });
    return {
      success: true,
      data: result.items,
      pagination: { total: result.total, limit: lim, offset: query.offset || 0 },
    };
  }

  @Post('financial-periods')
  @RequirePermissions('billing:accounting:manage')
  async createFinancialPeriod(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Body() body: CreateFinancialPeriodDto,
  ) {
    const correlationId = headers['x-correlation-id'] || `bl-${Date.now()}`;
    const tenantId = req?.user?.tenantId as string;
    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' }, correlationId };
    }
    const result = await this.service.createFinancialPeriod({ ...body, tenantId });
    return { success: true, data: result, correlationId };
  }

  @Put('financial-periods/:id/close')
  @RequirePermissions('billing:close_period')
  async closeFinancialPeriod(
    @Param('id') id: string,
    @Headers() headers: Record<string, any>,
    @Req() req: any,
  ) {
    const correlationId = headers['x-correlation-id'] || `bl-${Date.now()}`;
    const tenantId = req?.user?.tenantId as string;
    const userId = req?.user?.userId || req?.user?.sub || 'system';
    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' }, correlationId };
    }
    const result = await this.service.closeFinancialPeriod(id, tenantId, userId);
    return { success: true, data: result, correlationId };
  }

  @Get('accounting/trial-balance')
  @RequirePermissions('billing:invoices:view')
  async getTrialBalance(
    @Req() req: any,
    @Query() query: any,
  ) {
    const tenantId = req?.user?.tenantId as string;
    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' } };
    }
    const result = await this.service.getTrialBalance({
      tenantId,
      asOfDate: query.asOfDate ? new Date(query.asOfDate) : undefined,
    });
    return { success: true, data: result };
  }

  @Get('accounts/:accountCode/balance')
  @RequirePermissions('billing:invoices:view')
  async getAccountBalance(
    @Param('accountCode') accountCode: string,
    @Req() req: any,
    @Query() query: any,
  ) {
    const tenantId = req?.user?.tenantId as string;
    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' } };
    }
    const result = await this.service.getAccountBalance({
      tenantId,
      accountCode,
      asOfDate: query.asOfDate ? new Date(query.asOfDate) : undefined,
    });
    return { success: true, data: result };
  }

  // Payment Gateway Endpoints

  @Post('payments/initiate')
  @RequirePermissions('billing:payments:initiate')
  async initiatePayment(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Body() body: InitiatePaymentDto,
  ) {
    const correlationId = headers['x-correlation-id'] || `bl-${Date.now()}`;
    const tenantId = req?.user?.tenantId as string;
    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' }, correlationId };
    }

    const invoice = await this.service.getInvoice(body.invoiceId, tenantId);
    if (!invoice) {
      return {
        success: false,
        error: { code: 'INVOICE_NOT_FOUND', message: 'Invoice not found' },
        correlationId,
      };
    }

    const result = await this.paymentGatewayService.initiatePayment({
      tenantId,
      invoiceId: body.invoiceId,
      amount: Number(invoice.amount),
      callbackUrl: body.callbackUrl,
      description: body.description,
      mobile: body.mobile,
      email: body.email,
      metadata: body.metadata,
      idempotencyKey: headers['x-idempotency-key'],
    });

    return {
      success: result.success,
      data: result.success ? { paymentId: result.paymentId, redirectUrl: result.redirectUrl, authority: result.authority } : null,
      error: result.success ? null : { code: result.errorCode, message: result.message },
      correlationId,
    };
  }

  @Post('payments/verify')
  @RequirePermissions('billing:payments:verify')
  async verifyPayment(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Body() body: VerifyPaymentDto,
  ) {
    const correlationId = headers['x-correlation-id'] || `bl-${Date.now()}`;
    const tenantId = req?.user?.tenantId as string;
    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' }, correlationId };
    }

    const result = await this.paymentGatewayService.verifyPayment({
      tenantId,
      paymentId: body.paymentId,
      authority: body.authority,
      amount: 0,
      provider: body.provider as any,
      correlationId,
    });

    return {
      success: result.success,
      data: result.success ? { refId: result.refId, cardPan: result.cardPan } : null,
      error: result.success ? null : { code: result.errorCode, message: result.message },
      correlationId,
    };
  }

  @Post('payments/:paymentId/cancel')
  @RequirePermissions('billing:payments:initiate')
  async cancelPayment(
    @Param('paymentId') paymentId: string,
    @Headers() headers: Record<string, any>,
    @Req() req: any,
  ) {
    const correlationId = headers['x-correlation-id'] || `bl-${Date.now()}`;
    const tenantId = req?.user?.tenantId as string;
    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' }, correlationId };
    }

    const result = await this.paymentGatewayService.cancelPayment(tenantId, paymentId);
    return { success: result.success, data: { message: result.message }, correlationId };
  }

  @Get('payments/:paymentId')
  @RequirePermissions('billing:invoices:view')
  async getPayment(
    @Param('paymentId') paymentId: string,
    @Headers() headers: Record<string, any>,
    @Req() req: any,
  ) {
    const correlationId = headers['x-correlation-id'] || `bl-${Date.now()}`;
    const tenantId = req?.user?.tenantId as string;
    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' }, correlationId };
    }

    const transaction = await this.paymentGatewayService.getTransaction(tenantId, paymentId);
    if (!transaction) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Payment transaction not found' },
        correlationId,
      };
    }

    return { success: true, data: transaction, correlationId };
  }

  @Get('invoices/:invoiceId/payments')
  @RequirePermissions('billing:invoices:view')
  async getInvoicePayments(
    @Param('invoiceId') invoiceId: string,
    @Headers() headers: Record<string, any>,
    @Req() req: any,
  ) {
    const correlationId = headers['x-correlation-id'] || `bl-${Date.now()}`;
    const tenantId = req?.user?.tenantId as string;
    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' }, correlationId };
    }

    const transactions = await this.paymentGatewayService.getTransactionsByInvoice(tenantId, invoiceId);
    return { success: true, data: transactions, correlationId };
  }

  @Get('payments/health-check')
  @RequirePermissions('billing:invoices:view')
  async paymentGatewayHealthCheck(@Headers() headers: Record<string, any>) {
    const correlationId = headers['x-correlation-id'] || `bl-${Date.now()}`;
    const health = await this.paymentGatewayService.healthCheck();
    return { success: true, data: health, correlationId };
  }

  // Auto-Deposit Verification Endpoints

  @Post('auto-deposit/ingest')
  @RequirePermissions('billing:auto-deposit:manage')
  async ingestBankTransaction(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Body() body: IngestBankTransactionDto,
  ) {
    const correlationId = headers['x-correlation-id'] || `bl-${Date.now()}`;
    const tenantId = req?.user?.tenantId as string;
    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' }, correlationId };
    }

    const result = await this.autoDepositService.ingestBankTransaction(tenantId, body);
    return { success: true, data: result, correlationId };
  }

  @Post('auto-deposit/:invoiceId/approve/:transactionId')
  @RequirePermissions('billing:auto-deposit:manage')
  async manualApprovePayment(
    @Param('invoiceId') invoiceId: string,
    @Param('transactionId') transactionId: string,
    @Headers() headers: Record<string, any>,
    @Req() req: any,
  ) {
    const correlationId = headers['x-correlation-id'] || `bl-${Date.now()}`;
    const tenantId = req?.user?.tenantId as string;
    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' }, correlationId };
    }

    await this.autoDepositService.manualApprovePayment(tenantId, invoiceId, transactionId);
    return { success: true, data: { message: 'Payment approved manually' }, correlationId };
  }

  @Post('auto-deposit/:transactionId/reject')
  @RequirePermissions('billing:auto-deposit:manage')
  async rejectTransaction(
    @Param('transactionId') transactionId: string,
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Body() body: RejectTransactionDto,
  ) {
    const correlationId = headers['x-correlation-id'] || `bl-${Date.now()}`;
    const tenantId = req?.user?.tenantId as string;
    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' }, correlationId };
    }

    await this.autoDepositService.rejectTransaction(tenantId, transactionId, body.reason);
    return { success: true, data: { message: 'Transaction rejected' }, correlationId };
  }

  @Get('auto-deposit/pending')
  @RequirePermissions('billing:auto-deposit:manage')
  async getPendingTransactions(@Headers() headers: Record<string, any>, @Req() req: any) {
    const correlationId = headers['x-correlation-id'] || `bl-${Date.now()}`;
    const tenantId = req?.user?.tenantId as string;
    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' }, correlationId };
    }

    const transactions = await this.autoDepositService.getPendingTransactions(tenantId);
    return { success: true, data: transactions, correlationId };
  }

  @Get('auto-deposit/matches')
  @RequirePermissions('billing:auto-deposit:manage')
  async getPendingMatches(@Headers() headers: Record<string, any>, @Req() req: any) {
    const correlationId = headers['x-correlation-id'] || `bl-${Date.now()}`;
    const tenantId = req?.user?.tenantId as string;
    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' }, correlationId };
    }

    const matches = await this.autoDepositService.getPendingMatches(tenantId);
    return { success: true, data: matches, correlationId };
  }

  @Post('auto-deposit/reconcile')
  @RequirePermissions('billing:auto-deposit:manage')
  async reconcileTransactions(@Headers() headers: Record<string, any>, @Req() req: any) {
    const correlationId = headers['x-correlation-id'] || `bl-${Date.now()}`;
    const tenantId = req?.user?.tenantId as string;
    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' }, correlationId };
    }

    const result = await this.autoDepositService.reconcileTransactions(tenantId);
    return { success: true, data: result, correlationId };
  }

  @Get('auto-deposit/config')
  @RequirePermissions('billing:auto-deposit:manage')
  async getAutoDepositConfig(@Headers() headers: Record<string, any>, @Req() req: any) {
    const correlationId = headers['x-correlation-id'] || `bl-${Date.now()}`;
    const tenantId = req?.user?.tenantId as string;
    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' }, correlationId };
    }

    const config = await this.autoDepositService.getConfig(tenantId);
    return { success: true, data: config, correlationId };
  }

  @Put('auto-deposit/config')
  @RequirePermissions('billing:auto-deposit:manage')
  async updateAutoDepositConfig(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Body() body: AutoDepositConfigDto,
  ) {
    const correlationId = headers['x-correlation-id'] || `bl-${Date.now()}`;
    const tenantId = req?.user?.tenantId as string;
    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' }, correlationId };
    }

    const config = await this.autoDepositService.updateConfig(tenantId, body);
    return { success: true, data: config, correlationId };
  }

  @Get('auto-deposit/health-check')
  @RequirePermissions('billing:invoices:view')
  async autoDepositHealthCheck(@Headers() headers: Record<string, any>, @Req() req: any) {
    const correlationId = headers['x-correlation-id'] || `bl-${Date.now()}`;
    const tenantId = req?.user?.tenantId as string;
    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' }, correlationId };
    }

    const health = await this.autoDepositService.healthCheck(tenantId);
    return { success: true, data: health, correlationId };
  }

  // Reconciliation endpoints

  @Post('reconcile')
  @RequirePermissions('billing:reconcile')
  async reconcile(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Body() body: ReconcileDto,
  ) {
    const correlationId = headers['x-correlation-id'] || `bl-${Date.now()}`;
    const tenantId = req?.user?.tenantId as string;
    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' }, correlationId };
    }
    const result = await this.service.reconcile({ ...body, tenantId });
    return { success: true, data: result, correlationId };
  }

  @Get('reconcile/results')
  @RequirePermissions('billing:reconcile')
  async listReconciliationResults(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Query() query: any,
  ) {
    const correlationId = headers['x-correlation-id'] || `bl-${Date.now()}`;
    const tenantId = req?.user?.tenantId as string;
    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' }, correlationId };
    }
    const lim = Math.min(parseInt(query.limit || '50', 10), 200);
    const result = await this.service.listReconciliationResults({
      tenantId,
      sourceType: query.sourceType,
      status: query.status,
      periodStart: query.periodStart ? new Date(query.periodStart) : undefined,
      periodEnd: query.periodEnd ? new Date(query.periodEnd) : undefined,
      limit: lim,
      offset: query.offset ? parseInt(query.offset, 10) : undefined,
    });
    return {
      success: true,
      data: result.items,
      pagination: { total: result.total, limit: lim, offset: query.offset || 0 },
      correlationId,
    };
  }

  @Put('reconcile/:id/approve')
  @RequirePermissions('billing:reconcile')
  async approveReconciliation(
    @Param('id') id: string,
    @Headers() headers: Record<string, any>,
    @Req() req: any,
  ) {
    const correlationId = headers['x-correlation-id'] || `bl-${Date.now()}`;
    const tenantId = req?.user?.tenantId as string;
    const userId = req?.user?.userId || req?.user?.sub || 'system';
    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' }, correlationId };
    }
    const result = await this.service.approveReconciliation(id, tenantId, userId);
    return { success: true, data: result, correlationId };
  }

  @Get('pnl-report')
  @RequirePermissions('billing:invoices:view')
  async getPnLReport(
    @Req() req: any,
    @Query() query: any,
  ) {
    const tenantId = req?.user?.tenantId as string;
    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' } };
    }
    const result = await this.service.getPnLReport({
      tenantId,
      periodStart: new Date(query.periodStart),
      periodEnd: new Date(query.periodEnd),
    });
    return { success: true, data: result };
  }

  @Get('balance-sheet')
  @RequirePermissions('billing:invoices:view')
  async getBalanceSheet(
    @Req() req: any,
    @Query() query: any,
  ) {
    const tenantId = req?.user?.tenantId as string;
    if (!tenantId) {
      return { success: false, error: { code: 'TENANT_REQUIRED', message: 'tenantId is required' } };
    }
    const result = await this.service.getBalanceSheet({
      tenantId,
      asOfDate: new Date(query.asOfDate),
    });
    return { success: true, data: result };
  }
}
