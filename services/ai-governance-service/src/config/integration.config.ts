/**
 * AI Governance Service Integration Configuration
 * 
 * This file defines the external system integrations for AI Governance
 * including deployment pipelines, monitoring systems, incident management,
 * and other external services.
 */

export interface IntegrationConfig {
  // Model Deployment Pipeline Integration
  deploymentPipeline: {
    enabled: boolean;
    type: 'kubernetes' | 'mlflow' | 'sagemaker' | 'custom';
    endpoint: string;
    apiKey?: string;
    canaryEnabled: boolean;
    blueGreenEnabled: boolean;
  };

  // Monitoring & Observability Integration
  monitoring: {
    enabled: boolean;
    type: 'prometheus' | 'datadog' | 'cloudwatch' | 'custom';
    prometheusUrl?: string;
    grafanaUrl?: string;
    alertWebhookUrl?: string;
  };

  // Model Registry Integration
  modelRegistry: {
    enabled: boolean;
    type: 'mlflow' | 'mlflow-tracking' | 'custom';
    endpoint: string;
    apiKey?: string;
  };

  // Model Artifact Storage Integration
  artifactStorage: {
    enabled: boolean;
    type: 's3' | 'gcs' | 'azure' | 'minio';
    endpoint: string;
    bucket: string;
    accessKey?: string;
    secretKey?: string;
  };

  // Test Execution Framework Integration
  testFramework: {
    enabled: boolean;
    type: 'pytest' | 'junit' | 'custom';
    endpoint: string;
    apiKey?: string;
  };

  // Bias Testing Tools Integration
  biasTesting: {
    enabled: boolean;
    type: 'fairlearn' | 'aix360' | 'what-if-tool' | 'custom';
    endpoint: string;
    apiKey?: string;
  };

  // Incident Management System Integration
  incidentManagement: {
    enabled: boolean;
    type: 'pagerduty' | 'servicenow' | 'jira' | 'opsgenie' | 'custom';
    endpoint: string;
    apiKey?: string;
  };

  // On-Call Rotation Integration
  onCallRotation: {
    enabled: boolean;
    type: 'pagerduty' | 'opsgenie' | 'custom';
    endpoint: string;
    apiKey?: string;
  };

  // Notification System Integration
  notifications: {
    enabled: boolean;
    type: 'slack' | 'email' | 'sms' | 'custom';
    slackWebhookUrl?: string;
    emailSmtpHost?: string;
    emailSmtpPort?: number;
    smsEndpoint?: string;
  };

  // Model Switchboard Service Integration
  modelSwitchboard: {
    enabled: boolean;
    endpoint: string;
    apiKey?: string;
  };

  // AI Use Cases Integration
  aiUseCases: {
    copilot: {
      enabled: boolean;
      endpoint: string;
      apiKey?: string;
    };
    fraud: {
      enabled: boolean;
      endpoint: string;
      apiKey?: string;
    };
    documentAI: {
      enabled: boolean;
      endpoint: string;
      apiKey?: string;
    };
  };

  // MRO Committee Workflow Integration
  committeeWorkflow: {
    enabled: boolean;
    type: 'email' | 'slack' | 'custom-workflow' | 'jira';
    endpoint: string;
    apiKey?: string;
  };

  // Approval Chain Integration
  approvalChain: {
    enabled: boolean;
    type: 'jira' | 'servicenow' | 'custom';
    endpoint: string;
    apiKey?: string;
  };
}

/**
 * Default Integration Configuration
 * These values can be overridden by environment variables
 */
export const defaultIntegrationConfig: IntegrationConfig = {
  deploymentPipeline: {
    enabled: process.env.DEPLOYMENT_PIPELINE_ENABLED === 'true',
    type: (process.env.DEPLOYMENT_PIPELINE_TYPE as any) || 'kubernetes',
    endpoint: process.env.DEPLOYMENT_PIPELINE_ENDPOINT || 'http://localhost:8080',
    apiKey: process.env.DEPLOYMENT_PIPELINE_API_KEY,
    canaryEnabled: process.env.CANARY_ENABLED === 'true',
    blueGreenEnabled: process.env.BLUE_GREEN_ENABLED === 'true',
  },

  monitoring: {
    enabled: process.env.MONITORING_ENABLED === 'true',
    type: (process.env.MONITORING_TYPE as any) || 'prometheus',
    prometheusUrl: process.env.PROMETHEUS_URL || 'http://localhost:9090',
    grafanaUrl: process.env.GRAFANA_URL || 'http://localhost:3000',
    alertWebhookUrl: process.env.ALERT_WEBHOOK_URL,
  },

  modelRegistry: {
    enabled: process.env.MODEL_REGISTRY_ENABLED === 'true',
    type: (process.env.MODEL_REGISTRY_TYPE as any) || 'mlflow',
    endpoint: process.env.MODEL_REGISTRY_ENDPOINT || 'http://localhost:5000',
    apiKey: process.env.MODEL_REGISTRY_API_KEY,
  },

  artifactStorage: {
    enabled: process.env.ARTIFACT_STORAGE_ENABLED === 'true',
    type: (process.env.ARTIFACT_STORAGE_TYPE as any) || 's3',
    endpoint: process.env.ARTIFACT_STORAGE_ENDPOINT || 'http://localhost:9000',
    bucket: process.env.ARTIFACT_STORAGE_BUCKET || 'ml-models',
    accessKey: process.env.ARTIFACT_STORAGE_ACCESS_KEY,
    secretKey: process.env.ARTIFACT_STORAGE_SECRET_KEY,
  },

  testFramework: {
    enabled: process.env.TEST_FRAMEWORK_ENABLED === 'true',
    type: (process.env.TEST_FRAMEWORK_TYPE as any) || 'pytest',
    endpoint: process.env.TEST_FRAMEWORK_ENDPOINT || 'http://localhost:8000',
    apiKey: process.env.TEST_FRAMEWORK_API_KEY,
  },

  biasTesting: {
    enabled: process.env.BIAS_TESTING_ENABLED === 'true',
    type: (process.env.BIAS_TESTING_TYPE as any) || 'fairlearn',
    endpoint: process.env.BIAS_TESTING_ENDPOINT || 'http://localhost:8001',
    apiKey: process.env.BIAS_TESTING_API_KEY,
  },

  incidentManagement: {
    enabled: process.env.INCIDENT_MANAGEMENT_ENABLED === 'true',
    type: (process.env.INCIDENT_MANAGEMENT_TYPE as any) || 'pagerduty',
    endpoint: process.env.INCIDENT_MANAGEMENT_ENDPOINT || 'https://api.pagerduty.com',
    apiKey: process.env.INCIDENT_MANAGEMENT_API_KEY,
  },

  onCallRotation: {
    enabled: process.env.ON_CALL_ROTATION_ENABLED === 'true',
    type: (process.env.ON_CALL_ROTATION_TYPE as any) || 'pagerduty',
    endpoint: process.env.ON_CALL_ROTATION_ENDPOINT || 'https://api.pagerduty.com',
    apiKey: process.env.ON_CALL_ROTATION_API_KEY,
  },

  notifications: {
    enabled: process.env.NOTIFICATIONS_ENABLED === 'true',
    type: (process.env.NOTIFICATIONS_TYPE as any) || 'slack',
    slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
    emailSmtpHost: process.env.EMAIL_SMTP_HOST,
    emailSmtpPort: process.env.EMAIL_SMTP_PORT ? parseInt(process.env.EMAIL_SMTP_PORT) : 587,
    smsEndpoint: process.env.SMS_ENDPOINT,
  },

  modelSwitchboard: {
    enabled: process.env.MODEL_SWITCHBOARD_ENABLED === 'true',
    endpoint: process.env.MODEL_SWITCHBOARD_ENDPOINT || 'http://localhost:3002',
    apiKey: process.env.MODEL_SWITCHBOARD_API_KEY,
  },

  aiUseCases: {
    copilot: {
      enabled: process.env.COPILOT_ENABLED === 'true',
      endpoint: process.env.COPILOT_ENDPOINT || 'http://localhost:3003',
      apiKey: process.env.COPILOT_API_KEY,
    },
    fraud: {
      enabled: process.env.FRAUD_ENABLED === 'true',
      endpoint: process.env.FRAUD_ENDPOINT || 'http://localhost:3004',
      apiKey: process.env.FRAUD_API_KEY,
    },
    documentAI: {
      enabled: process.env.DOCUMENT_AI_ENABLED === 'true',
      endpoint: process.env.DOCUMENT_AI_ENDPOINT || 'http://localhost:3005',
      apiKey: process.env.DOCUMENT_AI_API_KEY,
    },
  },

  committeeWorkflow: {
    enabled: process.env.COMMITTEE_WORKFLOW_ENABLED === 'true',
    type: (process.env.COMMITTEE_WORKFLOW_TYPE as any) || 'slack',
    endpoint: process.env.COMMITTEE_WORKFLOW_ENDPOINT || '',
    apiKey: process.env.COMMITTEE_WORKFLOW_API_KEY,
  },

  approvalChain: {
    enabled: process.env.APPROVAL_CHAIN_ENABLED === 'true',
    type: (process.env.APPROVAL_CHAIN_TYPE as any) || 'jira',
    endpoint: process.env.APPROVAL_CHAIN_ENDPOINT || 'https://api.atlassian.com',
    apiKey: process.env.APPROVAL_CHAIN_API_KEY,
  },
};

/**
 * Get integration configuration
 * Merges default config with any environment-specific overrides
 */
export function getIntegrationConfig(): IntegrationConfig {
  return defaultIntegrationConfig;
}

/**
 * Validate integration configuration
 * Throws an error if required fields are missing for enabled integrations
 */
export function validateIntegrationConfig(config: IntegrationConfig): void {
  if (config.deploymentPipeline.enabled && !config.deploymentPipeline.endpoint) {
    throw new Error('DEPLOYMENT_PIPELINE_ENDPOINT is required when deployment pipeline is enabled');
  }

  if (config.monitoring.enabled && config.monitoring.type === 'prometheus' && !config.monitoring.prometheusUrl) {
    throw new Error('PROMETHEUS_URL is required when Prometheus monitoring is enabled');
  }

  if (config.modelRegistry.enabled && !config.modelRegistry.endpoint) {
    throw new Error('MODEL_REGISTRY_ENDPOINT is required when model registry is enabled');
  }

  if (config.artifactStorage.enabled && !config.artifactStorage.endpoint) {
    throw new Error('ARTIFACT_STORAGE_ENDPOINT is required when artifact storage is enabled');
  }

  if (config.incidentManagement.enabled && !config.incidentManagement.endpoint) {
    throw new Error('INCIDENT_MANAGEMENT_ENDPOINT is required when incident management is enabled');
  }

  if (config.modelSwitchboard.enabled && !config.modelSwitchboard.endpoint) {
    throw new Error('MODEL_SWITCHBOARD_ENDPOINT is required when model switchboard is enabled');
  }
}
