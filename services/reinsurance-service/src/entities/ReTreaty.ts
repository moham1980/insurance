import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type ReTreatyStatus = 'draft' | 'active' | 'closed';

@Entity('re_treaties')
@Index(['status', 'createdAt'])
@Index(['treatyNumber'])
@Index(['reinsurerName'])
export class ReTreaty {
  @PrimaryGeneratedColumn('uuid', { name: 'treaty_id' })
  treatyId!: string;

  @Column({ name: 'treaty_number', type: 'text' })
  treatyNumber!: string;

  @Column({ name: 'reinsurer_name', type: 'text' })
  reinsurerName!: string;

  @Column({ name: 'treaty_type', type: 'text' })
  treatyType!: 'proportional' | 'non_proportional';

  @Column({ name: 'status', type: 'text', default: 'draft' })
  status!: ReTreatyStatus;

  @Column({ name: 'retention_rate', type: 'numeric', nullable: true })
  retentionRate!: string | null;

  @Column({ name: 'cession_rate', type: 'numeric', nullable: true })
  cessionRate!: string | null;

  @Column({ name: 'config', type: 'jsonb', nullable: true })
  config!: any | null;

  @Column({ name: 'effective_from', type: 'date' })
  effectiveFrom!: string;

  @Column({ name: 'effective_to', type: 'date', nullable: true })
  effectiveTo!: string | null;

  @Column({ name: 'currency', type: 'text', default: 'IRR' })
  currency!: string;

  @Column({ name: 'terms', type: 'jsonb', nullable: true })
  terms!: any | null;

  @Column({ name: 'created_by', type: 'text', nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
