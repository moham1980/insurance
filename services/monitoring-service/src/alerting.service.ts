import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AlertChannel {
  type: 'email' | 'pager' | 'slack' | 'webhook';
  enabled: boolean;
  config: Record<string, any>;
}

export interface AlertRule {
  id: string;
  name: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  condition: string;
  channels: string[];
  cooldownMinutes: number;
  enabled: boolean;
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  details: Record<string, any>;
  timestamp: Date;
  channelsSent: string[];
  status: 'pending' | 'sent' | 'failed';
}

@Injectable()
export class AlertingService {
  private readonly logger = new Logger(AlertingService.name);
  private channels: Map<string, AlertChannel> = new Map();
  private rules: Map<string, AlertRule> = new Map();
  private alerts: Alert[] = [];
  private cooldowns: Map<string, Date> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.initializeChannels();
    this.initializeRules();
  }

  private initializeChannels() {
    // Email channel
    this.channels.set('email', {
      type: 'email',
      enabled: this.configService.get('ALERT_EMAIL_ENABLED') === 'true',
      config: {
        smtpHost: this.configService.get('SMTP_HOST') || 'localhost',
        smtpPort: parseInt(this.configService.get('SMTP_PORT') || '587'),
        smtpUser: this.configService.get('SMTP_USER'),
        smtpPass: this.configService.get('SMTP_PASS'),
        from: this.configService.get('ALERT_FROM_EMAIL') || 'alerts@insurance.ir',
        to: this.configService.get('ALERT_TO_EMAIL')?.split(',') || ['admin@insurance.ir'],
      },
    });

    // Pager channel (PagerDuty or similar)
    this.channels.set('pager', {
      type: 'pager',
      enabled: this.configService.get('ALERT_PAGER_ENABLED') === 'true',
      config: {
        pagerDutyApiKey: this.configService.get('PAGERDUTY_API_KEY'),
        pagerDutyServiceKey: this.configService.get('PAGERDUTY_SERVICE_KEY'),
        pagerDutyIntegrationKey: this.configService.get('PAGERDUTY_INTEGRATION_KEY'),
      },
    });

    // Slack channel
    this.channels.set('slack', {
      type: 'slack',
      enabled: this.configService.get('ALERT_SLACK_ENABLED') === 'true',
      config: {
        webhookUrl: this.configService.get('SLACK_WEBHOOK_URL'),
        channel: this.configService.get('SLACK_CHANNEL') || '#alerts',
      },
    });

    // Webhook channel
    this.channels.set('webhook', {
      type: 'webhook',
      enabled: this.configService.get('ALERT_WEBHOOK_ENABLED') === 'true',
      config: {
        url: this.configService.get('ALERT_WEBHOOK_URL'),
        headers: JSON.parse(this.configService.get('ALERT_WEBHOOK_HEADERS') || '{}'),
      },
    });
  }

  private initializeRules() {
    this.rules.set('high-error-rate', {
      id: 'high-error-rate',
      name: 'High Error Rate',
      severity: 'critical',
      condition: 'error_rate > 0.05',
      channels: ['email', 'pager', 'slack'],
      cooldownMinutes: 15,
      enabled: true,
    });

    this.rules.set('service-down', {
      id: 'service-down',
      name: 'Service Down',
      severity: 'critical',
      condition: 'service_health == 0',
      channels: ['email', 'pager'],
      cooldownMinutes: 5,
      enabled: true,
    });

    this.rules.set('high-latency', {
      id: 'high-latency',
      name: 'High Latency',
      severity: 'warning',
      condition: 'response_time_p95 > 2000',
      channels: ['email', 'slack'],
      cooldownMinutes: 30,
      enabled: true,
    });

    this.rules.set('database-connection-pool-exhausted', {
      id: 'database-connection-pool-exhausted',
      name: 'Database Connection Pool Exhausted',
      severity: 'error',
      condition: 'db_pool_active >= db_pool_max * 0.9',
      channels: ['email', 'pager'],
      cooldownMinutes: 10,
      enabled: true,
    });

    this.rules.set('kafka-consumer-lag', {
      id: 'kafka-consumer-lag',
      name: 'Kafka Consumer Lag',
      severity: 'warning',
      condition: 'kafka_consumer_lag > 10000',
      channels: ['email', 'slack'],
      cooldownMinutes: 20,
      enabled: true,
    });

    this.rules.set('memory-high', {
      id: 'memory-high',
      name: 'High Memory Usage',
      severity: 'warning',
      condition: 'memory_usage_percent > 85',
      channels: ['email', 'slack'],
      cooldownMinutes: 30,
      enabled: true,
    });

    this.rules.set('disk-space-low', {
      id: 'disk-space-low',
      name: 'Low Disk Space',
      severity: 'error',
      condition: 'disk_usage_percent > 90',
      channels: ['email', 'pager'],
      cooldownMinutes: 15,
      enabled: true,
    });

    this.rules.set('fraud-detection-spike', {
      id: 'fraud-detection-spike',
      name: 'Fraud Detection Spike',
      severity: 'error',
      condition: 'fraud_detection_rate > baseline * 3',
      channels: ['email', 'pager', 'slack'],
      cooldownMinutes: 10,
      enabled: true,
    });
  }

  async evaluateRule(ruleId: string, context: Record<string, any>): Promise<boolean> {
    const rule = this.rules.get(ruleId);
    if (!rule || !rule.enabled) {
      return false;
    }

    // Check cooldown
    const lastAlertTime = this.cooldowns.get(ruleId);
    if (lastAlertTime && Date.now() - lastAlertTime.getTime() < rule.cooldownMinutes * 60 * 1000) {
      return false;
    }

    // Evaluate condition (simplified - in production, use a proper expression evaluator)
    const conditionMet = this.evaluateCondition(rule.condition, context);

    if (conditionMet) {
      await this.triggerAlert(rule, context);
    }

    return conditionMet;
  }

  private evaluateCondition(condition: string, context: Record<string, any>): boolean {
    // Simplified condition evaluation
    // In production, use a proper expression evaluator like mathjs or a custom parser
    try {
      // Replace variables with values
      let evalString = condition;
      for (const [key, value] of Object.entries(context)) {
        evalString = evalString.replace(new RegExp(`\\b${key}\\b`, 'g'), String(value));
      }

      // Evaluate simple conditions
      if (evalString.includes('>') && evalString.includes('==')) {
        const parts = evalString.split('==');
        return parts[0].trim() === parts[1].trim();
      }

      if (evalString.includes('>')) {
        const parts = evalString.split('>');
        return parseFloat(parts[0]) > parseFloat(parts[1]);
      }

      if (evalString.includes('<')) {
        const parts = evalString.split('<');
        return parseFloat(parts[0]) < parseFloat(parts[1]);
      }

      if (evalString.includes('==')) {
        const parts = evalString.split('==');
        return parts[0].trim() === parts[1].trim();
      }

      return false;
    } catch (error) {
      this.logger.error(`Error evaluating condition: ${condition}`, error);
      return false;
    }
  }

  private async triggerAlert(rule: AlertRule, context: Record<string, any>) {
    const alert: Alert = {
      id: this.generateId(),
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      message: this.generateAlertMessage(rule, context),
      details: context,
      timestamp: new Date(),
      channelsSent: [],
      status: 'pending',
    };

    this.alerts.push(alert);
    this.cooldowns.set(rule.id, new Date());

    this.logger.warn(`Alert triggered: ${rule.name} (${rule.severity})`);

    // Send to configured channels
    for (const channelId of rule.channels) {
      const channel = this.channels.get(channelId);
      if (channel && channel.enabled) {
        try {
          await this.sendToChannel(channel, alert);
          alert.channelsSent.push(channelId);
        } catch (error) {
          this.logger.error(`Failed to send alert to channel ${channelId}`, error);
        }
      }
    }

    alert.status = alert.channelsSent.length > 0 ? 'sent' : 'failed';
  }

  private generateAlertMessage(rule: AlertRule, context: Record<string, any>): string {
    const contextStr = Object.entries(context)
      .map(([key, value]) => `${key}=${value}`)
      .join(', ');
    return `[${rule.severity.toUpperCase()}] ${rule.name}: ${contextStr}`;
  }

  private async sendToChannel(channel: AlertChannel, alert: Alert) {
    switch (channel.type) {
      case 'email':
        await this.sendEmail(channel, alert);
        break;
      case 'pager':
        await this.sendPager(channel, alert);
        break;
      case 'slack':
        await this.sendSlack(channel, alert);
        break;
      case 'webhook':
        await this.sendWebhook(channel, alert);
        break;
    }
  }

  private async sendEmail(channel: AlertChannel, alert: Alert) {
    this.logger.log(`Sending email alert: ${alert.message}`);
    // In production, use nodemailer or similar
    // await this.emailService.send({
    //   from: channel.config.from,
    //   to: channel.config.to,
    //   subject: `[${alert.severity.toUpperCase()}] ${alert.ruleName}`,
    //   html: this.generateEmailTemplate(alert),
    // });
  }

  private async sendPager(channel: AlertChannel, alert: Alert) {
    this.logger.log(`Sending pager alert: ${alert.message}`);
    // In production, use PagerDuty API
    // await this.pagerDutyService.createIncident({
    //   apiKey: channel.config.pagerDutyApiKey,
    //   serviceKey: channel.config.pagerDutyServiceKey,
    //   title: alert.ruleName,
    //   body: alert.message,
    //   severity: this.mapSeverityToPagerDuty(alert.severity),
    // });
  }

  private async sendSlack(channel: AlertChannel, alert: Alert) {
    this.logger.log(`Sending Slack alert: ${alert.message}`);
    // In production, use Slack Webhook API
    // await fetch(channel.config.webhookUrl, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     channel: channel.config.channel,
    //     text: alert.message,
    //     attachments: [
    //       {
    //         color: this.mapSeverityToSlackColor(alert.severity),
    //         fields: Object.entries(alert.details).map(([key, value]) => ({
    //           title: key,
    //           value: String(value),
    //           short: true,
    //         })),
    //       },
    //     ],
    //   }),
    // });
  }

  private async sendWebhook(channel: AlertChannel, alert: Alert) {
    this.logger.log(`Sending webhook alert: ${alert.message}`);
    // In production, send HTTP POST request
    // await fetch(channel.config.url, {
    //   method: 'POST',
    //   headers: channel.config.headers,
    //   body: JSON.stringify({
    //     alert: {
    //       id: alert.id,
    //       ruleName: alert.ruleName,
    //       severity: alert.severity,
    //       message: alert.message,
    //       timestamp: alert.timestamp,
    //     },
    //     details: alert.details,
    //   }),
    // });
  }

  private mapSeverityToPagerDuty(severity: string): string {
    const mapping: Record<string, string> = {
      info: 'info',
      warning: 'warning',
      error: 'error',
      critical: 'critical',
    };
    return mapping[severity] || 'warning';
  }

  private mapSeverityToSlackColor(severity: string): string {
    const mapping: Record<string, string> = {
      info: '#36a64f', // green
      warning: '#ff9900', // orange
      error: '#ff0000', // red
      critical: '#990000', // dark red
    };
    return mapping[severity] || '#ff9900';
  }

  private generateEmailTemplate(alert: Alert): string {
    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; }
            .alert-box { padding: 20px; border-radius: 5px; }
            .critical { background-color: #ffebee; border: 2px solid #f44336; }
            .error { background-color: #fff3e0; border: 2px solid #ff9800; }
            .warning { background-color: #fff8e1; border: 2px solid #ffc107; }
            .info { background-color: #e8f5e9; border: 2px solid #4caf50; }
            .details { margin-top: 20px; }
            .detail-row { margin: 5px 0; }
          </style>
        </head>
        <body>
          <div class="alert-box ${alert.severity}">
            <h2>${alert.ruleName}</h2>
            <p><strong>Severity:</strong> ${alert.severity.toUpperCase()}</p>
            <p><strong>Message:</strong> ${alert.message}</p>
            <p><strong>Time:</strong> ${alert.timestamp.toISOString()}</p>
            <div class="details">
              <h3>Details:</h3>
              ${Object.entries(alert.details).map(([key, value]) => 
                `<div class="detail-row"><strong>${key}:</strong> ${value}</div>`
              ).join('')}
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private generateId(): string {
    return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public API methods

  getChannels(): AlertChannel[] {
    return Array.from(this.channels.values());
  }

  getChannel(channelId: string): AlertChannel | undefined {
    return this.channels.get(channelId);
  }

  updateChannel(channelId: string, channel: Partial<AlertChannel>): void {
    const existing = this.channels.get(channelId);
    if (existing) {
      this.channels.set(channelId, { ...existing, ...channel });
      this.logger.log(`Updated channel: ${channelId}`);
    }
  }

  getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  getRule(ruleId: string): AlertRule | undefined {
    return this.rules.get(ruleId);
  }

  updateRule(ruleId: string, rule: Partial<AlertRule>): void {
    const existing = this.rules.get(ruleId);
    if (existing) {
      this.rules.set(ruleId, { ...existing, ...rule });
      this.logger.log(`Updated rule: ${ruleId}`);
    }
  }

  getAlerts(limit: number = 100): Alert[] {
    return this.alerts.slice(-limit);
  }

  getAlert(alertId: string): Alert | undefined {
    return this.alerts.find(a => a.id === alertId);
  }

  async testChannel(channelId: string): Promise<boolean> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error(`Channel not found: ${channelId}`);
    }

    const testAlert: Alert = {
      id: this.generateId(),
      ruleId: 'test',
      ruleName: 'Test Alert',
      severity: 'info',
      message: 'This is a test alert',
      details: { test: true },
      timestamp: new Date(),
      channelsSent: [],
      status: 'pending',
    };

    try {
      await this.sendToChannel(channel, testAlert);
      return true;
    } catch (error) {
      this.logger.error(`Test failed for channel ${channelId}`, error);
      return false;
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; channels: string[] }> {
    const enabledChannels = this.getChannels()
      .filter(c => c.enabled)
      .map(c => c.type);

    return {
      healthy: enabledChannels.length > 0,
      channels: enabledChannels,
    };
  }
}
