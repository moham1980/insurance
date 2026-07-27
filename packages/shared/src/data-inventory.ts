/**
 * Data Inventory
 * Catalog of all data assets in the system with metadata for governance
 */

export type DataSensitivity = 'public' | 'internal' | 'confidential' | 'restricted' | 'pii';

export type DataRetentionPeriod = '1_day' | '7_days' | '30_days' | '90_days' | '1_year' | '3_years' | '7_years' | '10_years' | 'permanent';

export interface DataAsset {
  id: string;
  name: string;
  description: string;
  category: string; // e.g., 'customer', 'policy', 'claim', 'financial', 'operational'
  source: string; // e.g., 'policy-service', 'claims-service', 'external_sanhab'
  schema: string; // Database schema or API schema
  table?: string; // Database table name
  fields: DataField[];
  sensitivity: DataSensitivity;
  retentionPeriod: DataRetentionPeriod;
  lawfulBasis: string[]; // e.g., 'contract', 'legal_obligation', 'legitimate_interest', 'consent'
  purposes: string[]; // e.g., 'underwriting', 'claims_processing', 'fraud_detection'
  owner: string; // Team or person responsible
  steward: string; // Data steward
  piiFields: string[]; // List of field names containing PII
  encryptionRequired: boolean;
  accessControl: string; // e.g., 'rbac', 'abac', 'custom'
  lineage: DataLineage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DataField {
  name: string;
  type: string;
  description: string;
  isPii: boolean;
  isSensitive: boolean;
  isEncrypted: boolean;
  maskingStrategy?: 'full' | 'partial' | 'hash' | 'tokenize' | null;
}

export interface DataLineage {
  source: string;
  transformation?: string;
  destination: string;
  timestamp: Date;
}

/**
 * Data Inventory Catalog
 * Central registry of all data assets in the system
 */
export const DATA_INVENTORY: DataAsset[] = [
  {
    id: 'DATA-001',
    name: 'Customer Personal Data',
    description: 'Personal information of customers including name, contact details, and identification',
    category: 'customer',
    source: 'party-service',
    schema: 'party',
    table: 'customers',
    fields: [
      { name: 'customer_id', type: 'uuid', description: 'Unique customer identifier', isPii: false, isSensitive: false, isEncrypted: false },
      { name: 'national_id', type: 'varchar', description: 'National identification number', isPii: true, isSensitive: true, isEncrypted: true, maskingStrategy: 'partial' },
      { name: 'first_name', type: 'varchar', description: 'Customer first name', isPii: true, isSensitive: true, isEncrypted: false, maskingStrategy: 'partial' },
      { name: 'last_name', type: 'varchar', description: 'Customer last name', isPii: true, isSensitive: true, isEncrypted: false, maskingStrategy: 'partial' },
      { name: 'phone_number', type: 'varchar', description: 'Customer phone number', isPii: true, isSensitive: true, isEncrypted: true, maskingStrategy: 'partial' },
      { name: 'email', type: 'varchar', description: 'Customer email address', isPii: true, isSensitive: true, isEncrypted: true, maskingStrategy: 'partial' },
      { name: 'address', type: 'jsonb', description: 'Customer address', isPii: true, isSensitive: true, isEncrypted: true, maskingStrategy: 'partial' },
      { name: 'date_of_birth', type: 'date', description: 'Customer date of birth', isPii: true, isSensitive: true, isEncrypted: true, maskingStrategy: 'partial' },
    ],
    sensitivity: 'pii',
    retentionPeriod: '7_years',
    lawfulBasis: ['contract', 'legal_obligation'],
    purposes: ['underwriting', 'claims_processing', 'customer_service', 'fraud_detection'],
    owner: 'Customer Team',
    steward: 'Data Steward',
    piiFields: ['national_id', 'first_name', 'last_name', 'phone_number', 'email', 'address', 'date_of_birth'],
    encryptionRequired: true,
    accessControl: 'abac',
    lineage: [],
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
  {
    id: 'DATA-002',
    name: 'Policy Data',
    description: 'Insurance policy information including coverage, premiums, and terms',
    category: 'policy',
    source: 'policy-service',
    schema: 'policy',
    table: 'policies',
    fields: [
      { name: 'policy_id', type: 'uuid', description: 'Unique policy identifier', isPii: false, isSensitive: false, isEncrypted: false },
      { name: 'policy_number', type: 'varchar', description: 'Policy number', isPii: true, isSensitive: true, isEncrypted: false, maskingStrategy: 'partial' },
      { name: 'customer_id', type: 'uuid', description: 'Reference to customer', isPii: false, isSensitive: false, isEncrypted: false },
      { name: 'vehicle_info', type: 'jsonb', description: 'Vehicle information', isPii: true, isSensitive: true, isEncrypted: true, maskingStrategy: 'partial' },
      { name: 'premium_amount', type: 'decimal', description: 'Premium amount', isPii: false, isSensitive: true, isEncrypted: false },
      { name: 'coverage_details', type: 'jsonb', description: 'Coverage details', isPii: false, isSensitive: false, isEncrypted: false },
    ],
    sensitivity: 'confidential',
    retentionPeriod: '10_years',
    lawfulBasis: ['contract', 'legal_obligation'],
    purposes: ['underwriting', 'claims_processing', 'reporting', 'reconciliation'],
    owner: 'Policy Team',
    steward: 'Data Steward',
    piiFields: ['policy_number', 'vehicle_info'],
    encryptionRequired: true,
    accessControl: 'abac',
    lineage: [
      { source: 'party-service', destination: 'policy-service', timestamp: new Date('2025-01-01') },
    ],
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
  {
    id: 'DATA-003',
    name: 'Claims Data',
    description: 'Claims information including incident details, assessments, and payments',
    category: 'claim',
    source: 'claims-service',
    schema: 'claims',
    table: 'claims',
    fields: [
      { name: 'claim_id', type: 'uuid', description: 'Unique claim identifier', isPii: false, isSensitive: false, isEncrypted: false },
      { name: 'claim_number', type: 'varchar', description: 'Claim number', isPii: true, isSensitive: true, isEncrypted: false, maskingStrategy: 'partial' },
      { name: 'policy_id', type: 'uuid', description: 'Reference to policy', isPii: false, isSensitive: false, isEncrypted: false },
      { name: 'incident_description', type: 'text', description: 'Incident description', isPii: true, isSensitive: true, isEncrypted: true, maskingStrategy: 'partial' },
      { name: 'loss_amount', type: 'decimal', description: 'Loss amount', isPii: false, isSensitive: true, isEncrypted: false },
      { name: 'payment_details', type: 'jsonb', description: 'Payment details', isPii: true, isSensitive: true, isEncrypted: true, maskingStrategy: 'full' },
    ],
    sensitivity: 'confidential',
    retentionPeriod: '10_years',
    lawfulBasis: ['contract', 'legal_obligation'],
    purposes: ['claims_processing', 'fraud_detection', 'reporting', 'audit'],
    owner: 'Claims Team',
    steward: 'Data Steward',
    piiFields: ['claim_number', 'incident_description', 'payment_details'],
    encryptionRequired: true,
    accessControl: 'abac',
    lineage: [
      { source: 'policy-service', destination: 'claims-service', timestamp: new Date('2025-01-01') },
    ],
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
  {
    id: 'DATA-004',
    name: 'Financial Transactions',
    description: 'Payment and financial transaction records',
    category: 'financial',
    source: 'payments-service',
    schema: 'payments',
    table: 'transactions',
    fields: [
      { name: 'transaction_id', type: 'uuid', description: 'Unique transaction identifier', isPii: false, isSensitive: false, isEncrypted: false },
      { name: 'account_number', type: 'varchar', description: 'Bank account number', isPii: true, isSensitive: true, isEncrypted: true, maskingStrategy: 'partial' },
      { name: 'amount', type: 'decimal', description: 'Transaction amount', isPii: false, isSensitive: true, isEncrypted: false },
      { name: 'card_number', type: 'varchar', description: 'Payment card number', isPii: true, isSensitive: true, isEncrypted: true, maskingStrategy: 'partial' },
    ],
    sensitivity: 'restricted',
    retentionPeriod: '7_years',
    lawfulBasis: ['contract', 'legal_obligation'],
    purposes: ['payments', 'reconciliation', 'audit', 'reporting'],
    owner: 'Finance Team',
    steward: 'Data Steward',
    piiFields: ['account_number', 'card_number'],
    encryptionRequired: true,
    accessControl: 'abac',
    lineage: [],
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
  {
    id: 'DATA-005',
    name: 'Sanhab Inquiry Logs',
    description: 'Logs of inquiries made to Sanhab (Central Insurance of Iran)',
    category: 'operational',
    source: 'regulatory-gateway-service',
    schema: 'regulatory',
    table: 'sanhab_inquiries',
    fields: [
      { name: 'inquiry_id', type: 'uuid', description: 'Unique inquiry identifier', isPii: false, isSensitive: false, isEncrypted: false },
      { name: 'national_id', type: 'varchar', description: 'National ID for inquiry', isPii: true, isSensitive: true, isEncrypted: true, maskingStrategy: 'partial' },
      { name: 'inquiry_type', type: 'varchar', description: 'Type of inquiry', isPii: false, isSensitive: false, isEncrypted: false },
      { name: 'response_data', type: 'jsonb', description: 'Response from Sanhab', isPii: true, isSensitive: true, isEncrypted: true, maskingStrategy: 'partial' },
    ],
    sensitivity: 'confidential',
    retentionPeriod: '3_years',
    lawfulBasis: ['legal_obligation'],
    purposes: ['compliance', 'audit', 'dispute_resolution'],
    owner: 'Compliance Team',
    steward: 'Data Steward',
    piiFields: ['national_id', 'response_data'],
    encryptionRequired: true,
    accessControl: 'abac',
    lineage: [],
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
];

/**
 * Get data asset by ID
 */
export function getDataAssetById(id: string): DataAsset | undefined {
  return DATA_INVENTORY.find(asset => asset.id === id);
}

/**
 * Get data assets by category
 */
export function getDataAssetsByCategory(category: string): DataAsset[] {
  return DATA_INVENTORY.filter(asset => asset.category === category);
}

/**
 * Get data assets by sensitivity level
 */
export function getDataAssetsBySensitivity(sensitivity: DataSensitivity): DataAsset[] {
  return DATA_INVENTORY.filter(asset => asset.sensitivity === sensitivity);
}

/**
 * Get PII fields across all data assets
 */
export function getAllPiiFields(): Array<{ assetId: string; assetName: string; fieldName: string; maskingStrategy: string }> {
  const piiFields: Array<{ assetId: string; assetName: string; fieldName: string; maskingStrategy: string }> = [];
  
  for (const asset of DATA_INVENTORY) {
    for (const field of asset.fields) {
      if (field.isPii) {
        piiFields.push({
          assetId: asset.id,
          assetName: asset.name,
          fieldName: field.name,
          maskingStrategy: field.maskingStrategy || 'none',
        });
      }
    }
  }
  
  return piiFields;
}
