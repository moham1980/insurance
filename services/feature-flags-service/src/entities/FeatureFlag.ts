import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// P2 #9: A/B testing variant types
export type VariantType = 'boolean' | 'percentage' | 'variant';

export interface Variant {
  name: string;
  weight: number;
  payload?: any;
}

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

  // P2 #9: A/B testing fields
  /** Determines how the flag is evaluated: boolean (on/off), percentage (rollout), or variant (A/B). */
  @Column({ type: 'text', name: 'variant_type', default: 'boolean' })
  variantType!: VariantType;

  /** Array of {name, weight, payload} for variant-based A/B testing. */
  @Column({ type: 'jsonb', name: 'variants', nullable: true })
  variants!: Variant[] | null;

  @Column({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @Column({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
