import { DataSource, Repository } from 'typeorm';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Policy } from './entities/Policy';
import { PolicyChange } from './entities/PolicyChange';
import { PolicyInquiry } from './entities/PolicyInquiry';

const RETENTION_YEARS = 5;
const ARCHIVE_AFTER_MONTHS = 6;

async function archiveAuditTrails(dataSource: DataSource) {
  const queryRunner = dataSource.createQueryRunner();
  
  try {
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const schema = process.env.DB_SCHEMA || 'policy';
    const retentionDate = new Date();
    retentionDate.setFullYear(retentionDate.getFullYear() - RETENTION_YEARS);

    const archiveDate = new Date();
    archiveDate.setMonth(archiveDate.getMonth() - ARCHIVE_AFTER_MONTHS);

    const logger = console;
    logger.log(`[Archive Job] Archiving audit trails older than ${archiveDate.toISOString()}`);
    logger.log(`[Archive Job] Deleting archived data older than ${retentionDate.toISOString()}`);

    // Check if audit table exists before archiving
    const tableCheck = await queryRunner.query(`
      SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = 'audit')
    `, [schema]);
    const auditTableExists = tableCheck?.[0]?.exists === true;

    if (!auditTableExists) {
      logger.log(`[Archive Job] audit table not found in schema ${schema} — skipping audit archival`);
      await queryRunner.commitTransaction();
      return { archived: 0, deleted: 0, purged: 0 };
    }

    // Archive old audit records
    const archiveResult = await queryRunner.query(`
      INSERT INTO ${schema}.audit_archive (
        original_table, original_id, tenant_id, actor_user_id, action,
        resource_type, resource_id, status, request_data, response_data,
        error_data, correlation_id, created_at, retention_until
      )
      SELECT 
        'audit' as original_table,
        id as original_id,
        tenant_id,
        actor_user_id,
        action,
        resource_type,
        resource_id,
        status,
        request_data,
        response_data,
        error_data,
        correlation_id,
        created_at,
        created_at + INTERVAL '${RETENTION_YEARS} years' as retention_until
      FROM ${schema}.audit
      WHERE created_at < $1
      ON CONFLICT DO NOTHING
    `, [archiveDate]);

    const archivedCount = archiveResult.rowCount || 0;
    logger.log(`[Archive Job] Archived ${archivedCount} audit records`);

    // Delete archived records from main table
    const deleteResult = await queryRunner.query(`
      DELETE FROM ${schema}.audit
      WHERE created_at < $1
    `, [archiveDate]);

    const deletedCount = deleteResult.rowCount || 0;
    logger.log(`[Archive Job] Deleted ${deletedCount} archived records from main table`);

    // Delete old archived records beyond retention period
    const purgeResult = await queryRunner.query(`
      DELETE FROM ${schema}.audit_archive
      WHERE retention_until < $1
    `, [retentionDate]);

    const purgedCount = purgeResult.rowCount || 0;
    logger.log(`[Archive Job] Purged ${purgedCount} records from archive (beyond ${RETENTION_YEARS} years)`);

    await queryRunner.commitTransaction();
    logger.log('[Archive Job] Completed successfully');

    return {
      archived: archivedCount,
      deleted: deletedCount,
      purged: purgedCount,
    };
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('[Archive Job] Failed:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }
}

export async function runArchiveJob() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || process.env.DB_NAME || 'postgres',
    schema: process.env.DB_SCHEMA || 'policy',
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    const result = await archiveAuditTrails(dataSource);
    console.log('[Archive Job] Result:', JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('[Archive Job] Error:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

// Run if executed directly
if (require.main === module) {
  runArchiveJob();
}

@Injectable()
export class PolicyArchiveJob {
  private readonly logger = new Logger(PolicyArchiveJob.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Policy) private readonly policyRepo: Repository<Policy>,
    @InjectRepository(PolicyChange) private readonly changeRepo: Repository<PolicyChange>,
    @InjectRepository(PolicyInquiry) private readonly inquiryRepo: Repository<PolicyInquiry>
  ) {}

  private getArchiveRetentionDays(): number {
    const raw = process.env.ARCHIVE_RETENTION_DAYS;
    if (!raw) return 365;
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n) || n <= 0) return 365;
    return n;
  }

  private getArchiveBatchSize(): number {
    const raw = process.env.ARCHIVE_BATCH_SIZE;
    if (!raw) return 100;
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n) || n <= 0) return 100;
    return Math.min(n, 1000);
  }

  async archiveOldPolicies(): Promise<void> {
    this.logger.log('Starting archival job for old policies');

    try {
      const retentionDays = this.getArchiveRetentionDays();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const batchSize = this.getArchiveBatchSize();
      let totalArchived = 0;

      const policiesToArchive = await this.policyRepo
        .createQueryBuilder('p')
        .where('p.status IN (:...statuses)', { statuses: ['cancelled', 'expired'] })
        .andWhere('p.updatedAt < :cutoffDate', { cutoffDate })
        .andWhere('p.archived = :archived', { archived: false })
        .take(batchSize)
        .getMany();

      if (policiesToArchive.length === 0) {
        this.logger.log('No policies to archive');
        return;
      }

      this.logger.log(`Found ${policiesToArchive.length} policies to archive`);

      await this.dataSource.transaction(async (transactionalEntityManager) => {
        for (const policy of policiesToArchive) {
          try {
            policy.archived = true;
            policy.archivedAt = new Date();
            await transactionalEntityManager.save(policy);

            await transactionalEntityManager.update(
              PolicyChange,
              { policyId: policy.policyId },
              { archived: true, archivedAt: new Date() }
            );

            await transactionalEntityManager.update(
              PolicyInquiry,
              { policyId: policy.policyId },
              { archived: true, archivedAt: new Date() }
            );

            totalArchived++;
          } catch (error) {
            this.logger.error(`Failed to archive policy ${policy.policyId}`, error);
          }
        }
      });

      this.logger.log(`Archived ${totalArchived} policies successfully`);
    } catch (error) {
      this.logger.error('Failed to archive old policies', error);
    }
  }

  async archivePolicyManually(policyId: string): Promise<{ success: boolean; message: string }> {
    try {
      const policy = await this.policyRepo.findOne({ where: { policyId } });
      if (!policy) {
        return { success: false, message: 'Policy not found' };
      }

      if (policy.archived) {
        return { success: false, message: 'Policy is already archived' };
      }

      await this.dataSource.transaction(async (transactionalEntityManager) => {
        policy.archived = true;
        policy.archivedAt = new Date();
        await transactionalEntityManager.save(policy);

        await transactionalEntityManager.update(
          PolicyChange,
          { policyId: policy.policyId },
          { archived: true, archivedAt: new Date() }
        );

        await transactionalEntityManager.update(
          PolicyInquiry,
          { policyId: policy.policyId },
          { archived: true, archivedAt: new Date() }
        );
      });

      this.logger.log(`Manually archived policy ${policyId}`);
      return { success: true, message: 'Policy archived successfully' };
    } catch (error) {
      this.logger.error(`Failed to manually archive policy ${policyId}`, error);
      return { success: false, message: 'Failed to archive policy' };
    }
  }

  async restorePolicy(policyId: string): Promise<{ success: boolean; message: string }> {
    try {
      const policy = await this.policyRepo.findOne({ where: { policyId } });
      if (!policy) {
        return { success: false, message: 'Policy not found' };
      }

      if (!policy.archived) {
        return { success: false, message: 'Policy is not archived' };
      }

      await this.dataSource.transaction(async (transactionalEntityManager) => {
        policy.archived = false;
        policy.archivedAt = null;
        await transactionalEntityManager.save(policy);

        await transactionalEntityManager.update(
          PolicyChange,
          { policyId: policy.policyId },
          { archived: false, archivedAt: null }
        );

        await transactionalEntityManager.update(
          PolicyInquiry,
          { policyId: policy.policyId },
          { archived: false, archivedAt: null }
        );
      });

      this.logger.log(`Restored archived policy ${policyId}`);
      return { success: true, message: 'Policy restored successfully' };
    } catch (error) {
      this.logger.error(`Failed to restore policy ${policyId}`, error);
      return { success: false, message: 'Failed to restore policy' };
    }
  }

  async getArchiveStats(): Promise<{
    totalPolicies: number;
    archivedPolicies: number;
    pendingArchive: number;
    retentionDays: number;
  }> {
    const retentionDays = this.getArchiveRetentionDays();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const [totalPolicies, archivedPolicies, pendingArchive] = await Promise.all([
      this.policyRepo.count(),
      this.policyRepo.count({ where: { archived: true } }),
      this.policyRepo
        .createQueryBuilder('p')
        .where('p.status IN (:...statuses)', { statuses: ['cancelled', 'expired'] })
        .andWhere('p.updatedAt < :cutoffDate', { cutoffDate })
        .andWhere('p.archived = :archived', { archived: false })
        .getCount(),
    ]);

    return {
      totalPolicies,
      archivedPolicies,
      pendingArchive,
      retentionDays,
    };
  }

  async enforceRetentionPolicies(): Promise<{
    deletedArchivedPolicies: number;
    purgedAuditTrails: number;
  }> {
    this.logger.log('Starting retention policy enforcement');

    let deletedArchivedPolicies = 0;
    let purgedAuditTrails = 0;

    try {
      const retentionYears = process.env.RETENTION_YEARS ? parseInt(process.env.RETENTION_YEARS, 10) : 7;
      const retentionDate = new Date();
      retentionDate.setFullYear(retentionDate.getFullYear() - retentionYears);

      // Delete archived policies beyond retention period
      const policiesToDelete = await this.policyRepo
        .createQueryBuilder('p')
        .where('p.archived = :archived', { archived: true })
        .andWhere('p.archivedAt < :retentionDate', { retentionDate })
        .getMany();

      if (policiesToDelete.length > 0) {
        const policyIds = policiesToDelete.map(p => p.policyId);

        await this.dataSource.transaction(async (transactionalEntityManager) => {
          // Delete related changes
          await transactionalEntityManager
            .createQueryBuilder()
            .delete()
            .from(PolicyChange)
            .where('policyId IN (:...policyIds)', { policyIds })
            .execute();

          // Delete related inquiries
          await transactionalEntityManager
            .createQueryBuilder()
            .delete()
            .from(PolicyInquiry)
            .where('policyId IN (:...policyIds)', { policyIds })
            .execute();

          // Delete policies
          const deleteResult = await transactionalEntityManager
            .createQueryBuilder()
            .delete()
            .from(Policy)
            .where('policyId IN (:...policyIds)', { policyIds })
            .execute();

          deletedArchivedPolicies = deleteResult.affected || 0;
        });

        this.logger.log(`Deleted ${deletedArchivedPolicies} archived policies beyond retention period`);
      }

      // Purge old audit trails from audit_archive table
      const queryRunner = this.dataSource.createQueryRunner();
      try {
        await queryRunner.connect();
        await queryRunner.startTransaction();

        const schema = process.env.DB_SCHEMA || 'policy';

        const purgeResult = await queryRunner.query(`
          DELETE FROM ${schema}.audit_archive
          WHERE retention_until < $1
        `, [retentionDate]);

        purgedAuditTrails = purgeResult.rowCount || 0;
        this.logger.log(`Purged ${purgedAuditTrails} audit records beyond retention period`);

        await queryRunner.commitTransaction();
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }

      this.logger.log('Retention policy enforcement completed');
    } catch (error) {
      this.logger.error('Failed to enforce retention policies', error);
      throw error;
    }

    return {
      deletedArchivedPolicies,
      purgedAuditTrails,
    };
  }
}
