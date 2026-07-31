import { MigrationInterface, QueryRunner } from 'typeorm';

export class P3BackfillCommissionLedger1830000000050 implements MigrationInterface {
  name = 'P3BackfillCommissionLedger1830000000050';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Seed default ledger accounts for each organization that has policies.
    const orgs = await queryRunner.query(`
      SELECT DISTINCT COALESCE(issuer_organization_id, distribution_organization_id) AS org_id,
             tenant_id
      FROM policies
      WHERE COALESCE(issuer_organization_id, distribution_organization_id) IS NOT NULL;
    `);

    const defaultAccounts = [
      { code: 'PREMIUM_RECEIVABLE_CUSTOMER', name: 'Customer Premium Receivable', type: 'ASSET' },
      { code: 'PREMIUM_PAYABLE_CARRIER', name: 'Premium Payable to Carrier', type: 'LIABILITY' },
      { code: 'TAX_PAYABLE_AUTHORITY', name: 'Tax Payable to Authority', type: 'LIABILITY' },
      { code: 'COMMISSION_EXPENSE', name: 'Commission Expense', type: 'EXPENSE' },
      { code: 'COMMISSION_PAYABLE', name: 'Commission Payable', type: 'LIABILITY' },
      { code: 'CASH_BANK', name: 'Cash / Bank', type: 'ASSET' },
    ];

    for (const org of orgs) {
      for (const acct of defaultAccounts) {
        await queryRunner.query(
          `
            INSERT INTO brokerage_ledger_accounts (tenant_id, organization_id, code, name, type, currency, status)
            VALUES ($1, $2, $3, $4, $5, 'IRR', 'active')
            ON CONFLICT (tenant_id, organization_id, code) DO NOTHING;
          `,
          [org.tenant_id, org.org_id, acct.code, acct.name, acct.type],
        );
      }
    }

    // 2. Backfill commission splits for existing policies that don't have any.
    const policiesWithoutSplits = await queryRunner.query(`
      SELECT p.policy_id, p.tenant_id,
             COALESCE(p.issuer_organization_id, p.distribution_organization_id) AS org_id,
             p.premium_amount, p.premium_currency, p.start_date,
             p.distribution_organization_id AS broker_org_id
      FROM policies p
      WHERE p.status IN ('active', 'issued', 'endorsed', 'cancelled', 'lapsed')
        AND NOT EXISTS (
          SELECT 1 FROM commission_splits cs WHERE cs.source_id = p.policy_id AND cs.source_type = 'POLICY'
        )
        AND p.premium_amount > 0
        AND p.distribution_organization_id IS NOT NULL;
    `);

    for (const policy of policiesWithoutSplits) {
      // Default single-tier broker split: 100% to broker at 15% commission rate (1500 bps)
      const commissionAmount = Number(policy.premium_amount) * 0.15;
      const currency = policy.premium_currency || 'IRR';

      // Create a journal entry for the policy issuance posting
      const journalResult = await queryRunner.query(
        `
          INSERT INTO brokerage_journal_entries (
            tenant_id, organization_id, source_type, source_id,
            idempotency_key, posting_date, period_id, status, description
          )
          VALUES ($1, $2, 'POLICY', $3, $4, $5, $6, 'posted', $7)
          ON CONFLICT (idempotency_key) DO NOTHING
          RETURNING journal_entry_id;
        `,
        [
          policy.tenant_id,
          policy.org_id,
          policy.policy_id,
          `policy-issuance-${policy.policy_id}`,
          policy.start_date,
          policy.tenant_id, // period_id approximated as tenant_id for backfill
          `Backfill policy issuance posting for ${policy.policy_id}`,
        ],
      );

      const journalEntryId = journalResult[0]?.journal_entry_id;
      if (!journalEntryId) continue;

      // Get account IDs for this org
      const accounts = await queryRunner.query(
        `SELECT code, account_id FROM brokerage_ledger_accounts WHERE tenant_id = $1 AND organization_id = $2`,
        [policy.tenant_id, policy.org_id],
      );
      const accountMap: Record<string, string> = {};
      for (const a of accounts) accountMap[a.code] = a.account_id;

      const totalPayable = Number(policy.premium_amount);
      const taxAmount = 0;
      const premiumPayable = Number(policy.premium_amount);

      // Create journal lines (double-entry balanced)
      const lines = [
        { account: 'PREMIUM_RECEIVABLE_CUSTOMER', debit: totalPayable, credit: 0 },
        { account: 'PREMIUM_PAYABLE_CARRIER', debit: 0, credit: premiumPayable },
        { account: 'TAX_PAYABLE_AUTHORITY', debit: 0, credit: taxAmount },
        { account: 'COMMISSION_EXPENSE', debit: commissionAmount, credit: 0 },
        { account: 'COMMISSION_PAYABLE', debit: 0, credit: commissionAmount },
      ];

      for (const line of lines) {
        const acctId = accountMap[line.account];
        if (!acctId) continue;
        await queryRunner.query(
          `
            INSERT INTO brokerage_journal_lines (
              tenant_id, journal_entry_id, account_id,
              debit_amount, debit_currency, credit_amount, credit_currency,
              dimensions, description
            )
            VALUES ($1, $2, $3, $4, 'IRR', $5, 'IRR', $6, $7);
          `,
          [
            policy.tenant_id,
            journalEntryId,
            acctId,
            line.debit,
            line.credit,
            { policyId: policy.policy_id, carrier: policy.org_id, broker: policy.broker_org_id, product: '', branch: policy.broker_org_id },
            `Backfill line for ${line.account}`,
          ],
        );
      }

      // Create commission split
      await queryRunner.query(
        `
          INSERT INTO commission_splits (
            tenant_id, journal_entry_id, organization_id, role, base,
            share_bps, amount, currency, effective_from, status,
            source_type, source_id
          )
          VALUES ($1, $2, $3, 'broker', 'gross_premium', 1500, $4, $5, $6, 'accrued', 'POLICY', $7)
          ON CONFLICT DO NOTHING;
        `,
        [
          policy.tenant_id,
          journalEntryId,
          policy.broker_org_id,
          commissionAmount,
          currency,
          policy.start_date,
          policy.policy_id,
        ],
      );
    }

    // 3. Log reconciliation counts for verification
    const policyCount = await queryRunner.query(`SELECT COUNT(*) AS cnt FROM policies`);
    const splitCount = await queryRunner.query(`SELECT COUNT(*) AS cnt FROM commission_splits WHERE source_type = 'POLICY'`);
    const journalCount = await queryRunner.query(`SELECT COUNT(*) AS cnt FROM brokerage_journal_entries WHERE source_type = 'POLICY'`);

    // eslint-disable-next-line no-console
    console.log(
      `[P3BackfillCommissionLedger] Reconciliation: policies=${policyCount[0].cnt}, ` +
      `commission_splits=${splitCount[0].cnt}, journal_entries=${journalCount[0].cnt}`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove backfilled commission splits and journal entries
    await queryRunner.query(`
      DELETE FROM commission_splits WHERE source_type = 'POLICY' AND journal_entry_id IS NOT NULL;
    `);
    await queryRunner.query(`
      DELETE FROM brokerage_journal_lines WHERE dimensions->>'policyId' IS NOT NULL
        AND journal_entry_id IN (
          SELECT journal_entry_id FROM brokerage_journal_entries WHERE source_type = 'POLICY'
        );
    `);
    await queryRunner.query(`
      DELETE FROM brokerage_journal_entries WHERE source_type = 'POLICY' AND idempotency_key LIKE 'policy-issuance-%';
    `);
    // Note: default ledger accounts are not removed as they may be referenced by other entries.
  }
}
