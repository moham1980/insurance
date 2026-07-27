import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedDefaultSLOs1700000000810 implements MigrationInterface {
  name = 'SeedDefaultSLOs1700000000810';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "CREATE UNIQUE INDEX IF NOT EXISTS uq_slos_service_name_slo_name ON monitoring.slos(service_name, slo_name)"
    );

    await queryRunner.query(
      `
      INSERT INTO monitoring.slos (service_name, slo_name, description, target, "window", current_value, status, created_at, updated_at)
      VALUES
        ('claims-service', 'claims_service_availability', 'Claims service availability', 0.995, '30d', NULL, 'healthy', NOW(), NOW()),
        ('claims-service', 'claims_service_latency_p95', 'Claims service latency p95 (normalized)', 0.500, '7d', NULL, 'healthy', NOW(), NOW()),
        ('payments-service', 'payments_service_availability', 'Payments service availability', 0.995, '30d', NULL, 'healthy', NOW(), NOW()),
        ('orchestrator-service', 'orchestrator_saga_success_rate', 'Orchestrator saga success rate', 0.99, '7d', NULL, 'healthy', NOW(), NOW()),
        ('complaints-service', 'complaints_resolution_sla', 'Complaints resolution SLA', 0.95, '30d', NULL, 'healthy', NOW(), NOW())
      ON CONFLICT (service_name, slo_name) DO NOTHING
      `
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      DELETE FROM monitoring.slos
      WHERE (service_name, slo_name) IN (
        ('claims-service', 'claims_service_availability'),
        ('claims-service', 'claims_service_latency_p95'),
        ('payments-service', 'payments_service_availability'),
        ('orchestrator-service', 'orchestrator_saga_success_rate'),
        ('complaints-service', 'complaints_resolution_sla')
      )
      `
    );

    await queryRunner.query('DROP INDEX IF EXISTS monitoring.uq_slos_service_name_slo_name');
  }
}
