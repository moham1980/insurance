import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('federated_identities')
@Index('idx_fed_user_provider', ['userId', 'providerId'])
@Index('idx_fed_provider_user', ['providerId', 'providerUserId'])
export class FederatedIdentity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 100, name: 'provider_id' })
  providerId: string;

  @Column({ type: 'varchar', length: 255, name: 'provider_user_id' })
  providerUserId: string;

  @Column({ type: 'jsonb', name: 'attributes', nullable: true })
  attributes: Record<string, any> | null;

  @CreateDateColumn({ name: 'linked_at' })
  linkedAt: Date;

  @Column({ type: 'timestamp', name: 'last_used_at', nullable: true })
  lastUsedAt: Date | null;
}
