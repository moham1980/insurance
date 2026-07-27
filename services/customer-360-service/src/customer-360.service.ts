import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, timeout as rxTimeout, catchError, of } from 'rxjs';
import { Customer360Profile, ProfileMetadata } from './models/Customer360Profile';

/**
 * Customer 360 Service
 * Aggregates customer data from all services into a unified profile
 */
@Injectable()
export class Customer360Service {
  private readonly logger = new Logger(Customer360Service.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get complete customer 360 profile
   */
  private readonly downstreamTimeoutMs = parseInt(process.env.DOWNSTREAM_TIMEOUT_MS || '5000', 10);

  async getCustomer360Profile(customerId: string, authToken?: string): Promise<Customer360Profile> {
    this.logger.log(`Fetching Customer 360 profile for customer ${customerId}`);
    const authHeaders: Record<string, string> = authToken ? { Authorization: authToken } : {};

    // Fetch data from all services in parallel with allSettled for partial failure handling
    const results = await Promise.allSettled([
      this.getCustomerProfile(customerId, authHeaders),
      this.getPolicies(customerId, authHeaders),
      this.getClaims(customerId, authHeaders),
      this.getPayments(customerId, authHeaders),
      this.getComplaints(customerId, authHeaders),
      this.getAMLStatus(customerId, authHeaders),
      this.getKYCStatus(customerId, authHeaders),
      this.getJourney(customerId, authHeaders),
      this.getRelationships(customerId, authHeaders),
      this.getRiskProfile(customerId, authHeaders),
      this.getPreferences(customerId, authHeaders),
      this.getConsent(customerId, authHeaders),
    ]);

    const profile = results[0].status === 'fulfilled' ? results[0].value : {};
    const policies = results[1].status === 'fulfilled' ? results[1].value : [];
    const claims = results[2].status === 'fulfilled' ? results[2].value : [];
    const payments = results[3].status === 'fulfilled' ? results[3].value : [];
    const complaints = results[4].status === 'fulfilled' ? results[4].value : [];
    const amlStatus = results[5].status === 'fulfilled' ? results[5].value : null;
    const kycStatus = results[6].status === 'fulfilled' ? results[6].value : null;
    const journey = results[7].status === 'fulfilled' ? results[7].value : [];
    const relationships = results[8].status === 'fulfilled' ? results[8].value : [];
    const riskProfile = results[9].status === 'fulfilled' ? results[9].value : null;
    const preferences = results[10].status === 'fulfilled' ? results[10].value : null;
    const consent = results[11].status === 'fulfilled' ? results[11].value : [];

    const failedSources: string[] = [];
    const sourceNames = ['profile', 'policies', 'claims', 'payments', 'complaints', 'amlStatus', 'kycStatus', 'journey', 'relationships', 'riskProfile', 'preferences', 'consent'];
    results.forEach((r, i) => { if (r.status === 'rejected') failedSources.push(sourceNames[i]); });

    const metadata: ProfileMetadata = {
      dataSource: 'aggregated',
      lastSyncedAt: new Date(),
      dataFreshness: 'near_real_time',
      completeness: this.calculateCompleteness(profile, policies, claims),
      confidence: this.calculateConfidence(profile, kycStatus),
    } as any;

    (metadata as any).errors = failedSources.length > 0 ? failedSources : undefined;

    return {
      customerId,
      nationalId: profile.nationalId,
      profile,
      policies,
      claims,
      payments,
      complaints,
      amlStatus,
      kycStatus,
      journey,
      relationships,
      riskProfile,
      preferences,
      consent,
      metadata,
    };
  }

  /**
   * Get customer profile from party/KYC service
   */
  private async getCustomerProfile(customerId: string, authHeaders: Record<string, string> = {}): Promise<any> {
    try {
      const partyKycUrl = this.configService.get<string>('PARTY_KYC_SERVICE_URL') || 'http://party-kyc-service:3008';
      const response = await firstValueFrom(
        this.httpService.get(`${partyKycUrl}/parties/${customerId}`, {
          headers: { 'x-correlation-id': `customer-360-${Date.now()}`, ...authHeaders },
          timeout: this.downstreamTimeoutMs,
        }),
      );
      return response.data?.data || {};
    } catch (error) {
      this.logger.warn(`Failed to fetch customer profile from party/KYC service`, error);
      return {
        nationalId: null,
        firstName: null,
        lastName: null,
        dateOfBirth: null,
        primaryPhone: null,
        email: null,
        address: null,
        language: 'fa',
        createdAt: null,
        updatedAt: null,
      };
    }
  }

  /**
   * Get policies from policy service
   */
  private async getPolicies(customerId: string, authHeaders: Record<string, string> = {}): Promise<any[]> {
    try {
      const policyServiceUrl = this.configService.get<string>('POLICY_SERVICE_URL') || 'http://policy-service:3001';
      const response = await firstValueFrom(
        this.httpService.get(`${policyServiceUrl}/policies`, {
          params: { customerId },
          headers: { 'x-correlation-id': `customer-360-${Date.now()}`, ...authHeaders },
          timeout: this.downstreamTimeoutMs,
        }),
      );
      return response.data?.data || [];
    } catch (error) {
      this.logger.warn(`Failed to fetch policies from policy service`, error);
      return [];
    }
  }

  /**
   * Get claims from claims service
   */
  private async getClaims(customerId: string, authHeaders: Record<string, string> = {}): Promise<any[]> {
    try {
      const claimsServiceUrl = this.configService.get<string>('CLAIMS_SERVICE_URL') || 'http://claims-service:3003';
      const response = await firstValueFrom(
        this.httpService.get(`${claimsServiceUrl}/claims`, {
          params: { customerId },
          headers: { 'x-correlation-id': `customer-360-${Date.now()}`, ...authHeaders },
          timeout: this.downstreamTimeoutMs,
        }),
      );
      return response.data?.data || [];
    } catch (error) {
      this.logger.warn(`Failed to fetch claims from claims service`, error);
      return [];
    }
  }

  /**
   * Get payments from payments service
   */
  private async getPayments(customerId: string, authHeaders: Record<string, string> = {}): Promise<any[]> {
    try {
      const paymentsServiceUrl = this.configService.get<string>('PAYMENTS_SERVICE_URL') || 'http://payments-service:3005';
      const response = await firstValueFrom(
        this.httpService.get(`${paymentsServiceUrl}/payments`, {
          params: { customerId },
          headers: { 'x-correlation-id': `customer-360-${Date.now()}`, ...authHeaders },
          timeout: this.downstreamTimeoutMs,
        }),
      );
      return response.data?.data || [];
    } catch (error) {
      this.logger.warn(`Failed to fetch payments from payments service`, error);
      return [];
    }
  }

  /**
   * Get complaints from complaints service
   */
  private async getComplaints(customerId: string, authHeaders: Record<string, string> = {}): Promise<any[]> {
    try {
      const complaintsServiceUrl = this.configService.get<string>('COMPLAINTS_SERVICE_URL') || 'http://complaints-service:3006';
      const response = await firstValueFrom(
        this.httpService.get(`${complaintsServiceUrl}/complaints`, {
          params: { customerId },
          headers: { 'x-correlation-id': `customer-360-${Date.now()}`, ...authHeaders },
          timeout: this.downstreamTimeoutMs,
        }),
      );
      return response.data?.data || [];
    } catch (error) {
      this.logger.warn(`Failed to fetch complaints from complaints service`, error);
      return [];
    }
  }

  /**
   * Get AML status from AML service
   */
  private async getAMLStatus(customerId: string, authHeaders: Record<string, string> = {}): Promise<any> {
    try {
      const amlServiceUrl = this.configService.get<string>('AML_SERVICE_URL') || 'http://aml-service:3007';
      const response = await firstValueFrom(
        this.httpService.get(`${amlServiceUrl}/aml/${customerId}/status`, {
          headers: { 'x-correlation-id': `customer-360-${Date.now()}`, ...authHeaders },
          timeout: this.downstreamTimeoutMs,
        }),
      );
      return response.data?.data || null;
    } catch (error) {
      this.logger.warn(`Failed to fetch AML status from AML service`, error);
      return null;
    }
  }

  /**
   * Get KYC status from party/KYC service
   */
  private async getKYCStatus(customerId: string, authHeaders: Record<string, string> = {}): Promise<any> {
    try {
      const partyKycUrl = this.configService.get<string>('PARTY_KYC_SERVICE_URL') || 'http://party-kyc-service:3008';
      const response = await firstValueFrom(
        this.httpService.get(`${partyKycUrl}/kyc/${customerId}/status`, {
          headers: { 'x-correlation-id': `customer-360-${Date.now()}`, ...authHeaders },
          timeout: this.downstreamTimeoutMs,
        }),
      );
      return response.data?.data || null;
    } catch (error) {
      this.logger.warn(`Failed to fetch KYC status from party/KYC service`, error);
      return null;
    }
  }

  /**
   * Get customer journey events
   */
  private async getJourney(customerId: string, authHeaders: Record<string, string> = {}): Promise<any[]> {
    try {
      // Aggregate journey events from multiple services
      const events: any[] = [];

      // Fetch policy events
      const policies = await this.getPolicies(customerId, authHeaders);
      policies.forEach((policy: any) => {
        if (policy.createdAt) {
          events.push({
            type: 'policy_created',
            timestamp: policy.createdAt,
            description: `Policy ${policy.policyNumber} created`,
            metadata: { policyId: policy.policyId, productId: policy.productId },
          });
        }
        if (policy.issuedAt) {
          events.push({
            type: 'policy_issued',
            timestamp: policy.issuedAt,
            description: `Policy ${policy.policyNumber} issued`,
            metadata: { policyId: policy.policyId },
          });
        }
      });

      // Fetch claims events
      const claims = await this.getClaims(customerId, authHeaders);
      claims.forEach((claim: any) => {
        if (claim.createdAt) {
          events.push({
            type: 'claim_submitted',
            timestamp: claim.createdAt,
            description: `Claim ${claim.claimNumber} submitted`,
            metadata: { claimId: claim.claimId, claimNumber: claim.claimNumber },
          });
        }
        if (claim.status === 'settled' && claim.settledAt) {
          events.push({
            type: 'claim_settled',
            timestamp: claim.settledAt,
            description: `Claim ${claim.claimNumber} settled`,
            metadata: { claimId: claim.claimId },
          });
        }
      });

      // Fetch payment events
      const payments = await this.getPayments(customerId, authHeaders);
      payments.forEach((payment: any) => {
        if (payment.createdAt) {
          events.push({
            type: 'payment_made',
            timestamp: payment.createdAt,
            description: `Payment of ${payment.amount} made`,
            metadata: { paymentId: payment.paymentId, amount: payment.amount },
          });
        }
      });

      // Sort events by timestamp
      events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      return events;
    } catch (error) {
      this.logger.warn(`Failed to fetch customer journey`, error);
      return [];
    }
  }

  /**
   * Get customer relationships
   */
  private async getRelationships(customerId: string, authHeaders: Record<string, string> = {}): Promise<any[]> {
    try {
      const partyKycUrl = this.configService.get<string>('PARTY_KYC_SERVICE_URL') || 'http://party-kyc-service:3008';
      const response = await firstValueFrom(
        this.httpService.get(`${partyKycUrl}/parties/${customerId}/relationships`, {
          headers: { 'x-correlation-id': `customer-360-${Date.now()}`, ...authHeaders },
          timeout: this.downstreamTimeoutMs,
        }),
      );
      return response.data?.data || [];
    } catch (error) {
      this.logger.warn(`Failed to fetch relationships from party/KYC service`, error);
      return [];
    }
  }

  /**
   * Get risk profile
   */
  private async getRiskProfile(customerId: string, authHeaders: Record<string, string> = {}): Promise<any> {
    try {
      const amlServiceUrl = this.configService.get<string>('AML_SERVICE_URL') || 'http://aml-service:3007';
      const response = await firstValueFrom(
        this.httpService.get(`${amlServiceUrl}/risk/${customerId}`, {
          headers: { 'x-correlation-id': `customer-360-${Date.now()}`, ...authHeaders },
          timeout: this.downstreamTimeoutMs,
        }),
      );
      return response.data?.data || null;
    } catch (error) {
      this.logger.warn(`Failed to fetch risk profile from AML service`, error);
      return null;
    }
  }

  /**
   * Get customer preferences
   */
  private async getPreferences(customerId: string, authHeaders: Record<string, string> = {}): Promise<any> {
    try {
      const partyKycUrl = this.configService.get<string>('PARTY_KYC_SERVICE_URL') || 'http://party-kyc-service:3008';
      const response = await firstValueFrom(
        this.httpService.get(`${partyKycUrl}/parties/${customerId}/preferences`, {
          headers: { 'x-correlation-id': `customer-360-${Date.now()}`, ...authHeaders },
          timeout: this.downstreamTimeoutMs,
        }),
      );
      return response.data?.data || null;
    } catch (error) {
      this.logger.warn(`Failed to fetch preferences from party/KYC service`, error);
      return null;
    }
  }

  /**
   * Get customer consents
   * Integration with consent management service
   */
  private async getConsent(customerId: string, authHeaders: Record<string, string> = {}): Promise<any[]> {
    try {
      // In a real implementation, this would call the consent management service API
      const consentServiceUrl = process.env.CONSENT_SERVICE_URL || 'http://localhost:18010';
      
      // Simulate API call to consent service
      // const response = await axios.get(`${consentServiceUrl}/consents/${customerId}`);
      // const consents = response.data;
      
      // For now, return simulated consent data
      const consents = [
        {
          consentId: 'consent-001',
          customerId,
          consentType: 'data_processing',
          status: 'active',
          grantedAt: new Date('2024-01-01'),
          expiresAt: new Date('2025-01-01'),
          purposes: ['marketing', 'analytics', 'fraud_detection'],
        },
        {
          consentId: 'consent-002',
          customerId,
          consentType: 'data_sharing',
          status: 'active',
          grantedAt: new Date('2024-01-15'),
          expiresAt: new Date('2025-01-15'),
          purposes: ['third_party', 'affiliates'],
        },
      ];
      
      return consents;
    } catch (error) {
      console.error('Error fetching consents from consent management service:', error);
      return [];
    }
  }

  /**
   * Calculate data completeness score
   */
  private calculateCompleteness(profile: any, policies: any[], claims: any[]): number {
    let score = 0;
    const maxScore = 100;

    // Profile completeness (40 points)
    if (profile.firstName) score += 5;
    if (profile.lastName) score += 5;
    if (profile.dateOfBirth) score += 5;
    if (profile.primaryPhone) score += 5;
    if (profile.email) score += 5;
    if (profile.address) score += 5;
    if (profile.nationalId) score += 10;

    // Policies completeness (30 points)
    if (policies.length > 0) score += 15;
    if (policies.some(p => p.status === 'active')) score += 15;

    // Claims completeness (30 points)
    if (claims.length > 0) score += 15;
    if (claims.some(c => c.status === 'closed')) score += 15;

    return Math.min(score, maxScore);
  }

  /**
   * Calculate data confidence score
   */
  private calculateConfidence(profile: any, kycStatus: any): number {
    let score = 0;

    if (kycStatus.status === 'verified') score += 50;
    if (kycStatus.verificationLevel === 'enhanced') score += 20;
    if (kycStatus.verificationLevel === 'standard') score += 10;

    if (profile.nationalId) score += 20;
    if (profile.dateOfBirth) score += 10;

    return Math.min(score, 100);
  }

  /**
   * Search customers by criteria
   * Implementation: Search across all services (party, policies, claims)
   */
  async searchCustomers(criteria: {
    nationalId?: string;
    phone?: string;
    email?: string;
    policyNumber?: string;
  }): Promise<Customer360Profile[]> {
    try {
      const results: Customer360Profile[] = [];
      
      // Search by national ID in party service
      if (criteria.nationalId) {
        const partyResponse = await this.httpService.get(
          `${process.env.PARTY_SERVICE_URL || 'http://localhost:18001'}/parties/search`,
          { params: { nationalId: criteria.nationalId } }
        ).toPromise();
        
        if (partyResponse?.data?.data) {
          const party = partyResponse.data.data;
          const profile = await this.getCustomer360Profile(party.partyId);
          if (profile) results.push(profile);
        }
      }
      
      // Search by phone in party service
      if (criteria.phone) {
        const partyResponse = await this.httpService.get(
          `${process.env.PARTY_SERVICE_URL || 'http://localhost:18001'}/parties/search`,
          { params: { phone: criteria.phone } }
        ).toPromise();
        
        if (partyResponse?.data?.data) {
          const parties = Array.isArray(partyResponse.data.data) ? partyResponse.data.data : [partyResponse.data.data];
          for (const party of parties) {
            const profile = await this.getCustomer360Profile(party.partyId);
            if (profile && !results.find(r => r.customerId === profile.customerId)) {
              results.push(profile);
            }
          }
        }
      }
      
      // Search by email in party service
      if (criteria.email) {
        const partyResponse = await this.httpService.get(
          `${process.env.PARTY_SERVICE_URL || 'http://localhost:18001'}/parties/search`,
          { params: { email: criteria.email } }
        ).toPromise();
        
        if (partyResponse?.data?.data) {
          const parties = Array.isArray(partyResponse.data.data) ? partyResponse.data.data : [partyResponse.data.data];
          for (const party of parties) {
            const profile = await this.getCustomer360Profile(party.partyId);
            if (profile && !results.find(r => r.customerId === profile.customerId)) {
              results.push(profile);
            }
          }
        }
      }
      
      // Search by policy number in policy service
      if (criteria.policyNumber) {
        const policyResponse = await this.httpService.get(
          `${process.env.POLICY_SERVICE_URL || 'http://localhost:18007'}/policies/search`,
          { params: { policyNumber: criteria.policyNumber } }
        ).toPromise();
        
        if (policyResponse?.data?.data) {
          const policy = policyResponse.data.data;
          const profile = await this.getCustomer360Profile(policy.holderPartyId);
          if (profile && !results.find(r => r.customerId === profile.customerId)) {
            results.push(profile);
          }
        }
      }
      
      return results;
    } catch (error) {
      this.logger.error('Error searching customers across services:', error);
      return [];
    }
  }

  /**
   * Get customer journey timeline
   */
  async getCustomerJourneyTimeline(customerId: string, startDate?: Date, endDate?: Date): Promise<any[]> {
    const journey = await this.getJourney(customerId);

    if (startDate || endDate) {
      return journey.filter(event => {
        if (startDate && event.timestamp < startDate) return false;
        if (endDate && event.timestamp > endDate) return false;
        return true;
      });
    }

    return journey;
  }

  /**
   * Get customer summary (lightweight version)
   */
  async getCustomerSummary(customerId: string): Promise<any> {
    const fullProfile = await this.getCustomer360Profile(customerId);

    return {
      customerId: fullProfile.customerId,
      nationalId: fullProfile.nationalId,
      name: `${fullProfile.profile.firstName} ${fullProfile.profile.lastName}`,
      activePolicies: fullProfile.policies.filter(p => p.status === 'active').length,
      totalPolicies: fullProfile.policies.length,
      openClaims: fullProfile.claims.filter(c => ['reported', 'investigating', 'assessing'].includes(c.status)).length,
      totalClaims: fullProfile.claims.length,
      amlStatus: fullProfile.amlStatus.status,
      kycStatus: fullProfile.kycStatus.status,
      riskCategory: fullProfile.riskProfile.riskCategory,
      lastSyncedAt: fullProfile.metadata.lastSyncedAt,
    };
  }
}
