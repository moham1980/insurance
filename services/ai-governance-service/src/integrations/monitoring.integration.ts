/**
 * Monitoring & Observability Integration Adapter
 * 
 * Integrates AI Governance with monitoring systems (Prometheus, Grafana, Datadog, etc.)
 * Supports metrics collection, alert management, and dashboard integration
 */

import axios, { AxiosInstance } from 'axios';
import { getIntegrationConfig } from '../config/integration.config';

export interface MetricQuery {
  metricName: string;
  labels?: Record<string, string>;
  startTime?: Date;
  endTime?: Date;
  step?: string;
}

export interface MetricData {
  timestamp: Date;
  value: number;
}

export interface AlertRule {
  name: string;
  condition: string;
  threshold: number;
  duration: string;
  severity: 'critical' | 'warning' | 'info';
}

export interface Alert {
  id: string;
  ruleName: string;
  severity: 'critical' | 'warning' | 'info';
  status: 'firing' | 'resolved';
  value: number;
  message: string;
  startTime: Date;
  endTime?: Date;
}

export class MonitoringIntegration {
  private client: AxiosInstance;
  private config: ReturnType<typeof getIntegrationConfig>['monitoring'];
  private enabled: boolean;

  constructor() {
    const integrationConfig = getIntegrationConfig();
    this.config = integrationConfig.monitoring;
    this.enabled = this.config.enabled;

    if (this.enabled) {
      this.client = axios.create({
        baseURL: this.config.prometheusUrl,
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });
    }
  }

  /**
   * Query metrics from Prometheus
   */
  async queryMetrics(query: MetricQuery): Promise<MetricData[]> {
    if (!this.enabled || this.config.type !== 'prometheus') {
      throw new Error('Prometheus monitoring integration is not enabled');
    }

    try {
      const promQuery = this.buildPrometheusQuery(query);
      const response = await this.client.get('/api/v1/query_range', {
        params: {
          query: promQuery,
          start: query.startTime?.getTime() / 1000 || (Date.now() - 3600000) / 1000,
          end: query.endTime?.getTime() / 1000 || Date.now() / 1000,
          step: query.step || '1m',
        },
      });

      if (response.data.status !== 'success') {
        throw new Error('Prometheus query failed');
      }

      return this.parseMetricData(response.data.data);
    } catch (error: any) {
      throw new Error(`Failed to query metrics: ${error.message}`);
    }
  }

  /**
   * Create an alert rule
   */
  async createAlertRule(rule: AlertRule): Promise<void> {
    if (!this.enabled) {
      throw new Error('Monitoring integration is not enabled');
    }

    try {
      // This would integrate with the alert management system
      // For now, we'll log it
      console.log('Creating alert rule:', rule);
      
      // If alert webhook is configured, send notification
      if (this.config.alertWebhookUrl) {
        await axios.post(this.config.alertWebhookUrl, {
          type: 'alert_rule_created',
          rule,
        });
      }
    } catch (error: any) {
      throw new Error(`Failed to create alert rule: ${error.message}`);
    }
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(): Promise<Alert[]> {
    if (!this.enabled || this.config.type !== 'prometheus') {
      return [];
    }

    try {
      const response = await this.client.get('/api/v1/alerts');
      return response.data.data.alerts.map((alert: any) => ({
        id: alert.fingerprint,
        ruleName: alert.labels.alertname,
        severity: alert.labels.severity || 'warning',
        status: alert.state === 'firing' ? 'firing' : 'resolved',
        value: parseFloat(alert.value?.value || '0'),
        message: alert.annotations.description || '',
        startTime: new Date(alert.startsAt * 1000),
        endTime: alert.endsAt ? new Date(alert.endsAt * 1000) : undefined,
      }));
    } catch (error: any) {
      console.error('Failed to get active alerts:', error);
      return [];
    }
  }

  /**
   * Send alert notification
   */
  async sendAlertNotification(alert: Alert): Promise<void> {
    if (!this.enabled || !this.config.alertWebhookUrl) {
      return;
    }

    try {
      await axios.post(this.config.alertWebhookUrl, {
        type: 'alert',
        alert,
      });
    } catch (error: any) {
      console.error('Failed to send alert notification:', error);
    }
  }

  /**
   * Get Grafana dashboard URL
   */
  getGrafanaDashboardUrl(dashboardId: string, variables?: Record<string, string>): string | null {
    if (!this.enabled || !this.config.grafanaUrl) {
      return null;
    }

    const params = new URLSearchParams();
    Object.entries(variables || {}).forEach(([key, value]) => {
      params.append(`var-${key}`, value);
    });

    return `${this.config.grafanaUrl}/d/${dashboardId}?${params.toString()}`;
  }

  /**
   * Build Prometheus query from MetricQuery
   */
  private buildPrometheusQuery(query: MetricQuery): string {
    let promQuery = query.metricName;
    
    if (query.labels && Object.keys(query.labels).length > 0) {
      const labelFilters = Object.entries(query.labels)
        .map(([key, value]) => `${key}="${value}"`)
        .join(',');
      promQuery = `${promQuery}{${labelFilters}}`;
    }

    return promQuery;
  }

  /**
   * Parse Prometheus metric data
   */
  private parseMetricData(data: any): MetricData[] {
    if (!data || !data.result) {
      return [];
    }

    const result = data.result[0];
    if (!result || !result.values) {
      return [];
    }

    return result.values.map(([timestamp, value]: [number, string]) => ({
      timestamp: new Date(timestamp * 1000),
      value: parseFloat(value),
    }));
  }

  /**
   * Health check for monitoring integration
   */
  async healthCheck(): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    try {
      await this.client.get('/api/v1/query', {
        params: { query: 'up' },
      });
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const monitoringIntegration = new MonitoringIntegration();
