import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class AddAccessAuditTable1699999999999 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'access_audit',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'user_id',
            type: 'varchar',
          },
          {
            name: 'username',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'roles',
            type: 'text',
            isArray: true,
            isNullable: true,
          },
          {
            name: 'org_unit_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'resource_type',
            type: 'varchar',
          },
          {
            name: 'resource_id',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'resource_owner',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'resource_org_unit_id',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'tenant_id',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'action',
            type: 'varchar',
          },
          {
            name: 'decision',
            type: 'varchar',
          },
          {
            name: 'decision_reason',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'policy_id',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'policy_name',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'context',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'ip_address',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'user_agent',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'location',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'timestamp',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Create indexes for common queries
    await queryRunner.createIndex(
      'access_audit',
      new TableIndex({
        name: 'idx_access_audit_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'access_audit',
      new TableIndex({
        name: 'idx_access_audit_resource_type',
        columnNames: ['resource_type'],
      }),
    );

    await queryRunner.createIndex(
      'access_audit',
      new TableIndex({
        name: 'idx_access_audit_action',
        columnNames: ['action'],
      }),
    );

    await queryRunner.createIndex(
      'access_audit',
      new TableIndex({
        name: 'idx_access_audit_decision',
        columnNames: ['decision'],
      }),
    );

    await queryRunner.createIndex(
      'access_audit',
      new TableIndex({
        name: 'idx_access_audit_timestamp',
        columnNames: ['timestamp'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('access_audit', true);
  }
}
