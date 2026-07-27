import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'feature_flags' })
export class FeatureFlag {
  @PrimaryGeneratedColumn('uuid', { name: 'feature_flag_id' })
  featureFlagId!: string;

  @Column({ type: 'text', unique: true })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'boolean', name: 'is_enabled', default: false })
  isEnabled!: boolean;

  @Column({ type: 'integer', name: 'rollout_percentage', default: 0 })
  rolloutPercentage!: number;

  @Column({ type: 'jsonb', name: 'target_audience', nullable: true })
  targetAudience!: Record<string, any> | null;

  @Column({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @Column({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
