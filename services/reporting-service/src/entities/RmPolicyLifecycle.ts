import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('rm_policy_lifecycle')
@Index(['updatedAt'])
export class RmPolicyLifecycle {
  @PrimaryColumn({ name: 'policy_id', type: 'uuid' })
  policyId!: string;

  @Column({ name: 'policy_number', type: 'text', nullable: true })
  policyNumber!: string | null;

  @Column({ name: 'quoted_at', type: 'timestamptz', nullable: true })
  quotedAt!: Date | null;

  @Column({ name: 'docs_submitted_at', type: 'timestamptz', nullable: true })
  docsSubmittedAt!: Date | null;

  @Column({ name: 'risk_assessed_at', type: 'timestamptz', nullable: true })
  riskAssessedAt!: Date | null;

  @Column({ name: 'issued_at', type: 'timestamptz', nullable: true })
  issuedAt!: Date | null;

  @Column({ name: 'unique_code_set_at', type: 'timestamptz', nullable: true })
  uniqueCodeSetAt!: Date | null;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'NOW()' })
  updatedAt!: Date;
}
