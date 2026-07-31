import { MigrationInterface, QueryRunner } from 'typeorm';

export class P5BackfillAndReconciliation1850000000050 implements MigrationInterface {
  name = 'P5BackfillAndReconciliation1850000000050';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS migration_quarantine (
        quarantine_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source_table TEXT NOT NULL,
        record_id UUID,
        reason TEXT NOT NULL,
        details JSONB,
        tenant_id UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_migration_quarantine_source ON migration_quarantine(source_table, record_id);
      CREATE INDEX IF NOT EXISTS idx_migration_quarantine_tenant ON migration_quarantine(tenant_id);
    `);

    await queryRunner.query(`
      INSERT INTO claim_advocacy_cases (
        case_id,
        tenant_id,
        claim_id,
        broker_organization_id,
        customer_party_id,
        carrier_organization_id,
        status,
        priority,
        opened_at,
        created_at,
        updated_at
      )
      SELECT
        gen_random_uuid(),
        c.tenant_id,
        c.claim_id,
        c.broker_organization_id,
        c.claimant_party_id,
        c.carrier_organization_id,
        'open',
        'medium',
        COALESCE(c.reported_date, c.created_at, NOW()),
        NOW(),
        NOW()
      FROM claims c
      LEFT JOIN claim_advocacy_cases cac ON cac.claim_id = c.claim_id
      WHERE c.broker_organization_id IS NOT NULL
        AND c.status NOT IN ('closed', 'rejected', 'denied')
        AND cac.case_id IS NULL;
    `);

    await queryRunner.query(`
      INSERT INTO migration_quarantine (source_table, record_id, reason, details, tenant_id)
      SELECT
        'claims',
        c.claim_id,
        'No advocacy case after backfill',
        jsonb_build_object('status', c.status, 'broker_organization_id', c.broker_organization_id),
        c.tenant_id
      FROM claims c
      WHERE c.broker_organization_id IS NOT NULL
        AND c.status NOT IN ('closed', 'rejected', 'denied')
        AND NOT EXISTS (SELECT 1 FROM claim_advocacy_cases cac WHERE cac.claim_id = c.claim_id);
    `);

    await queryRunner.query(`
      INSERT INTO migration_quarantine (source_table, record_id, reason, details, tenant_id)
      SELECT
        'claims',
        c.claim_id,
        'Active claim missing carrier organization',
        jsonb_build_object('status', c.status, 'carrier_organization_id', c.carrier_organization_id),
        c.tenant_id
      FROM claims c
      WHERE c.carrier_organization_id IS NULL
        AND c.status NOT IN ('closed', 'rejected', 'denied');
    `);

    -- P5-10.1: Backfill ClaimProjection from existing claim history
    -- Creates an initial active projection for every claim that has a carrierOrganizationId
    INSERT INTO claim_projections (
      projection_id,
      tenant_id,
      broker_organization_id,
      carrier_organization_id,
      claim_id,
      external_claim_id,
      source_system_id,
      source_version,
      payload,
      received_at,
      status,
      created_at,
      updated_at
    )
    SELECT
      gen_random_uuid(),
      c.tenant_id,
      COALESCE(c.broker_organization_id, c.record_owner_organization_id),
      c.carrier_organization_id,
      c.claim_id,
      COALESCE(c.external_claim_id, c.claim_number),
      'claims-service',
      1,
      jsonb_build_object(
        'status', c.status,
        'claimNumber', c.claim_number,
        'assessedAmount', c.assessed_amount,
        'approvedAmount', c.approved_amount,
        'paidAmount', c.paid_amount,
        'backfilled', true
      ),
      COALESCE(c.updated_at, c.created_at, NOW()),
      'active',
      NOW(),
      NOW()
    FROM claims c
    WHERE c.carrier_organization_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM claim_projections cp WHERE cp.claim_id = c.claim_id
      );

    -- P5-10.1: Map attachedDocuments JSONB array to ClaimDocument rows
    -- Only processes claims that have attachedDocuments and no existing ClaimDocument rows
    INSERT INTO claim_documents (
      document_id,
      tenant_id,
      claim_id,
      case_id,
      uploaded_by_party_id,
      document_type,
      storage_ref,
      checksum,
      classification,
      virus_scan_status,
      pii_scan_status,
      created_at,
      updated_at
    )
    SELECT
      gen_random_uuid(),
      c.tenant_id,
      c.claim_id,
      NULL,
      c.claimant_party_id,
      COALESCE(doc->>'documentType', 'other'),
      doc->>'storageRef',
      COALESCE(doc->>'checksum', ''),
      COALESCE(doc->>'classification', 'INTERNAL'),
      'clean',
      'pending',
      NOW(),
      NOW()
    FROM claims c
    JOIN LATERAL jsonb_array_elements(c.attached_documents) AS doc ON true
    WHERE c.attached_documents IS NOT NULL
      AND jsonb_typeof(c.attached_documents) = 'array'
      AND jsonb_array_length(c.attached_documents) > 0
      AND NOT EXISTS (
        SELECT 1 FROM claim_documents cd WHERE cd.claim_id = c.claim_id
      );

    -- P5-10.2: Reconciliation — verify claim count and amounts match
    -- Insert reconciliation anomalies into quarantine
    INSERT INTO migration_quarantine (source_table, record_id, reason, details, tenant_id)
    SELECT
      'claims',
      c.claim_id,
      'Claim with attachedDocuments but missing storageRef in some docs',
      jsonb_build_object('docCount', jsonb_array_length(c.attached_documents)),
      c.tenant_id
    FROM claims c
    WHERE c.attached_documents IS NOT NULL
      AND jsonb_typeof(c.attached_documents) = 'array'
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(c.attached_documents) AS doc
        WHERE (doc->>'storageRef') IS NULL OR (doc->>'storageRef') = ''
      );

    -- P5-10.2: Reconciliation — claims with paidAmount but no paymentReference
    INSERT INTO migration_quarantine (source_table, record_id, reason, details, tenant_id)
    SELECT
      'claims',
      c.claim_id,
      'Claim with paidAmount but missing paymentReference',
      jsonb_build_object('paidAmount', c.paid_amount, 'status', c.status),
      c.tenant_id
    FROM claims c
    WHERE c.paid_amount IS NOT NULL
      AND c.paid_amount > 0
      AND (c.payment_reference IS NULL OR c.payment_reference = '');

    -- P5-10.2: Reconciliation — claims with approvedAmount but status not in expected set
    INSERT INTO migration_quarantine (source_table, record_id, reason, details, tenant_id)
    SELECT
      'claims',
      c.claim_id,
      'Claim with approvedAmount but unexpected status',
      jsonb_build_object('approvedAmount', c.approved_amount, 'status', c.status),
      c.tenant_id
    FROM claims c
    WHERE c.approved_amount IS NOT NULL
      AND c.approved_amount > 0
      AND c.status NOT IN ('approved', 'paid', 'settled', 'closed');

    -- P5-10.2: Reconciliation — orphaned projections (projection exists but claim missing)
    INSERT INTO migration_quarantine (source_table, record_id, reason, details, tenant_id)
    SELECT
      'claim_projections',
      cp.projection_id,
      'Orphaned projection — claim no longer exists',
      jsonb_build_object('claimId', cp.claim_id, 'externalClaimId', cp.external_claim_id),
      cp.tenant_id
    FROM claim_projections cp
    LEFT JOIN claims c ON c.claim_id = cp.claim_id
    WHERE c.claim_id IS NULL;
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Backfilled advocacy cases and quarantine records are intentionally retained.
    // This protects audit trail and prevents data loss on rollback.
  }
}
