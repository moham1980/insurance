import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('metrics')
@Index(['serviceName', 'metricName', 'timestamp'])
export class Metric {
  @PrimaryGeneratedColumn('uuid', { name: 'metric_id' })
  metricId!: string;

  @Column({ name: 'service_name', type: 'text' })
  serviceName!: string;

  @Column({ name: 'metric_name', type: 'text' })
  metricName!: string;

  @Column({ name: 'metric_type', type: 'text' })
  metricType!: 'counter' | 'gauge' | 'histogram';

  @Column({ name: 'value', type: 'numeric' })
  value!: number;

  @Column({ name: 'labels', type: 'jsonb', nullable: true })
  labels!: Record<string, string> | null;

  @Column({ name: 'timestamp', type: 'timestamptz', default: () => 'NOW()' })
  timestamp!: Date;
}

@Entity('slos')
@Index(['serviceName', 'sloName'])
export class SLO {
  @PrimaryGeneratedColumn('uuid', { name: 'slo_id' })
  sloId!: string;

  @Column({ name: 'service_name', type: 'text' })
  serviceName!: string;

  @Column({ name: 'slo_name', type: 'text' })
  sloName!: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'target', type: 'numeric' })
  target!: number; // e.g., 0.99 for 99%

  @Column({ name: 'window', type: 'text' })
  window!: string; // e.g., '30d', '7d'

  @Column({ name: 'current_value', type: 'numeric', nullable: true })
  currentValue!: number | null;

  @Column({ name: 'status', type: 'text', default: 'healthy' })
  status!: 'healthy' | 'at_risk' | 'breached';

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'NOW()' })
  updatedAt!: Date;
}

@Entity('alerts')
@Index(['status', 'severity'])
@Index(['createdAt'])
export class Alert {
  @PrimaryGeneratedColumn('uuid', { name: 'alert_id' })
  alertId!: string;

  @Column({ name: 'slo_id', type: 'uuid', nullable: true })
  sloId!: string | null;

  @Column({ name: 'service_name', type: 'text' })
  serviceName!: string;

  @Column({ name: 'alert_name', type: 'text' })
  alertName!: string;

  @Column({ name: 'description', type: 'text' })
  description!: string;

  @Column({ name: 'severity', type: 'text' })
  severity!: 'critical' | 'warning' | 'info';

  @Column({ name: 'status', type: 'text', default: 'firing' })
  status!: 'firing' | 'acknowledged' | 'resolved';

  @Column({ name: 'value', type: 'numeric' })
  value!: number;

  @Column({ name: 'threshold', type: 'numeric' })
  threshold!: number;

  @Column({ name: 'acknowledged_by', type: 'text', nullable: true })
  acknowledgedBy!: string | null;

  @Column({ name: 'acknowledged_at', type: 'timestamptz', nullable: true })
  acknowledgedAt!: Date | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt!: Date | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date;
}

// P2 #8: AlertSilence entity for silencing alerts during maintenance windows.
@Entity('alert_silences')
@Index(['tenantId', 'alertName'])
@Index(['silenceUntil'])
export class AlertSilence {
  @PrimaryGeneratedColumn('uuid', { name: 'silence_id' })
  silenceId!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId!: string | null;

  @Column({ name: 'alert_name', type: 'text' })
  alertName!: string;

  @Column({ name: 'silence_until', type: 'timestamptz' })
  silenceUntil!: Date;

  @Column({ name: 'created_by', type: 'text' })
  createdBy!: string;

  @Column({ name: 'reason', type: 'text', nullable: true })
  reason!: string | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date;
}

// P2 #5: DashboardConfig entity for customizable dashboards (tenant-scoped and user-scoped)
@Entity('dashboard_configs')
@Index(['tenantId', 'userId'])
@Index(['tenantId', 'name'])
export class DashboardConfig {
  @PrimaryGeneratedColumn('uuid', { name: 'dashboard_id' })
  dashboardId!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'user_id', type: 'text' })
  userId!: string;

  @Column({ name: 'name', type: 'text' })
  name!: string;

  @Column({ name: 'widgets', type: 'jsonb', nullable: true })
  widgets!: Array<{ type: string; title: string; config: Record<string, any>; position: { x: number; y: number; w: number; h: number } }> | null;

  @Column({ name: 'layout', type: 'jsonb', nullable: true })
  layout!: Record<string, any> | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'NOW()' })
  updatedAt!: Date;
}
