import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('warehouse_fire_inquiry_record')
export class WarehouseFireInquiryRecord {
  @PrimaryGeneratedColumn('uuid')
  recordId: string;

  @Column({ type: 'uuid', nullable: true })
  inquiryId: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  warehouseId: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  nationalId: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  licenseNumber: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  province: string | null;

  @Column({ type: 'varchar', length: 50 })
  inquiryType: string;

  @Column({ type: 'boolean' })
  success: boolean;

  @Column({ type: 'jsonb', nullable: true })
  responseJson: Record<string, any> | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  tenantId: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  actorUserId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  @Index()
  createdAt: Date;
}
