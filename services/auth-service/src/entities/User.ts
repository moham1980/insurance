import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { piiFieldTransformer } from '../utils/field-encryption';

@Entity('users')
@Index(['email'], { unique: true })
@Index(['username'], { unique: true })
@Index(['orgUnitId'])
export class User {
  @PrimaryGeneratedColumn('uuid', { name: 'user_id' })
  userId: string;

  @Column({ name: 'email', type: 'text', unique: true })
  email: string;

  @Column({ name: 'username', type: 'text', unique: true })
  username: string;

  @Column({ name: 'password_hash', type: 'text' })
  passwordHash: string;

  @Column({ name: 'first_name', type: 'text' })
  firstName: string;

  @Column({ name: 'last_name', type: 'text' })
  lastName: string;

  @Column({ name: 'roles', type: 'text', array: true, default: () => "ARRAY['user']::text[]" })
  roles: string[];

  @Column({ name: 'department', type: 'text', nullable: true })
  department: string | null;

  @Column({ name: 'org_unit_id', type: 'uuid', nullable: true })
  orgUnitId: string | null;

  @Column({ name: 'position_title', type: 'text', nullable: true })
  positionTitle: string | null;

  @Column({
    name: 'national_id',
    type: 'text',
    nullable: true,
    transformer: piiFieldTransformer,
  })
  nationalId: string | null;

  @Column({ name: 'global_user_id', type: 'text', nullable: true })
  globalUserId: string | null;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId: string | null;

  @Index()
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
