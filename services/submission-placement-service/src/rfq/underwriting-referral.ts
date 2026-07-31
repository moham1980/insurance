import { Injectable } from '@nestjs/common';
import { UnderwritingServiceClient } from '../clients/underwriting-service.client';

export interface UnderwritingResult {
  inAppetite: boolean;
  referralRequired: boolean;
  referralId?: string;
  notes?: string[];
}

@Injectable()
export class UnderwritingReferral {
  constructor(private readonly uwClient: UnderwritingServiceClient) {}

  async evaluate(tenantId: string, body: any, authHeader?: string): Promise<UnderwritingResult> {
    try {
      const res = await this.uwClient.checkRiskAppetite(tenantId, body, authHeader);
      const data = res?.data || res;
      return {
        inAppetite: data?.inAppetite !== false,
        referralRequired: data?.referralRequired === true,
        referralId: data?.referralId,
        notes: data?.notes || [],
      };
    } catch {
      return { inAppetite: true, referralRequired: false, notes: ['uw_service_unavailable'] };
    }
  }

  async createReferral(tenantId: string, body: any, authHeader?: string): Promise<string | undefined> {
    try {
      const res = await this.uwClient.createReferral(tenantId, body, authHeader);
      return res?.data?.referralId || res?.data?.requestId;
    } catch {
      return undefined;
    }
  }
}
