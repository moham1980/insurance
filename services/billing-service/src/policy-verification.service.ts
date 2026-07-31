import { Injectable, Logger, BadRequestException } from '@nestjs/common';

export interface PolicyVerificationResult {
  policyId: string;
  status: string;
  issuerOrganizationId: string;
  productType: string;
  isActive: boolean;
}

@Injectable()
export class PolicyVerificationService {
  private readonly logger = new Logger(PolicyVerificationService.name);

  private getPolicyServiceUrl(): string {
    return process.env.POLICY_SERVICE_URL || 'http://localhost:18007';
  }

  private resolveAuthHeaders(correlationId?: string): Record<string, string> {
    const token = process.env.PAYMENT_SERVICE_TOKEN || process.env.INTERNAL_SERVICE_TOKEN || '';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (correlationId) {
      headers['X-Correlation-Id'] = correlationId;
    }
    return headers;
  }

  private async fetchPolicy(tenantId: string, policyId: string, correlationId?: string): Promise<any> {
    const policyServiceUrl = this.getPolicyServiceUrl();

    try {
      const response = await fetch(`${policyServiceUrl}/api/v1/policies/${policyId}`, {
        method: 'GET',
        headers: {
          ...this.resolveAuthHeaders(correlationId),
          'X-Tenant-Id': tenantId,
        },
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new BadRequestException(`Policy verification failed: ${response.status} ${errBody}`);
      }

      const policyData: any = await response.json();
      return policyData.data || policyData;
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error(`Failed to verify policy ${policyId}: ${err?.message}`);
      throw new BadRequestException(`Policy verification service unavailable: ${err?.message}`);
    }
  }

  async verifyPolicyForInvoice(
    tenantId: string,
    policyId: string,
    requestingOrganizationId: string,
    correlationId?: string,
  ): Promise<PolicyVerificationResult> {
    const policy = await this.fetchPolicy(tenantId, policyId, correlationId);
    const status = String(policy.status || policy.policyStatus || '').toUpperCase();

    const allowedStatuses = ['ACTIVE', 'INFORCE', 'IN_FORCE', 'ISSUED', 'BOUND'];
    if (!allowedStatuses.includes(status)) {
      throw new BadRequestException(
        `Policy ${policyId} is not in an active state for invoicing (status: ${status})`,
      );
    }

    const issuerOrganizationId = String(
      policy.issuerOrganizationId || policy.carrierOrganizationId || policy.organizationId || '',
    );

    if (!issuerOrganizationId) {
      throw new BadRequestException(`Policy ${policyId} has no issuer organization ID`);
    }

    if (issuerOrganizationId !== requestingOrganizationId) {
      throw new BadRequestException(
        `Organization ${requestingOrganizationId} is not authorized to create invoices for policy ${policyId} (issuer: ${issuerOrganizationId})`,
      );
    }

    return {
      policyId,
      status,
      issuerOrganizationId,
      productType: String(policy.productType || policy.product?.type || ''),
      isActive: allowedStatuses.includes(status),
    };
  }

  async verifyPolicyCancelled(
    tenantId: string,
    policyId: string,
    cancellationSourceId: string,
    correlationId?: string,
  ): Promise<void> {
    const policy = await this.fetchPolicy(tenantId, policyId, correlationId);
    const status = String(policy.status || policy.policyStatus || '').toUpperCase();

    const cancelledStatuses = ['CANCELLED', 'CANCELED', 'VOID', 'TERMINATED'];
    if (!cancelledStatuses.includes(status)) {
      throw new BadRequestException(
        `Policy ${policyId} is not cancelled (status: ${status}). Clawback requires a cancelled policy.`,
      );
    }

    const cancellationId = String(policy.cancellationId || policy.cancellation?.id || '');
    if (cancellationId && cancellationId !== cancellationSourceId) {
      this.logger.warn(
        `Clawback cancellation source ID ${cancellationSourceId} does not match policy cancellation ID ${cancellationId}`,
      );
    }
  }
}
