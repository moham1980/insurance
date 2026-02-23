import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import client from 'prom-client';
import cron from 'node-cron';
import { createLogger, Logger } from '@insurance/shared';
import { Metric, SLO, Alert } from './entities/MonitoringEntities';

export interface MetricPayload {
  serviceName: string;
  metricName: string;
  metricType: 'counter' | 'gauge' | 'histogram';
  value: number;
  labels?: Record<string, string>;
}

export interface SLOPayload {
  serviceName: string;
  sloName: string;
  description?: string;
  target: number;
  window: string;
}

@Injectable()
export class MonitoringService implements OnModuleInit {
  private register!: client.Registry;
  private logger: Logger;

  constructor(
    @InjectRepository(Metric) private readonly metricRepo: Repository<Metric>,
    @InjectRepository(SLO) private readonly sloRepo: Repository<SLO>,
    @InjectRepository(Alert) private readonly alertRepo: Repository<Alert>
  ) {
    this.logger = createLogger({
      serviceName: 'monitoring-service',
      prettyPrint: process.env.NODE_ENV !== 'production',
    });
  }

  async onModuleInit(): Promise<void> {
    this.register = new client.Registry();
    client.collectDefaultMetrics({ register: this.register });

    cron.schedule('*/5 * * * *', async () => {
      await this.evaluateSLOs();
    });

    this.logger.info('Monitoring Service initialized');
  }

  getPrometheusContentType(): string {
    return this.register.contentType;
  }

  async getPrometheusMetrics(): Promise<string> {
    return this.register.metrics();
  }

  async recordMetric(payload: MetricPayload): Promise<void> {
    const metric = this.metricRepo.create({
      serviceName: payload.serviceName,
      metricName: payload.metricName,
      metricType: payload.metricType,
      value: payload.value,
      labels: payload.labels || null,
      timestamp: new Date(),
    });

    await this.metricRepo.save(metric);

    const metricKey = `${payload.serviceName}_${payload.metricName}`;
    let promMetric = this.register.getSingleMetric(metricKey) as client.Counter | client.Gauge | client.Histogram;

    if (!promMetric) {
      if (payload.metricType === 'counter') {
        promMetric = new client.Counter({
          name: metricKey,
          help: `Counter for ${payload.metricName}`,
          labelNames: payload.labels ? Object.keys(payload.labels) : [],
          registers: [this.register],
        });
      } else if (payload.metricType === 'gauge') {
        promMetric = new client.Gauge({
          name: metricKey,
          help: `Gauge for ${payload.metricName}`,
          labelNames: payload.labels ? Object.keys(payload.labels) : [],
          registers: [this.register],
        });
      } else {
        promMetric = new client.Histogram({
          name: metricKey,
          help: `Histogram for ${payload.metricName}`,
          labelNames: payload.labels ? Object.keys(payload.labels) : [],
          buckets: [0.1, 0.5, 1, 2, 5, 10],
          registers: [this.register],
        });
      }
    }

    if (payload.metricType === 'counter') {
      (promMetric as client.Counter).inc(payload.labels || {}, payload.value);
    } else if (payload.metricType === 'gauge') {
      (promMetric as client.Gauge).set(payload.labels || {}, payload.value);
    } else {
      (promMetric as client.Histogram).observe(payload.labels || {}, payload.value);
    }
  }

  async listSLOs(params: { serviceName?: string; status?: string }): Promise<SLO[]> {
    const qb = this.sloRepo.createQueryBuilder('slo');
    if (params.serviceName) qb.andWhere('slo.service_name = :serviceName', { serviceName: params.serviceName });
    if (params.status) qb.andWhere('slo.status = :status', { status: params.status });
    return qb.getMany();
  }

  async createSLO(payload: SLOPayload): Promise<SLO> {
    const slo = this.sloRepo.create({
      serviceName: payload.serviceName,
      sloName: payload.sloName,
      description: payload.description || null,
      target: payload.target,
      window: payload.window,
      status: 'healthy',
      createdAt: new Date(),
      updatedAt: new Date(),
      currentValue: null,
    });

    return this.sloRepo.save(slo);
  }

  async listAlerts(params: { status?: string; severity?: string; serviceName?: string }): Promise<Alert[]> {
    const qb = this.alertRepo.createQueryBuilder('alert');

    if (params.status) qb.andWhere('alert.status = :status', { status: params.status });
    if (params.severity) qb.andWhere('alert.severity = :severity', { severity: params.severity });
    if (params.serviceName) qb.andWhere('alert.service_name = :serviceName', { serviceName: params.serviceName });

    qb.orderBy('alert.created_at', 'DESC');
    return qb.getMany();
  }

  async acknowledgeAlert(params: { alertId: string; acknowledgedBy?: string }): Promise<Alert | null> {
    const alert = await this.alertRepo.findOne({ where: { alertId: params.alertId } });
    if (!alert) return null;

    alert.status = 'acknowledged';
    alert.acknowledgedBy = params.acknowledgedBy || 'system';
    alert.acknowledgedAt = new Date();

    return this.alertRepo.save(alert);
  }

  async getDashboard(): Promise<any> {
    const [sloStats, alertStats] = await Promise.all([
      this.sloRepo
        .createQueryBuilder('slo')
        .select('slo.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('slo.status')
        .getRawMany(),
      this.alertRepo
        .createQueryBuilder('alert')
        .select('alert.status', 'status')
        .addSelect('alert.severity', 'severity')
        .addSelect('COUNT(*)', 'count')
        .where("alert.created_at > NOW() - INTERVAL '24 hours'")
        .groupBy('alert.status, alert.severity')
        .getRawMany(),
    ]);

    const dashboard = {
      slos: {
        healthy: 0,
        at_risk: 0,
        breached: 0,
        total: 0,
      },
      alerts: {
        firing: { critical: 0, warning: 0, info: 0 },
        acknowledged: { critical: 0, warning: 0, info: 0 },
        resolved: { critical: 0, warning: 0, info: 0 },
      },
      timestamp: new Date().toISOString(),
    };

    for (const row of sloStats as Array<{ status: string; count: string }>) {
      (dashboard.slos as any)[row.status] = parseInt(row.count, 10);
      dashboard.slos.total += parseInt(row.count, 10);
    }

    type AlertStatusKey = keyof typeof dashboard.alerts;
    type AlertSeverityKey = keyof (typeof dashboard.alerts)['firing'];

    for (const row of alertStats as Array<{ status: string; severity: string; count: string }>) {
      const statusKey = row.status as AlertStatusKey;
      const severityKey = row.severity as AlertSeverityKey;

      if (dashboard.alerts[statusKey] && (dashboard.alerts[statusKey] as any)[severityKey] !== undefined) {
        (dashboard.alerts[statusKey] as any)[severityKey] = parseInt(row.count, 10);
      }
    }

    return dashboard;
  }

  private async evaluateSLOs(): Promise<void> {
    const slos = await this.sloRepo.find();

    for (const slo of slos) {
      try {
        let currentValue = 0;

        if (slo.sloName.includes('availability')) {
          currentValue = await this.calculateAvailability(slo.serviceName, slo.window);
        } else if (slo.sloName.includes('latency')) {
          currentValue = await this.calculateLatency(slo.serviceName, slo.window);
        } else if (slo.sloName.includes('error_rate')) {
          currentValue = await this.calculateErrorRate(slo.serviceName, slo.window);
        }

        slo.currentValue = currentValue;

        if (currentValue < slo.target * 0.95) {
          slo.status = 'breached';
          await this.createAlert(slo, currentValue);
        } else if (currentValue < slo.target * 0.98) {
          slo.status = 'at_risk';
        } else {
          slo.status = 'healthy';
        }

        slo.updatedAt = new Date();
        await this.sloRepo.save(slo);

        this.logger.info('SLO evaluated', {
          serviceName: slo.serviceName,
          sloName: slo.sloName,
          currentValue,
          target: slo.target,
          status: slo.status,
        });
      } catch (error) {
        this.logger.error('SLO evaluation failed', error as Error, {
          serviceName: slo.serviceName,
          sloName: slo.sloName,
        });
      }
    }
  }

  private async calculateAvailability(_serviceName: string, _window: string): Promise<number> {
    return 0.995 + Math.random() * 0.005;
  }

  private async calculateLatency(_serviceName: string, _window: string): Promise<number> {
    return 100 + Math.random() * 50;
  }

  private async calculateErrorRate(_serviceName: string, _window: string): Promise<number> {
    return 0.001 + Math.random() * 0.005;
  }

  private async createAlert(slo: SLO, currentValue: number): Promise<void> {
    const existingAlert = await this.alertRepo.findOne({
      where: {
        sloId: slo.sloId,
        status: 'firing',
      },
    });

    if (existingAlert) return;

    const alert = this.alertRepo.create({
      sloId: slo.sloId,
      serviceName: slo.serviceName,
      alertName: `${slo.serviceName}_${slo.sloName}_breach`,
      description: `SLO ${slo.sloName} breached for ${slo.serviceName}. Current: ${currentValue}, Target: ${slo.target}`,
      severity: slo.status === 'breached' ? 'critical' : 'warning',
      status: 'firing',
      value: currentValue,
      threshold: slo.target,
      createdAt: new Date(),
      acknowledgedAt: null,
      acknowledgedBy: null,
      resolvedAt: null,
    });

    await this.alertRepo.save(alert);

    this.logger.warn('Alert created', {
      alertId: alert.alertId,
      serviceName: alert.serviceName,
      severity: alert.severity,
    });
  }
}
