import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type ComplaintSlaBreachType = 'resolution';

@Entity('complaint_sla_breaches')
@Index(['complaintId', 'breachType'], { unique: true })
@Index(['breachedAt'])
export class ComplaintSlaBreach {
  @PrimaryGeneratedColumn('uuid', { name: 'breach_id' })
  breachId!: string;

  @Column({ name: 'complaint_id', type: 'uuid' })
  complaintId!: string;

  @Column({ name: 'breach_type', type: 'text' })
  breachType!: ComplaintSlaBreachType;

  @Column({ name: 'sla_due_at', type: 'timestamptz' })
  slaDueAt!: Date;

  @Column({ name: 'breached_at', type: 'timestamptz' })
  breachedAt!: Date;

  @Column({ name: 'sla_hours', type: 'int', nullable: true })
  slaHours!: number | null;

  @Column({ name: 'elapsed_hours', type: 'int' })
  elapsedHours!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
