export interface ComparisonItem {
  quoteResponseId: string;
  carrierOrganizationId: string;
  premiumAmountMinor: string;
  premiumCurrency: string;
  basePremiumMinor: string | null;
  taxesMinor: string | null;
  feesMinor: string | null;
  deductibleAmountMinor: string | null;
  commissionRateBps: number | null;
  commissionAmountMinor: string | null;
  markupAmountMinor: string;
  rankScore: string | null;
  comparisonFactors: Record<string, any> | null;
  expiresAt: Date | null;
  rank: number;
}

export interface ComparisonResult {
  quoteRequestId: string;
  submissionId: string;
  tenantId: string;
  recommendation: ComparisonItem;
  alternatives: ComparisonItem[];
  factors: {
    totalQuotes: number;
    sortedBy: string;
  };
}
