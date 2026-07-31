import { Injectable, Logger } from '@nestjs/common';

export interface PartnerDiscoveryResult {
  partnerId: string;
  partnerTenantId: string;
  partnerOrganizationId: string;
  partnerApiGatewayUrl: string;
  tokenExchangeEndpoint: string;
  relationshipType: string;
  allowedApis: string[];
  allowedScopes: string[];
  status: string;
}

interface PartnerListResponse {
  partnerId: string;
  tenantId: string;
  partnerTenantId: string;
  partnerOrganizationId: string;
  relationshipType: string;
  allowedScopes: string[];
  allowedApis: string[];
  status: string;
  partnerApiGatewayUrl?: string;
  tokenExchangeEndpoint?: string;
}

@Injectable()
export class PartnerDiscoveryService {
  private readonly logger = new Logger(PartnerDiscoveryService.name);

  async discoverPartnersForTenant(tenantId: string): Promise<PartnerDiscoveryResult[]> {
    const gatewayUrl = process.env.PARTNER_GATEWAY_URL || 'http://localhost:18010';
    try {
      const response = await fetch(`${gatewayUrl}/partners?tenantId=${encodeURIComponent(tenantId)}`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        this.logger.warn(`Partner gateway returned ${response.status} for tenant ${tenantId}`);
        return [];
      }
      const partners: PartnerListResponse[] = await response.json() as PartnerListResponse[];
      return partners
        .filter((p: PartnerListResponse) => p.status === 'active')
        .map((p: PartnerListResponse) => ({
          partnerId: p.partnerId,
          partnerTenantId: p.partnerTenantId,
          partnerOrganizationId: p.partnerOrganizationId,
          partnerApiGatewayUrl: p.partnerApiGatewayUrl || '',
          tokenExchangeEndpoint: p.tokenExchangeEndpoint || '',
          relationshipType: p.relationshipType,
          allowedApis: p.allowedApis || [],
          allowedScopes: p.allowedScopes || [],
          status: p.status,
        }));
    } catch (err: any) {
      this.logger.error(`Failed to discover partners for tenant ${tenantId}: ${err.message}`);
      return [];
    }
  }

  async discoverPartnerForCarrier(
    tenantId: string,
    carrierOrganizationId: string,
  ): Promise<PartnerDiscoveryResult | null> {
    const partners = await this.discoverPartnersForTenant(tenantId);
    return partners.find((p: PartnerDiscoveryResult) => p.partnerOrganizationId === carrierOrganizationId) || null;
  }
}
