export class SchemaRegistry {
    config;
    logger;
    schemaCache = new Map();
    httpClient;
    constructor(config, logger) {
        this.config = {
            cacheCapacity: 100,
            ...config,
        };
        this.logger = logger;
    }
    async initialize() {
        this.logger.info('Schema Registry initialized', { url: this.config.url });
    }
    async registerSchema(subject, schema, version = 1) {
        try {
            const response = await fetch(`${this.config.url}/subjects/${subject}/versions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/vnd.schemaregistry.v1+json' },
                body: JSON.stringify({ schema: JSON.stringify(schema) }),
            });
            if (!response.ok) {
                throw new Error(`Failed to register schema: ${response.statusText}`);
            }
            const result = await response.json();
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
        }
        catch (error) {
            this.logger.error('Failed to register schema', error, { subject, version });
            throw error;
        }
    }
    async getSchema(subject, version = 1) {
        const cacheKey = `${subject}:${version}`;
        // Check cache first
        if (this.schemaCache.has(cacheKey)) {
            return this.schemaCache.get(cacheKey);
        }
        try {
            const response = await fetch(`${this.config.url}/subjects/${subject}/versions/${version}`, {
                method: 'GET',
                headers: { 'Accept': 'application/vnd.schemaregistry.v1+json' },
            });
            if (!response.ok) {
                throw new Error(`Schema not found: ${subject} v${version}`);
            }
            const result = await response.json();
            const eventSchema = {
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
        }
        catch (error) {
            this.logger.error('Failed to get schema', error, { subject, version });
            throw error;
        }
    }
    async validateEvent(subject, event, version = 1) {
        try {
            const schema = await this.getSchema(subject, version);
            // Basic validation - in production use Ajv or similar
            return this.validateAgainstSchema(event, schema.schema);
        }
        catch (error) {
            this.logger.error('Schema validation failed', error, { subject, version });
            return false;
        }
    }
    validateAgainstSchema(event, schema) {
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
    async getLatestSchema(subject) {
        return this.getSchema(subject, 'latest');
    }
    async checkCompatibility(subject, newSchema) {
        try {
            const response = await fetch(`${this.config.url}/compatibility/subjects/${subject}/versions/latest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/vnd.schemaregistry.v1+json' },
                body: JSON.stringify({ schema: JSON.stringify(newSchema) }),
            });
            if (!response.ok) {
                return false;
            }
            const result = await response.json();
            return result.is_compatible === true;
        }
        catch (error) {
            this.logger.error('Compatibility check failed', error, { subject });
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
//# sourceMappingURL=SchemaRegistry.js.map