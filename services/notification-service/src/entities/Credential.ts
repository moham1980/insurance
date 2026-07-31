import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum CredentialType {
  API_KEY = 'api_key',
  API_SECRET = 'api_secret',
  AUTH_TOKEN = 'auth_token',
  USERNAME_PASSWORD = 'username_password',
  WEBHOOK_SECRET = 'webhook_secret',
}

export enum CredentialProvider {
  KAVENEGAR = 'kavenegar',
  TWILIO = 'twilio',
  MELLIPAYAMAK = 'mellipayamak',
  SENDGRID = 'sendgrid',
  AWS_SES = 'aws_ses',
  FCM = 'fcm',
  APNS = 'apns',
}

@Entity('credentials')
@Index(['tenantId'])
@Index(['tenantId', 'provider', 'credentialType'])
export class Credential {
  @PrimaryGeneratedColumn('uuid', { name: 'credential_id' })
  credentialId: string;

  @Column({ name: 'tenant_id', type: 'text' })
  tenantId: string;

  @Column({ name: 'provider', type: 'enum', enum: CredentialProvider })
  provider: CredentialProvider;

  @Column({ name: 'credential_type', type: 'enum', enum: CredentialType })
  credentialType: CredentialType;

  @Column({ name: 'encrypted_value', type: 'text' })
  encryptedValue: string;

  @Column({ name: 'masked_value', type: 'text' })
  maskedValue: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
