export interface ISanhabClient {
  inquiryByNationalIdAndUniqueCode(params: { nationalId: string; uniqueCode: string }): Promise<SanhabInquiryResponse>;
  inquiryByPolicyNumber(params: { policyNumber: string }): Promise<SanhabInquiryResponse>;
  inquiryByVin(params: { vin: string }): Promise<SanhabInquiryResponse>;
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
