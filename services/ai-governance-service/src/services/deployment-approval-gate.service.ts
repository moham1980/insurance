import { Injectable } from '@nestjs/common';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type DeploymentEnvironment = 'staging' | 'production';

export interface ApprovalRequest {
  requestId: string;
  modelId: string;
  modelVersion: string;
  environment: DeploymentEnvironment;
  requestedBy: string;
  requestedAt: Date;
  status: ApprovalStatus;
  approvers: string[];
  approvals: Array<{ approver: string; approvedAt: Date; comments?: string }>;
  rejections: Array<{ approver: string; rejectedAt: Date; reason: string }>;
  validationReportId?: string;
  riskAssessmentId?: string;
  scheduledDeploymentAt?: Date;
  deployedAt?: Date;
  deployedBy?: string;
}

export interface ApprovalPolicy {
  environment: DeploymentEnvironment;
  requiredApprovers: number;
  requiredRoles: string[];
  requiresValidationReport: boolean;
  requiresRiskAssessment: boolean;
  minValidationScore: number;
  maxRiskLevel: string;
}

@Injectable()
export class DeploymentApprovalGateService {
  private approvalRequests: Map<string, ApprovalRequest> = new Map();
  private approvalPolicies: Map<DeploymentEnvironment, ApprovalPolicy> = new Map();

  constructor() {
    this.initializePolicies();
  }

  private initializePolicies(): void {
    this.approvalPolicies.set('staging', {
      environment: 'staging',
      requiredApprovers: 1,
      requiredRoles: ['ml_engineer', 'data_scientist'],
      requiresValidationReport: true,
      requiresRiskAssessment: false,
      minValidationScore: 70,
      maxRiskLevel: 'high',
    });

    this.approvalPolicies.set('production', {
      environment: 'production',
      requiredApprovers: 2,
      requiredRoles: ['ml_engineer', 'data_scientist', 'ai_governance_lead'],
      requiresValidationReport: true,
      requiresRiskAssessment: true,
      minValidationScore: 85,
      maxRiskLevel: 'medium',
    });
  }

  async requestDeploymentApproval(
    modelId: string,
    modelVersion: string,
    environment: DeploymentEnvironment,
    requestedBy: string,
    validationReportId?: string,
    riskAssessmentId?: string,
  ): Promise<ApprovalRequest> {
    const requestId = `dar-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const policy = this.approvalPolicies.get(environment);

    if (!policy) {
      throw new Error(`No approval policy found for environment: ${environment}`);
    }

    // Validate prerequisites
    if (policy.requiresValidationReport && !validationReportId) {
      throw new Error(`Validation report is required for ${environment} deployment`);
    }

    if (policy.requiresRiskAssessment && !riskAssessmentId) {
      throw new Error(`Risk assessment is required for ${environment} deployment`);
    }

    const request: ApprovalRequest = {
      requestId,
      modelId,
      modelVersion,
      environment,
      requestedBy,
      requestedAt: new Date(),
      status: 'pending',
      approvers: policy.requiredRoles,
      approvals: [],
      rejections: [],
      validationReportId,
      riskAssessmentId,
    };

    this.approvalRequests.set(requestId, request);
    return request;
  }

  async approveDeployment(
    requestId: string,
    approver: string,
    comments?: string,
  ): Promise<ApprovalRequest> {
    const request = this.approvalRequests.get(requestId);
    if (!request) {
      throw new Error(`Approval request ${requestId} not found`);
    }

    if (request.status !== 'pending') {
      throw new Error(`Cannot approve request with status ${request.status}`);
    }

    // Check if approver is in the allowed list
    if (!request.approvers.includes(approver)) {
      throw new Error(`User ${approver} is not authorized to approve this deployment`);
    }

    // Check if approver has already approved
    if (request.approvals.some(a => a.approver === approver)) {
      throw new Error(`User ${approver} has already approved this deployment`);
    }

    request.approvals.push({
      approver,
      approvedAt: new Date(),
      comments,
    });

    // Check if we have enough approvals
    const policy = this.approvalPolicies.get(request.environment);
    if (policy && request.approvals.length >= policy.requiredApprovers) {
      request.status = 'approved';
    }

    this.approvalRequests.set(requestId, request);
    return request;
  }

  async rejectDeployment(
    requestId: string,
    approver: string,
    reason: string,
  ): Promise<ApprovalRequest> {
    const request = this.approvalRequests.get(requestId);
    if (!request) {
      throw new Error(`Approval request ${requestId} not found`);
    }

    if (request.status !== 'pending') {
      throw new Error(`Cannot reject request with status ${request.status}`);
    }

    if (!request.approvers.includes(approver)) {
      throw new Error(`User ${approver} is not authorized to reject this deployment`);
    }

    request.rejections.push({
      approver,
      rejectedAt: new Date(),
      reason,
    });

    request.status = 'rejected';
    this.approvalRequests.set(requestId, request);
    return request;
  }

  async cancelDeploymentRequest(requestId: string, cancelledBy: string): Promise<ApprovalRequest> {
    const request = this.approvalRequests.get(requestId);
    if (!request) {
      throw new Error(`Approval request ${requestId} not found`);
    }

    if (request.status === 'approved' || request.status === 'rejected') {
      throw new Error(`Cannot cancel request with status ${request.status}`);
    }

    if (request.requestedBy !== cancelledBy) {
      throw new Error(`Only the requester can cancel the deployment request`);
    }

    request.status = 'cancelled';
    this.approvalRequests.set(requestId, request);
    return request;
  }

  async getApprovalRequest(requestId: string): Promise<ApprovalRequest | null> {
    return this.approvalRequests.get(requestId) || null;
  }

  async getApprovalRequestsByModel(modelId: string): Promise<ApprovalRequest[]> {
    return Array.from(this.approvalRequests.values()).filter(r => r.modelId === modelId);
  }

  async getPendingApprovals(): Promise<ApprovalRequest[]> {
    return Array.from(this.approvalRequests.values()).filter(r => r.status === 'pending');
  }

  async getPendingApprovalsForApprover(approver: string): Promise<ApprovalRequest[]> {
    return Array.from(this.approvalRequests.values()).filter(
      r => r.status === 'pending' && r.approvers.includes(approver)
    );
  }

  async scheduleDeployment(
    requestId: string,
    scheduledAt: Date,
    scheduledBy: string,
  ): Promise<ApprovalRequest> {
    const request = this.approvalRequests.get(requestId);
    if (!request) {
      throw new Error(`Approval request ${requestId} not found`);
    }

    if (request.status !== 'approved') {
      throw new Error(`Can only schedule approved deployments`);
    }

    if (request.requestedBy !== scheduledBy) {
      throw new Error(`Only the requester can schedule the deployment`);
    }

    request.scheduledDeploymentAt = scheduledAt;
    this.approvalRequests.set(requestId, request);
    return request;
  }

  async confirmDeployment(
    requestId: string,
    deployedBy: string,
  ): Promise<ApprovalRequest> {
    const request = this.approvalRequests.get(requestId);
    if (!request) {
      throw new Error(`Approval request ${requestId} not found`);
    }

    if (request.status !== 'approved') {
      throw new Error(`Can only confirm approved deployments`);
    }

    request.deployedAt = new Date();
    request.deployedBy = deployedBy;
    this.approvalRequests.set(requestId, request);
    return request;
  }

  async getApprovalPolicy(environment: DeploymentEnvironment): Promise<ApprovalPolicy | null> {
    return this.approvalPolicies.get(environment) || null;
  }

  async updateApprovalPolicy(
    environment: DeploymentEnvironment,
    policy: Partial<ApprovalPolicy>,
  ): Promise<ApprovalPolicy> {
    const existingPolicy = this.approvalPolicies.get(environment);
    if (!existingPolicy) {
      throw new Error(`No policy found for environment: ${environment}`);
    }

    const updatedPolicy: ApprovalPolicy = {
      ...existingPolicy,
      ...policy,
      environment,
    };

    this.approvalPolicies.set(environment, updatedPolicy);
    return updatedPolicy;
  }

  async getDeploymentStatistics(): Promise<{
    totalRequests: number;
    pendingRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
    cancelledRequests: number;
    byEnvironment: Record<string, number>;
    averageApprovalTime: number;
  }> {
    const requests = Array.from(this.approvalRequests.values());
    const pending = requests.filter(r => r.status === 'pending');
    const approved = requests.filter(r => r.status === 'approved');
    const rejected = requests.filter(r => r.status === 'rejected');
    const cancelled = requests.filter(r => r.status === 'cancelled');

    const byEnvironment: Record<string, number> = {
      staging: requests.filter(r => r.environment === 'staging').length,
      production: requests.filter(r => r.environment === 'production').length,
    };

    // Calculate average approval time (for approved requests)
    const approvedWithTime = approved.filter(r => r.deployedAt);
    const averageApprovalTime = approvedWithTime.length > 0
      ? approvedWithTime.reduce((sum, r) => sum + (r.deployedAt!.getTime() - r.requestedAt.getTime()), 0) / approvedWithTime.length
      : 0;

    return {
      totalRequests: requests.length,
      pendingRequests: pending.length,
      approvedRequests: approved.length,
      rejectedRequests: rejected.length,
      cancelledRequests: cancelled.length,
      byEnvironment,
      averageApprovalTime,
    };
  }
}
