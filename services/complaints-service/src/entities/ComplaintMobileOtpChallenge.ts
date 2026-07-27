import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type ComplaintMobileOtpChallengeStatus = 'sent' | 'verified' | 'expired' | 'locked';

@Entity('complaint_mobile_otp_challenges')
@Index(['complaintId', 'createdAt'])
@Index(['mobile', 'createdAt'])
@Index(['status', 'expiresAt'])
export class ComplaintMobileOtpChallenge {
  @PrimaryGeneratedColumn('uuid', { name: 'challenge_id' })
  challengeId!: string;

  @Column({ name: 'complaint_id', type: 'uuid' })
  complaintId!: string;

  @Column({ name: 'mobile', type: 'text' })
  mobile!: string;

  @Column({ name: 'code_hash', type: 'text' })
  codeHash!: string;

  @Column({ name: 'code_salt', type: 'text' })
  codeSalt!: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'status', type: 'text', default: 'sent' })
  status!: ComplaintMobileOtpChallengeStatus;

  @Column({ name: 'attempts', type: 'int', default: 0 })
  attempts!: number;

  @Column({ name: 'max_attempts', type: 'int', default: 5 })
  maxAttempts!: number;

  @Column({ name: 'last_attempt_at', type: 'timestamptz', nullable: true })
  lastAttemptAt!: Date | null;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt!: Date | null;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt!: Date | null;

  @Column({ name: 'requested_by', type: 'text', nullable: true })
  requestedBy!: string | null;

  @Column({ name: 'verified_by', type: 'text', nullable: true })
  verifiedBy!: string | null;

  @Column({ name: 'correlation_id', type: 'text', nullable: true })
  correlationId!: string | null;

  @Column({ name: 'tenant_id', type: 'text', nullable: true })
  tenantId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
