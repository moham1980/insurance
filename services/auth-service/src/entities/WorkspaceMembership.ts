import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('workspace_memberships')
@Index(['workspaceId'])
@Index(['partyId'])
@Index(['workspaceId', 'partyId'], { unique: true })
export class WorkspaceMembership {
  @PrimaryGeneratedColumn('uuid', { name: 'membership_id' })
  membershipId!: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId!: string;

  @Column({ name: 'party_id', type: 'uuid' })
  partyId!: string;

  @Column({ name: 'role', type: 'text' })
  role!: string;

  @Column({ name: 'granted_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  grantedAt!: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
