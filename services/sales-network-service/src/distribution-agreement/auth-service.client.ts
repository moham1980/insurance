import { Injectable } from '@nestjs/common';

export interface OrganizationCapability {
  capabilityId: string;
  organizationId: string;
  tenantId: string;
  capability: string;
  scope: string[];
  lineOfBusiness: string[];
  status: 'active' | 'suspended';
  effectiveFrom: string;
  effectiveTo?: string | null;
}

@Injectable()
export class AuthServiceClient {
  private get baseUrl(): string {
    return process.env.AUTH_SERVICE_URL || 'http://localhost:18004';
  }

  async listCapabilities(organizationId: string, tenantId?: string, authorization?: string): Promise<OrganizationCapability[]> {
    const url = new URL(`${this.baseUrl}/api/v1/admin/organizations/${encodeURIComponent(organizationId)}/capabilities`);
    if (tenantId) url.searchParams.set('tenantId', tenantId);
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: authorization ? { authorization } : {},
    });
    if (!res.ok) return [];
    const json: any = await res.json();
    return (json.data || []) as OrganizationCapability[];
  }
}
