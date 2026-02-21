import { Request, Response } from 'express';
import { Repository } from 'typeorm';
import client from 'prom-client';
import { BaseService } from '@insurance/shared';
import { Metric, SLO, Alert } from './entities/MonitoringEntities';
import cron from 'node-cron';

interface MetricPayload {
  serviceName: string;
  metricName: string;
  metricType: 'counter' | 'gauge' | 'histogram';
  value: number;
  labels?: Record<string, string>;
}

interface SLOPayload {
  serviceName: string;
  sloName: string;
  description?: string;
  target: number;
  window: string;
}

export class MonitoringService extends BaseService {
  private metricRepo!: Repository<Metric>;
  private sloRepo!: Repository<SLO>;
  private alertRepo!: Repository<Alert>;
  private register!: client.Registry;

  getEntities(): any[] {
    return [Metric, SLO, Alert];
  }

  async initialize(): Promise<void> {
    await super.initialize();
    this.metricRepo = this.dataSource.getRepository(Metric);
    this.sloRepo = this.dataSource.getRepository(SLO);
    this.alertRepo = this.dataSource.getRepository(Alert);

    // Prometheus registry
    this.register = new client.Registry();
    client.collectDefaultMetrics({ register: this.register });

    // Start SLO evaluation cron job (every 5 minutes)
    cron.schedule('*/5 * * * *', async () => {
      await this.evaluateSLOs();
    });

    this.logger.info('Monitoring Service initialized');
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

    // Also record to Prometheus
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

  private async evaluateSLOs(): Promise<void> {
    const slos = await this.sloRepo.find();

    for (const slo of slos) {
      try {
        let currentValue = 0;

        // Calculate SLO based on metric type
        if (slo.sloName.includes('availability')) {
          currentValue = await this.calculateAvailability(slo.serviceName, slo.window);
        } else if (slo.sloName.includes('latency')) {
          currentValue = await this.calculateLatency(slo.serviceName, slo.window);
        } else if (slo.sloName.includes('error_rate')) {
          currentValue = await this.calculateErrorRate(slo.serviceName, slo.window);
        }

        slo.currentValue = currentValue;

        // Update status
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

  private async calculateAvailability(serviceName: string, window: string): Promise<number> {
    // Mock calculation - in production would query actual metrics
    return 0.995 + Math.random() * 0.005;
  }

  private async calculateLatency(serviceName: string, window: string): Promise<number> {
    // Mock calculation - in production would query actual metrics
    return 100 + Math.random() * 50;
  }

  private async calculateErrorRate(serviceName: string, window: string): Promise<number> {
    // Mock calculation - in production would query actual metrics
    return 0.001 + Math.random() * 0.005;
  }

  private async createAlert(slo: SLO, currentValue: number): Promise<void> {
    const existingAlert = await this.alertRepo.findOne({
      where: {
        sloId: slo.sloId,
        status: 'firing',
      },
    });

    if (existingAlert) {
      return; // Alert already firing
    }

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
    });

    await this.alertRepo.save(alert);

    this.logger.warn('Alert created', {
      alertId: alert.alertId,
      serviceName: alert.serviceName,
      severity: alert.severity,
    });
  }

  setupRoutes(): void {
    // GET /metrics/prometheus - Prometheus metrics endpoint
    this.app.get('/metrics/prometheus', async (req: Request, res: Response) => {
      res.set('Content-Type', this.register.contentType);
      res.end(await this.register.metrics());
    });

    // POST /metrics - Record a metric
    this.app.post('/metrics', async (req: Request, res: Response) => {
      try {
        const correlationId = (req as any).correlationId;
        const body = req.body as MetricPayload;

        await this.recordMetric(body);

        return res.json({
          success: true,
          data: { recorded: true },
          correlationId,
        });
      } catch (error) {
        this.logger.error('Failed to record metric', error as Error, {
          correlationId: (req as any).correlationId,
        });
        return res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to record metric' },
          correlationId: (req as any).correlationId,
        });
      }
    });

    // GET /slos - List all SLOs
    this.app.get('/slos', async (req: Request, res: Response) => {
      const correlationId = (req as any).correlationId;
      const { serviceName, status } = req.query;

      const qb = this.sloRepo.createQueryBuilder('slo');

      if (serviceName) {
        qb.andWhere('slo.service_name = :serviceName', { serviceName });
      }
      if (status) {
        qb.andWhere('slo.status = :status', { status });
      }

      const slos = await qb.getMany();

      return res.json({
        success: true,
        data: slos,
        correlationId,
      });
    });

    // POST /slos - Create a new SLO
    this.app.post('/slos', async (req: Request, res: Response) => {
      try {
        const correlationId = (req as any).correlationId;
        const body = req.body as SLOPayload;

        const slo = this.sloRepo.create({
          serviceName: body.serviceName,
          sloName: body.sloName,
          description: body.description || null,
          target: body.target,
          window: body.window,
          status: 'healthy',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        await this.sloRepo.save(slo);

        return res.status(201).json({
          success: true,
          data: slo,
          correlationId,
        });
      } catch (error) {
        this.logger.error('Failed to create SLO', error as Error, {
          correlationId: (req as any).correlationId,
        });
        return res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to create SLO' },
          correlationId: (req as any).correlationId,
        });
      }
    });

    // GET /alerts - List alerts
    this.app.get('/alerts', async (req: Request, res: Response) => {
      const correlationId = (req as any).correlationId;
      const { status, severity, serviceName } = req.query;

      const qb = this.alertRepo.createQueryBuilder('alert');

      if (status) {
        qb.andWhere('alert.status = :status', { status });
      }
      if (severity) {
        qb.andWhere('alert.severity = :severity', { severity });
      }
      if (serviceName) {
        qb.andWhere('alert.service_name = :serviceName', { serviceName });
      }

      qb.orderBy('alert.created_at', 'DESC');

      const alerts = await qb.getMany();

      return res.json({
        success: true,
        data: alerts,
        correlationId,
      });
    });

    // POST /alerts/:alertId/acknowledge
    this.app.post('/alerts/:alertId/acknowledge', async (req: Request, res: Response) => {
      try {
        const correlationId = (req as any).correlationId;
        const { alertId } = req.params;
        const { acknowledgedBy } = req.body;

        const alert = await this.alertRepo.findOne({ where: { alertId } });

        if (!alert) {
          return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Alert not found' },
            correlationId,
          });
        }

        alert.status = 'acknowledged';
        alert.acknowledgedBy = acknowledgedBy || 'system';
        alert.acknowledgedAt = new Date();
        await this.alertRepo.save(alert);

        return res.json({
          success: true,
          data: alert,
          correlationId,
        });
      } catch (error) {
        this.logger.error('Failed to acknowledge alert', error as Error, {
          correlationId: (req as any).correlationId,
        });
        return res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to acknowledge alert' },
          correlationId: (req as any).correlationId,
        });
      }
    });

    // GET /dashboard - Dashboard metrics summary
    this.app.get('/dashboard', async (req: Request, res: Response) => {
      const correlationId = (req as any).correlationId;

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
          .where('alert.created_at > NOW() - INTERVAL \'24 hours\'')
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

      for (const row of sloStats) {
        dashboard.slos[row.status as keyof typeof dashboard.slos] = parseInt(row.count, 10);
        dashboard.slos.total += parseInt(row.count, 10);
      }

      type AlertStatusKey = keyof typeof dashboard.alerts;
      type AlertSeverityKey = keyof (typeof dashboard.alerts)['firing'];

      for (const row of alertStats as Array<{ status: string; severity: string; count: string }>) {
        const statusKey = row.status as AlertStatusKey;
        const severityKey = row.severity as AlertSeverityKey;

        if (dashboard.alerts[statusKey] && dashboard.alerts[statusKey][severityKey] !== undefined) {
          dashboard.alerts[statusKey][severityKey] = parseInt(row.count, 10);
        }
      }

      return res.json({
        success: true,
        data: dashboard,
        correlationId,
      });
    });
  }
}
