#!/usr/bin/env bun
/**
 * P2 backfill & reconciliation script for Quote-to-Bind phase.
 * Converts existing quote/placement data to the new P2 model.
 *
 * Usage:
 *   bun run scripts/p2-backfill-reconcile.ts --dry-run
 *   bun run scripts/p2-backfill-reconcile.ts --reconcile
 *   bun run scripts/p2-backfill-reconcile.ts --backfill
 */
import { AppDataSource as SubmissionDataSource } from '../services/submission-placement-service/src/data-source';
import { AppDataSource as PolicyDataSource } from '../services/policy-service/src/data-source';

interface Args {
  dryRun: boolean;
  reconcile: boolean;
  backfill: boolean;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const out: Args = { dryRun: false, reconcile: false, backfill: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') out.dryRun = true;
    if (args[i] === '--reconcile') out.reconcile = true;
    if (args[i] === '--backfill') out.backfill = true;
  }
  return out;
}

async function backfillSubmissions(ds: any, dryRun: boolean): Promise<{ created: number; skipped: number; quarantined: number }> {
  const stats = { created: 0, skipped: 0, quarantined: 0 };
  const queryRunner = ds.createQueryRunner();
  await queryRunner.connect();

  try {
    const existingQuotes = await queryRunner.query(`
      SELECT * FROM legacy_quotes WHERE migrated = false OR migrated IS NULL
    `);

    for (const quote of existingQuotes) {
      if (!quote.tenant_id || !quote.broker_organization_id || !quote.product_id) {
        await queryRunner.query(`
          INSERT INTO migration_quarantine (source_table, source_id, reason, data, created_at)
          VALUES ('legacy_quotes', $1, 'missing required fields', $2, NOW())
        `, [quote.id, JSON.stringify(quote)]);
        stats.quarantined++;
        continue;
      }

      if (dryRun) {
        console.log(`[DRY-RUN] Would create submission for legacy quote ${quote.id}`);
        stats.created++;
        continue;
      }

      await queryRunner.query(`
        INSERT INTO submissions (submission_id, tenant_id, broker_organization_id, party_id, product_id, product_version,
          line_of_business, status, exposure, effective_from, effective_to, idempotency_key, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'placed', $8, $9, $10, $11, 'migration', NOW(), NOW())
        ON CONFLICT (idempotency_key) DO NOTHING
      `, [
        `mig-sub-${quote.id}`,
        quote.tenant_id,
        quote.broker_organization_id,
        quote.party_id || 'unknown',
        quote.product_id,
        quote.product_version || 1,
        quote.line_of_business || 'unknown',
        JSON.stringify(quote.exposure || {}),
        quote.effective_from || new Date(),
        quote.effective_to || new Date(Date.now() + 365 * 86400000),
        `backfill-sub-${quote.id}`,
      ]);

      await queryRunner.query(`UPDATE legacy_quotes SET migrated = true WHERE id = $1`, [quote.id]);
      stats.created++;
    }
  } finally {
    await queryRunner.release();
  }

  return stats;
}

async function backfillQuoteRequests(ds: any, dryRun: boolean): Promise<{ created: number; skipped: number; quarantined: number }> {
  const stats = { created: 0, skipped: 0, quarantined: 0 };
  const queryRunner = ds.createQueryRunner();
  await queryRunner.connect();

  try {
    const existing = await queryRunner.query(`
      SELECT * FROM legacy_quote_requests WHERE migrated = false OR migrated IS NULL
    `);

    for (const qr of existing) {
      if (!qr.tenant_id || !qr.submission_id) {
        await queryRunner.query(`
          INSERT INTO migration_quarantine (source_table, source_id, reason, data, created_at)
          VALUES ('legacy_quote_requests', $1, 'missing tenant or submission', $2, NOW())
        `, [qr.id, JSON.stringify(qr)]);
        stats.quarantined++;
        continue;
      }

      if (dryRun) {
        console.log(`[DRY-RUN] Would create quote request for legacy ${qr.id}`);
        stats.created++;
        continue;
      }

      await queryRunner.query(`
        INSERT INTO quote_requests (quote_request_id, tenant_id, submission_id, distribution_agreement_id, agreement_version,
          carrier_organization_id, product_id, product_version, connector_type, request_payload, idempotency_key,
          attempt, sla_deadline, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'manual', $9, $10, 1, $11, 'received', NOW(), NOW())
        ON CONFLICT (idempotency_key) DO NOTHING
      `, [
        `mig-qr-${qr.id}`,
        qr.tenant_id,
        qr.submission_id,
        qr.distribution_agreement_id || null,
        qr.agreement_version || 1,
        qr.carrier_organization_id || 'unknown',
        qr.product_id,
        qr.product_version || 1,
        JSON.stringify(qr.request_payload || {}),
        `backfill-qr-${qr.id}`,
        qr.sla_deadline || new Date(Date.now() + 7 * 86400000),
      ]);

      await queryRunner.query(`UPDATE legacy_quote_requests SET migrated = true WHERE id = $1`, [qr.id]);
      stats.created++;
    }
  } finally {
    await queryRunner.release();
  }

  return stats;
}

async function backfillPlacements(ds: any, dryRun: boolean): Promise<{ created: number; skipped: number; quarantined: number }> {
  const stats = { created: 0, skipped: 0, quarantined: 0 };
  const queryRunner = ds.createQueryRunner();
  await queryRunner.connect();

  try {
    const existing = await queryRunner.query(`
      SELECT * FROM legacy_policies WHERE migrated = false OR migrated IS NULL
    `);

    for (const pol of existing) {
      if (!pol.tenant_id || !pol.distribution_agreement_id) {
        await queryRunner.query(`
          INSERT INTO migration_quarantine (source_table, source_id, reason, data, created_at)
          VALUES ('legacy_policies', $1, 'missing tenant or distribution agreement', $2, NOW())
        `, [pol.id, JSON.stringify(pol)]);
        stats.quarantined++;
        continue;
      }

      if (dryRun) {
        console.log(`[DRY-RUN] Would create placement for legacy policy ${pol.id}`);
        stats.created++;
        continue;
      }

      await queryRunner.query(`
        INSERT INTO placements (placement_id, tenant_id, distribution_agreement_id, agreement_version, submission_id,
          quote_response_id, carrier_organization_id, broker_organization_id, status, bind_saga_state,
          policy_id, policy_number, effective_from, effective_to, idempotency_key, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'completed', 'completed', $9, $10, $11, $12, $13, 'migration', NOW(), NOW())
        ON CONFLICT (idempotency_key) DO NOTHING
      `, [
        `mig-pl-${pol.id}`,
        pol.tenant_id,
        pol.distribution_agreement_id,
        pol.agreement_version || 1,
        pol.submission_id || `mig-sub-${pol.quote_id}`,
        pol.quote_response_id || `mig-qr-${pol.quote_id}`,
        pol.carrier_organization_id || 'unknown',
        pol.broker_organization_id,
        pol.policy_id || pol.id,
        pol.policy_number,
        pol.effective_from || new Date(),
        pol.effective_to || new Date(Date.now() + 365 * 86400000),
        `backfill-pl-${pol.id}`,
      ]);

      await queryRunner.query(`UPDATE legacy_policies SET migrated = true WHERE id = $1`, [pol.id]);
      stats.created++;
    }
  } finally {
    await queryRunner.release();
  }

  return stats;
}

async function backfillPolicyProjections(ds: any, dryRun: boolean): Promise<{ created: number; skipped: number; quarantined: number }> {
  const stats = { created: 0, skipped: 0, quarantined: 0 };
  const queryRunner = ds.createQueryRunner();
  await queryRunner.connect();

  try {
    const existing = await queryRunner.query(`
      SELECT * FROM legacy_policies WHERE migrated_projection = false OR migrated_projection IS NULL
    `);

    for (const pol of existing) {
      if (!pol.tenant_id || !pol.broker_organization_id) {
        stats.quarantined++;
        continue;
      }

      if (dryRun) {
        console.log(`[DRY-RUN] Would create policy projection for ${pol.id}`);
        stats.created++;
        continue;
      }

      await queryRunner.query(`
        INSERT INTO policy_projections (projection_id, tenant_id, broker_organization_id, issuer_organization_id,
          policy_id, policy_number, placement_id, source_system_id, source_version, received_at, payload, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'legacy', 1, NOW(), $8, 'active', NOW(), NOW())
        ON CONFLICT DO NOTHING
      `, [
        `mig-pp-${pol.id}`,
        pol.tenant_id,
        pol.broker_organization_id,
        pol.carrier_organization_id || 'unknown',
        pol.policy_id || pol.id,
        pol.policy_number,
        `mig-pl-${pol.id}`,
        JSON.stringify(pol),
      ]);

      await queryRunner.query(`UPDATE legacy_policies SET migrated_projection = true WHERE id = $1`, [pol.id]);
      stats.created++;
    }
  } finally {
    await queryRunner.release();
  }

  return stats;
}

async function reconcile(ds: any): Promise<void> {
  const queryRunner = ds.createQueryRunner();
  await queryRunner.connect();

  try {
    const submissionCount = await queryRunner.query(`SELECT COUNT(*) as count FROM submissions`);
    const legacyQuoteCount = await queryRunner.query(`SELECT COUNT(*) as count FROM legacy_quotes WHERE migrated = true`);
    console.log(`Reconciliation: submissions=${submissionCount[0].count}, migrated legacy quotes=${legacyQuoteCount[0].count}`);
    if (parseInt(submissionCount[0].count) !== parseInt(legacyQuoteCount[0].count)) {
      console.warn(`WARNING: Submission count mismatch! submissions=${submissionCount[0].count} vs migrated=${legacyQuoteCount[0].count}`);
    }

    const placementsWithoutAgreement = await queryRunner.query(`
      SELECT COUNT(*) as count FROM placements WHERE distribution_agreement_id IS NULL
    `);
    if (parseInt(placementsWithoutAgreement[0].count) > 0) {
      console.warn(`WARNING: ${placementsWithoutAgreement[0].count} placements without distributionAgreementId!`);
    }

    const quarantineCount = await queryRunner.query(`SELECT COUNT(*) as count FROM migration_quarantine`);
    console.log(`Quarantined records: ${quarantineCount[0].count}`);
  } finally {
    await queryRunner.release();
  }
}

async function run() {
  const args = parseArgs();

  console.log('P2 Backfill & Reconciliation');
  console.log('============================');
  console.log(`Mode: ${args.dryRun ? 'DRY-RUN' : args.reconcile ? 'RECONCILE' : args.backfill ? 'BACKFILL' : 'NONE'}`);
  console.log('');

  if (!args.dryRun && !args.reconcile && !args.backfill) {
    console.error('No mode specified. Use --dry-run, --reconcile, or --backfill');
    process.exit(1);
  }

  await SubmissionDataSource.initialize();
  await PolicyDataSource.initialize();

  if (args.dryRun || args.backfill) {
    console.log('--- Backfilling Submissions ---');
    const subStats = await backfillSubmissions(SubmissionDataSource, args.dryRun);
    console.log(`Created: ${subStats.created}, Skipped: ${subStats.skipped}, Quarantined: ${subStats.quarantined}`);

    console.log('--- Backfilling Quote Requests ---');
    const qrStats = await backfillQuoteRequests(SubmissionDataSource, args.dryRun);
    console.log(`Created: ${qrStats.created}, Skipped: ${qrStats.skipped}, Quarantined: ${qrStats.quarantined}`);

    console.log('--- Backfilling Placements ---');
    const plStats = await backfillPlacements(SubmissionDataSource, args.dryRun);
    console.log(`Created: ${plStats.created}, Skipped: ${plStats.skipped}, Quarantined: ${plStats.quarantined}`);

    console.log('--- Backfilling Policy Projections ---');
    const ppStats = await backfillPolicyProjections(PolicyDataSource, args.dryRun);
    console.log(`Created: ${ppStats.created}, Skipped: ${ppStats.skipped}, Quarantined: ${ppStats.quarantined}`);
  }

  if (args.reconcile || args.dryRun) {
    console.log('');
    console.log('--- Reconciliation ---');
    await reconcile(SubmissionDataSource);
  }

  await SubmissionDataSource.destroy();
  await PolicyDataSource.destroy();

  console.log('');
  console.log('Done.');
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
