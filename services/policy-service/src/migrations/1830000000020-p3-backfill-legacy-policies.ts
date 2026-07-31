import { MigrationInterface, QueryRunner } from 'typeorm';

export class P3BackfillLegacyPolicies1830000000020 implements MigrationInterface {
  name = 'P3BackfillLegacyPolicies1830000000020';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Fill ownership fields on existing policies where null.
    await queryRunner.query(`
      UPDATE policies
      SET customer_party_id = party_id,
          record_owner_organization_id = COALESCE(issuer_organization_id, distribution_organization_id),
          authoritative_tenant_id = tenant_id,
          product_version = GREATEST(product_version, 1),
          servicing_organization_id = COALESCE(servicing_organization_id, issuer_organization_id),
          producer_party_id = COALESCE(producer_party_id, sub_agent_party_id, marketer_party_id)
      WHERE customer_party_id IS NULL;
    `);

    // Also backfill servicing_organization_id and producer_party_id for policies that already had customer_party_id
    await queryRunner.query(`
      UPDATE policies
      SET servicing_organization_id = COALESCE(servicing_organization_id, issuer_organization_id),
          producer_party_id = COALESCE(producer_party_id, sub_agent_party_id, marketer_party_id)
      WHERE servicing_organization_id IS NULL OR producer_party_id IS NULL;
    `);

    // Backfill coverages from legacy JSONB coverages into policy_coverages.
    const policies = await queryRunner.query(`
      SELECT policy_id, tenant_id, coverages, premium_currency
      FROM policies
      WHERE coverages IS NOT NULL;
    `);

    for (const policy of policies) {
      const rows = this.extractCoverages(policy.coverages);
      for (const row of rows) {
        await queryRunner.query(
          `
            INSERT INTO policy_coverages (
              tenant_id, policy_id, coverage_code, limit_amount, limit_currency,
              deductible_amount, deductible_currency, premium_amount, premium_currency, status, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', $10)
            ON CONFLICT DO NOTHING;
          `,
          [
            policy.tenant_id,
            policy.policy_id,
            row.coverageCode,
            row.limitAmount || 0,
            policy.premium_currency || 'IRR',
            row.deductibleAmount || 0,
            policy.premium_currency || 'IRR',
            row.premiumAmount || 0,
            policy.premium_currency || 'IRR',
            row.metadata || {},
          ],
        );
      }
    }

    // Backfill parties: create a policy_parties row for the insured party if none exists.
    await queryRunner.query(`
      INSERT INTO policy_parties (tenant_id, policy_id, party_id, role, allocation)
      SELECT tenant_id, policy_id, party_id, 'INSURED', 100
      FROM policies
      WHERE NOT EXISTS (
        SELECT 1 FROM policy_parties pp WHERE pp.policy_id = policies.policy_id
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM policy_parties`);
    await queryRunner.query(`DELETE FROM policy_coverages`);
  }

  private extractCoverages(coverages: any): any[] {
    if (!coverages) return [];
    if (Array.isArray(coverages)) return coverages;
    if (typeof coverages === 'object') {
      return Object.keys(coverages).map((key) => ({
        coverageCode: key,
        limitAmount: coverages[key]?.limit,
        deductibleAmount: coverages[key]?.deductible,
        premiumAmount: coverages[key]?.premium,
        metadata: coverages[key] || {},
      }));
    }
    return [];
  }
}
