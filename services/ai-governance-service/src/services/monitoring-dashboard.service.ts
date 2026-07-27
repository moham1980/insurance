import { Injectable } from '@nestjs/common';

export interface ModelMetrics {
  modelId: string;
  modelName: string;
  timestamp: Date;
  requestsPerMinute: number;
  averageLatency: number;
  errorRate: number;
  throughput: number;
  cpuUsage: number;
  memoryUsage: number;
  gpuUsage?: number;
}

export interface AnomalyDetection {
  anomalyId: string;
  modelId: string;
  modelName: string;
  type: 'performance_degradation' | 'spike_in_errors' | 'resource_exhaustion' | 'drift_detected';
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: Date;
  description: string;
  currentValue: number;
  threshold: number;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
}

export interface ModelDriftMetrics {
  modelId: string;
  modelName: string;
  lastCheckedAt: Date;
  dataDriftScore: number;
  conceptDriftScore: number;
  featureImportanceChange: number;
  predictionDistributionChange: number;
  driftDetected: boolean;
  driftThreshold: number;
}

@Injectable()
export class MonitoringDashboardService {
  private metricsHistory: Map<string, ModelMetrics[]> = new Map();
  private anomalies: Map<string, AnomalyDetection> = new Map();
  private driftMetrics: Map<string, ModelDriftMetrics> = new Map();

  async recordMetrics(metrics: ModelMetrics): Promise<void> {
    const history = this.metricsHistory.get(metrics.modelId) || [];
    history.push(metrics);
    
    // Keep only last 1000 data points per model
    if (history.length > 1000) {
      history.shift();
    }
    
    this.metricsHistory.set(metrics.modelId, history);
    
    // Check for anomalies
    await this.detectAnomalies(metrics);
  }

  private async detectAnomalies(metrics: ModelMetrics): Promise<void> {
    const history = this.metricsHistory.get(metrics.modelId) || [];
    if (history.length < 10) return;

    // Calculate thresholds based on historical data
    const avgLatency = history.reduce((sum, m) => sum + m.averageLatency, 0) / history.length;
    const avgErrorRate = history.reduce((sum, m) => sum + m.errorRate, 0) / history.length;
    const avgCpu = history.reduce((sum, m) => sum + m.cpuUsage, 0) / history.length;
    const avgMemory = history.reduce((sum, m) => sum + m.memoryUsage, 0) / history.length;

    // Performance degradation: latency > 2x average
    if (metrics.averageLatency > avgLatency * 2) {
      await this.createAnomaly({
        modelId: metrics.modelId,
        modelName: metrics.modelName,
        type: 'performance_degradation',
        severity: metrics.averageLatency > avgLatency * 3 ? 'critical' : 'high',
        description: `Latency spike detected: ${metrics.averageLatency}ms vs average ${avgLatency.toFixed(2)}ms`,
        currentValue: metrics.averageLatency,
        threshold: avgLatency * 2,
      });
    }

    // Spike in errors: error rate > 5x average
    if (metrics.errorRate > avgErrorRate * 5 && metrics.errorRate > 0.01) {
      await this.createAnomaly({
        modelId: metrics.modelId,
        modelName: metrics.modelName,
        type: 'spike_in_errors',
        severity: metrics.errorRate > avgErrorRate * 10 ? 'critical' : 'high',
        description: `Error rate spike: ${(metrics.errorRate * 100).toFixed(2)}% vs average ${(avgErrorRate * 100).toFixed(2)}%`,
        currentValue: metrics.errorRate,
        threshold: avgErrorRate * 5,
      });
    }

    // Resource exhaustion: CPU > 90% or Memory > 90%
    if (metrics.cpuUsage > 90) {
      await this.createAnomaly({
        modelId: metrics.modelId,
        modelName: metrics.modelName,
        type: 'resource_exhaustion',
        severity: metrics.cpuUsage > 95 ? 'critical' : 'high',
        description: `CPU usage high: ${metrics.cpuUsage}%`,
        currentValue: metrics.cpuUsage,
        threshold: 90,
      });
    }

    if (metrics.memoryUsage > 90) {
      await this.createAnomaly({
        modelId: metrics.modelId,
        modelName: metrics.modelName,
        type: 'resource_exhaustion',
        severity: metrics.memoryUsage > 95 ? 'critical' : 'high',
        description: `Memory usage high: ${metrics.memoryUsage}%`,
        currentValue: metrics.memoryUsage,
        threshold: 90,
      });
    }
  }

  private async createAnomaly(data: {
    modelId: string;
    modelName: string;
    type: AnomalyDetection['type'];
    severity: AnomalyDetection['severity'];
    description: string;
    currentValue: number;
    threshold: number;
  }): Promise<void> {
    const anomalyId = `anomaly-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const anomaly: AnomalyDetection = {
      anomalyId,
      modelId: data.modelId,
      modelName: data.modelName,
      type: data.type,
      severity: data.severity,
      detectedAt: new Date(),
      description: data.description,
      currentValue: data.currentValue,
      threshold: data.threshold,
    };
    
    this.anomalies.set(anomalyId, anomaly);
  }

  async getMetricsHistory(modelId: string, minutes: number = 60): Promise<ModelMetrics[]> {
    const history = this.metricsHistory.get(modelId) || [];
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
    
    return history.filter(m => m.timestamp >= cutoffTime);
  }

  async getCurrentMetrics(modelId: string): Promise<ModelMetrics | null> {
    const history = this.metricsHistory.get(modelId) || [];
    return history.length > 0 ? history[history.length - 1] : null;
  }

  async getAllCurrentMetrics(): Promise<ModelMetrics[]> {
    const metrics: ModelMetrics[] = [];
    
    for (const [modelId, history] of this.metricsHistory.entries()) {
      if (history.length > 0) {
        metrics.push(history[history.length - 1]);
      }
    }
    
    return metrics;
  }

  async getAnomalies(modelId?: string): Promise<AnomalyDetection[]> {
    const anomalies = Array.from(this.anomalies.values());
    
    if (modelId) {
      return anomalies.filter(a => a.modelId === modelId);
    }
    
    return anomalies;
  }

  async getActiveAnomalies(): Promise<AnomalyDetection[]> {
    return Array.from(this.anomalies.values()).filter(a => !a.resolvedAt);
  }

  async acknowledgeAnomaly(anomalyId: string, acknowledgedBy: string): Promise<AnomalyDetection> {
    const anomaly = this.anomalies.get(anomalyId);
    if (!anomaly) {
      throw new Error(`Anomaly ${anomalyId} not found`);
    }
    
    anomaly.acknowledgedAt = new Date();
    anomaly.acknowledgedBy = acknowledgedBy;
    this.anomalies.set(anomalyId, anomaly);
    
    return anomaly;
  }

  async resolveAnomaly(anomalyId: string): Promise<AnomalyDetection> {
    const anomaly = this.anomalies.get(anomalyId);
    if (!anomaly) {
      throw new Error(`Anomaly ${anomalyId} not found`);
    }
    
    anomaly.resolvedAt = new Date();
    this.anomalies.set(anomalyId, anomaly);
    
    return anomaly;
  }

  async recordDriftMetrics(metrics: ModelDriftMetrics): Promise<void> {
    this.driftMetrics.set(metrics.modelId, metrics);
    
    // Create anomaly if drift detected
    if (metrics.driftDetected) {
      await this.createAnomaly({
        modelId: metrics.modelId,
        modelName: metrics.modelName,
        type: 'drift_detected',
        severity: metrics.dataDriftScore > metrics.driftThreshold * 1.5 ? 'high' : 'medium',
        description: `Model drift detected: data drift ${metrics.dataDriftScore.toFixed(3)}, concept drift ${metrics.conceptDriftScore.toFixed(3)}`,
        currentValue: Math.max(metrics.dataDriftScore, metrics.conceptDriftScore),
        threshold: metrics.driftThreshold,
      });
    }
  }

  async getDriftMetrics(modelId: string): Promise<ModelDriftMetrics | null> {
    return this.driftMetrics.get(modelId) || null;
  }

  async getAllDriftMetrics(): Promise<ModelDriftMetrics[]> {
    return Array.from(this.driftMetrics.values());
  }

  async getMonitoringSummary(): Promise<{
    totalModels: number;
    activeModels: number;
    totalAnomalies: number;
    activeAnomalies: number;
    criticalAnomalies: number;
    modelsWithDrift: number;
    averageLatency: number;
    averageErrorRate: number;
  }> {
    const currentMetrics = await this.getAllCurrentMetrics();
    const anomalies = await this.getActiveAnomalies();
    const driftMetrics = await this.getAllDriftMetrics();

    const totalModels = this.metricsHistory.size;
    const activeModels = currentMetrics.length;
    const totalAnomalies = this.anomalies.size;
    const activeAnomalies = anomalies.length;
    const criticalAnomalies = anomalies.filter(a => a.severity === 'critical').length;
    const modelsWithDrift = driftMetrics.filter(d => d.driftDetected).length;
    const averageLatency = currentMetrics.length > 0
      ? currentMetrics.reduce((sum, m) => sum + m.averageLatency, 0) / currentMetrics.length
      : 0;
    const averageErrorRate = currentMetrics.length > 0
      ? currentMetrics.reduce((sum, m) => sum + m.errorRate, 0) / currentMetrics.length
      : 0;

    return {
      totalModels,
      activeModels,
      totalAnomalies,
      activeAnomalies,
      criticalAnomalies,
      modelsWithDrift,
      averageLatency,
      averageErrorRate,
    };
  }

  async getMetricsTrend(modelId: string, metric: keyof ModelMetrics, minutes: number = 60): Promise<{
    timestamp: Date;
    value: number;
  }[]> {
    const history = await this.getMetricsHistory(modelId, minutes);
    
    return history.map(m => ({
      timestamp: m.timestamp,
      value: m[metric] as number,
    }));
  }

  async getResourceUtilization(minutes: number = 60): Promise<{
    timestamp: Date;
    cpu: number;
    memory: number;
    gpu?: number;
  }[]> {
    const currentMetrics = await this.getAllCurrentMetrics();
    if (currentMetrics.length === 0) return [];

    const modelId = currentMetrics[0].modelId;
    const history = await this.getMetricsHistory(modelId, minutes);

    return history.map(m => ({
      timestamp: m.timestamp,
      cpu: m.cpuUsage,
      memory: m.memoryUsage,
      gpu: m.gpuUsage,
    }));
  }
}
