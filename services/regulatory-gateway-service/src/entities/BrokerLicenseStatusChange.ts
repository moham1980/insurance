import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('broker_license_status_change')
export class BrokerLicenseStatusChange {
  @PrimaryGeneratedColumn('uuid')
  changeId: string;

  @Column({ type: 'varchar', length: 50 })
  @Index()
  brokerCentralCode: string;

  @Column({ type: 'varchar', length: 100 })
  licenseNumber: string;

  @Column({ type: 'varchar', length: 20 })
  previousStatus: string;

  @Column({ type: 'varchar', length: 20 })
  newStatus: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  reason: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  source: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  expiryDate: Date | null;

  @Column({ type: 'boolean', default: false })
  authServiceNotified: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  authServiceNotifiedAt: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  @Index()
  createdAt: Date;
}
