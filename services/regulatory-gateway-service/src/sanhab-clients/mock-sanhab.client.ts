import { ISanhabClient, SanhabInquiryResponse, SanhabInquiryResultCode, SanhabSubmissionRequest, SanhabSubmissionResponse } from './sanhab-client.interface';

/**
 * Mock Sanhab Client for development/testing.
 * In production, replace with real SOAP/REST client using official Sanhab API credentials.
 * 
 * Sanhab API requires:
 * - Certificate-based authentication from Central Insurance of Iran
 * - WSDL endpoint for SOAP services
 * - Official API documentation
 */
export class MockSanhabClient implements ISanhabClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.SANHAB_API_URL || 'https://api.sanhab.ir/mock';
    this.apiKey = process.env.SANHAB_API_KEY || 'mock-key';
  }

  async inquiryByNationalIdAndUniqueCode(params: {
    nationalId: string;
    uniqueCode: string;
  }): Promise<SanhabInquiryResponse> {
    // Simulate API call
    await this.delay(500);

    const uc = params.uniqueCode.toUpperCase();
    
    // Mock responses based on unique code patterns
    if (uc.includes('404')) {
      return {
        resultCode: 'NOT_FOUND',
        errorMessage: 'Policy not found in Sanhab database',
      };
    }
    
    if (uc.includes('MISMATCH')) {
      return {
        resultCode: 'MISMATCH',
        errorMessage: 'National ID does not match policy holder',
        policyNumber: 'PN-MISMATCH-001',
        uniqueCode: params.uniqueCode,
        insuredNationalId: '0000000000', // Different from input
      };
    }
    
    if (uc.includes('PENDING')) {
      return {
        resultCode: 'PENDING_SYNC',
        errorMessage: 'Policy pending synchronization with Sanhab',
        policyNumber: 'PN-PENDING-001',
        uniqueCode: params.uniqueCode,
        insuredNationalId: params.nationalId,
      };
    }

    if (uc.includes('UPSTREAM')) {
      return {
        resultCode: 'UPSTREAM_ERROR',
        errorMessage: 'Sanhab service temporarily unavailable',
      };
    }

    // Successful response
    return {
      resultCode: 'OK',
      policyNumber: `PN-${params.uniqueCode}`,
      uniqueCode: params.uniqueCode,
      insuredNationalId: params.nationalId,
      insurerCode: '123',
      issueDate: '2024-01-01',
      expiryDate: '2025-01-01',
    };
  }

  async inquiryByPolicyNumber(params: {
    policyNumber: string;
  }): Promise<SanhabInquiryResponse> {
    await this.delay(500);

    if (params.policyNumber === '404' || params.policyNumber.includes('404')) {
      return {
        resultCode: 'NOT_FOUND',
        errorMessage: 'Policy not found in Sanhab database',
      };
    }

    return {
      resultCode: 'OK',
      policyNumber: params.policyNumber,
      uniqueCode: 'UC-' + params.policyNumber,
      insuredNationalId: '1234567890',
      insurerCode: '123',
      issueDate: '2024-01-01',
      expiryDate: '2025-01-01',
    };
  }

  async inquiryByVin(params: { vin: string }): Promise<SanhabInquiryResponse> {
    await this.delay(500);

    if (params.vin === '404' || params.vin.includes('404')) {
      return {
        resultCode: 'NOT_FOUND',
        errorMessage: 'Vehicle not found in Sanhab database',
      };
    }

    return {
      resultCode: 'OK',
      policyNumber: 'PN-' + params.vin.substring(0, 10),
      uniqueCode: 'UC-' + params.vin.substring(0, 10),
      vehicleVin: params.vin,
      insurerCode: '123',
      issueDate: '2024-01-01',
      expiryDate: '2025-01-01',
    };
  }

  async submitPolicy(params: SanhabSubmissionRequest): Promise<SanhabSubmissionResponse> {
    await this.delay(500);

    const uc = params.uniqueCode || `UC-${params.policyNumber}`;
    const pn = params.policyNumber;

    if (pn === '404' || pn.includes('404')) {
      return {
        resultCode: 'NOT_FOUND',
        errorMessage: 'Policy not found in Sanhab database',
      };
    }

    if (uc.includes('MISMATCH')) {
      return {
        resultCode: 'MISMATCH',
        errorMessage: 'National ID does not match policy holder',
        policyNumber: pn,
        uniqueCode: uc,
      };
    }

    if (uc.includes('PENDING')) {
      return {
        resultCode: 'PENDING_SYNC',
        errorMessage: 'Policy pending synchronization with Sanhab',
        policyNumber: pn,
        uniqueCode: uc,
      };
    }

    if (uc.includes('UPSTREAM')) {
      return {
        resultCode: 'UPSTREAM_ERROR',
        errorMessage: 'Sanhab service temporarily unavailable',
      };
    }

    return {
      resultCode: 'OK',
      policyNumber: pn,
      uniqueCode: uc,
      insuredNationalId: params.nationalId,
      vehicleVin: params.vin,
      insurerCode: '123',
      issueDate: '2024-01-01',
      expiryDate: '2025-01-01',
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
