import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('endorsement_changes')
@Index(['endorsementId', 'field'])
export class EndorsementChange {
  @PrimaryGeneratedColumn('uuid', { name: 'change_id' })
  changeId!: string;

  @Column({ name: 'tenant_id', type: 'text', nullable: true })
  tenantId!: string | null;

  @Column({ name: 'endorsement_id', type: 'uuid' })
  endorsementId!: string;

  @Column({ name: 'field', type: 'text' })
  field!: string;

  @Column({ name: 'old_value', type: 'jsonb', nullable: true })
  oldValue!: any;

  @Column({ name: 'new_value', type: 'jsonb', nullable: true })
  newValue!: any;

  @Column({ name: 'reason', type: 'text', nullable: true })
  reason!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
