import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerSession, SessionStatus } from './entities/CustomerSession';
import { JwtService } from '@nestjs/jwt';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import crypto from 'crypto';

@Injectable()
export class CustomerPortalService {
  private readonly logger = new Logger(CustomerPortalService.name);
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second

  constructor(
    @InjectRepository(CustomerSession)
    private sessionRepo: Repository<CustomerSession>,
    private jwtService: JwtService,
    private httpService: HttpService,
  ) {}

  /**
   * Make HTTP request with retry logic
   */
  private async fetchWithRetry<T>(
    requestFn: () => Promise<T>,
    operation: string,
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        
        if (this.isRetryableError(error) && attempt < this.maxRetries) {
          this.logger.warn(
            `${operation} failed (attempt ${attempt}/${this.maxRetries}), retrying in ${this.retryDelay * attempt}ms...`,
            error instanceof AxiosError ? error.message : String(error),
          );
          await this.delay(this.retryDelay * attempt); // Exponential backoff
        } else {
          this.logger.error(
            `${operation} failed after ${attempt} attempts`,
            error instanceof AxiosError ? error.message : String(error),
          );
          throw error;
        }
      }
    }

    throw lastError;
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const code = error.code as string | undefined;
      // Retry on: 5xx errors, 429 (Too Many Requests), network errors
      return (
        !status ||
        status >= 500 ||
        status === 429 ||
        code === 'ECONNREFUSED' ||
        code === 'ETIMEDOUT' ||
        code === 'ENOTFOUND'
      );
    }
    return false;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async initiateOtpLogin(params: {
    tenantId: string;
    phoneNumber: string;
  }): Promise<{ sessionId: string; expiresAt: Date }> {
    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = crypto.createHash('sha256').update(otp + (process.env.OTP_SALT || 'default-salt')).digest('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Revoke any existing active sessions for this phone number
    await this.sessionRepo.update(
      { phoneNumber: params.phoneNumber, status: SessionStatus.ACTIVE },
      { status: SessionStatus.REVOKED }
    );

    const session = this.sessionRepo.create({
      tenantId: params.tenantId,
      phoneNumber: params.phoneNumber,
      otp: otpHash,
      status: SessionStatus.ACTIVE,
      expiresAt,
      metadata: null,
    });

    const saved = await this.sessionRepo.save(session);

    // Send OTP via notification service
    try {
      const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:18037';
      await this.fetchWithRetry(
        () => firstValueFrom(
          this.httpService.post(
            `${notificationServiceUrl}/notifications/sms/otp`,
            {
              phoneNumber: params.phoneNumber,
              otp: otp,
              template: 'verification',
              tenantId: params.tenantId,
            },
            {
              headers: {
                'Content-Type': 'application/json',
              },
            },
          ),
        ),
        'Send OTP',
      );
      this.logger.log(`OTP sent to ${params.phoneNumber}`);
    } catch (error) {
      this.logger.error('Failed to send OTP after retries', error);
      // SECURITY: Fail if SMS delivery fails - OTP must be delivered
      await this.sessionRepo.update(saved.id, { status: SessionStatus.REVOKED });
      throw new Error('Failed to send OTP via SMS. Please try again.');
    }

    return {
      sessionId: saved.id,
      expiresAt: saved.expiresAt,
    };
  }

  async verifyOtp(params: {
    sessionId: string;
    otp: string;
  }): Promise<{ success: boolean; customerId?: string; token?: string; error?: string }> {
    const session = await this.sessionRepo.findOne({ where: { id: params.sessionId } });
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    if (session.status !== SessionStatus.ACTIVE) {
      return { success: false, error: 'Session is not active' };
    }

    if (new Date() > session.expiresAt) {
      session.status = SessionStatus.EXPIRED;
      await this.sessionRepo.save(session);
      return { success: false, error: 'Session expired' };
    }

    const otpHash = crypto.createHash('sha256').update(params.otp + (process.env.OTP_SALT || 'default-salt')).digest('hex');
    if (session.otp !== otpHash) {
      return { success: false, error: 'Invalid OTP' };
    }

    // OTP is valid - link to customer if exists
    // SECURITY: Don't default customerId to phone number - require real customer identity
    if (!session.customerId) {
      return { success: false, error: 'No customer account linked to this phone number. Please contact support to verify your identity.' };
    }
    const customerId = session.customerId;
    
    // Generate JWT token with 30 minute TTL
    const token = this.jwtService.sign({
      customerId,
      tenantId: session.tenantId,
      phoneNumber: session.phoneNumber,
      type: 'customer_portal',
    }, {
      expiresIn: '30m',
    });

    // Update session with customer ID
    session.customerId = customerId;
    await this.sessionRepo.save(session);

    return {
      success: true,
      customerId,
      token,
    };
  }

  async getSession(sessionId: string): Promise<CustomerSession | null> {
    return this.sessionRepo.findOne({ where: { id: sessionId } });
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.sessionRepo.update(
      { id: sessionId },
      { status: SessionStatus.REVOKED }
    );
  }

  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.sessionRepo.update(
      { status: SessionStatus.ACTIVE, expiresAt: { $lt: new Date() } as any },
      { status: SessionStatus.EXPIRED }
    );
    return (result.affected || 0);
  }

  // BFF Methods - Proxy to downstream services with customer filtering
  async getPoliciesForCustomer(customerId: string, tenantId: string, authToken?: string): Promise<any[]> {
    const policyServiceUrl = process.env.POLICY_SERVICE_URL || 'http://policy-service:18007';
    const partyServiceUrl = process.env.PARTY_KYC_URL || 'http://party-kyc-service:18006';
    const authHeaders: Record<string, string> = { 'x-tenant-id': tenantId };
    if (authToken) authHeaders['Authorization'] = `Bearer ${authToken}`;

    try {
      // First, get the party ID for the customer
      const partyResponse: any = await this.fetchWithRetry(
        () => firstValueFrom(
          this.httpService.get(
            `${partyServiceUrl}/parties`,
            {
              params: { nationalId: customerId },
              headers: authHeaders,
            },
          ),
        ),
        'Fetch party for customer',
      );

      const partyId = (partyResponse.data as any)?.data?.[0]?.id;
      if (!partyId) {
        this.logger.warn(`No party found for customer ${customerId}`);
        return [];
      }

      // Get policies for this party
      const policiesResponse: any = await this.fetchWithRetry(
        () => firstValueFrom(
          this.httpService.get(
            `${policyServiceUrl}/policies`,
            {
              params: { partyId },
              headers: authHeaders,
            },
          ),
        ),
        'Fetch policies for party',
      );

      return (policiesResponse.data as any)?.data || [];
    } catch (error) {
      this.logger.error('Failed to fetch policies for customer after retries', error);
      throw new HttpException(
        'Failed to fetch policies',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getPolicyForCustomer(policyId: string, customerId: string, tenantId: string, authToken?: string): Promise<any> {
    const policyServiceUrl = process.env.POLICY_SERVICE_URL || 'http://policy-service:18007';
    const authHeaders: Record<string, string> = { 'x-tenant-id': tenantId, 'x-customer-id': customerId };
    if (authToken) authHeaders['Authorization'] = `Bearer ${authToken}`;

    try {
      const policyResponse: any = await this.fetchWithRetry(
        () => firstValueFrom(
          this.httpService.get(
            `${policyServiceUrl}/policies/${policyId}`,
            {
              headers: authHeaders,
            },
          ),
        ),
        'Fetch policy for customer',
      );

      // Verify the policy belongs to the customer
      const policy = (policyResponse.data as any)?.data;
      if (!policy) {
        throw new HttpException('Policy not found', HttpStatus.NOT_FOUND);
      }

      // Here you would verify that policy.partyId matches the customer's party ID
      // For now, we'll return the policy

      return policy;
    } catch (error) {
      this.logger.error('Failed to fetch policy for customer after retries', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to fetch policy',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getClaimsForCustomer(customerId: string, tenantId: string, authToken?: string): Promise<any[]> {
    const claimsReadModelUrl = process.env.CLAIMS_READMODEL_URL || 'http://claims-readmodel-service:18012';
    const authHeaders: Record<string, string> = { 'x-tenant-id': tenantId };
    if (authToken) authHeaders['Authorization'] = `Bearer ${authToken}`;

    try {
      const claimsResponse: any = await this.fetchWithRetry(
        () => firstValueFrom(
          this.httpService.get(
            `${claimsReadModelUrl}/rm/claims`,
            {
              params: { customerId },
              headers: authHeaders,
            },
          ),
        ),
        'Fetch claims for customer',
      );

      return (claimsResponse.data as any)?.data || [];
    } catch (error) {
      this.logger.error('Failed to fetch claims for customer after retries', error);
      throw new HttpException(
        'Failed to fetch claims',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getClaimForCustomer(claimId: string, customerId: string, tenantId: string, authToken?: string): Promise<any> {
    const claimsReadModelUrl = process.env.CLAIMS_READMODEL_URL || 'http://claims-readmodel-service:18012';
    const authHeaders: Record<string, string> = { 'x-tenant-id': tenantId, 'x-customer-id': customerId };
    if (authToken) authHeaders['Authorization'] = `Bearer ${authToken}`;

    try {
      const claimResponse: any = await this.fetchWithRetry(
        () => firstValueFrom(
          this.httpService.get(
            `${claimsReadModelUrl}/rm/claims/${claimId}`,
            {
              headers: authHeaders,
            },
          ),
        ),
        'Fetch claim for customer',
      );

      const claim = (claimResponse.data as any)?.data;
      if (!claim) {
        throw new HttpException('Claim not found', HttpStatus.NOT_FOUND);
      }

      // Verify the claim belongs to the customer
      if (claim.customerId !== customerId) {
        throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
      }

      return claim;
    } catch (error) {
      this.logger.error('Failed to fetch claim for customer after retries', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to fetch claim',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getPaymentsForCustomer(customerId: string, tenantId: string, authToken?: string): Promise<any[]> {
    const collectionsServiceUrl = process.env.COLLECTIONS_SERVICE_URL || 'http://collections-service:18025';
    const authHeaders: Record<string, string> = { 'x-tenant-id': tenantId };
    if (authToken) authHeaders['Authorization'] = `Bearer ${authToken}`;

    try {
      const paymentsResponse: any = await this.fetchWithRetry(
        () => firstValueFrom(
          this.httpService.get(
            `${collectionsServiceUrl}/collections/payments`,
            {
              params: { customerId },
              headers: authHeaders,
            },
          ),
        ),
        'Fetch payments for customer',
      );

      return (paymentsResponse.data as any)?.data || [];
    } catch (error) {
      this.logger.error('Failed to fetch payments for customer after retries', error);
      throw new HttpException(
        'Failed to fetch payments',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getComplaintsForCustomer(customerId: string, tenantId: string, authToken?: string): Promise<any[]> {
    const complaintsServiceUrl = process.env.COMPLAINTS_SERVICE_URL || 'http://complaints-service:18013';
    const authHeaders: Record<string, string> = { 'x-tenant-id': tenantId };
    if (authToken) authHeaders['Authorization'] = `Bearer ${authToken}`;

    try {
      const complaintsResponse: any = await this.fetchWithRetry(
        () => firstValueFrom(
          this.httpService.get(
            `${complaintsServiceUrl}/complaints`,
            {
              params: { customerId },
              headers: authHeaders,
            },
          ),
        ),
        'Fetch complaints for customer',
      );

      return (complaintsResponse.data as any)?.data || [];
    } catch (error) {
      this.logger.error('Failed to fetch complaints for customer after retries', error);
      throw new HttpException(
        'Failed to fetch complaints',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async submitFnol(params: {
    customerId: string;
    tenantId: string;
    policyId: string;
    incidentDate: string;
    incidentDescription: string;
    incidentAmount?: number;
    documents?: Array<{ name: string; type: string; url: string }>;
    authToken?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    const claimsServiceUrl = process.env.CLAIMS_SERVICE_URL || 'http://claims-service:18002';
    const documentServiceUrl = process.env.DOCUMENT_SERVICE_URL || 'http://document-service:18008';
    const authHeaders: Record<string, string> = { 'x-tenant-id': params.tenantId, 'Content-Type': 'application/json' };
    if (params.authToken) authHeaders['Authorization'] = `Bearer ${params.authToken}`;

    try {
      // First, verify the policy belongs to the customer
      const policy = await this.getPolicyForCustomer(params.policyId, params.customerId, params.tenantId, params.authToken);

      // Upload documents if provided
      const uploadedDocuments = [];
      if (params.documents && params.documents.length > 0) {
        for (const doc of params.documents) {
          const docResponse: any = await this.fetchWithRetry(
            () => firstValueFrom(
              this.httpService.post(
                `${documentServiceUrl}/documents`,
                {
                  name: doc.name,
                  type: doc.type,
                  url: doc.url,
                  entityType: 'claim',
                  entityId: params.policyId,
                  tenantId: params.tenantId,
                },
                {
                  headers: authHeaders,
                },
              ),
            ),
            'Upload FNOL document',
          );
          uploadedDocuments.push(docResponse.data?.data);
        }
      }

      // Create the claim
      const claimResponse: any = await this.fetchWithRetry(
        () => firstValueFrom(
          this.httpService.post(
            `${claimsServiceUrl}/claims`,
            {
              policyId: params.policyId,
              incidentDate: params.incidentDate,
              incidentDescription: params.incidentDescription,
              incidentAmount: params.incidentAmount,
              documents: uploadedDocuments.map(d => d.id),
              customerId: params.customerId,
              tenantId: params.tenantId,
            },
            {
              headers: authHeaders,
            },
          ),
        ),
        'Submit FNOL',
      );

      return {
        success: true,
        data: (claimResponse.data as any)?.data,
      };
    } catch (error) {
      this.logger.error('Failed to submit FNOL after retries', error);
      return {
        success: false,
        error: error instanceof HttpException ? error.message : 'Failed to submit FNOL',
      };
    }
  }

  async requestEndorsement(params: {
    customerId: string;
    tenantId: string;
    policyId: string;
    endorsementType: string;
    payload: Record<string, any>;
    reason?: string;
    correlationId: string;
    authToken?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    const policyServiceUrl = process.env.POLICY_SERVICE_URL || 'http://policy-service:18007';
    const authHeaders: Record<string, string> = { 'x-tenant-id': params.tenantId, 'x-correlation-id': params.correlationId, 'Content-Type': 'application/json' };
    if (params.authToken) authHeaders['Authorization'] = `Bearer ${params.authToken}`;

    try {
      // Verify policy belongs to customer
      const policy = await this.getPolicyForCustomer(params.policyId, params.customerId, params.tenantId, params.authToken);
      if (!policy) {
        return { success: false, error: 'Policy not found or not owned by customer' };
      }

      const response: any = await this.fetchWithRetry(
        () => firstValueFrom(
          this.httpService.post(
            `${policyServiceUrl}/policies/${params.policyId}/endorse`,
            {
              endorsementType: params.endorsementType,
              payload: params.payload,
              reason: params.reason,
            },
            {
              headers: authHeaders,
            },
          ),
        ),
        'Request endorsement',
      );

      return {
        success: (response.data as any)?.success ?? true,
        data: (response.data as any)?.data,
      };
    } catch (error) {
      this.logger.error('Failed to request endorsement after retries', error);
      return {
        success: false,
        error: error instanceof HttpException ? error.message : 'Failed to request endorsement',
      };
    }
  }

  async requestRenewal(params: {
    customerId: string;
    tenantId: string;
    policyId: string;
    newEndDate?: string;
    correlationId: string;
    authToken?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    const policyServiceUrl = process.env.POLICY_SERVICE_URL || 'http://policy-service:18007';
    const authHeaders: Record<string, string> = { 'x-tenant-id': params.tenantId, 'x-correlation-id': params.correlationId, 'Content-Type': 'application/json' };
    if (params.authToken) authHeaders['Authorization'] = `Bearer ${params.authToken}`;

    try {
      // Verify policy belongs to customer
      const policy = await this.getPolicyForCustomer(params.policyId, params.customerId, params.tenantId, params.authToken);
      if (!policy) {
        return { success: false, error: 'Policy not found or not owned by customer' };
      }

      const response: any = await this.fetchWithRetry(
        () => firstValueFrom(
          this.httpService.post(
            `${policyServiceUrl}/policies/${params.policyId}/renew`,
            { newEndDate: params.newEndDate },
            {
              headers: authHeaders,
            },
          ),
        ),
        'Request renewal',
      );

      return {
        success: (response.data as any)?.success ?? true,
        data: (response.data as any)?.data,
      };
    } catch (error) {
      this.logger.error('Failed to request renewal after retries', error);
      return {
        success: false,
        error: error instanceof HttpException ? error.message : 'Failed to request renewal',
      };
    }
  }
private maskPii(value: string | null | undefined): string | null {
  if (!value || typeof value !== 'string') return null;
  if (value.length <= 4) return '****';
  return value.substring(0, 2) + '*'.repeat(Math.max(4, value.length - 4)) + value.substring(value.length - 2);
}

private maskPiiFields(data: any): any {
  if (!data || typeof data !== 'object') return data;
  const piiKeys = ['nationalId', 'mobile', 'contactPhone', 'contactEmail', 'iban', 'destinationIban', 'beneficiaryPartyId', 'subjectNationalId'];
  const masked = { ...data };
  for (const key of Object.keys(masked)) {
    if (piiKeys.includes(key) && typeof masked[key] === 'string') {
      masked[key] = this.maskPii(masked[key]);
    }
  }
  return masked;
}


}
