import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuoteRequest } from '../entities/QuoteRequest';
import { QuoteResponse } from '../entities/QuoteResponse';
import { RankingRule } from './ranking-rule';
import { ComparisonResult } from './comparison-result';

@Injectable()
export class ComparisonEngine {
  constructor(
    @InjectRepository(QuoteRequest)
    private readonly quoteRequestRepo: Repository<QuoteRequest>,
    @InjectRepository(QuoteResponse)
    private readonly quoteResponseRepo: Repository<QuoteResponse>,
    private readonly ranking: RankingRule,
  ) {}

  async compare(tenantId: string, quoteRequestId: string, preferences?: any): Promise<ComparisonResult> {
    const quoteRequest = await this.quoteRequestRepo.findOne({ where: { quoteRequestId, tenantId } });
    if (!quoteRequest) throw new NotFoundException('Quote request not found');

    const responses = await this.quoteResponseRepo.find({ where: { quoteRequestId, tenantId } });
    const received = responses.filter((r) => r.status === 'received' && !this.isExpired(r.expiresAt));
    if (!received.length) throw new BadRequestException('No active quotes to compare');

    const ranked = await this.ranking.rank(received, preferences);
    const recommendation = ranked[0];
    const alternatives = ranked.slice(1);

    return {
      quoteRequestId,
      submissionId: quoteRequest.submissionId,
      tenantId,
      recommendation: this.toComparisonItem(recommendation, 1),
      alternatives: alternatives.map((r, idx) => this.toComparisonItem(r, idx + 2)),
      factors: {
        totalQuotes: received.length,
        sortedBy: preferences?.sortBy || 'best_value',
      },
    };
  }

  private isExpired(expiresAt: Date | null): boolean {
    if (!expiresAt) return false;
    return new Date() > expiresAt;
  }

  private toComparisonItem(r: QuoteResponse, rank: number) {
    return {
      quoteResponseId: r.quoteResponseId,
      carrierOrganizationId: r.carrierOrganizationId,
      premiumAmountMinor: r.premiumAmountMinor,
      premiumCurrency: r.premiumCurrency,
      basePremiumMinor: r.basePremiumMinor,
      taxesMinor: r.taxesMinor,
      feesMinor: r.feesMinor,
      deductibleAmountMinor: r.deductibleAmountMinor,
      commissionRateBps: r.commissionRateBps,
      commissionAmountMinor: r.commissionAmountMinor,
      markupAmountMinor: r.markupAmountMinor,
      rankScore: r.rankScore,
      comparisonFactors: r.comparisonFactors,
      expiresAt: r.expiresAt,
      rank,
    };
  }
}
