import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum RelationshipType {
  CLAIMANT = 'claimant',
  INSURED = 'insured',
  BENEFICIARY = 'beneficiary',
  WITNESS = 'witness',
  DRIVER = 'driver',
  OWNER = 'owner',
  POLICYHOLDER = 'policyholder',
  AGENT = 'agent',
  ADJUSTER = 'adjuster',
  SAME_ADDRESS = 'same_address',
  SAME_PHONE = 'same_phone',
  SAME_EMAIL = 'same_email',
  SAME_BANK_ACCOUNT = 'same_bank_account',
  RELATED_PARTY = 'related_party',
  FAMILY_MEMBER = 'family_member',
  BUSINESS_ASSOCIATE = 'business_associate',
}

@Entity('fraud_graph_relationships')
@Index(['tenantId', 'sourceEntityId'])
@Index(['tenantId', 'targetEntityId'])
@Index(['tenantId', 'relationshipType'])
export class FraudGraphRelationship {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  tenantId!: string | null;

  @Column({ type: 'uuid' })
  sourceEntityId!: string;

  @Column({ type: 'uuid' })
  targetEntityId!: string;

  @Column({ type: 'enum', enum: RelationshipType })
  relationshipType!: RelationshipType;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  weight!: number | null;

  @Column({ type: 'integer', default: 0 })
  interactionCount!: number;

  @Column({ type: 'timestamp', nullable: true })
  firstInteractionAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  lastInteractionAt!: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  attributes!: Record<string, any> | null;

  @Column({ type: 'boolean', default: false })
  isSuspicious!: boolean;

  @Column({ type: 'text', nullable: true })
  suspicionReason!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
