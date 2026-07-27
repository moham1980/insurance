import { Injectable } from '@nestjs/common';

export interface ModelSelectionPolicy {
  policyId: string;
  modelId: string;
  modelName: string;
  allowedUseCases: string[];
  maxRequestsPerMinute?: number;
  maxConcurrentRequests?: number;
  requiredAuthentication: boolean;
  auditLogging: boolean;
  dataRetentionDays?: number;
  fallbackModelId?: string;
  circuitBreakerThreshold?: number;
}

export interface ModelSelectionRequest {
  requestId: string;
  useCase: string;
  userId?: string;
  context?: Record<string, any>;
  timestamp: Date;
}

export interface ModelSelectionDecision {
  requestId: string;
  selectedModelId: string;
  selectedModelName: string;
  approved: boolean;
  reason?: string;
  fallbackUsed: boolean;
  governanceChecksPassed: string[];
  governanceChecksFailed: string[];
  selectedAt: Date;
}

@Injectable()
export class ModelSwitchboardGovernanceService {
  private modelPolicies: Map<string, ModelSelectionPolicy> = new Map();
  private selectionHistory: Map<string, ModelSelectionDecision> = new Map();
  private requestCounts: Map<string, number[]> = new Map();

  async registerModelPolicy(policy: ModelSelectionPolicy): Promise<void> {
    this.modelPolicies.set(policy.modelId, policy);
  }

  async getModelPolicy(modelId: string): Promise<ModelSelectionPolicy | null> {
    return this.modelPolicies.get(modelId) || null;
  }

  async getAllModelPolicies(): Promise<ModelSelectionPolicy[]> {
    return Array.from(this.modelPolicies.values());
  }

  async selectModel(
    availableModels: string[],
    request: ModelSelectionRequest,
  ): Promise<ModelSelectionDecision> {
    const requestId = request.requestId;
    const governanceChecksPassed: string[] = [];
    const governanceChecksFailed: string[] = [];

    // Filter models based on governance policies
    const eligibleModels = [];
    
    for (const modelId of availableModels) {
      const policy = this.modelPolicies.get(modelId);
      if (!policy) {
        governanceChecksFailed.push(`model_${modelId}_no_policy`);
        continue;
      }

      // Check use case authorization
      if (!policy.allowedUseCases.includes(request.useCase)) {
        governanceChecksFailed.push(`model_${modelId}_use_case_not_allowed`);
        continue;
      }
      governanceChecksPassed.push(`model_${modelId}_use_case_authorized`);

      // Check rate limiting
      if (policy.maxRequestsPerMinute) {
        const currentRate = await this.getRequestRate(modelId);
        if (currentRate >= policy.maxRequestsPerMinute) {
          governanceChecksFailed.push(`model_${modelId}_rate_limit_exceeded`);
          continue;
        }
      }
      governanceChecksPassed.push(`model_${modelId}_rate_limit_ok`);

      // Check authentication requirement
      if (policy.requiredAuthentication && !request.userId) {
        governanceChecksFailed.push(`model_${modelId}_auth_required`);
        continue;
      }
      governanceChecksPassed.push(`model_${modelId}_auth_ok`);

      // Check circuit breaker
      if (policy.circuitBreakerThreshold) {
        const failureRate = await this.getFailureRate(modelId);
        if (failureRate >= policy.circuitBreakerThreshold) {
          governanceChecksFailed.push(`model_${modelId}_circuit_breaker_open`);
          continue;
        }
      }
      governanceChecksPassed.push(`model_${modelId}_circuit_breaker_ok`);

      eligibleModels.push({ modelId, policy });
    }

    // Select model from eligible ones
    let selectedModel = null;
    let fallbackUsed = false;

    if (eligibleModels.length > 0) {
      // Simple selection: pick the first eligible model
      // In production, this could be based on performance, cost, etc.
      selectedModel = eligibleModels[0];
    } else {
      // Try to use fallback models
      for (const eligible of eligibleModels) {
        if (eligible.policy.fallbackModelId) {
          const fallbackPolicy = this.modelPolicies.get(eligible.policy.fallbackModelId);
          if (fallbackPolicy && fallbackPolicy.allowedUseCases.includes(request.useCase)) {
            selectedModel = { modelId: fallbackPolicy.modelId, policy: fallbackPolicy };
            fallbackUsed = true;
            governanceChecksPassed.push(`fallback_model_used`);
            break;
          }
        }
      }
    }

    if (!selectedModel) {
      const decision: ModelSelectionDecision = {
        requestId,
        selectedModelId: '',
        selectedModelName: '',
        approved: false,
        reason: 'No eligible model found for the given request and governance policies',
        fallbackUsed: false,
        governanceChecksPassed,
        governanceChecksFailed,
        selectedAt: new Date(),
      };
      
      this.selectionHistory.set(requestId, decision);
      return decision;
    }

    // Record request
    await this.recordRequest(selectedModel.modelId);

    const decision: ModelSelectionDecision = {
      requestId,
      selectedModelId: selectedModel.modelId,
      selectedModelName: selectedModel.policy.modelName,
      approved: true,
      fallbackUsed,
      governanceChecksPassed,
      governanceChecksFailed,
      selectedAt: new Date(),
    };

    this.selectionHistory.set(requestId, decision);

    // Audit log if required
    if (selectedModel.policy.auditLogging) {
      await this.auditModelSelection(decision);
    }

    return decision;
  }

  private async getRequestRate(modelId: string): Promise<number> {
    const timestamps = this.requestCounts.get(modelId) || [];
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    
    // Filter timestamps from the last minute
    const recentTimestamps = timestamps.filter(t => t >= oneMinuteAgo);
    this.requestCounts.set(modelId, recentTimestamps);
    
    return recentTimestamps.length;
  }

  private async getFailureRate(modelId: string): Promise<number> {
    // In a real implementation, this would query the monitoring service
    // For now, return a mock value
    return 0.05; // 5% failure rate
  }

  private async recordRequest(modelId: string): Promise<void> {
    const timestamps = this.requestCounts.get(modelId) || [];
    timestamps.push(Date.now());
    this.requestCounts.set(modelId, timestamps);
  }

  private async auditModelSelection(decision: ModelSelectionDecision): Promise<void> {
    // In a real implementation, this would log to an audit service
    console.log(`Audit: Model selection - ${decision.selectedModelId} for request ${decision.requestId}`);
  }

  async getSelectionDecision(requestId: string): Promise<ModelSelectionDecision | null> {
    return this.selectionHistory.get(requestId) || null;
  }

  async getSelectionHistory(modelId?: string, hours: number = 24): Promise<ModelSelectionDecision[]> {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    const history = Array.from(this.selectionHistory.values());
    
    const filtered = history.filter(d => d.selectedAt >= cutoffTime);
    
    if (modelId) {
      return filtered.filter(d => d.selectedModelId === modelId);
    }
    
    return filtered;
  }

  async updateModelPolicy(
    modelId: string,
    updates: Partial<ModelSelectionPolicy>,
  ): Promise<ModelSelectionPolicy> {
    const existingPolicy = this.modelPolicies.get(modelId);
    if (!existingPolicy) {
      throw new Error(`No policy found for model ${modelId}`);
    }

    const updatedPolicy: ModelSelectionPolicy = {
      ...existingPolicy,
      ...updates,
      policyId: existingPolicy.policyId,
      modelId: existingPolicy.modelId,
    };

    this.modelPolicies.set(modelId, updatedPolicy);
    return updatedPolicy;
  }

  async removeModelPolicy(modelId: string): Promise<void> {
    this.modelPolicies.delete(modelId);
  }

  async getModelUsageStatistics(modelId: string, hours: number = 24): Promise<{
    totalRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
    fallbackUsage: number;
    averageRequestRate: number;
    governanceCheckPassRate: number;
  }> {
    const history = await this.getSelectionHistory(modelId, hours);
    
    const totalRequests = history.length;
    const approvedRequests = history.filter(d => d.approved).length;
    const rejectedRequests = totalRequests - approvedRequests;
    const fallbackUsage = history.filter(d => d.fallbackUsed).length;
    
    const averageRequestRate = hours > 0 ? totalRequests / hours : 0;
    
    const totalChecks = history.reduce((sum, d) => sum + d.governanceChecksPassed.length + d.governanceChecksFailed.length, 0);
    const passedChecks = history.reduce((sum, d) => sum + d.governanceChecksPassed.length, 0);
    const governanceCheckPassRate = totalChecks > 0 ? passedChecks / totalChecks : 0;

    return {
      totalRequests,
      approvedRequests,
      rejectedRequests,
      fallbackUsage,
      averageRequestRate,
      governanceCheckPassRate,
    };
  }

  async getGovernanceSummary(): Promise<{
    totalModels: number;
    modelsWithPolicies: number;
    totalSelections: number;
    approvedSelections: number;
    rejectedSelections: number;
    overallPassRate: number;
  }> {
    const totalModels = this.modelPolicies.size;
    const history = Array.from(this.selectionHistory.values());
    
    const totalSelections = history.length;
    const approvedSelections = history.filter(d => d.approved).length;
    const rejectedSelections = totalSelections - approvedSelections;
    const overallPassRate = totalSelections > 0 ? approvedSelections / totalSelections : 0;

    return {
      totalModels,
      modelsWithPolicies: totalModels,
      totalSelections,
      approvedSelections,
      rejectedSelections,
      overallPassRate,
    };
  }
}
