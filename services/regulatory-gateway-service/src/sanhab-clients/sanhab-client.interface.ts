export interface SanhabSubmissionRequest {
  policyNumber: string;
  nationalId?: string;
  vin?: string;
  policyData?: Record<string, any>;
}

export interface SanhabSubmissionResponse {
  resultCode: SanhabInquiryResultCode;
  uniqueCode?: string;
  policyNumber?: string;
  insuredNationalId?: string;
  vehicleVin?: string;
  insurerCode?: string;
  issueDate?: string;
  expiryDate?: string;
  errorMessage?: string;
}

export interface ISanhabClient {
  inquiryByNationalIdAndUniqueCode(params: { nationalId: string; uniqueCode: string }): Promise<SanhabInquiryResponse>;
  inquiryByPolicyNumber(params: { policyNumber: string }): Promise<SanhabInquiryResponse>;
  inquiryByVin(params: { vin: string }): Promise<SanhabInquiryResponse>;
  submitPolicy?(params: SanhabSubmissionRequest): Promise<SanhabSubmissionResponse>;
  healthCheck?(): Promise<{ healthy: boolean; message: string; latencyMs?: number }>;
}

export type SanhabInquiryResultCode = 'OK' | 'NOT_FOUND' | 'MISMATCH' | 'PENDING_SYNC' | 'UPSTREAM_ERROR';

export interface SanhabInquiryResponse {
  resultCode: SanhabInquiryResultCode;
  policyNumber?: string;
  uniqueCode?: string;
  insuredNationalId?: string;
  vehicleVin?: string;
  insurerCode?: string;
  issueDate?: string;
  expiryDate?: string;
  errorMessage?: string;
}
