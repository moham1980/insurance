/**
 * Deployment Pipeline Integration Adapter
 * 
 * Integrates AI Governance with model deployment pipeline (Kubernetes, MLflow, SageMaker, etc.)
 * Supports canary deployments, blue-green deployments, and deployment tracking
 */

import axios, { AxiosInstance } from 'axios';
import { getIntegrationConfig } from '../config/integration.config';

export interface DeploymentConfig {
  modelId: string;
  modelVersion: string;
  environment: 'staging' | 'production';
  deploymentStrategy: 'canary' | 'blue-green' | 'rolling';
  canaryPercentage?: number;
  replicas?: number;
  resources?: {
    cpu: string;
    memory: string;
  };
}

export interface DeploymentStatus {
  deploymentId: string;
  status: 'pending' | 'deploying' | 'success' | 'failed' | 'rolling_back';
  startTime: Date;
  endTime?: Date;
  logs?: string[];
  metrics?: {
    cpuUsage: number;
    memoryUsage: number;
    requestCount: number;
    errorRate: number;
  };
}

export class DeploymentPipelineIntegration {
  private client: AxiosInstance;
  private config: ReturnType<typeof getIntegrationConfig>['deploymentPipeline'];
  private enabled: boolean;

  constructor() {
    const integrationConfig = getIntegrationConfig();
    this.config = integrationConfig.deploymentPipeline;
    this.enabled = this.config.enabled;

    if (this.enabled) {
      this.client = axios.create({
        baseURL: this.config.endpoint,
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
        },
        timeout: 30000,
      });
    }
  }

  /**
   * Deploy a model to the specified environment
   */
  async deployModel(config: DeploymentConfig): Promise<DeploymentStatus> {
    if (!this.enabled) {
      throw new Error('Deployment pipeline integration is not enabled');
    }

    try {
      const response = await this.client.post('/deployments', {
        modelId: config.modelId,
        modelVersion: config.modelVersion,
        environment: config.environment,
        strategy: config.deploymentStrategy,
        canaryPercentage: config.canaryPercentage,
        replicas: config.replicas,
        resources: config.resources,
      });

      return this.mapDeploymentStatus(response.data);
    } catch (error: any) {
      throw new Error(`Failed to deploy model: ${error.message}`);
    }
  }

  /**
   * Get deployment status
   */
  async getDeploymentStatus(deploymentId: string): Promise<DeploymentStatus> {
    if (!this.enabled) {
      throw new Error('Deployment pipeline integration is not enabled');
    }

    try {
      const response = await this.client.get(`/deployments/${deploymentId}`);
      return this.mapDeploymentStatus(response.data);
    } catch (error: any) {
      throw new Error(`Failed to get deployment status: ${error.message}`);
    }
  }

  /**
   * Rollback a deployment
   */
  async rollbackDeployment(deploymentId: string): Promise<DeploymentStatus> {
    if (!this.enabled) {
      throw new Error('Deployment pipeline integration is not enabled');
    }

    try {
      const response = await this.client.post(`/deployments/${deploymentId}/rollback`);
      return this.mapDeploymentStatus(response.data);
    } catch (error: any) {
      throw new Error(`Failed to rollback deployment: ${error.message}`);
    }
  }

  /**
   * Scale a deployment
   */
  async scaleDeployment(deploymentId: string, replicas: number): Promise<DeploymentStatus> {
    if (!this.enabled) {
      throw new Error('Deployment pipeline integration is not enabled');
    }

    try {
      const response = await this.client.patch(`/deployments/${deploymentId}`, {
        replicas,
      });
      return this.mapDeploymentStatus(response.data);
    } catch (error: any) {
      throw new Error(`Failed to scale deployment: ${error.message}`);
    }
  }

  /**
   * Get deployment logs
   */
  async getDeploymentLogs(deploymentId: string, tailLines?: number): Promise<string[]> {
    if (!this.enabled) {
      throw new Error('Deployment pipeline integration is not enabled');
    }

    try {
      const params = tailLines ? { tailLines } : {};
      const response = await this.client.get(`/deployments/${deploymentId}/logs`, { params });
      return response.data.logs || [];
    } catch (error: any) {
      throw new Error(`Failed to get deployment logs: ${error.message}`);
    }
  }

  /**
   * Get deployment metrics
   */
  async getDeploymentMetrics(deploymentId: string): Promise<DeploymentStatus['metrics']> {
    if (!this.enabled) {
      throw new Error('Deployment pipeline integration is not enabled');
    }

    try {
      const response = await this.client.get(`/deployments/${deploymentId}/metrics`);
      return response.data.metrics;
    } catch (error: any) {
      throw new Error(`Failed to get deployment metrics: ${error.message}`);
    }
  }

  /**
   * Check if canary deployment is supported
   */
  isCanaryEnabled(): boolean {
    return this.enabled && this.config.canaryEnabled;
  }

  /**
   * Check if blue-green deployment is supported
   */
  isBlueGreenEnabled(): boolean {
    return this.enabled && this.config.blueGreenEnabled;
  }

  /**
   * Map external deployment status to internal format
   */
  private mapDeploymentStatus(data: any): DeploymentStatus {
    return {
      deploymentId: data.deploymentId || data.id,
      status: data.status || 'pending',
      startTime: new Date(data.startTime || Date.now()),
      endTime: data.endTime ? new Date(data.endTime) : undefined,
      logs: data.logs,
      metrics: data.metrics,
    };
  }

  /**
   * Health check for deployment pipeline
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
}

// Export singleton instance
export const deploymentPipelineIntegration = new DeploymentPipelineIntegration();
