import { Injectable } from '@nestjs/common';
import { FraudServiceClient } from '../clients/fraud-service.client';

export interface AmlResult {
  passed: boolean;
  riskScore?: number;
  reasons?: string[];
  caseId?: string;
}

@Injectable()
export class AmlCheckService {
  constructor(private readonly fraudClient: FraudServiceClient) {}

  async check(tenantId: string, partyId: string, exposure: Record<string, any>, authHeader?: string): Promise<AmlResult> {
    try {
      const res = await this.fraudClient.computeScore(tenantId, { partyId, exposure, kind: 'aml' }, authHeader);
      const data = res?.data || res;
      return {
        passed: data?.passed !== false,
        riskScore: data?.riskScore ?? 0,
        reasons: data?.reasons || [],
        caseId: data?.caseId,
      };
    } catch {
      return { passed: true, riskScore: 0, reasons: ['aml_service_unavailable'] };
    }
  }
}
