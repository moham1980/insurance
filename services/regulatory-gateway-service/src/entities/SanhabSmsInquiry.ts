import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type SmsInquiryType = 'NATIONAL_ID_UNIQUE_CODE' | 'POLICY_NUMBER' | 'VIN';

export type SmsInquiryStatus = 'pending' | 'completed' | 'cancelled';

@Entity('sanhab_sms_inquiries')
@Index(['phoneNumber', 'status'])
@Index(['status', 'createdAt'])
export class SanhabSmsInquiry {
  @PrimaryGeneratedColumn('uuid', { name: 'inquiry_id' })
  inquiryId!: string;

  @Column({ name: 'phone_number', type: 'text' })
  phoneNumber!: string;

  @Column({ name: 'inquiry_type', type: 'text' })
  inquiryType!: SmsInquiryType;

  @Column({ name: 'national_id', type: 'text', nullable: true })
  nationalId!: string | null;

  @Column({ name: 'unique_code', type: 'text', nullable: true })
  uniqueCode!: string | null;

  @Column({ name: 'policy_number', type: 'text', nullable: true })
  policyNumber!: string | null;

  @Column({ name: 'vin', type: 'text', nullable: true })
  vin!: string | null;

  @Column({ name: 'status', type: 'text', default: 'pending' })
  status!: SmsInquiryStatus;

  @Column({ name: 'result_json', type: 'jsonb', nullable: true })
  resultJson!: object | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
