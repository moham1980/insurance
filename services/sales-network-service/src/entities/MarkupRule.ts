import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('markup_rules')
@Index(['agreementId'])
export class MarkupRule {
  @PrimaryGeneratedColumn('uuid', { name: 'markup_rule_id' })
  markupRuleId!: string;

  @Column({ name: 'agreement_id', type: 'uuid' })
  agreementId!: string;

  @Column({ name: 'name', type: 'text' })
  name!: string;

  @Column({ name: 'line_of_business', type: 'text', nullable: true })
  lineOfBusiness!: string | null;

  @Column({ name: 'premium_from_minor', type: 'numeric', nullable: true })
  premiumFromMinor!: string | null;

  @Column({ name: 'premium_to_minor', type: 'numeric', nullable: true })
  premiumToMinor!: string | null;

  @Column({ name: 'markup_amount_minor', type: 'numeric', nullable: true })
  markupAmountMinor!: string | null;

  @Column({ name: 'markup_rate_bp', type: 'int', nullable: true })
  markupRateBp!: number | null;

  @Column({ name: 'currency', type: 'text' })
  currency!: string;

  @Column({ name: 'rules', type: 'jsonb', default: '{}' })
  rules!: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
