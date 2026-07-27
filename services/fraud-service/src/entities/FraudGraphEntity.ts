import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum EntityType {
  PERSON = 'person',
  CLAIM = 'claim',
  POLICY = 'policy',
  VEHICLE = 'vehicle',
  ADDRESS = 'address',
  PHONE = 'phone',
  EMAIL = 'email',
  BANK_ACCOUNT = 'bank_account',
  ORGANIZATION = 'organization',
}

@Entity('fraud_graph_entities')
@Index(['tenantId', 'entityType'])
@Index(['tenantId', 'entityId'])
export class FraudGraphEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  tenantId!: string | null;

  @Column({ type: 'varchar', length: 50 })
  entityType!: EntityType;

  @Column({ type: 'varchar', length: 100 })
  entityId!: string; // e.g., person nationalId, claim ID, policy number

  @Column({ type: 'varchar', length: 100 })
  entityName!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  attributes!: Record<string, any> | null;

  @Column({ type: 'integer', default: 0 })
  connectionCount!: number;

  @Column({ type: 'integer', default: 0 })
  fraudCaseCount!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  riskScore!: number;

  @Column({ type: 'boolean', default: false })
  isHighRisk!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastActivityAt!: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
