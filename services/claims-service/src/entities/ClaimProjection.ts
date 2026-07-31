import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn, VersionColumn } from 'typeorm';

export type ClaimProjectionStatus = 'active' | 'superseded' | 'revoked';

@Entity('claim_projections')
@Index(['claimId'])
@Index(['externalClaimId'])
@Index(['carrierOrganizationId'])
@Index(['brokerOrganizationId'])
@Index(['tenantId'])
@Index(['sourceSystemId', 'sourceVersion'])
export class ClaimProjection {
  @PrimaryGeneratedColumn('uuid', { name: 'projection_id' })
  projectionId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'broker_organization_id', type: 'uuid' })
  brokerOrganizationId: string;

  @Column({ name: 'carrier_organization_id', type: 'uuid' })
  carrierOrganizationId: string;

  @Column({ name: 'claim_id', type: 'uuid' })
  claimId: string;

  @Column({ name: 'external_claim_id', type: 'text' })
  externalClaimId: string;

  @Column({ name: 'source_system_id', type: 'text' })
  sourceSystemId: string;

  @VersionColumn({ name: 'source_version', type: 'int', default: 1 })
  sourceVersion: number;

  @Column({ name: 'payload', type: 'jsonb' })
  payload: Record<string, any>;

  @Column({ name: 'received_at', type: 'timestamptz' })
  receivedAt: Date;

  @Column({ name: 'status', type: 'text', default: 'active' })
  status: ClaimProjectionStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
