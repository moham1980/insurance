import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('aml_alert_decisions')
@Index(['alertId', 'createdAt'])
@Index(['decidedBy', 'createdAt'])
export class AmlAlertDecision {
  @PrimaryGeneratedColumn('uuid', { name: 'decision_id' })
  decisionId!: string;

  @Column({ name: 'alert_id', type: 'uuid' })
  alertId!: string;

  @Column({ name: 'from_status', type: 'text' })
  fromStatus!: string;

  @Column({ name: 'to_status', type: 'text' })
  toStatus!: string;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'snapshot', type: 'jsonb', nullable: true })
  snapshot!: any | null;

  @Column({ name: 'decided_by', type: 'text', nullable: true })
  decidedBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
