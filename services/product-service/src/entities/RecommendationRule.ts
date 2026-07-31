import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'recommendation_rules' })
@Index(['offeringId'])
export class RecommendationRule {
  @PrimaryColumn('uuid', { name: 'rule_id' })
  ruleId!: string;

  @Column('uuid', { name: 'tenant_id' })
  tenantId!: string;

  @Column('uuid', { name: 'offering_id' })
  offeringId!: string;

  @Column({ name: 'priority', type: 'int' })
  priority!: number;

  @Column({ name: 'criteria', type: 'jsonb' })
  criteria!: Record<string, any>;

  @Column({ name: 'rank_weight', type: 'jsonb' })
  rankWeight!: Record<string, number>;

  @Column({ name: 'reason_code', type: 'varchar', length: 128 })
  reasonCode!: string;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
