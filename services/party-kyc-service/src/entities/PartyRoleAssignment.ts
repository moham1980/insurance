import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type PartyRoleType = 'CUSTOMER' | 'INSURED' | 'BENEFICIARY' | 'BROKER' | 'AGENT' | 'SUB_AGENT' | 'MARKETER' | 'LOSS_ADJUSTER' | 'CLAIMANT' | 'PAYER';

@Entity('party_role_assignments')
@Index(['partyId', 'organizationId', 'tenantId', 'roleType'])
@Index(['organizationId', 'tenantId', 'roleType', 'status'])
export class PartyRoleAssignment {
  @PrimaryGeneratedColumn('uuid', { name: 'assignment_id' })
  assignmentId!: string;

  @Column({ name: 'party_id', type: 'uuid' })
  partyId!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'tenant_id', type: 'text' })
  tenantId!: string;

  @Column({ name: 'role_type', type: 'text' })
  roleType!: PartyRoleType;

  @Column({ name: 'scope', type: 'text', array: true, default: () => "ARRAY[]::text[]" })
  scope!: string[];

  @Column({ name: 'valid_from', type: 'timestamptz' })
  validFrom!: Date;

  @Column({ name: 'valid_to', type: 'timestamptz', nullable: true })
  validTo!: Date | null;

  @Column({ name: 'status', type: 'text', default: 'active' })
  status!: 'active' | 'revoked';

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
