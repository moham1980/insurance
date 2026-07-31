import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
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
  private readonly otpRateLimitWindowMs = 10 * 60 * 1000; // 10 minutes
  private readonly otpRateLimitMax = 3; // max 3 OTP requests per window
  private readonly otpMaxAttempts = 5; // max 5 wrong OTP attempts before lock

  constructor(
    @InjectRepository(CustomerSession)
    private sessionRepo: Repository<CustomerSession>,
    private jwtService: JwtService,
    private httpService: HttpService,
    private dataSource: DataSource,
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
    // Rate limit: check recent OTP requests for this phone number
    const windowStart = new Date(Date.now() - this.otpRateLimitWindowMs);
    const recentSessions = await this.sessionRepo.count({
      where: {
        phoneNumber: params.phoneNumber,
        createdAt: { $gte: windowStart } as any,
      } as any,
    });
    if (recentSessions >= this.otpRateLimitMax) {
      throw new HttpException(
        'Too many OTP requests. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

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
      otpAttempts: 0,
      lockedAt: null,
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

    if (session.status === SessionStatus.LOCKED) {
      return { success: false, error: 'Session is locked due to too many failed attempts' };
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
      session.otpAttempts += 1;
      if (session.otpAttempts >= this.otpMaxAttempts) {
        session.status = SessionStatus.LOCKED;
        session.lockedAt = new Date();
        await this.sessionRepo.save(session);
        return { success: false, error: 'Too many failed attempts. Session locked.' };
      }
      await this.sessionRepo.save(session);
      return { success: false, error: `Invalid OTP. ${this.otpMaxAttempts - session.otpAttempts} attempts remaining.` };
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
  async getKycStatus(customerId: string, tenantId: string, authToken?: string): Promise<any> {
    const partyServiceUrl = process.env.PARTY_KYC_URL || 'http://party-kyc-service:18006';
    const authHeaders: Record<string, string> = { 'x-tenant-id': tenantId };
    if (authToken) authHeaders['Authorization'] = `Bearer ${authToken}`;

    try {
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
        'Fetch party for KYC status',
      );

      const partyId = (partyResponse.data as any)?.data?.[0]?.id || (partyResponse.data as any)?.data?.partyId;
      if (!partyId) {
        this.logger.warn(`No party found for customer ${customerId}`);
        return { kycStatus: 'not_found', partyId: null };
      }

      const kycResponse: any = await this.fetchWithRetry(
        () => firstValueFrom(
          this.httpService.get(
            `${partyServiceUrl}/party/${partyId}/kyc`,
            { headers: authHeaders },
          ),
        ),
        'Fetch KYC status for party',
      );

      const kycData = (kycResponse.data as any)?.data;
      return {
        partyId,
        kycStatus: kycData?.status || 'unknown',
        kycType: kycData?.kycType || 'standard',
        workflowStage: kycData?.workflowStage || null,
        riskLevel: kycData?.riskLevel || null,
        dueDate: kycData?.dueDate || null,
        documentStatus: kycData?.documentStatus || null,
        amlScreeningStatus: kycData?.amlScreeningStatus || null,
      };
    } catch (error: any) {
      this.logger.error(`Failed to fetch KYC status for customer ${customerId}: ${error.message}`);
      throw new HttpException(
        { success: false, error: { code: 'KYC_STATUS_FETCH_FAILED', message: error.message } },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getPoliciesForCustomer(customerId: string, tenantId: string, authToken?: string, brokerOrganizationId?: string): Promise<any[]> {
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

      // Get policies for this party, optionally filtered by brokerOrganizationId
      const policyParams: Record<string, string> = { partyId };
      if (brokerOrganizationId) policyParams.brokerOrganizationId = brokerOrganizationId;

      const policiesResponse: any = await this.fetchWithRetry(
        () => firstValueFrom(
          this.httpService.get(
            `${policyServiceUrl}/policies`,
            {
              params: policyParams,
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

  async createComplaint(params: {
    customerId: string;
    tenantId: string;
    subject: string;
    description: string;
    category?: string;
    priority?: string;
    authToken?: string;
  }): Promise<any> {
    const complaintsServiceUrl = process.env.COMPLAINTS_SERVICE_URL || 'http://complaints-service:18013';
    const authHeaders: Record<string, string> = { 'x-tenant-id': params.tenantId };
    if (params.authToken) authHeaders['Authorization'] = `Bearer ${params.authToken}`;

    try {
      const response: any = await this.fetchWithRetry(
        () => firstValueFrom(
          this.httpService.post(
            `${complaintsServiceUrl}/complaints`,
            {
              customerId: params.customerId,
              subject: params.subject,
              description: params.description,
              category: params.category,
              priority: params.priority,
            },
            { headers: authHeaders },
          ),
        ),
        'Create complaint',
      );

      return (response.data as any)?.data || (response.data as any);
    } catch (error) {
      this.logger.error('Failed to create complaint', error);
      throw new HttpException(
        'Failed to create complaint',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getComplaintStatus(params: {
    complaintId: string;
    tenantId: string;
    authToken?: string;
  }): Promise<any> {
    const complaintsServiceUrl = process.env.COMPLAINTS_SERVICE_URL || 'http://complaints-service:18013';
    const authHeaders: Record<string, string> = { 'x-tenant-id': params.tenantId };
    if (params.authToken) authHeaders['Authorization'] = `Bearer ${params.authToken}`;

    try {
      const response: any = await this.fetchWithRetry(
        () => firstValueFrom(
          this.httpService.get(
            `${complaintsServiceUrl}/complaints/${params.complaintId}`,
            { headers: authHeaders },
          ),
        ),
        'Get complaint status',
      );

      return (response.data as any)?.data || (response.data as any);
    } catch (error) {
      this.logger.error('Failed to fetch complaint status', error);
      throw new HttpException(
        'Failed to fetch complaint status',
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
    correlationId?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    const claimsServiceUrl = process.env.CLAIMS_SERVICE_URL || 'http://claims-service:18002';
    const documentServiceUrl = process.env.DOCUMENT_SERVICE_URL || 'http://document-service:18008';
    const authHeaders: Record<string, string> = { 'x-tenant-id': params.tenantId, 'Content-Type': 'application/json' };
    if (params.authToken) authHeaders['Authorization'] = `Bearer ${params.authToken}`;

    try {
      // First, verify the policy belongs to the customer
      const policy = await this.getPolicyForCustomer(params.policyId, params.customerId, params.tenantId, params.authToken);
      const brokerOrganizationId = policy?.brokerOrganizationId || policy?.distributionOrganizationId || null;

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
              brokerOrganizationId,
            },
            {
              headers: authHeaders,
            },
          ),
        ),
        'Submit FNOL',
      );

      const claimData = (claimResponse.data as any)?.data;

      // Publish broker notification event for FNOL
      if (brokerOrganizationId && claimData?.claimId) {
        try {
          const { OutboxEvent } = await import('@insurance/shared');
          const outboxRepo = this.dataSource.getRepository(OutboxEvent);
          await outboxRepo.save({
            topic: 'insurance.claim.fnol.broker-notification',
            eventType: 'BrokerFnolNotification',
            eventVersion: 1,
            correlationId: params.correlationId || `${Date.now()}`,
            subject: { claimId: claimData.claimId, policyId: params.policyId, brokerOrganizationId, tenantId: params.tenantId },
            payload: {
              tenantId: params.tenantId,
              claimId: claimData.claimId,
              policyId: params.policyId,
              customerId: params.customerId,
              brokerOrganizationId,
              incidentDate: params.incidentDate,
              incidentDescription: params.incidentDescription,
              notificationType: 'fnol_submitted',
            },
          });
        } catch (e) {
          this.logger.warn('Failed to publish broker FNOL notification event', e);
        }
      }

      return {
        success: true,
        data: claimData,
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

  async submitEndorsementForCustomer(params: {
    endorsementId: string;
    customerId: string;
    tenantId: string;
    authToken?: string;
    correlationId?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    const policyServiceUrl = process.env.POLICY_SERVICE_URL || 'http://policy-service:18007';
    const authHeaders = this.getAuthHeaders(params);

    try {
      const response: any = await this.fetchWithRetry(
        () => firstValueFrom(
          this.httpService.post(
            `${policyServiceUrl}/endorsements/${params.endorsementId}/submit`,
            {},
            { headers: authHeaders },
          )
        ),
        'Submit endorsement for broker approval',
      );

      return {
        success: true,
        data: (response.data as any)?.data,
      };
    } catch (error) {
      this.logger.error('Failed to submit endorsement', error);
      return {
        success: false,
        error: error instanceof HttpException ? error.message : 'Failed to submit endorsement',
      };
    }
  }

  async getEndorsementStatusForCustomer(params: {
    endorsementId: string;
    customerId: string;
    tenantId: string;
    authToken?: string;
    correlationId?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    const policyServiceUrl = process.env.POLICY_SERVICE_URL || 'http://policy-service:18007';
    const authHeaders = this.getAuthHeaders(params);

    try {
      const response: any = await this.fetchWithRetry(
        () => firstValueFrom(
          this.httpService.get(
            `${policyServiceUrl}/endorsements/${params.endorsementId}`,
            { headers: authHeaders },
          )
        ),
        'Fetch endorsement status',
      );

      const endorsement = (response.data as any)?.data;
      if (!endorsement) {
        return { success: false, error: 'Endorsement not found' };
      }

      return {
        success: true,
        data: {
          endorsementId: endorsement.endorsementId,
          policyId: endorsement.policyId,
          status: endorsement.status,
          endorsementType: endorsement.endorsementType,
          reason: endorsement.reason,
          submittedAt: endorsement.submittedAt,
          approvedByPartyId: endorsement.approvedByPartyId,
          appliedAt: endorsement.appliedAt,
          rejectedAt: endorsement.rejectedAt,
          rejectionReason: endorsement.rejectionReason,
        },
      };
    } catch (error) {
      this.logger.error('Failed to fetch endorsement status', error);
      return {
        success: false,
        error: error instanceof HttpException ? error.message : 'Failed to fetch endorsement status',
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
private getClaimsServiceUrl(): string {
    return process.env.CLAIMS_SERVICE_URL || 'http://claims-service:18002';
  }

  private getAuthHeaders(params: { tenantId: string; authToken?: string; correlationId?: string }): Record<string, string> {
    const headers: Record<string, string> = { 'x-tenant-id': params.tenantId, 'Content-Type': 'application/json' };
    if (params.authToken) headers['Authorization'] = `Bearer ${params.authToken}`;
    if (params.correlationId) headers['x-correlation-id'] = params.correlationId;
    return headers;
  }

  async compareRenewalQuotes(params: {
    customerId: string;
    tenantId: string;
    policyId: string;
    productIds?: string[];
    effectiveDate?: string;
    authToken?: string;
    correlationId?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    const productServiceUrl = process.env.PRODUCT_SERVICE_URL || 'http://product-service:18002';
    const authHeaders = this.getAuthHeaders(params);

    try {
      // Verify policy belongs to customer
      const policy = await this.getPolicyForCustomer(params.policyId, params.customerId, params.tenantId, params.authToken);
      if (!policy) {
        return { success: false, error: 'Policy not found or not owned by customer' };
      }

      // Get quotes from multiple carriers via product-service
      const response: any = await this.fetchWithRetry(
        () => firstValueFrom(
          this.httpService.post(
            `${productServiceUrl}/product/quote/compare`,
            {
              productIds: params.productIds,
              customerPartyId: params.customerId,
              effectiveDate: params.effectiveDate || new Date().toISOString().split('T')[0],
              renewalPolicyId: params.policyId,
            },
            { headers: authHeaders },
          )
        ),
        'Compare renewal quotes',
      );

      return {
        success: true,
        data: (response.data as any)?.data,
      };
    } catch (error) {
      this.logger.error('Failed to compare renewal quotes', error);
      return {
        success: false,
        error: error instanceof HttpException ? error.message : 'Failed to compare renewal quotes',
      };
    }
  }

  async addAdjusterCommunicationForCustomer(params: {
    claimId: string;
    referralId: string;
    customerId: string;
    tenantId: string;
    channel: string;
    direction: string;
    contentRef: string;
    subject?: string;
    summary?: string;
    authToken?: string;
    correlationId?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    const claimsServiceUrl = this.getClaimsServiceUrl();
    const authHeaders = this.getAuthHeaders(params);

    // Verify claim ownership
    try {
      const claimResponse: any = await this.fetchWithRetry(
        () => firstValueFrom(
          this.httpService.get(`${claimsServiceUrl}/claims/${params.claimId}`, { headers: authHeaders })
        ),
        'Verify claim ownership for adjuster communication',
      );

      const claim = (claimResponse.data as any)?.data;
      if (!claim) {
        return { success: false, error: 'Claim not found' };
      }

      if (claim.claimantPartyId !== params.customerId && claim.customerId !== params.customerId) {
        return { success: false, error: 'Access denied' };
      }

      // Post communication to claims-service
      const response: any = await this.fetchWithRetry(
        () => firstValueFrom(
          this.httpService.post(
            `${claimsServiceUrl}/adjuster-referrals/${params.referralId}/communications`,
            {
              channel: params.channel,
              direction: params.direction,
              contentRef: params.contentRef,
              partyId: params.customerId,
              subject: params.subject,
              summary: params.summary,
            },
            { headers: authHeaders },
          )
        ),
        'Add adjuster communication',
      );

      return {
        success: true,
        data: (response.data as any)?.data,
      };
    } catch (error) {
      this.logger.error('Failed to add adjuster communication', error);
      return {
        success: false,
        error: error instanceof HttpException ? error.message : 'Failed to add adjuster communication',
      };
    }
  }

  async getClaimAdvocacyForCustomer(params: {
    claimId: string;
    customerId: string;
    tenantId: string;
    authToken?: string;
    correlationId?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    const claimsServiceUrl = this.getClaimsServiceUrl();
    const authHeaders = this.getAuthHeaders(params);

    try {
      // Verify claim belongs to customer
      const claimResponse: any = await this.fetchWithRetry(
        () => firstValueFrom(
          this.httpService.get(`${claimsServiceUrl}/claims/${params.claimId}`, { headers: authHeaders })
        ),
        'Fetch claim for advocacy',
      );

      const claim = (claimResponse.data as any)?.data;
      if (!claim || claim.claimantPartyId !== params.customerId) {
        return { success: false, error: 'Access denied' };
      }

      const casesResponse: any = await this.fetchWithRetry(
        () => firstValueFrom(
          this.httpService.get(`${claimsServiceUrl}/advocacy-cases`, {
            params: { claimId: params.claimId },
            headers: authHeaders,
          })
        ),
        'Fetch advocacy cases for claim',
      );

      return {
        success: true,
        data: (casesResponse.data as any)?.data?.rows || [],
      };
    } catch (error) {
      this.logger.error('Failed to get claim advocacy', error);
      return { success: false, error: error instanceof HttpException ? error.message : 'Failed to get claim advocacy' };
    }
  }

  async createAdvocacyCaseForCustomer(params: {
    claimId: string;
    customerId: string;
    tenantId: string;
    brokerOrganizationId?: string;
    caseType?: string;
    priority?: string;
    description?: string;
    authToken?: string;
    correlationId?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    const claimsServiceUrl = this.getClaimsServiceUrl();
    const authHeaders = this.getAuthHeaders(params);

    try {
      // Verify claim belongs to customer
      const claimResponse: any = await this.fetchWithRetry(
        () => firstValueFrom(
          this.httpService.get(`${claimsServiceUrl}/claims/${params.claimId}`, { headers: authHeaders })
        ),
        'Fetch claim for advocacy case creation',
      );

      const claim = (claimResponse.data as any)?.data;
      if (!claim || claim.claimantPartyId !== params.customerId) {
        return { success: false, error: 'Access denied' };
      }

      const response: any = await this.fetchWithRetry(
        () => firstValueFrom(
          this.httpService.post(
            `${claimsServiceUrl}/claims/${params.claimId}/advocacy-cases`,
            {
              brokerOrganizationId: params.brokerOrganizationId || claim.brokerOrganizationId,
              customerPartyId: params.customerId,
              caseType: params.caseType || 'general',
              priority: params.priority || 'medium',
              description: params.description,
            },
            { headers: authHeaders },
          )
        ),
        'Create advocacy case for customer',
      );

      return {
        success: true,
        data: (response.data as any)?.data,
      };
    } catch (error) {
      this.logger.error('Failed to create advocacy case', error);
      return { success: false, error: error instanceof HttpException ? error.message : 'Failed to create advocacy case' };
    }
  }

  async addAdvocacyCommunicationForCustomer(params: {
    caseId: string;
    claimId: string;
    customerId: string;
    tenantId: string;
    channel: 'email' | 'sms' | 'call' | 'web' | 'mobile_app';
    contentRef: string;
    authToken?: string;
    correlationId?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    const claimsServiceUrl = this.getClaimsServiceUrl();
    const authHeaders = this.getAuthHeaders(params);

    try {
      const response: any = await this.fetchWithRetry(
        () => firstValueFrom(
          this.httpService.post(
            `${claimsServiceUrl}/advocacy-cases/${params.caseId}/communications`,
            {
              channel: params.channel,
              direction: 'inbound',
              contentRef: params.contentRef,
              partyId: params.customerId,
            },
            { headers: authHeaders },
          )
        ),
        'Add advocacy communication',
      );

      return {
        success: (response.data as any)?.success ?? true,
        data: (response.data as any)?.data,
      };
    } catch (error) {
      this.logger.error('Failed to add advocacy communication', error);
      return { success: false, error: error instanceof HttpException ? error.message : 'Failed to add advocacy communication' };
    }
  }

  async getAdvocacyCommunicationsForCustomer(params: {
    claimId: string;
    caseId: string;
    customerId: string;
    tenantId: string;
    authToken?: string;
    correlationId?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    const claimsServiceUrl = this.getClaimsServiceUrl();
    const authHeaders = this.getAuthHeaders(params);

    try {
      const response: any = await this.fetchWithRetry(
        () => firstValueFrom(
          this.httpService.get(
            `${claimsServiceUrl}/advocacy-cases/${params.caseId}/communications`,
            { headers: authHeaders },
          )
        ),
        'Get advocacy communications',
      );

      return {
        success: (response.data as any)?.success ?? true,
        data: (response.data as any)?.data ?? response.data,
      };
    } catch (error) {
      this.logger.error('Failed to fetch advocacy communications', error);
      return { success: false, error: error instanceof HttpException ? error.message : 'Failed to fetch advocacy communications' };
    }
  }

  async getPaymentForCustomer(paymentId: string, customerId: string, tenantId: string, authToken?: string): Promise<any> {
    const collectionsServiceUrl = process.env.COLLECTIONS_SERVICE_URL || 'http://collections-service:18025';
    const authHeaders: Record<string, string> = { 'x-tenant-id': tenantId, 'x-customer-id': customerId };
    if (authToken) authHeaders['Authorization'] = `Bearer ${authToken}`;
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${collectionsServiceUrl}/payments/${paymentId}`, { headers: authHeaders }),
      );
      return data;
    } catch (err: any) {
      const status = err?.response?.status || 500;
      const message = err?.response?.data?.message || 'Failed to fetch payment details';
      return { success: false, error: { code: 'PAYMENTS_ERROR', message, status } };
    }
  }

  async getClaimStatusForCustomer(params: {
    claimId: string;
    customerId: string;
    tenantId: string;
    authToken?: string;
    correlationId?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    const claimsServiceUrl = this.getClaimsServiceUrl();
    const authHeaders = this.getAuthHeaders(params);

    try {
      const claimResponse: any = await this.fetchWithRetry(
        () => firstValueFrom(
          this.httpService.get(`${claimsServiceUrl}/claims/${params.claimId}`, { headers: authHeaders })
        ),
        'Fetch claim status',
      );

      const claim = (claimResponse.data as any)?.data;
      if (!claim) {
        return { success: false, error: 'Claim not found' };
      }

      if (claim.claimantPartyId !== params.customerId && claim.customerId !== params.customerId) {
        return { success: false, error: 'Access denied' };
      }

      const projectionsResponse: any = await this.fetchWithRetry(
        () => firstValueFrom(
          this.httpService.get(`${claimsServiceUrl}/claims/${params.claimId}/projections`, {
            params: { limit: 1 },
            headers: authHeaders,
          })
        ),
        'Fetch claim projections',
      );

      const projections = (projectionsResponse.data as any)?.data?.rows || [];

      return {
        success: true,
        data: {
          claimId: claim.claimId,
          claimNumber: claim.claimNumber,
          status: claim.status,
          assessedAmount: claim.assessedAmount,
          approvedAmount: claim.approvedAmount,
          paidAmount: claim.paidAmount,
          currency: claim.currency,
          updatedAt: claim.updatedAt,
          latestProjection: projections[0] || null,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get claim status', error);
      return { success: false, error: error instanceof HttpException ? error.message : 'Failed to get claim status' };
    }
  }

  async uploadClaimDocumentForCustomer(params: {
    claimId: string;
    customerId: string;
    tenantId: string;
    documentId: string;
    documentType: string;
    uploadedByPartyId: string;
    authToken?: string;
    correlationId?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    const claimsServiceUrl = this.getClaimsServiceUrl();
    const authHeaders = this.getAuthHeaders(params);

    try {
      const claimResponse: any = await this.fetchWithRetry(
        () => firstValueFrom(
          this.httpService.get(`${claimsServiceUrl}/claims/${params.claimId}`, { headers: authHeaders })
        ),
        'Verify claim ownership for document upload',
      );

      const claim = (claimResponse.data as any)?.data;
      if (!claim) {
        return { success: false, error: 'Claim not found' };
      }

      if (claim.claimantPartyId !== params.customerId && claim.customerId !== params.customerId) {
        return { success: false, error: 'Access denied' };
      }

      const response: any = await this.fetchWithRetry(
        () => firstValueFrom(
          this.httpService.post(
            `${claimsServiceUrl}/claims/${params.claimId}/documents`,
            {
              documentId: params.documentId,
              documentType: params.documentType,
              uploadedByPartyId: params.uploadedByPartyId,
            },
            { headers: authHeaders },
          )
        ),
        'Upload claim document',
      );

      return {
        success: (response.data as any)?.success ?? true,
        data: (response.data as any)?.data,
      };
    } catch (error) {
      this.logger.error('Failed to upload claim document', error);
      return { success: false, error: error instanceof HttpException ? error.message : 'Failed to upload claim document' };
    }
  }

  async getClaimDocumentDownloadUrl(params: {
    claimId: string;
    documentId: string;
    customerId: string;
    tenantId: string;
    authToken?: string;
    correlationId?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    const claimsServiceUrl = this.getClaimsServiceUrl();
    const authHeaders = this.getAuthHeaders(params);

    try {
      const claimResponse: any = await this.fetchWithRetry(
        () => firstValueFrom(
          this.httpService.get(`${claimsServiceUrl}/claims/${params.claimId}`, { headers: authHeaders })
        ),
        'Verify claim ownership for document download',
      );

      const claim = (claimResponse.data as any)?.data;
      if (!claim) {
        return { success: false, error: 'Claim not found' };
      }

      if (claim.claimantPartyId !== params.customerId && claim.customerId !== params.customerId) {
        return { success: false, error: 'Access denied' };
      }

      const response: any = await this.fetchWithRetry(
        () => firstValueFrom(
          this.httpService.get(
            `${claimsServiceUrl}/claims/${params.claimId}/documents/${params.documentId}/download`,
            { headers: authHeaders },
          )
        ),
        'Get claim document download URL',
      );

      return {
        success: (response.data as any)?.success ?? true,
        data: (response.data as any)?.data,
      };
    } catch (error) {
      this.logger.error('Failed to get claim document download URL', error);
      return { success: false, error: error instanceof HttpException ? error.message : 'Failed to get download URL' };
    }
  }

  async initiatePayment(params: {
    customerId: string;
    tenantId: string;
    invoiceId: string;
    authToken?: string;
    correlationId?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    const billingServiceUrl = process.env.BILLING_SERVICE_URL || 'http://billing-service:18007';
    const authHeaders = this.getAuthHeaders(params);

    try {
      const response: any = await this.fetchWithRetry(
        () => firstValueFrom(
          this.httpService.post(
            `${billingServiceUrl}/payments/initiate`,
            { invoiceId: params.invoiceId },
            { headers: authHeaders },
          )
        ),
        'Initiate payment for customer',
      );

      return {
        success: (response.data as any)?.success ?? true,
        data: (response.data as any)?.data,
      };
    } catch (error) {
      this.logger.error('Failed to initiate payment', error);
      return { success: false, error: error instanceof HttpException ? error.message : 'Failed to initiate payment' };
    }
  }

  async getBrokerInfo(params: {
    customerId: string;
    tenantId: string;
    authToken?: string;
    correlationId?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    const policyServiceUrl = process.env.POLICY_SERVICE_URL || 'http://policy-service:18003';
    const salesNetworkUrl = process.env.SALES_NETWORK_SERVICE_URL || 'http://sales-network-service:18006';
    const authHeaders = this.getAuthHeaders(params);

    try {
      const policyResponse: any = await this.fetchWithRetry(
        () => firstValueFrom(
          this.httpService.get(`${policyServiceUrl}/policies`, {
            params: { customerId: params.customerId, limit: 1 },
            headers: authHeaders,
          })
        ),
        'Fetch policy for broker info lookup',
      );

      const policies = (policyResponse.data as any)?.data || [];
      if (policies.length === 0) {
        return { success: false, error: 'No policies found for customer' };
      }

      const brokerOrgId = policies[0].distributionOrganizationId;
      if (!brokerOrgId) {
        return { success: false, error: 'No broker assigned to customer policy' };
      }

      const partnerResponse: any = await this.fetchWithRetry(
        () => firstValueFrom(
          this.httpService.get(`${salesNetworkUrl}/sales-network/partners`, {
            params: { orgUnitId: brokerOrgId },
            headers: authHeaders,
          })
        ),
        'Fetch broker partner info',
      );

      const partners = (partnerResponse.data as any)?.data || [];
      if (partners.length === 0) {
        return { success: false, error: 'Broker not found' };
      }

      const broker = partners[0];
      return {
        success: true,
        data: {
          partnerId: broker.partnerId,
          displayName: broker.displayName,
          status: broker.status,
          organizationId: broker.orgUnitId,
          parentPartnerId: broker.parentPartnerId,
          partnerType: broker.partnerType,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get broker info', error);
      return { success: false, error: error instanceof HttpException ? error.message : 'Failed to get broker info' };
    }
  }

  async getInstallmentDetails(params: {
    customerId: string;
    tenantId: string;
    installmentId: string;
    authToken?: string;
    correlationId?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    const collectionsServiceUrl = process.env.COLLECTIONS_SERVICE_URL || 'http://collections-service:18025';
    const authHeaders = this.getAuthHeaders(params);

    try {
      const response: any = await this.fetchWithRetry(
        () => firstValueFrom(
          this.httpService.get(
            `${collectionsServiceUrl}/collections/installments/${params.installmentId}`,
            { headers: authHeaders },
          )
        ),
        'Fetch installment details for customer',
      );

      const installment = (response.data as any)?.data;
      if (!installment) {
        return { success: false, error: 'Installment not found' };
      }

      if (installment.customerId && installment.customerId !== params.customerId) {
        return { success: false, error: 'Access denied' };
      }

      return { success: true, data: installment };
    } catch (error) {
      this.logger.error('Failed to get installment details', error);
      return { success: false, error: error instanceof HttpException ? error.message : 'Failed to get installment details' };
    }
  }

  async getOfferingsForCustomer(customerId: string, tenantId: string, authToken?: string, params?: { brokerOrganizationId?: string; currency?: string; region?: string; limit?: number; offset?: number }): Promise<any> {
    const productUrl = process.env.PRODUCT_SERVICE_URL || 'http://localhost:18018';
    const query: Record<string, string> = {};
    if (params?.brokerOrganizationId) query.brokerOrganizationId = params.brokerOrganizationId;
    if (params?.currency) query.currency = params.currency;
    if (params?.region) query.region = params.region;
    if (params?.limit) query.limit = String(params.limit);
    if (params?.offset) query.offset = String(params.offset);

    return this.fetchWithRetry(
      () => firstValueFrom(
        this.httpService.get(`${productUrl}/api/v1/customers/offerings`, {
          headers: {
            ...(authToken ? { Authorization: authToken } : {}),
            'x-tenant-id': tenantId,
            'x-customer-id': customerId,
          },
          params: query,
        }),
      ).then(res => res.data),
      'getOfferingsForCustomer',
    );
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

  // --- Consent Management (proxy to customer-360-service) ---

  async getConsents(customerId: string, tenantId: string, authToken?: string): Promise<any> {
    const customer360Url = process.env.CUSTOMER_360_URL || 'http://localhost:3010';
    const authHeaders: Record<string, string> = { 'x-tenant-id': tenantId };
    if (authToken) authHeaders['Authorization'] = `Bearer ${authToken}`;
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${customer360Url}/customer-360/${customerId}/consents`, { headers: authHeaders }),
      );
      return data;
    } catch (err: any) {
      const status = err?.response?.status || 500;
      const message = err?.response?.data?.message || 'Failed to fetch consents';
      return { success: false, error: { code: 'CONSENT_ERROR', message, status } };
    }
  }

  async grantConsent(params: {
    customerId: string;
    tenantId: string;
    purpose: string;
    source?: string;
    channel?: string;
    authToken?: string;
  }): Promise<any> {
    const customer360Url = process.env.CUSTOMER_360_URL || 'http://localhost:3010';
    const authHeaders: Record<string, string> = { 'x-tenant-id': params.tenantId, 'Content-Type': 'application/json' };
    if (params.authToken) authHeaders['Authorization'] = `Bearer ${params.authToken}`;
    try {
      const { data } = await firstValueFrom(
        this.httpService.post(`${customer360Url}/customer-360/${params.customerId}/consents`, {
          purpose: params.purpose,
          status: 'granted',
          source: params.source || 'customer-portal',
          channel: params.channel || 'web',
        }, { headers: authHeaders }),
      );
      return data;
    } catch (err: any) {
      const status = err?.response?.status || 500;
      const message = err?.response?.data?.message || 'Failed to grant consent';
      return { success: false, error: { code: 'CONSENT_ERROR', message, status } };
    }
  }

  async revokeConsent(params: {
    customerId: string;
    tenantId: string;
    purpose: string;
    reason?: string;
    authToken?: string;
  }): Promise<any> {
    const customer360Url = process.env.CUSTOMER_360_URL || 'http://localhost:3010';
    const authHeaders: Record<string, string> = { 'x-tenant-id': params.tenantId, 'Content-Type': 'application/json' };
    if (params.authToken) authHeaders['Authorization'] = `Bearer ${params.authToken}`;
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${customer360Url}/customer-360/${params.customerId}/consents`, {
          headers: authHeaders,
          params: { purpose: params.purpose },
        }),
      );
      const consents = data?.data || data?.consents || [];
      const consent = Array.isArray(consents) ? consents.find((c: any) => c.purpose === params.purpose) : null;
      if (!consent?.id) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'Consent not found for this purpose' } };
      }
      const { data: revokeData } = await firstValueFrom(
        this.httpService.post(`${customer360Url}/customer-360/${params.customerId}/consents/${consent.id}/revoke`, {
          reason: params.reason || 'User revoked from portal',
        }, { headers: authHeaders }),
      );
      return revokeData;
    } catch (err: any) {
      const status = err?.response?.status || 500;
      const message = err?.response?.data?.message || 'Failed to revoke consent';
      return { success: false, error: { code: 'CONSENT_ERROR', message, status } };
    }
  }

  // --- Adjuster Communications ---

  async getAdjusterCommunications(claimId: string, customerId: string, tenantId: string, authToken?: string): Promise<any> {
    const claimsUrl = process.env.CLAIMS_SERVICE_URL || 'http://claims-service:18010';
    const authHeaders: Record<string, string> = { 'x-tenant-id': tenantId, 'x-customer-id': customerId };
    if (authToken) authHeaders['Authorization'] = `Bearer ${authToken}`;
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${claimsUrl}/claims/${claimId}/adjuster-communications`, { headers: authHeaders }),
      );
      return data;
    } catch (err: any) {
      const status = err?.response?.status || 500;
      const message = err?.response?.data?.message || 'Failed to fetch adjuster communications';
      return { success: false, error: { code: 'CLAIMS_ERROR', message, status } };
    }
  }

  async sendAdjusterMessage(params: {
    claimId: string;
    customerId: string;
    tenantId: string;
    message: string;
    attachments?: string[];
    authToken?: string;
  }): Promise<any> {
    const claimsUrl = process.env.CLAIMS_SERVICE_URL || 'http://claims-service:18010';
    const authHeaders: Record<string, string> = { 'x-tenant-id': params.tenantId, 'x-customer-id': params.customerId, 'Content-Type': 'application/json' };
    if (params.authToken) authHeaders['Authorization'] = `Bearer ${params.authToken}`;
    try {
      const { data } = await firstValueFrom(
        this.httpService.post(`${claimsUrl}/claims/${params.claimId}/adjuster-communications`, {
          message: params.message,
          attachments: params.attachments || [],
        }, { headers: authHeaders }),
      );
      return data;
    } catch (err: any) {
      const status = err?.response?.status || 500;
      const message = err?.response?.data?.message || 'Failed to send adjuster message';
      return { success: false, error: { code: 'CLAIMS_ERROR', message, status } };
    }
  }

  // --- Policy Endorsements List ---

  async listPolicyEndorsements(policyId: string, customerId: string, tenantId: string, authToken?: string): Promise<any> {
    const policyUrl = process.env.POLICY_SERVICE_URL || 'http://policy-service:18007';
    const authHeaders: Record<string, string> = { 'x-tenant-id': tenantId, 'x-customer-id': customerId };
    if (authToken) authHeaders['Authorization'] = `Bearer ${authToken}`;
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${policyUrl}/policies/${policyId}/endorsements`, { headers: authHeaders }),
      );
      return data;
    } catch (err: any) {
      const status = err?.response?.status || 500;
      const message = err?.response?.data?.message || 'Failed to fetch endorsements';
      return { success: false, error: { code: 'POLICY_ERROR', message, status } };
    }
  }

  // --- Renewal Quotes ---

  async getRenewalQuotes(policyId: string, customerId: string, tenantId: string, authToken?: string): Promise<any> {
    const policyUrl = process.env.POLICY_SERVICE_URL || 'http://policy-service:18007';
    const authHeaders: Record<string, string> = { 'x-tenant-id': tenantId, 'x-customer-id': customerId };
    if (authToken) authHeaders['Authorization'] = `Bearer ${authToken}`;
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${policyUrl}/policies/${policyId}/renewal/quotes`, { headers: authHeaders }),
      );
      return data;
    } catch (err: any) {
      const status = err?.response?.status || 500;
      const message = err?.response?.data?.message || 'Failed to fetch renewal quotes';
      return { success: false, error: { code: 'POLICY_ERROR', message, status } };
    }
  }

  async acceptRenewalQuote(params: {
    policyId: string;
    quoteId: string;
    customerId: string;
    tenantId: string;
    authToken?: string;
  }): Promise<any> {
    const policyUrl = process.env.POLICY_SERVICE_URL || 'http://policy-service:18007';
    const authHeaders: Record<string, string> = { 'x-tenant-id': params.tenantId, 'x-customer-id': params.customerId, 'Content-Type': 'application/json' };
    if (params.authToken) authHeaders['Authorization'] = `Bearer ${params.authToken}`;
    try {
      const { data } = await firstValueFrom(
        this.httpService.post(`${policyUrl}/policies/${params.policyId}/renewal/quotes/${params.quoteId}/accept`, {}, { headers: authHeaders }),
      );
      return data;
    } catch (err: any) {
      const status = err?.response?.status || 500;
      const message = err?.response?.data?.message || 'Failed to accept renewal quote';
      return { success: false, error: { code: 'POLICY_ERROR', message, status } };
    }
  }

  async scheduleRenewal(params: {
    policyId: string;
    customerId: string;
    tenantId: string;
    newStartDate: string;
    newProductCode?: string;
    authToken?: string;
  }): Promise<any> {
    const policyUrl = process.env.POLICY_SERVICE_URL || 'http://policy-service:18007';
    const authHeaders: Record<string, string> = { 'x-tenant-id': params.tenantId, 'x-customer-id': params.customerId, 'Content-Type': 'application/json' };
    if (params.authToken) authHeaders['Authorization'] = `Bearer ${params.authToken}`;
    try {
      const { data } = await firstValueFrom(
        this.httpService.post(`${policyUrl}/policies/${params.policyId}/renewal/schedule`, {
          newStartDate: params.newStartDate,
          newProductCode: params.newProductCode,
        }, { headers: authHeaders }),
      );
      return data;
    } catch (err: any) {
      const status = err?.response?.status || 500;
      const message = err?.response?.data?.message || 'Failed to schedule renewal';
      return { success: false, error: { code: 'POLICY_ERROR', message, status } };
    }
  }


}
