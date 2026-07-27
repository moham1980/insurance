import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, BeforeUpdate, BeforeRemove } from 'typeorm';

@Entity('access_audit')
@Index(['userId'])
@Index(['resourceType'])
@Index(['action'])
@Index(['decision'])
@Index(['timestamp'])
export class AccessAudit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'username', nullable: true })
  username: string;

  @Column({ type: 'simple-array', nullable: true })
  roles: string[];

  @Column({ name: 'org_unit_id', nullable: true })
  orgUnitId: string;

  @Column({ name: 'resource_type' })
  resourceType: string;

  @Column({ name: 'resource_id', nullable: true })
  resourceId: string;

  @Column({ name: 'resource_owner', nullable: true })
  resourceOwner: string;

  @Column({ name: 'resource_org_unit_id', nullable: true })
  resourceOrgUnitId: string;

  @Column({ name: 'tenant_id', nullable: true })
  tenantId: string;

  @Column()
  action: string;

  @Column()
  decision: 'allow' | 'deny';

  @Column({ name: 'decision_reason', nullable: true })
  decisionReason: string;

  @Column({ name: 'policy_id', nullable: true })
  policyId: string;

  @Column({ name: 'policy_name', nullable: true })
  policyName: string;

  @Column({ type: 'json', nullable: true })
  context: Record<string, any>;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', nullable: true })
  userAgent: string;

  @Column({ name: 'location', nullable: true })
  location: string;

  @CreateDateColumn({ name: 'timestamp' })
  timestamp: Date;

  @BeforeUpdate()
  preventUpdate() {
    throw new Error('AccessAudit records are immutable and cannot be updated');
  }

  @BeforeRemove()
  preventRemove() {
    throw new Error('AccessAudit records are immutable and cannot be deleted');
  }
}
