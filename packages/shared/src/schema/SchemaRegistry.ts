import { Kafka } from 'kafkajs';
import { Logger } from '../observability';

export interface SchemaRegistryConfig {
  url: string;
  cacheCapacity?: number;
}

export interface EventSchema {
  subject: string;
  version: number;
  schema: object;
  id?: number;
}

export class SchemaRegistry {
  private config: SchemaRegistryConfig;
  private logger: Logger;
  private schemaCache: Map<string, EventSchema> = new Map();
  private httpClient: any;

  constructor(config: SchemaRegistryConfig, logger: Logger) {
    this.config = {
      cacheCapacity: 100,
      ...config,
    };
    this.logger = logger;
  }

  async initialize(): Promise<void> {
    this.logger.info('Schema Registry initialized', { url: this.config.url });
  }

  async registerSchema(subject: string, schema: object, version: number = 1): Promise<number> {
    try {
      const response = await fetch(`${this.config.url}/subjects/${subject}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/vnd.schemaregistry.v1+json' },
        body: JSON.stringify({ schema: JSON.stringify(schema) }),
      });

      if (!response.ok) {
        throw new Error(`Failed to register schema: ${response.statusText}`);
      }

      const result = await response.json() as { id: number };
      const schemaId = result.id;

      // Cache the schema
      this.schemaCache.set(`${subject}:${version}`, {
        subject,
        version,
        schema,
        id: schemaId,
      });

      this.logger.info('Schema registered', { subject, version, schemaId });
      return schemaId;
    } catch (error) {
      this.logger.error('Failed to register schema', error as Error, { subject, version });
      throw error;
    }
  }

  async getSchema(subject: string, version: number = 1): Promise<EventSchema> {
    const cacheKey = `${subject}:${version}`;

    // Check cache first
    if (this.schemaCache.has(cacheKey)) {
      return this.schemaCache.get(cacheKey)!;
    }

    try {
      const response = await fetch(`${this.config.url}/subjects/${subject}/versions/${version}`, {
        method: 'GET',
        headers: { 'Accept': 'application/vnd.schemaregistry.v1+json' },
      });

      if (!response.ok) {
        throw new Error(`Schema not found: ${subject} v${version}`);
      }

      const result = await response.json() as { schema: string; id: number };
      const eventSchema: EventSchema = {
        subject,
        version,
        schema: JSON.parse(result.schema),
        id: result.id,
      };

      // Cache with LRU eviction
      if (this.schemaCache.size >= (this.config.cacheCapacity || 100)) {
        const firstKey = this.schemaCache.keys().next().value;
        if (firstKey) {
          this.schemaCache.delete(firstKey);
        }
      }
      this.schemaCache.set(cacheKey, eventSchema);

      return eventSchema;
    } catch (error) {
      this.logger.error('Failed to get schema', error as Error, { subject, version });
      throw error;
    }
  }

  async validateEvent(subject: string, event: any, version: number = 1): Promise<boolean> {
    try {
      const schema = await this.getSchema(subject, version);
      // Basic validation - in production use Ajv or similar
      return this.validateAgainstSchema(event, schema.schema);
    } catch (error) {
      this.logger.error('Schema validation failed', error as Error, { subject, version });
      return false;
    }
  }

  private validateAgainstSchema(event: any, schema: any): boolean {
    // Simplified validation - in production use proper JSON Schema validation
    if (schema.required && Array.isArray(schema.required)) {
      for (const field of schema.required) {
        if (event[field] === undefined || event[field] === null) {
          return false;
        }
      }
    }
    return true;
  }

  async getLatestSchema(subject: string): Promise<EventSchema> {
    return this.getSchema(subject, 'latest' as any);
  }

  async checkCompatibility(subject: string, newSchema: object): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.url}/compatibility/subjects/${subject}/versions/latest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/vnd.schemaregistry.v1+json' },
        body: JSON.stringify({ schema: JSON.stringify(newSchema) }),
      });

      if (!response.ok) {
        return false;
      }

      const result = await response.json() as { is_compatible: boolean };
      return result.is_compatible === true;
    } catch (error) {
      this.logger.error('Compatibility check failed', error as Error, { subject });
      return false;
    }
  }
}

// Predefined schemas for insurance domain
export const InsuranceEventSchemas = {
  'insurance.claim.created': {
    type: 'object',
    required: ['claimId', 'claimNumber', 'policyId', 'lossDate', 'lossType'],
    properties: {
      claimId: { type: 'string', format: 'uuid' },
      claimNumber: { type: 'string' },
      policyId: { type: 'string', format: 'uuid' },
      lossDate: { type: 'string', format: 'date-time' },
      lossType: { type: 'string', enum: ['AUTO', 'PROPERTY', 'LIABILITY', 'HEALTH', 'LIFE', 'OTHER'] },
    },
  },
  'insurance.claim.approved': {
    type: 'object',
    required: ['claimId', 'approvedAmount'],
    properties: {
      claimId: { type: 'string', format: 'uuid' },
      approvedAmount: { type: 'number', minimum: 0 },
      approvedBy: { type: 'string' },
      approvedAt: { type: 'string', format: 'date-time' },
    },
  },
  'insurance.fraud.score_computed': {
    type: 'object',
    required: ['claimId', 'score'],
    properties: {
      claimId: { type: 'string', format: 'uuid' },
      score: { type: 'number', minimum: 0, maximum: 100 },
      signals: { type: 'array', items: { type: 'string' } },
      holdClaim: { type: 'boolean' },
    },
  },
  'insurance.document.uploaded': {
    type: 'object',
    required: ['documentId', 'claimId', 'documentType', 'fileName'],
    properties: {
      documentId: { type: 'string', format: 'uuid' },
      claimId: { type: 'string', format: 'uuid' },
      documentType: { type: 'string', enum: ['invoice', 'medical_report', 'police_report', 'photo', 'receipt', 'other'] },
      fileName: { type: 'string' },
    },
  },
};
