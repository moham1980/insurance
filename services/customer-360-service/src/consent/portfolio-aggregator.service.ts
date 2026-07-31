import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout as rxTimeout, catchError, of } from 'rxjs';
import { ConsentCheckService } from './consent-check.service';

/**
 * PortfolioAggregatorService — Aggregates portfolio data across services.
 *
 * P7-13: Separated from Customer360Service for single-responsibility.
 * Enforces consent check before aggregating cross-service data.
 *
 * Aggregates: policies, claims, payments, complaints into a unified portfolio view.
 */
@Injectable()
export class PortfolioAggregatorService {
  private readonly logger = new Logger(PortfolioAggregatorService.name);
  private readonly downstreamTimeoutMs = parseInt(process.env.DOWNSTREAM_TIMEOUT_MS || '5000', 10);

  constructor(
    private readonly httpService: HttpService,
    private readonly consentCheck: ConsentCheckService,
  ) {}

  /**
   * Aggregate portfolio data for a customer.
   * Enforces consent check before fetching any data.
   */
  async aggregatePortfolio(customerId: string, authToken?: string) {
    // Enforce consent before aggregation
    await this.consentCheck.assertConsent(customerId, ConsentCheckService.PURPOSE_PORTFOLIO_AGGREGATION);

    this.logger.log(`Aggregating portfolio for customer ${customerId}`);
    const authHeaders: Record<string, string> = authToken ? { Authorization: authToken } : {};

    const results = await Promise.allSettled([
      this.fetchPolicies(customerId, authHeaders),
      this.fetchClaims(customerId, authHeaders),
      this.fetchPayments(customerId, authHeaders),
      this.fetchComplaints(customerId, authHeaders),
    ]);

    const policies = results[0].status === 'fulfilled' ? results[0].value : [];
    const claims = results[1].status === 'fulfilled' ? results[1].value : [];
    const payments = results[2].status === 'fulfilled' ? results[2].value : [];
    const complaints = results[3].status === 'fulfilled' ? results[3].value : [];

    const failedSources: string[] = [];
    const sourceNames = ['policies', 'claims', 'payments', 'complaints'];
    results.forEach((r, i) => { if (r.status === 'rejected') failedSources.push(sourceNames[i]); });

    // Calculate portfolio summary
    const totalPolicies = policies.length;
    const activePolicies = policies.filter((p: any) => p.status === 'active').length;
    const totalPremium = policies
      .filter((p: any) => p.status === 'active')
      .reduce((sum: number, p: any) => sum + (p.premiumAmount || 0), 0);
    const openClaims = claims.filter((c: any) => !['closed', 'rejected'].includes(c.status)).length;
    const totalClaimAmount = claims
      .filter((c: any) => c.status === 'approved')
      .reduce((sum: number, c: any) => sum + (c.approvedAmount || 0), 0);
    const totalPaid = payments
      .filter((p: any) => p.status === 'completed')
      .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    const openComplaints = complaints.filter((c: any) => c.status !== 'resolved').length;

    return {
      customerId,
      summary: {
        totalPolicies,
        activePolicies,
        totalPremium,
        openClaims,
        totalClaimAmount,
        totalPaid,
        openComplaints,
      },
      policies,
      claims,
      payments,
      complaints,
      metadata: {
        aggregatedAt: new Date(),
        failedSources: failedSources.length > 0 ? failedSources : undefined,
      },
    };
  }

  private async fetchPolicies(customerId: string, headers: Record<string, string>) {
    const policyUrl = process.env.POLICY_SERVICE_URL || 'http://localhost:18010';
    const { data } = await firstValueFrom(
      this.httpService.get(`${policyUrl}/api/v1/policies`, { headers, params: { customerId } }).pipe(
        rxTimeout(this.downstreamTimeoutMs),
        catchError(() => of({ data: [] })),
      ),
    );
    return data?.data || data || [];
  }

  private async fetchClaims(customerId: string, headers: Record<string, string>) {
    const claimUrl = process.env.CLAIM_SERVICE_URL || 'http://localhost:18020';
    const { data } = await firstValueFrom(
      this.httpService.get(`${claimUrl}/api/v1/claims`, { headers, params: { customerId } }).pipe(
        rxTimeout(this.downstreamTimeoutMs),
        catchError(() => of({ data: [] })),
      ),
    );
    return data?.data || data || [];
  }

  private async fetchPayments(customerId: string, headers: Record<string, string>) {
    const billingUrl = process.env.BILLING_SERVICE_URL || 'http://localhost:18030';
    const { data } = await firstValueFrom(
      this.httpService.get(`${billingUrl}/api/v1/payments`, { headers, params: { customerId } }).pipe(
        rxTimeout(this.downstreamTimeoutMs),
        catchError(() => of({ data: [] })),
      ),
    );
    return data?.data || data || [];
  }

  private async fetchComplaints(customerId: string, headers: Record<string, string>) {
    const complaintUrl = process.env.COMPLAINT_SERVICE_URL || 'http://localhost:18050';
    const { data } = await firstValueFrom(
      this.httpService.get(`${complaintUrl}/api/v1/complaints`, { headers, params: { customerId } }).pipe(
        rxTimeout(this.downstreamTimeoutMs),
        catchError(() => of({ data: [] })),
      ),
    );
    return data?.data || data || [];
  }
}
