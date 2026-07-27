import { Injectable } from '@nestjs/common';

export type ValidationStatus = 'pending' | 'running' | 'passed' | 'failed' | 'needs_review';
export type ValidationType = 'functional' | 'performance' | 'security' | 'bias' | 'compliance' | 'data_quality';

export interface ValidationTest {
  testName: string;
  status: ValidationStatus;
  score?: number;
  details?: string;
  executedAt?: Date;
}

export interface ValidationReport {
  reportId: string;
  modelId: string;
  modelVersion: string;
  validationType: ValidationType;
  status: ValidationStatus;
  tests: ValidationTest[];
  overallScore: number;
  passedTests: number;
  failedTests: number;
  startedAt: Date;
  completedAt?: Date;
  validatedBy?: string;
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
}

@Injectable()
export class ValidationWorkflowService {
  private validationReports: Map<string, ValidationReport> = new Map();

  private getModelValidationUrl(): string | null {
    const url = process.env.MODEL_VALIDATION_URL || process.env.MODEL_SWITCHBOARD_URL;
    if (typeof url === 'string' && url.length > 0) return url;
    return null;
  }

  async initiateValidation(
    modelId: string,
    modelVersion: string,
    validationType: ValidationType,
    initiatedBy: string,
  ): Promise<ValidationReport> {
    const reportId = `vr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const report: ValidationReport = {
      reportId,
      modelId,
      modelVersion,
      validationType,
      status: 'pending',
      tests: [],
      overallScore: 0,
      passedTests: 0,
      failedTests: 0,
      startedAt: new Date(),
      validatedBy: initiatedBy,
    };

    this.validationReports.set(reportId, report);
    
    // Start validation asynchronously
    this.runValidation(reportId).catch(console.error);

    return report;
  }

  private async runValidation(reportId: string): Promise<void> {
    const report = this.validationReports.get(reportId);
    if (!report) return;

    report.status = 'running';
    this.validationReports.set(reportId, report);

    // Simulate running tests based on validation type
    const tests = await this.executeTests(report.validationType, report.modelId);
    
    report.tests = tests;
    report.completedAt = new Date();
    
    // Calculate overall score
    const passedCount = tests.filter(t => t.status === 'passed').length;
    const failedCount = tests.filter(t => t.status === 'failed').length;
    report.passedTests = passedCount;
    report.failedTests = failedCount;
    
    // Calculate overall score (0-100)
    if (tests.length > 0) {
      const totalScore = tests.reduce((sum, t) => sum + (t.score || 0), 0);
      report.overallScore = Math.round(totalScore / tests.length);
    }

    // Determine overall status
    if (report.overallScore >= 80 && failedCount === 0) {
      report.status = 'passed';
    } else if (report.overallScore >= 60) {
      report.status = 'needs_review';
    } else {
      report.status = 'failed';
    }

    this.validationReports.set(reportId, report);
  }

  private async executeTests(validationType: ValidationType, modelId: string): Promise<ValidationTest[]> {
    const tests: ValidationTest[] = [];
    
    switch (validationType) {
      case 'functional':
        tests.push(
          await this.runTest('API Integration Test', modelId),
          await this.runTest('Input/Output Validation', modelId),
          await this.runTest('Error Handling Test', modelId),
          await this.runTest('Edge Cases Test', modelId),
        );
        break;
      case 'performance':
        tests.push(
          await this.runTest('Latency Test', modelId),
          await this.runTest('Throughput Test', modelId),
          await this.runTest('Memory Usage Test', modelId),
          await this.runTest('Concurrency Test', modelId),
        );
        break;
      case 'security':
        tests.push(
          await this.runTest('Input Sanitization Test', modelId),
          await this.runTest('Data Privacy Test', modelId),
          await this.runTest('Authentication Test', modelId),
          await this.runTest('Authorization Test', modelId),
        );
        break;
      case 'bias':
        tests.push(
          await this.runTest('Demographic Parity Test', modelId),
          await this.runTest('Equal Opportunity Test', modelId),
          await this.runTest('Disparate Impact Test', modelId),
          await this.runTest('Fairness Metrics Test', modelId),
        );
        break;
      case 'compliance':
        tests.push(
          await this.runTest('Regulatory Compliance Test', modelId),
          await this.runTest('Data Governance Test', modelId),
          await this.runTest('Audit Trail Test', modelId),
          await this.runTest('Documentation Test', modelId),
        );
        break;
      case 'data_quality':
        tests.push(
          await this.runTest('Data Completeness Test', modelId),
          await this.runTest('Data Consistency Test', modelId),
          await this.runTest('Data Accuracy Test', modelId),
          await this.runTest('Data Freshness Test', modelId),
        );
        break;
    }

    return tests;
  }

  private async runTest(testName: string, modelId: string): Promise<ValidationTest> {
    const validationUrl = this.getModelValidationUrl();

    if (validationUrl) {
      try {
        const res = await fetch(`${validationUrl}/models/${modelId}/validate`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ testName }),
        });
        if (res.ok) {
          const result: any = await res.json().catch(() => ({}));
          const score = typeof result.score === 'number' ? result.score : 0;
          const status = result.status || (score >= 75 ? 'passed' : 'failed');
          return {
            testName,
            status: status as ValidationStatus,
            score,
            details: result.details || `Test ${status} with score ${score}`,
            executedAt: new Date(),
          };
        }
      } catch {
        // Fall through to no-endpoint handling
      }
    }

    // No validation endpoint configured: mark as needs_review instead of fabricating scores
    return {
      testName,
      status: 'needs_review',
      score: 0,
      details: 'No model validation endpoint configured; manual review required',
      executedAt: new Date(),
    };
  }

  async getValidationReport(reportId: string): Promise<ValidationReport | null> {
    return this.validationReports.get(reportId) || null;
  }

  async getValidationReportsByModel(modelId: string): Promise<ValidationReport[]> {
    return Array.from(this.validationReports.values()).filter(r => r.modelId === modelId);
  }

  async approveValidationReport(
    reportId: string,
    approvedBy: string,
  ): Promise<ValidationReport> {
    const report = this.validationReports.get(reportId);
    
    if (!report) {
      throw new Error(`Validation report ${reportId} not found`);
    }

    if (report.status !== 'passed' && report.status !== 'needs_review') {
      throw new Error(`Cannot approve report with status ${report.status}`);
    }

    report.approvedBy = approvedBy;
    report.approvedAt = new Date();
    this.validationReports.set(reportId, report);

    return report;
  }

  async rejectValidationReport(
    reportId: string,
    rejectedBy: string,
    reason: string,
  ): Promise<ValidationReport> {
    const report = this.validationReports.get(reportId);
    
    if (!report) {
      throw new Error(`Validation report ${reportId} not found`);
    }

    report.status = 'failed';
    report.approvedBy = rejectedBy;
    report.approvedAt = new Date();
    report.rejectionReason = reason;
    this.validationReports.set(reportId, report);

    return report;
  }

  async getPendingValidations(): Promise<ValidationReport[]> {
    return Array.from(this.validationReports.values()).filter(
      r => r.status === 'pending' || r.status === 'running'
    );
  }

  async getValidationSummary(): Promise<{
    total: number;
    passed: number;
    failed: number;
    needsReview: number;
    pending: number;
    running: number;
  }> {
    const reports = Array.from(this.validationReports.values());
    
    return {
      total: reports.length,
      passed: reports.filter(r => r.status === 'passed').length,
      failed: reports.filter(r => r.status === 'failed').length,
      needsReview: reports.filter(r => r.status === 'needs_review').length,
      pending: reports.filter(r => r.status === 'pending').length,
      running: reports.filter(r => r.status === 'running').length,
    };
  }
}
