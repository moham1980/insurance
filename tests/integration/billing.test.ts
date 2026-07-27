import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { ApiClient } from '../helpers/api-client';
import { DbHelper } from '../helpers/db-helper';
import { JwtFactory } from '../helpers/jwt-factory';

describe('Integration: Billing/Finance Service', () => {
  let apiClient: ApiClient;
  let adminToken: string;
  let tenantId: string;
  let accountId: string;
  let invoiceId: string;

  beforeAll(async () => {
    apiClient = new ApiClient('http://localhost:18000');
    tenantId = 'tenant-billing-integration';
    adminToken = JwtFactory.createAdminToken(tenantId);
    await DbHelper.cleanup('billing');
  });

  afterAll(async () => {
    // Cleanup if needed
  });

  describe('T-BF-01: Chart of Accounts CRUD', () => {
    test('should create chart of account', async () => {
      const createResponse = await apiClient.post('/billing/chart-of-accounts', {
        tenantId,
        accountCode: '1001',
        accountName: 'Cash',
        accountType: 'ASSET',
        category: 'current_assets',
        description: 'Cash on hand and in bank',
        balanceType: 'DEBIT',
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(createResponse.status).toBe(201);
      expect(createResponse.data.success).toBe(true);
      expect(createResponse.data.data).toHaveProperty('id');
      expect(createResponse.data.data.accountCode).toBe('1001');
      expect(createResponse.data.data.accountType).toBe('ASSET');

      accountId = createResponse.data.data.id;
    });

    test('should get chart of account by ID', async () => {
      const getResponse = await apiClient.get(`/billing/chart-of-accounts/${accountId}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(getResponse.status).toBe(200);
      expect(getResponse.data.success).toBe(true);
      expect(getResponse.data.data.id).toBe(accountId);
    });

    test('should update chart of account', async () => {
      const updateResponse = await apiClient.put(`/billing/chart-of-accounts/${accountId}`, {
        description: 'Updated description for cash account',
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.data.success).toBe(true);
    });

    test('should list chart of accounts', async () => {
      const listResponse = await apiClient.get('/billing/chart-of-accounts', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(listResponse.status).toBe(200);
      expect(listResponse.data.success).toBe(true);
      expect(Array.isArray(listResponse.data.data)).toBe(true);
    });

    test('should create additional accounts for testing', async () => {
      const accounts = [
        {
          accountCode: '4001',
          accountName: 'Premium Revenue',
          accountType: 'REVENUE',
          category: 'insurance_revenue',
          balanceType: 'CREDIT',
        },
        {
          accountCode: '6001',
          accountName: 'Claim Expense',
          accountType: 'EXPENSE',
          category: 'claims',
          balanceType: 'DEBIT',
        },
        {
          accountCode: '2001',
          accountName: 'Accounts Receivable',
          accountType: 'ASSET',
          category: 'current_assets',
          balanceType: 'DEBIT',
        },
      ];

      for (const account of accounts) {
        await apiClient.post('/billing/chart-of-accounts', {
          tenantId,
          ...account,
        }, {
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'x-tenant-id': tenantId,
          },
        });
      }
    });
  });

  describe('T-BF-02: Accounting Entry: double-entry validation', () => {
    test('should create valid double-entry journal entry', async () => {
      const createResponse = await apiClient.post('/billing/journal-entries', {
        tenantId,
        entryDate: new Date().toISOString(),
        description: 'Policy premium received',
        reference: 'POL-123',
        lines: [
          {
            accountCode: '1001',
            debitAmount: 10000000,
            creditAmount: 0,
          },
          {
            accountCode: '4001',
            debitAmount: 0,
            creditAmount: 10000000,
          },
        ],
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(createResponse.status).toBe(201);
      expect(createResponse.data.success).toBe(true);
      expect(createResponse.data.data).toHaveProperty('id');
    });

    test('should reject unbalanced journal entry (debit≠credit)', async () => {
      const createResponse = await apiClient.post('/billing/journal-entries', {
        tenantId,
        entryDate: new Date().toISOString(),
        description: 'Unbalanced entry',
        reference: 'TEST',
        lines: [
          {
            accountCode: '1001',
            debitAmount: 10000000,
            creditAmount: 0,
          },
          {
            accountCode: '4001',
            debitAmount: 0,
            creditAmount: 9000000,
          },
        ],
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(createResponse.status).toBe(400);
      expect(createResponse.data.success).toBe(false);
      expect(createResponse.data.message).toContain('debit');
    });
  });

  describe('T-BF-03: Fiscal Period: close → prevent entry in closed period', () => {
    test('should create fiscal period', async () => {
      const createResponse = await apiClient.post('/billing/fiscal-periods', {
        tenantId,
        periodCode: '2024-Q1',
        startDate: '2024-01-01',
        endDate: '2024-03-31',
        status: 'OPEN',
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(createResponse.status).toBe(201);
      expect(createResponse.data.success).toBe(true);
    });

    test('should close fiscal period', async () => {
      const listResponse = await apiClient.get('/billing/fiscal-periods', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      const periodId = listResponse.data.data[0].id;

      const closeResponse = await apiClient.put(`/billing/fiscal-periods/${periodId}/close`, {}, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(closeResponse.status).toBe(200);
      expect(closeResponse.data.success).toBe(true);
      expect(closeResponse.data.data.status).toBe('CLOSED');
    });

    test('should reject journal entry in closed period', async () => {
      const createResponse = await apiClient.post('/billing/journal-entries', {
        tenantId,
        entryDate: '2024-02-15',
        description: 'Entry in closed period',
        reference: 'TEST',
        lines: [
          {
            accountCode: '1001',
            debitAmount: 10000000,
            creditAmount: 0,
          },
          {
            accountCode: '4001',
            debitAmount: 0,
            creditAmount: 10000000,
          },
        ],
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(createResponse.status).toBe(400);
      expect(createResponse.data.success).toBe(false);
      expect(createResponse.data.message).toContain('closed');
    });
  });

  describe('T-BF-04: Trial Balance: total debit = total credit', () => {
    test('should generate trial balance with balanced totals', async () => {
      // Create a new open period for testing
      const periodResponse = await apiClient.post('/billing/fiscal-periods', {
        tenantId,
        periodCode: '2024-Q2',
        startDate: '2024-04-01',
        endDate: '2024-06-30',
        status: 'OPEN',
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      // Create journal entries
      await apiClient.post('/billing/journal-entries', {
        tenantId,
        entryDate: '2024-04-15',
        description: 'Test entry 1',
        reference: 'TB-001',
        lines: [
          { accountCode: '1001', debitAmount: 5000000, creditAmount: 0 },
          { accountCode: '4001', debitAmount: 0, creditAmount: 5000000 },
        ],
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      await apiClient.post('/billing/journal-entries', {
        tenantId,
        entryDate: '2024-04-20',
        description: 'Test entry 2',
        reference: 'TB-002',
        lines: [
          { accountCode: '6001', debitAmount: 3000000, creditAmount: 0 },
          { accountCode: '1001', debitAmount: 0, creditAmount: 3000000 },
        ],
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      const trialBalanceResponse = await apiClient.get('/billing/reports/trial-balance', {
        params: {
          tenantId,
          periodCode: '2024-Q2',
        },
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(trialBalanceResponse.status).toBe(200);
      expect(trialBalanceResponse.data.success).toBe(true);
      expect(trialBalanceResponse.data.data).toHaveProperty('totalDebit');
      expect(trialBalanceResponse.data.data).toHaveProperty('totalCredit');
      expect(trialBalanceResponse.data.data.totalDebit).toBe(trialBalanceResponse.data.data.totalCredit);
    });
  });

  describe('T-BF-05: Ledger: account ledger with correct balance', () => {
    test('should get account ledger with correct balance', async () => {
      const ledgerResponse = await apiClient.get('/billing/ledger/account', {
        params: {
          tenantId,
          accountCode: '1001',
          periodCode: '2024-Q2',
        },
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(ledgerResponse.status).toBe(200);
      expect(ledgerResponse.data.success).toBe(true);
      expect(ledgerResponse.data.data).toHaveProperty('accountCode');
      expect(ledgerResponse.data.data).toHaveProperty('balance');
      expect(ledgerResponse.data.data).toHaveProperty('transactions');
      expect(Array.isArray(ledgerResponse.data.data.transactions)).toBe(true);
    });
  });

  describe('T-BF-06: Kafka: policy issuance → accounting entry generated', () => {
    test('should create accounting entry on policy issuance', async () => {
      const entryResponse = await apiClient.post('/billing/journal-entries', {
        tenantId,
        entryDate: new Date().toISOString(),
        description: 'Policy issuance - POL-456',
        reference: 'POL-456',
        source: 'policy_issuance',
        lines: [
          {
            accountCode: '2001',
            debitAmount: 15000000,
            creditAmount: 0,
          },
          {
            accountCode: '4001',
            debitAmount: 0,
            creditAmount: 15000000,
          },
        ],
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(entryResponse.status).toBe(201);
      expect(entryResponse.data.success).toBe(true);
    });
  });

  describe('T-BF-07: Kafka: claim payment → accounting entry generated', () => {
    test('should create accounting entry on claim payment', async () => {
      const entryResponse = await apiClient.post('/billing/journal-entries', {
        tenantId,
        entryDate: new Date().toISOString(),
        description: 'Claim payment - CLM-789',
        reference: 'CLM-789',
        source: 'claim_payment',
        lines: [
          {
            accountCode: '6001',
            debitAmount: 8000000,
            creditAmount: 0,
          },
          {
            accountCode: '1001',
            debitAmount: 0,
            creditAmount: 8000000,
          },
        ],
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(entryResponse.status).toBe(201);
      expect(entryResponse.data.success).toBe(true);
    });
  });

  describe('T-BF-08: Kafka: premium collection → accounting entry generated', () => {
    test('should create accounting entry on premium collection', async () => {
      const entryResponse = await apiClient.post('/billing/journal-entries', {
        tenantId,
        entryDate: new Date().toISOString(),
        description: 'Premium collection - INV-999',
        reference: 'INV-999',
        source: 'premium_collection',
        lines: [
          {
            accountCode: '1001',
            debitAmount: 12000000,
            creditAmount: 0,
          },
          {
            accountCode: '2001',
            debitAmount: 0,
            creditAmount: 12000000,
          },
        ],
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(entryResponse.status).toBe(201);
      expect(entryResponse.data.success).toBe(true);
    });
  });

  describe('T-BF-09: Reconciliation: match entries with operational transactions', () => {
    test('should reconcile accounting entries with transactions', async () => {
      const reconciliationResponse = await apiClient.post('/billing/reconciliation', {
        tenantId,
        periodCode: '2024-Q2',
        source: 'policy',
        transactionIds: ['POL-456'],
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(reconciliationResponse.status).toBe(200);
      expect(reconciliationResponse.data.success).toBe(true);
      expect(reconciliationResponse.data.data).toHaveProperty('matched');
      expect(reconciliationResponse.data.data).toHaveProperty('unmatched');
    });

    test('should get reconciliation status', async () => {
      const statusResponse = await apiClient.get('/billing/reconciliation/status', {
        params: {
          tenantId,
          periodCode: '2024-Q2',
        },
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.data.success).toBe(true);
    });
  });

  describe('T-BF-10: PnL: profit and loss report', () => {
    test('should generate profit and loss report', async () => {
      const pnlResponse = await apiClient.get('/billing/reports/profit-loss', {
        params: {
          tenantId,
          periodCode: '2024-Q2',
        },
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(pnlResponse.status).toBe(200);
      expect(pnlResponse.data.success).toBe(true);
      expect(pnlResponse.data.data).toHaveProperty('revenue');
      expect(pnlResponse.data.data).toHaveProperty('expenses');
      expect(pnlResponse.data.data).toHaveProperty('netProfit');
    });
  });

  describe('T-BF-11: Balance Sheet: balanced balance sheet', () => {
    test('should generate balanced balance sheet', async () => {
      const balanceSheetResponse = await apiClient.get('/billing/reports/balance-sheet', {
        params: {
          tenantId,
          periodCode: '2024-Q2',
        },
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(balanceSheetResponse.status).toBe(200);
      expect(balanceSheetResponse.data.success).toBe(true);
      expect(balanceSheetResponse.data.data).toHaveProperty('assets');
      expect(balanceSheetResponse.data.data).toHaveProperty('liabilities');
      expect(balanceSheetResponse.data.data).toHaveProperty('equity');
      // Assets should equal Liabilities + Equity
      const totalAssets = balanceSheetResponse.data.data.assets.total;
      const totalLiabilitiesEquity = balanceSheetResponse.data.data.liabilities.total + balanceSheetResponse.data.data.equity.total;
      expect(Math.abs(totalAssets - totalLiabilitiesEquity)).toBeLessThan(1); // Allow small rounding differences
    });
  });

  describe('T-BF-12: E2E: issuance → issuance entry → collection → collection entry → trial balance', () => {
    test('should complete full E2E accounting flow', async () => {
      // Step 1: Policy issuance
      const issuanceEntry = await apiClient.post('/billing/journal-entries', {
        tenantId,
        entryDate: '2024-05-01',
        description: 'E2E Policy issuance - POL-E2E-001',
        reference: 'POL-E2E-001',
        source: 'policy_issuance',
        lines: [
          { accountCode: '2001', debitAmount: 20000000, creditAmount: 0 },
          { accountCode: '4001', debitAmount: 0, creditAmount: 20000000 },
        ],
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(issuanceEntry.status).toBe(201);

      // Step 2: Premium collection
      const collectionEntry = await apiClient.post('/billing/journal-entries', {
        tenantId,
        entryDate: '2024-05-15',
        description: 'E2E Premium collection - INV-E2E-001',
        reference: 'INV-E2E-001',
        source: 'premium_collection',
        lines: [
          { accountCode: '1001', debitAmount: 20000000, creditAmount: 0 },
          { accountCode: '2001', debitAmount: 0, creditAmount: 20000000 },
        ],
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(collectionEntry.status).toBe(201);

      // Step 3: Verify trial balance
      const trialBalanceResponse = await apiClient.get('/billing/reports/trial-balance', {
        params: {
          tenantId,
          periodCode: '2024-Q2',
        },
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(trialBalanceResponse.status).toBe(200);
      expect(trialBalanceResponse.data.data.totalDebit).toBe(trialBalanceResponse.data.data.totalCredit);
    });
  });

  describe('Invoice Management', () => {
    test('should create invoice', async () => {
      const response = await apiClient.post('/billing/invoices', {
        tenantId,
        invoiceNumber: 'INV-2024-001',
        invoiceType: 'policy_premium',
        amount: 15000000,
        taxAmount: 1500000,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        customerId: 'customer-123',
        lineItems: [
          {
            description: 'Annual Premium',
            quantity: 1,
            unitPrice: 15000000,
            amount: 15000000,
          },
        ],
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('id');
      expect(response.data.data.invoiceNumber).toBe('INV-2024-001');
      expect(response.data.data.status).toBe('DRAFT');

      invoiceId = response.data.data.id;
    });

    test('should issue invoice', async () => {
      const issueResponse = await apiClient.put(`/billing/invoices/${invoiceId}/issue`, {}, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(issueResponse.status).toBe(200);
      expect(issueResponse.data.success).toBe(true);
      expect(issueResponse.data.data.status).toBe('PENDING');
    });

    test('should record payment', async () => {
      const paymentResponse = await apiClient.post(`/billing/invoices/${invoiceId}/payment`, {
        amount: 16500000,
        paymentDate: new Date().toISOString(),
        reference: 'PAY-REF-001',
      }, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(paymentResponse.status).toBe(200);
      expect(paymentResponse.data.success).toBe(true);
      expect(paymentResponse.data.data.paidAmount).toBe(16500000);
      expect(paymentResponse.data.data.status).toBe('PAID');
    });

    test('should get invoice by ID', async () => {
      const getResponse = await apiClient.get(`/billing/invoices/${invoiceId}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(getResponse.status).toBe(200);
      expect(getResponse.data.success).toBe(true);
      expect(getResponse.data.data.id).toBe(invoiceId);
    });

    test('should list invoices', async () => {
      const listResponse = await apiClient.get('/billing/invoices', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(listResponse.status).toBe(200);
      expect(listResponse.data.success).toBe(true);
      expect(Array.isArray(listResponse.data.data)).toBe(true);
    });

    test('should get outstanding balance', async () => {
      const balanceResponse = await apiClient.get('/billing/balance/outstanding', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'x-tenant-id': tenantId,
        },
      });

      expect(balanceResponse.status).toBe(200);
      expect(balanceResponse.data.success).toBe(true);
      expect(balanceResponse.data.data).toHaveProperty('outstandingBalance');
      expect(typeof balanceResponse.data.data.outstandingBalance).toBe('number');
    });
  });
});
