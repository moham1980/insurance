import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface RetentionResult {
  brokerTransactionReports: number;
  tcorReports: number;
  auditReports: number;
  dataQualityIssues: number;
  auditLogs: number;
  outboxEvents: number;
  consumedEvents: number;
  piiPurged: number;
  archived: number;
}

export interface RetentionPolicy {
  entityType: string;
  retentionDays: number;
  action: 'archive' | 'delete';
  purgePii: boolean;
}

const PII_COLUMNS: Record<string, string[]> = {
  rm_policies: ['national_id', 'phone_number', 'email', 'address', 'birth_date', 'iban', 'card_number'],
  rm_claim_payments: ['payee_national_id', 'payee_phone', 'payee_iban'],
  rm_fraud_signals: [],
};

const DEFAULT_POLICIES: RetentionPolicy[] = [
  { entityType: 'audit_logs', retentionDays: 2555, action: 'archive', purgePii: false },
  { entityType: 'kpi_snapshots', retentionDays: 1095, action: 'archive', purgePii: false },
  { entityType: 'outbox_events', retentionDays: 365, action: 'delete', purgePii: false },
  { entityType: 'consumed_events', retentionDays: 365, action: 'delete', purgePii: false },
  { entityType: 'data_quality_issues', retentionDays: 1095, action: 'archive', purgePii: false },
  { entityType: 'audit_reports', retentionDays: 2555, action: 'archive', purgePii: false },
  { entityType: 'broker_transaction_reports', retentionDays: 2555, action: 'archive', purgePii: false },
  { entityType: 'tcor_reports', retentionDays: 2555, action: 'archive', purgePii: false },
  { entityType: 'rm_policies', retentionDays: 3650, action: 'archive', purgePii: true },
  { entityType: 'rm_claim_payments', retentionDays: 3650, action: 'archive', purgePii: true },
  { entityType: 'rm_fraud_signals', retentionDays: 1825, action: 'archive', purgePii: false },
];

@Injectable()
export class ReportRetentionService {
  private readonly logger = new Logger(ReportRetentionService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  get retentionDays(): number {
    const raw = process.env.REPORT_RETENTION_DAYS;
    return raw ? Math.max(1, parseInt(raw, 10)) : 2555;
  }

  async getPolicies(): Promise<RetentionPolicy[]> {
    try {
      const rows = await this.dataSource.query(
        'SELECT entity_type, retention_days, action, purge_pii FROM data_retention_policies ORDER BY entity_type',
      );
      if (rows && rows.length > 0) {
        return rows.map((r: any) => ({
          entityType: r.entity_type,
          retentionDays: Number(r.retention_days),
          action: r.action,
          purgePii: r.purge_pii,
        }));
      }
    } catch {
      this.logger.warn('data_retention_policies table not found, using defaults');
    }
    return DEFAULT_POLICIES;
  }

  async applyRetention(tenantId?: string): Promise<RetentionResult> {
    const policies = await this.getPolicies();
    const result: RetentionResult = {
      brokerTransactionReports: 0,
      tcorReports: 0,
      auditReports: 0,
      dataQualityIssues: 0,
      auditLogs: 0,
      outboxEvents: 0,
      consumedEvents: 0,
      piiPurged: 0,
      archived: 0,
    };

    for (const policy of policies) {
      const cutoff = new Date(Date.now() - policy.retentionDays * 24 * 60 * 60 * 1000).toISOString();
      const tableMap: Record<string, keyof RetentionResult> = {
        broker_transaction_reports: 'brokerTransactionReports',
        tcor_reports: 'tcorReports',
        audit_reports: 'auditReports',
        data_quality_issues: 'dataQualityIssues',
        outbox_events: 'outboxEvents',
        consumed_events: 'consumedEvents',
      };

      if (policy.purgePii) {
        const purged = await this.purgePII(policy.entityType, cutoff, tenantId);
        result.piiPurged += purged;
      }

      if (policy.action === 'archive') {
        const archived = await this.archiveRecords(policy.entityType, cutoff, tenantId);
        result.archived += archived;
        const key = tableMap[policy.entityType];
        if (key) (result as any)[key] = archived;
      } else {
        const deleted = await this.deleteRecords(policy.entityType, cutoff, tenantId);
        const key = tableMap[policy.entityType];
        if (key) (result as any)[key] = deleted;
      }

      this.logger.log(`Retention for ${policy.entityType}: ${policy.action} (cutoff=${cutoff}, purgePii=${policy.purgePii})`, { tenantId });
    }

    return result;
  }

  private async archiveRecords(table: string, cutoff: string, tenantId?: string): Promise<number> {
    const archiveTable = `archived_${table}`;
    try {
      await this.dataSource.query(`CREATE TABLE IF NOT EXISTS ${archiveTable} (LIKE ${table} INCLUDING ALL);`);
    } catch {
      this.logger.warn(`Could not create archive table ${archiveTable}`);
      return 0;
    }

    const whereParts = [`created_at < $1`];
    const params: any[] = [cutoff];
    if (tenantId) {
      whereParts.push(`tenant_id = $2`);
      params.push(tenantId);
    }
    const whereClause = whereParts.join(' AND ');

    try {
      const res = await this.dataSource.query(
        `WITH moved AS (
          DELETE FROM ${table} WHERE ${whereClause}
          RETURNING *
        ) INSERT INTO ${archiveTable} SELECT * FROM moved`,
        params,
      );
      const count = res?.length || res?.[1] || 0;
      this.logger.log(`Archived ${count} records from ${table} to ${archiveTable}`);
      return Array.isArray(res) ? res.length : Number(count);
    } catch (err) {
      this.logger.error(`Failed to archive ${table}: ${err}`);
      return 0;
    }
  }

  private async deleteRecords(table: string, cutoff: string, tenantId?: string): Promise<number> {
    const whereParts = [`created_at < $1`];
    const params: any[] = [cutoff];
    if (tenantId) {
      whereParts.push(`tenant_id = $2`);
      params.push(tenantId);
    }
    const whereClause = whereParts.join(' AND ');

    try {
      const res = await this.dataSource.query(`DELETE FROM ${table} WHERE ${whereClause}`, params);
      const count = res?.[1] || 0;
      this.logger.log(`Deleted ${count} records from ${table}`);
      return Number(count);
    } catch (err) {
      this.logger.error(`Failed to delete from ${table}: ${err}`);
      return 0;
    }
  }

  private async purgePII(table: string, cutoff: string, tenantId?: string): Promise<number> {
    const piiCols = PII_COLUMNS[table];
    if (!piiCols || piiCols.length === 0) return 0;

    const setParts = piiCols.map((col, idx) => `${col} = $${idx + 2}`).join(', ');
    const whereParts = [`created_at < $1`, `(${piiCols.map((c) => `${c} IS NOT NULL`).join(' OR ')})`];
    const params: any[] = [cutoff, ...piiCols.map(() => '****')];

    if (tenantId) {
      whereParts.push(`tenant_id = $${params.length + 1}`);
      params.push(tenantId);
    }

    const whereClause = whereParts.join(' AND ');

    try {
      const res = await this.dataSource.query(
        `UPDATE ${table} SET ${setParts} WHERE ${whereClause}`,
        params,
      );
      const count = res?.[1] || 0;
      this.logger.log(`Purged PII in ${count} records from ${table}`);
      return Number(count);
    } catch (err) {
      this.logger.error(`Failed to purge PII from ${table}: ${err}`);
      return 0;
    }
  }
}
