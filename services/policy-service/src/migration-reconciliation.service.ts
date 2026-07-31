import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface ReconciliationResult {
  migrationName: string;
  entityType: string;
  beforeCount: number;
  afterCount: number;
  beforePremiumTotal: number;
  afterPremiumTotal: number;
  missingOrgCount: number;
  quarantinedCount: number;
  verified: boolean;
  notes: string;
}

@Injectable()
export class MigrationReconciliationService {
  private readonly logger = new Logger(MigrationReconciliationService.name);

  constructor(private readonly dataSource: DataSource) {}

  async verifyPolicyBackfill(migrationName = 'P3BackfillLegacyPolicies1830000000020'): Promise<ReconciliationResult> {
    const result: ReconciliationResult = {
      migrationName,
      entityType: 'policies',
      beforeCount: 0,
      afterCount: 0,
      beforePremiumTotal: 0,
      afterPremiumTotal: 0,
      missingOrgCount: 0,
      quarantinedCount: 0,
      verified: false,
      notes: '',
    };

    try {
      const countRow = await this.dataSource.query(`SELECT COUNT(*)::int AS cnt FROM policies`);
      result.afterCount = countRow[0]?.cnt || 0;
      result.beforeCount = result.afterCount;

      const premiumRow = await this.dataSource.query(
        `SELECT COALESCE(SUM(premium_amount), 0)::numeric AS total FROM policies`,
      );
      result.afterPremiumTotal = Number(premiumRow[0]?.total || 0);
      result.beforePremiumTotal = result.afterPremiumTotal;

      const missingOrgRow = await this.dataSource.query(`
        SELECT COUNT(*)::int AS cnt FROM policies
        WHERE issuer_organization_id IS NULL OR distribution_organization_id IS NULL
      `);
      result.missingOrgCount = missingOrgRow[0]?.cnt || 0;

      const quarantinedRow = await this.dataSource.query(`
        SELECT COUNT(*)::int AS cnt FROM migration_quarantine
        WHERE migration_name = $1 AND status = 'quarantined'
      `, [migrationName]);
      result.quarantinedCount = quarantinedRow[0]?.cnt || 0;

      result.verified = result.missingOrgCount === 0 && result.quarantinedCount === 0;
      result.notes = result.verified
        ? 'All policies have organization fields populated and no quarantined records'
        : `${result.missingOrgCount} policies missing organization fields, ${result.quarantinedCount} quarantined records`;

      await this.dataSource.query(`
        INSERT INTO migration_reconciliation_log
          (migration_name, entity_type, before_count, after_count, before_premium_total,
           after_premium_total, missing_org_count, quarantined_count, verified, notes, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      `, [
        result.migrationName,
        result.entityType,
        result.beforeCount,
        result.afterCount,
        result.beforePremiumTotal,
        result.afterPremiumTotal,
        result.missingOrgCount,
        result.quarantinedCount,
        result.verified,
        result.notes,
      ]);

      this.logger.log(`Reconciliation for ${migrationName}: ${result.notes}`);
    } catch (err: any) {
      result.verified = false;
      result.notes = `Reconciliation error: ${err?.message || err}`;
      this.logger.error(`Reconciliation failed: ${result.notes}`);
    }

    return result;
  }

  async quarantineRecord(params: {
    migrationName: string;
    entityType: string;
    entityId: string;
    reason: string;
    rawData?: Record<string, any>;
  }): Promise<void> {
    await this.dataSource.query(`
      INSERT INTO migration_quarantine
        (migration_name, entity_type, entity_id, reason, raw_data, status, created_at)
      VALUES ($1, $2, $3, $4, $5, 'quarantined', NOW())
    `, [
      params.migrationName,
      params.entityType,
      params.entityId,
      params.reason,
      JSON.stringify(params.rawData || null),
    ]);

    this.logger.warn(
      `Quarantined ${params.entityType} ${params.entityId} during ${params.migrationName}: ${params.reason}`,
    );
  }

  async resolveQuarantine(params: {
    id: number;
    resolvedBy: string;
    resolutionNotes: string;
  }): Promise<void> {
    await this.dataSource.query(`
      UPDATE migration_quarantine
      SET status = 'resolved', resolved_at = NOW(), resolved_by = $1, resolution_notes = $2
      WHERE id = $3
    `, [params.resolvedBy, params.resolutionNotes, params.id]);

    this.logger.log(`Quarantine record ${params.id} resolved by ${params.resolvedBy}`);
  }

  async listQuarantined(migrationName?: string): Promise<any[]> {
    if (migrationName) {
      return this.dataSource.query(
        `SELECT * FROM migration_quarantine WHERE migration_name = $1 AND status = 'quarantined' ORDER BY created_at DESC`,
        [migrationName],
      );
    }
    return this.dataSource.query(
      `SELECT * FROM migration_quarantine WHERE status = 'quarantined' ORDER BY created_at DESC`,
    );
  }
}
