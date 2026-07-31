import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type AdvocacyCaseStatus = 'open' | 'waiting_carrier' | 'adjuster_review' | 'escalated' | 'resolved' | 'closed';
export type AdvocacyPriority = 'low' | 'medium' | 'high' | 'urgent';

@Entity('claim_advocacy_cases')
@Index(['claimId'])
@Index(['brokerOrganizationId'])
@Index(['customerPartyId'])
@Index(['tenantId'])
@Index(['status'])
export class ClaimAdvocacyCase {
  @PrimaryGeneratedColumn('uuid', { name: 'case_id' })
  caseId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'broker_organization_id', type: 'uuid' })
  brokerOrganizationId: string;

  @Column({ name: 'claim_id', type: 'uuid' })
  claimId: string;

  @Column({ name: 'customer_party_id', type: 'uuid' })
  customerPartyId: string;

  @Column({ name: 'carrier_organization_id', type: 'uuid' })
  carrierOrganizationId: string;

  @Column({ name: 'status', type: 'text', default: 'open' })
  status: AdvocacyCaseStatus;

  @Column({ name: 'priority', type: 'text', default: 'medium' })
  priority: AdvocacyPriority;

  @Column({ name: 'assigned_party_id', type: 'uuid', nullable: true })
  assignedPartyId: string | null;

  @Column({ name: 'escalation_reason', type: 'text', nullable: true })
  escalationReason: string | null;

  @Column({ name: 'opened_at', type: 'timestamptz' })
  openedAt: Date;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt: Date | null;

  @Column({ name: 'case_metadata', type: 'jsonb', nullable: true })
  caseMetadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
