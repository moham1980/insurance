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
export declare class SchemaRegistry {
    private config;
    private logger;
    private schemaCache;
    private httpClient;
    constructor(config: SchemaRegistryConfig, logger: Logger);
    initialize(): Promise<void>;
    registerSchema(subject: string, schema: object, version?: number): Promise<number>;
    getSchema(subject: string, version?: number): Promise<EventSchema>;
    validateEvent(subject: string, event: any, version?: number): Promise<boolean>;
    private validateAgainstSchema;
    getLatestSchema(subject: string): Promise<EventSchema>;
    checkCompatibility(subject: string, newSchema: object): Promise<boolean>;
}
export declare const InsuranceEventSchemas: {
    'insurance.claim.created': {
        type: string;
        required: string[];
        properties: {
            claimId: {
                type: string;
                format: string;
            };
            claimNumber: {
                type: string;
            };
            policyId: {
                type: string;
                format: string;
            };
            lossDate: {
                type: string;
                format: string;
            };
            lossType: {
                type: string;
                enum: string[];
            };
        };
    };
    'insurance.claim.approved': {
        type: string;
        required: string[];
        properties: {
            claimId: {
                type: string;
                format: string;
            };
            approvedAmount: {
                type: string;
                minimum: number;
            };
            approvedBy: {
                type: string;
            };
            approvedAt: {
                type: string;
                format: string;
            };
        };
    };
    'insurance.fraud.score_computed': {
        type: string;
        required: string[];
        properties: {
            claimId: {
                type: string;
                format: string;
            };
            score: {
                type: string;
                minimum: number;
                maximum: number;
            };
            signals: {
                type: string;
                items: {
                    type: string;
                };
            };
            holdClaim: {
                type: string;
            };
        };
    };
    'insurance.document.uploaded': {
        type: string;
        required: string[];
        properties: {
            documentId: {
                type: string;
                format: string;
            };
            claimId: {
                type: string;
                format: string;
            };
            documentType: {
                type: string;
                enum: string[];
            };
            fileName: {
                type: string;
            };
        };
    };
};
