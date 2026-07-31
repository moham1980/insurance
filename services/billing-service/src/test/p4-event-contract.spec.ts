import * as fs from 'fs';
import * as path from 'path';

describe('P4 Event Contract Tests', () => {
  let asyncApiContent: string;
  let billingServiceDir: string;

  beforeAll(() => {
    const asyncApiPath = path.resolve(__dirname, '../../../doc/asyncapi/insurance-events.asyncapi.yml');
    asyncApiContent = fs.readFileSync(asyncApiPath, 'utf-8');
    billingServiceDir = path.resolve(__dirname, '..');
  });

  const P4_EVENTS = [
    { topic: 'insurance.billing.premium_invoice.created', eventType: 'PremiumInvoiceCreated' },
    { topic: 'insurance.billing.premium_invoice.issued', eventType: 'PremiumInvoiceIssued' },
    { topic: 'insurance.billing.premium_invoice.paid', eventType: 'PremiumInvoicePaid' },
    { topic: 'insurance.billing.premium_invoice.overdue', eventType: 'PremiumInvoiceOverdue' },
    { topic: 'insurance.billing.premium_invoice.cancelled', eventType: 'PremiumInvoiceCancelled' },
    { topic: 'insurance.billing.installment_plan.created', eventType: 'InstallmentPlanCreated' },
    { topic: 'insurance.billing.installment.paid', eventType: 'InstallmentPaid' },
    { topic: 'insurance.billing.installment.defaulted', eventType: 'InstallmentDefaulted' },
    { topic: 'insurance.billing.payment.initiated', eventType: 'PaymentInitiated' },
    { topic: 'insurance.billing.payment.settled', eventType: 'PaymentSettled' },
    { topic: 'insurance.billing.payment.failed', eventType: 'PaymentFailed' },
    { topic: 'insurance.billing.refund.initiated', eventType: 'RefundInitiated' },
    { topic: 'insurance.billing.refund.approved', eventType: 'RefundApproved' },
    { topic: 'insurance.billing.refund.sent', eventType: 'RefundSent' },
    { topic: 'insurance.billing.refund.settled', eventType: 'RefundSettled' },
    { topic: 'insurance.billing.refund.failed', eventType: 'RefundFailed' },
    { topic: 'insurance.billing.escrow.held', eventType: 'EscrowHeld' },
    { topic: 'insurance.billing.escrow.released', eventType: 'EscrowReleased' },
    { topic: 'insurance.billing.escrow.auto_released', eventType: 'EscrowAutoReleased' },
    { topic: 'insurance.billing.escrow.carrier_approved', eventType: 'EscrowCarrierApproved' },
    { topic: 'insurance.billing.clawback.applied', eventType: 'ClawbackPaymentInitiated' },
    { topic: 'insurance.billing.settlement.batch.created', eventType: 'SettlementBatchCreated' },
    { topic: 'insurance.billing.settlement.batch.approved', eventType: 'SettlementBatchApproved' },
    { topic: 'insurance.billing.settlement.batch.paid', eventType: 'SettlementBatchPaid' },
    { topic: 'insurance.billing.settlement.batch.reconciled', eventType: 'SettlementBatchReconciled' },
    { topic: 'insurance.billing.settlement.discrepancy_detected', eventType: 'SettlementDiscrepancyDetected' },
    { topic: 'insurance.billing.commission.accrued', eventType: 'CommissionSplitAccrued' },
    { topic: 'insurance.billing.journal.posted', eventType: 'BrokerageJournalPosted' },
    { topic: 'insurance.billing.journal.reversed', eventType: 'BrokerageJournalReversed' },
    { topic: 'insurance.billing.receivable.created', eventType: 'ReceivableCreated' },
  ];

  describe('AsyncAPI channel coverage', () => {
    for (const evt of P4_EVENTS) {
      it(`defines channel for ${evt.topic}`, () => {
        expect(asyncApiContent).toContain(evt.topic);
      });

      it(`defines message component for ${evt.eventType}`, () => {
        expect(asyncApiContent).toContain(`    ${evt.eventType}:`);
      });

      it(`message ${evt.eventType} has correct name property`, () => {
        expect(asyncApiContent).toContain(`name: ${evt.eventType}`);
      });

      it(`message ${evt.eventType} has contentType application/json`, () => {
        const msgSection = asyncApiContent.split(`    ${evt.eventType}:`)[1]?.split('    ')[0] || '';
        expect(msgSection).toContain('contentType: application/json');
      });

      it(`message ${evt.eventType} has required fields`, () => {
        const msgSection = asyncApiContent.split(`    ${evt.eventType}:`)[1]?.split('\n    ')[0] || '';
        expect(msgSection).toContain('required:');
        expect(msgSection).toContain('eventType');
        expect(msgSection).toContain('eventVersion');
        expect(msgSection).toContain('correlationId');
        expect(msgSection).toContain('subject');
        expect(msgSection).toContain('payload');
      });
    }
  });

  describe('Producer code coverage', () => {
    const sourceFiles: string[] = [];

    beforeAll(() => {
      const srcDir = path.resolve(billingServiceDir, 'src');
      function collectTsFiles(dir: string) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory() && entry.name !== 'test') {
            collectTsFiles(fullPath);
          } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) {
            sourceFiles.push(fullPath);
          }
        }
      }
      collectTsFiles(srcDir);
    });

    for (const evt of P4_EVENTS) {
      it(`has producer code publishing ${evt.eventType}`, () => {
        const found = sourceFiles.some((file) => {
          const content = fs.readFileSync(file, 'utf-8');
          return content.includes(`eventType: '${evt.eventType}'`);
        });
        expect(found).toBe(true);
      });

      it(`has producer code using topic ${evt.topic}`, () => {
        const found = sourceFiles.some((file) => {
          const content = fs.readFileSync(file, 'utf-8');
          return content.includes(`topic: '${evt.topic}'`);
        });
        expect(found).toBe(true);
      });
    }
  });

  describe('OpenAPI contract coverage', () => {
    let openApiContent: string;

    beforeAll(() => {
      const openApiPath = path.resolve(__dirname, '../../../contracts/openapi/billing-service-p4.openapi.yaml');
      openApiContent = fs.readFileSync(openApiPath, 'utf-8');
    });

    const P4_ENDPOINTS = [
      'POST /invoicing/policies/{policyId}/invoices',
      'GET /invoicing/policies/{policyId}/invoices',
      'GET /invoicing/invoices/{invoiceId}',
      'POST /invoicing/invoices/{invoiceId}/issue',
      'POST /invoicing/invoices/{invoiceId}/cancel',
      'POST /invoicing/invoices/{invoiceId}/installments',
      'POST /invoicing/installments/{itemId}/pay',
      'POST /brokerage/invoices/{invoiceId}/pay',
      'GET /brokerage/payments/{paymentId}',
      'POST /brokerage/payments/{paymentId}/retry',
      'POST /webhooks/payments',
      'POST /brokerage/settlements/batches',
      'POST /brokerage/settlements/batches/{batchId}/approve',
      'POST /brokerage/settlements/batches/{batchId}/confirm',
      'POST /brokerage/settlements/batches/{batchId}/verify',
      'POST /brokerage/settlements/batches/{batchId}/reconcile',
      'POST /brokerage/refunds',
      'POST /brokerage/refunds/{refundId}/approve',
      'POST /brokerage/refunds/{refundId}/send',
      'POST /brokerage/clawbacks/calculate',
      'POST /brokerage/clawbacks/apply',
      'GET /brokerage/escrow/holdings',
      'POST /brokerage/escrow/holdings/{holdingId}/release',
      'GET /brokerage/escrow/holdings/{holdingId}/eligibility',
      'POST /brokerage/escrow/holdings/{holdingId}/carrier-approve',
      'POST /brokerage/escrow/auto-release',
      'GET /reports/collections',
      'GET /reports/outstanding-invoices',
      'GET /reports/settlements',
      'GET /reports/escrow-balance',
    ];

    for (const endpoint of P4_ENDPOINTS) {
      it(`OpenAPI defines ${endpoint}`, () => {
        const [method, ...pathParts] = endpoint.split(' ');
        const apiPath = pathParts.join(' ');
        expect(openApiContent).toContain(apiPath);
        expect(openApiContent.toLowerCase()).toContain(method.toLowerCase());
      });
    }

    it('OpenAPI has BearerAuth security scheme', () => {
      expect(openApiContent).toContain('BearerAuth');
      expect(openApiContent).toContain('bearerFormat: JWT');
    });

    it('OpenAPI has server definition', () => {
      expect(openApiContent).toContain('servers:');
      expect(openApiContent).toContain('localhost:18039');
    });
  });
});
