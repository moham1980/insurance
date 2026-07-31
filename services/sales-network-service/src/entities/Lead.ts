import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
export type LeadPriority = 'high' | 'medium' | 'low';

@Entity('sales_leads')
@Index(['tenantId'])
@Index(['agentId'])
@Index(['partnerId'])
@Index(['status'])
export class Lead {
  @PrimaryGeneratedColumn('uuid', { name: 'lead_id' })
  leadId!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'agent_id', type: 'uuid', nullable: true })
  agentId!: string | null;

  @Column({ name: 'partner_id', type: 'uuid' })
  partnerId!: string;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId!: string | null;

  @Column({ name: 'customer_name', type: 'text' })
  customerName!: string;

  @Column({ name: 'phone', type: 'text' })
  phone!: string;

  @Column({ name: 'email', type: 'text', nullable: true })
  email!: string | null;

  @Column({ name: 'product_interest', type: 'text' })
  productInterest!: string;

  @Column({ name: 'status', type: 'text', default: 'new' })
  status!: LeadStatus;

  @Column({ name: 'priority', type: 'text', default: 'medium' })
  priority!: LeadPriority;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'assigned_to', type: 'uuid', nullable: true })
  assignedTo!: string | null;

  @Column({ name: 'converted_submission_id', type: 'uuid', nullable: true })
  convertedSubmissionId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
