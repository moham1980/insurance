import { Injectable } from '@nestjs/common';
import { QuoteResponse } from '../entities/QuoteResponse';

export interface RankingPreferences {
  sortBy?: 'best_value' | 'lowest_premium' | 'highest_coverage' | 'fastest_bind' | 'custom';
  weights?: Record<string, number>;
}

@Injectable()
export class RankingRule {
  async rank(responses: QuoteResponse[], preferences?: RankingPreferences): Promise<QuoteResponse[]> {
    const sorted = [...responses];
    const by = preferences?.sortBy || 'best_value';

    const score = (r: QuoteResponse): number => {
      if (r.rankScore) return parseFloat(r.rankScore);
      const premium = BigInt(r.premiumAmountMinor);
      const commission = BigInt(r.commissionAmountMinor || 0);
      const markup = BigInt(r.markupAmountMinor || 0);
      const valueScore = premium > 0n ? Number((commission + markup) * 10000n / premium) : 0;
      // Lower premium scores higher (0-100) scaled inversely
      const premiumScore = Number(1000000n / (premium + 1n));
      const weights = preferences?.weights || { value: 0.5, premium: 0.5 };
      return valueScore * (weights.value || 0.5) + premiumScore * (weights.premium || 0.5);
    };

    sorted.sort((a, b) => {
      if (by === 'lowest_premium') return Number(BigInt(a.premiumAmountMinor) - BigInt(b.premiumAmountMinor));
      if (by === 'highest_coverage') {
        const ca = BigInt(a.deductibleAmountMinor || 0);
        const cb = BigInt(b.deductibleAmountMinor || 0);
        return Number(cb - ca);
      }
      return score(b) - score(a);
    });

    for (let i = 0; i < sorted.length; i++) {
      sorted[i].rankScore = String(score(sorted[i]));
    }

    return sorted;
  }
}
