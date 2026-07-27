import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('auto_deposit_config')
export class AutoDepositConfig {
  @PrimaryColumn({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'boolean', default: false })
  enabled!: boolean;

  @Column({ type: 'int', default: 30 })
  checkIntervalMinutes!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 1000 })
  toleranceAmount!: number;

  @Column({ type: 'boolean', default: false })
  requireExactMatch!: boolean;

  @Column({ type: 'boolean', default: false })
  autoApproveHighConfidence!: boolean;

  @Column({ type: 'text', array: true, nullable: true })
  bankProviders!: string[] | null;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
