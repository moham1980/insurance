/**
 * Customer 360 Data Model
 * Unified customer profile aggregating data from all services
 */

export interface Customer360Profile {
  customerId: string;
  nationalId: string;
  profile: CustomerProfile;
  policies: PolicySummary[];
  claims: ClaimSummary[];
  payments: PaymentSummary[];
  complaints: ComplaintSummary[];
  amlStatus: AMLStatus;
  kycStatus: KYCStatus;
  journey: JourneyEvent[];
  relationships: CustomerRelationship[];
  riskProfile: RiskProfile;
  preferences: CustomerPreferences;
  consent: ConsentSummary[];
  metadata: ProfileMetadata;
}

export interface CustomerProfile {
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender?: 'male' | 'female' | 'other';
  nationality: string;
  primaryPhone: string;
  secondaryPhone?: string;
  email: string;
  address: Address;
  occupation?: string;
  employer?: string;
  incomeLevel?: string;
  maritalStatus?: string;
  education?: string;
  language: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Address {
  street: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface PolicySummary {
  policyId: string;
  policyNumber: string;
  productType: string;
  status: 'active' | 'expired' | 'cancelled' | 'pending';
  startDate: Date;
  endDate: Date;
  premiumAmount: number;
  premiumCurrency: string;
  coverageDetails: {
    vehicle?: VehicleInfo;
    property?: PropertyInfo;
    life?: LifeInfo;
  };
  agentId?: string;
  branchId?: string;
  renewalCount: number;
  claimsCount: number;
  lastClaimDate?: Date;
}

export interface VehicleInfo {
  make: string;
  model: string;
  year: number;
  plateNumber: string;
  vin?: string;
  color?: string;
}

export interface PropertyInfo {
  type: string;
  address: Address;
  constructionType?: string;
  yearBuilt?: number;
  area?: number;
}

export interface LifeInfo {
  sumAssured: number;
  beneficiaries: Beneficiary[];
}

export interface Beneficiary {
  name: string;
  relationship: string;
  percentage: number;
}

export interface ClaimSummary {
  claimId: string;
  claimNumber: string;
  policyId: string;
  policyNumber: string;
  incidentDate: Date;
  reportedDate: Date;
  status: 'reported' | 'investigating' | 'assessing' | 'approved' | 'rejected' | 'paid' | 'closed';
  claimType: string;
  estimatedAmount: number;
  paidAmount?: number;
  currency: string;
  adjusterId?: string;
  description: string;
  documents: DocumentSummary[];
  fraudFlags?: string[];
}

export interface DocumentSummary {
  documentId: string;
  type: string;
  uploadedAt: Date;
  status: string;
}

export interface PaymentSummary {
  paymentId: string;
  policyId: string;
  policyNumber: string;
  paymentType: 'premium' | 'claim_payout' | 'refund' | 'commission';
  amount: number;
  currency: string;
  paymentDate: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  paymentMethod: string;
  reference?: string;
}

export interface ComplaintSummary {
  complaintId: string;
  category: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'escalated' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  submittedDate: Date;
  resolvedDate?: Date;
  resolution?: string;
  satisfactionRating?: number;
}

export interface AMLStatus {
  status: 'cleared' | 'under_review' | 'flagged' | 'sanctioned';
  lastScreeningDate: Date;
  riskLevel: 'low' | 'medium' | 'high';
  flags: AMLFlag[];
  watchListMatch?: boolean;
  pepMatch?: boolean;
}

export interface AMLFlag {
  flagId: string;
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  createdAt: Date;
  resolved?: boolean;
}

export interface KYCStatus {
  status: 'not_started' | 'in_progress' | 'verified' | 'rejected' | 'expired';
  verificationLevel: 'basic' | 'standard' | 'enhanced';
  lastVerifiedDate?: Date;
  expiryDate?: Date;
  documents: KYCDocument[];
  riskScore: number;
}

export interface KYCDocument {
  documentType: string;
  documentNumber: string;
  issuedDate: Date;
  expiryDate?: Date;
  issuingCountry: string;
  verified: boolean;
}

export interface JourneyEvent {
  eventId: string;
  eventType: string;
  eventCategory: 'policy' | 'claim' | 'payment' | 'complaint' | 'inquiry';
  timestamp: Date;
  description: string;
  channel: 'web' | 'mobile' | 'branch' | 'call_center' | 'agent';
  outcome?: string;
  metadata?: Record<string, any>;
}

export interface CustomerRelationship {
  relationshipId: string;
  type: 'family' | 'business' | 'referrer' | 'beneficiary';
  relatedCustomerId: string;
  relatedCustomerName: string;
  relationshipDescription: string;
  startDate: Date;
  endDate?: Date;
}

export interface RiskProfile {
  overallRiskScore: number;
  riskCategory: 'low' | 'medium' | 'high';
  factors: RiskFactor[];
  lastCalculated: Date;
}

export interface RiskFactor {
  factor: string;
  impact: number;
  description: string;
}

export interface CustomerPreferences {
  communicationPreferences: {
    email: boolean;
    sms: boolean;
    phone: boolean;
    post: boolean;
  };
  language: string;
    marketing: boolean;
    analytics: boolean;
    thirdPartySharing: boolean;
  }[];
  notificationSettings: {
    policyRenewal: boolean;
    paymentReminder: boolean;
    claimUpdates: boolean;
    promotional: boolean;
  };
}

export interface ConsentSummary {
  purpose: string;
  status: 'granted' | 'denied' | 'revoked' | 'expired';
  grantedAt?: Date;
  expiresAt?: Date;
  version: string;
}

export interface ProfileMetadata {
  dataSource: string;
  lastSyncedAt: Date;
  dataFreshness: 'real_time' | 'near_real_time' | 'daily' | 'stale';
  completeness: number; // 0-100 percentage
  confidence: number; // 0-100 percentage
}

export interface PortfolioSummary {
  customerId: string;
  totalPolicies: number;
  activePolicies: number;
  totalPremium: number;
  totalCoverage: number;
  totalClaims: number;
  openClaims: number;
  totalClaimAmount: number;
  paidClaims: number;
  outstandingClaims: number;
  totalPayments: number;
  netPosition: number;
  assets: {
    vehicles: VehicleInfo[];
    properties: PropertyInfo[];
    lifeSumAssured: number;
  };
  riskMetrics: {
    overallRiskScore: number;
    riskCategory: 'low' | 'medium' | 'high';
    amlStatus: string;
    kycStatus: string;
  };
}

export interface ConsentRecord {
  consentId: string;
  customerId: string;
  purpose: string;
  status: 'granted' | 'denied' | 'revoked' | 'expired';
  grantedAt?: Date;
  expiresAt?: Date;
  revokedAt?: Date;
  revocationReason?: string;
  version: string;
  source: string;
  channel: string;
  actorUserId?: string;
  tenantId?: string;
  createdAt: Date;
  updatedAt: Date;
}
