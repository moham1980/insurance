import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('rm_ri_borderaux')
@Index(['contractId', 'updatedAt'])
@Index(['periodStart', 'periodEnd'])
export class RmRiBorderaux {
  @Column({ type: 'uuid', name: 'tenant_id', nullable: true })
  tenantId?: string | null;

  @PrimaryColumn({ name: 'borderaux_id', type: 'uuid' })
  borderauxId: string;

  @Column({ name: 'contract_id', type: 'uuid' })
  contractId: string;

  @Column({ name: 'period_start', type: 'timestamptz' })
  periodStart: Date;

  @Column({ name: 'period_end', type: 'timestamptz' })
  periodEnd: Date;

  @Column({ name: 'items_count', type: 'int' })
  itemsCount: number;

  @Column({ name: 'document_id', type: 'text', nullable: true })
  documentId: string | null;

  @Column({ name: 'occurred_at', type: 'timestamptz', nullable: true })
  occurredAt: Date | null;

  @Column({ name: 'last_event_id', type: 'uuid', nullable: true })
  lastEventId: string | null;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'NOW()' })
  updatedAt: Date;
}
