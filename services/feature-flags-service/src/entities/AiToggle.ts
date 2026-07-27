import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'ai_toggles' })
export class AiToggle {
  @PrimaryGeneratedColumn('uuid', { name: 'ai_toggle_id' })
  aiToggleId!: string;

  @Column({ type: 'text', unique: true })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'boolean', name: 'is_enabled', default: false })
  isEnabled!: boolean;

  @Column({ type: 'text', name: 'model_name', nullable: true })
  modelName!: string | null;

  @Column({ type: 'text', name: 'model_version', nullable: true })
  modelVersion!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  config!: Record<string, any> | null;

  @Column({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @Column({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
