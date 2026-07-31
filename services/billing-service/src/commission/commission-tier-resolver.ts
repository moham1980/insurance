import { CommissionSplitRole } from './commission-split.entity';

export interface CommissionTier {
  role: CommissionSplitRole;
  base: 'premium_gross' | 'premium_net';
  shareBps: number;
  organizationId?: string;
  partyId?: string;
  floor?: number;
  cap?: number;
}

export interface CommissionSchedule {
  currency: string;
  tiers: CommissionTier[];
}

export function resolveCommissionSchedule(params: {
  distributionAgreementId?: string;
  distributionAgreementSnapshot?: Record<string, any>;
  currency: string;
}): CommissionSchedule {
  const currency = params.currency || 'IRR';
  const snapshot = params.distributionAgreementSnapshot;

  if (snapshot?.tiers && Array.isArray(snapshot.tiers)) {
    return {
      currency,
      tiers: snapshot.tiers as CommissionTier[],
    };
  }

  // Default multi-tier broker hierarchy split if no schedule is supplied.
  return {
    currency,
    tiers: [
      {
        role: 'BROKER',
        base: 'premium_gross',
        shareBps: 800, // 8% default to broker
        organizationId: snapshot?.organizationId,
      },
      {
        role: 'SUB_AGENT',
        base: 'premium_gross',
        shareBps: 200, // 2% default to sub-agent
        organizationId: snapshot?.subAgentOrganizationId,
        partyId: snapshot?.subAgentPartyId,
      },
    ],
  };
}
