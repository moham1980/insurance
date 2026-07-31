import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('policy_parties')
@Index(['policyId', 'role'])
export class PolicyParty {
  @PrimaryGeneratedColumn('uuid', { name: 'policy_party_id' })
  policyPartyId!: string;

  @Column({ name: 'tenant_id', type: 'text', nullable: true })
  tenantId!: string | null;

  @Column({ name: 'policy_id', type: 'uuid' })
  policyId!: string;

  @Column({ name: 'party_id', type: 'uuid' })
  partyId!: string;

  @Column({ name: 'role', type: 'text' })
  role!: 'INSURED' | 'BENEFICIARY' | 'PAYER' | 'BROKER' | 'AGENT' | 'CLAIMANT';

  @Column({ name: 'allocation', type: 'numeric', default: 0 })
  allocation!: number;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
