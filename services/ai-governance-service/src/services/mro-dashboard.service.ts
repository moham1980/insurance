import { Injectable } from '@nestjs/common';

export interface DashboardMetrics {
  totalModels: number;
  modelsByStatus: Record<string, number>;
  modelsByRiskLevel: Record<string, number>;
  modelsByType: Record<string, number>;
  pendingValidations: number;
  passedValidations: number;
  failedValidations: number;
  modelsNeedingEvaluation: number;
  averageModelScore: number;
}

export interface Alert {
  alertId: string;
  type: 'model_risk' | 'validation_failure' | 'evaluation_due' | 'compliance_issue';
  severity: 'low' | 'medium' | 'high' | 'critical';
  modelId?: string;
  modelName?: string;
  message: string;
  createdAt: Date;
  resolvedAt?: Date;
}

@Injectable()
export class MroDashboardService {
  private alerts: Alert[] = [];

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    // In a real implementation, this would query the database
    // For now, returning mock metrics
    return {
      totalModels: 25,
      modelsByStatus: {
        development: 8,
        testing: 5,
        staging: 4,
        production: 6,
        deprecated: 2,
        retired: 0,
      },
      modelsByRiskLevel: {
        low: 12,
        medium: 8,
        high: 4,
        critical: 1,
      },
      modelsByType: {
        llm: 8,
        ml: 10,
        ocr: 4,
        embedding: 2,
        other: 1,
      },
      pendingValidations: 3,
      passedValidations: 18,
      failedValidations: 2,
      modelsNeedingEvaluation: 4,
      averageModelScore: 82,
    };
  }

  async getModelRiskSummary(): Promise<{
    highRiskModels: Array<{ modelId: string; modelName: string; riskLevel: string; reason: string }>;
    criticalIssues: Array<{ modelId: string; modelName: string; issue: string; severity: string }>;
  }> {
    // In a real implementation, this would query the database
    return {
      highRiskModels: [
        { modelId: 'model-1', modelName: 'Fraud Detection Model', riskLevel: 'high', reason: 'High false positive rate in recent tests' },
        { modelId: 'model-2', modelName: 'Claims Classification Model', riskLevel: 'high', reason: 'Performance degradation detected' },
        { modelId: 'model-3', modelName: 'OCR Document Parser', riskLevel: 'critical', reason: 'Security vulnerabilities found' },
      ],
      criticalIssues: [
        { modelId: 'model-3', modelName: 'OCR Document Parser', issue: 'Security vulnerabilities found', severity: 'critical' },
        { modelId: 'model-4', modelName: 'Sentiment Analysis Model', issue: 'Bias detected in demographic groups', severity: 'high' },
      ],
    };
  }

  async getValidationTrends(days: number = 30): Promise<{
    date: string;
    validationsRun: number;
    validationsPassed: number;
    validationsFailed: number;
  }[]> {
    const trends = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const validationsRun = Math.floor(Math.random() * 5) + 1;
      const validationsPassed = Math.floor(validationsRun * 0.8);
      
      trends.push({
        date: date.toISOString().split('T')[0],
        validationsRun,
        validationsPassed,
        validationsFailed: validationsRun - validationsPassed,
      });
    }
    
    return trends;
  }

  async getModelPerformanceMetrics(modelId: string): Promise<{
    modelId: string;
    modelName: string;
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    latency: number;
    throughput: number;
    lastUpdated: Date;
  }> {
    // In a real implementation, this would query performance metrics
    return {
      modelId,
      modelName: 'Sample Model',
      accuracy: 0.92,
      precision: 0.89,
      recall: 0.91,
      f1Score: 0.90,
      latency: 125,
      throughput: 1000,
      lastUpdated: new Date(),
    };
  }

  async getComplianceStatus(): Promise<{
    overallCompliance: number;
    compliantModels: number;
    nonCompliantModels: number;
    pendingReview: number;
    complianceIssues: Array<{
      modelId: string;
      modelName: string;
      issue: string;
      severity: string;
    }>;
  }> {
    return {
      overallCompliance: 87,
      compliantModels: 18,
      nonCompliantModels: 3,
      pendingReview: 4,
      complianceIssues: [
        { modelId: 'model-3', modelName: 'OCR Document Parser', issue: 'Missing documentation', severity: 'medium' },
        { modelId: 'model-5', modelName: 'Risk Assessment Model', issue: 'Outdated validation report', severity: 'low' },
        { modelId: 'model-7', modelName: 'Chatbot Model', issue: 'Bias metrics not calculated', severity: 'high' },
      ],
    };
  }

  async createAlert(
    type: Alert['type'],
    severity: Alert['severity'],
    message: string,
    modelId?: string,
    modelName?: string,
  ): Promise<Alert> {
    const alert: Alert = {
      alertId: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      modelId,
      modelName,
      message,
      createdAt: new Date(),
    };
    
    this.alerts.push(alert);
    return alert;
  }

  async getActiveAlerts(): Promise<Alert[]> {
    return this.alerts.filter(a => !a.resolvedAt);
  }

  async getAlertsBySeverity(severity: Alert['severity']): Promise<Alert[]> {
    return this.alerts.filter(a => a.severity === severity && !a.resolvedAt);
  }

  async resolveAlert(alertId: string): Promise<Alert> {
    const alert = this.alerts.find(a => a.alertId === alertId);
    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }
    
    alert.resolvedAt = new Date();
    return alert;
  }

  async getAlertSummary(): Promise<{
    total: number;
    active: number;
    resolved: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
  }> {
    const total = this.alerts.length;
    const active = this.alerts.filter(a => !a.resolvedAt).length;
    const resolved = total - active;
    
    const bySeverity: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };
    
    const byType: Record<string, number> = {
      model_risk: 0,
      validation_failure: 0,
      evaluation_due: 0,
      compliance_issue: 0,
    };
    
    this.alerts.forEach(alert => {
      if (bySeverity[alert.severity] !== undefined) {
        bySeverity[alert.severity]++;
      }
      if (byType[alert.type] !== undefined) {
        byType[alert.type]++;
      }
    });
    
    return { total, active, resolved, bySeverity, byType };
  }

  async getModelDeploymentHistory(modelId: string): Promise<{
    modelId: string;
    deployments: Array<{
      version: string;
      deployedAt: Date;
      deployedBy: string;
      status: string;
    }>;
  }> {
    // In a real implementation, this would query deployment history
    return {
      modelId,
      deployments: [
        { version: '1.0.0', deployedAt: new Date('2024-01-15'), deployedBy: 'user1', status: 'active' },
        { version: '0.9.0', deployedAt: new Date('2023-12-01'), deployedBy: 'user2', status: 'deprecated' },
        { version: '0.8.0', deployedAt: new Date('2023-10-15'), deployedBy: 'user3', status: 'retired' },
      ],
    };
  }
}
