/**
 * Model Switchboard Integration Adapter
 * 
 * Integrates AI Governance with the Model Switchboard Service
 * Enables policy-based model selection, governance checks, and fallback mechanisms
 */

import axios, { AxiosInstance } from 'axios';
import { getIntegrationConfig } from '../config/integration.config';

export interface ModelSelectionRequest {
  useCase: string;
  features?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high';
  userId?: string;
  sessionId?: string;
}

export interface ModelSelectionResponse {
  selectedModel: string;
  modelVersion: string;
  confidence: number;
  fallbackModel?: string;
  governanceChecks: {
    passed: boolean;
    checks: Array<{
      name: string;
      passed: boolean;
      message: string;
    }>;
  };
  rateLimit?: {
    remaining: number;
    resetTime: Date;
  };
}

export interface ModelUsageStatistics {
  modelId: string;
  useCase: string;
  requestCount: number;
  successCount: number;
  failureCount: number;
  averageLatency: number;
  lastUsed: Date;
}

export class ModelSwitchboardIntegration {
  private client: AxiosInstance;
  private config: ReturnType<typeof getIntegrationConfig>['modelSwitchboard'];
  private enabled: boolean;

  constructor() {
    const integrationConfig = getIntegrationConfig();
    this.config = integrationConfig.modelSwitchboard;
    this.enabled = this.config.enabled;

    if (this.enabled) {
      this.client = axios.create({
        baseURL: this.config.endpoint,
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
        },
        timeout: 10000,
      });
    }
  }

  /**
   * Select a model based on governance policies
   */
  async selectModel(request: ModelSelectionRequest): Promise<ModelSelectionResponse> {
    if (!this.enabled) {
      throw new Error('Model switchboard integration is not enabled');
    }

    try {
      const response = await this.client.post('/select', request);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to select model: ${error.message}`);
    }
  }

  /**
   * Register a model policy
   */
  async registerModelPolicy(policy: {
    useCase: string;
    modelId: string;
    rules: Array<{
      type: 'rate_limit' | 'auth' | 'circuit_breaker' | 'risk_level';
      config: Record<string, any>;
    }>;
  }): Promise<void> {
    if (!this.enabled) {
      throw new Error('Model switchboard integration is not enabled');
    }

    try {
      await this.client.post('/policies', policy);
    } catch (error: any) {
      throw new Error(`Failed to register model policy: ${error.message}`);
    }
  }

  /**
   * Get model usage statistics
   */
  async getModelUsageStatistics(modelId?: string): Promise<ModelUsageStatistics[]> {
    if (!this.enabled) {
      throw new Error('Model switchboard integration is not enabled');
    }

    try {
      const params = modelId ? { modelId } : {};
      const response = await this.client.get('/statistics', { params });
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get model usage statistics: ${error.message}`);
    }
  }

  /**
   * Get governance summary
   */
  async getGovernanceSummary(): Promise<{
    totalModels: number;
    activePolicies: number;
    totalRequests: number;
    governancePassRate: number;
  }> {
    if (!this.enabled) {
      throw new Error('Model switchboard integration is not enabled');
    }

    try {
      const response = await this.client.get('/governance/summary');
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get governance summary: ${error.message}`);
    }
  }

  /**
   * Health check for model switchboard
   */
  async healthCheck(): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    try {
      await this.client.get('/health');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if integration is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Export singleton instance
export const modelSwitchboardIntegration = new ModelSwitchboardIntegration();
