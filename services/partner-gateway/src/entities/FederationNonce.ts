import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type NonceStatus = 'active' | 'used' | 'expired';

@Entity('federation_nonces')
@Index(['nonce'], { unique: true })
@Index(['expiresAt'])
export class FederationNonce {
  @PrimaryGeneratedColumn('uuid', { name: 'nonce_id' })
  nonceId!: string;

  @Column({ name: 'nonce', type: 'text', unique: true })
  nonce!: string;

  @Column({ name: 'partner_id', type: 'text' })
  partnerId!: string;

  @Column({ name: 'request_hash', type: 'text' })
  requestHash!: string;

  @Column({ name: 'status', type: 'text', default: 'active' })
  status!: NonceStatus;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
