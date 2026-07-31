import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PartnerGatewayService } from '../partner-gateway.service';
import { CertificateService } from '../certificate.service';
import { PartnerRegistration } from '../entities/PartnerRegistration';
import { PartnerCertificate } from '../entities/PartnerCertificate';

export interface PartnerHealthStatus {
  partnerId: string;
  tenantId: string;
  partnerTenantId: string;
  status: 'healthy' | 'degraded' | 'unreachable';
  certExpiryDays: number | null;
  lastCheckedAt: Date;
  details: string;
}

@Injectable()
export class PartnerHealthCheckService implements OnModuleInit {
  private readonly logger = new Logger(PartnerHealthCheckService.name);
  private healthCache = new Map<string, PartnerHealthStatus>();
  private knownTenants: string[] = [];

  constructor(
    private readonly partnerGatewayService: PartnerGatewayService,
    private readonly certificateService: CertificateService,
  ) {}

  onModuleInit(): void {
    setInterval(() => this.runHealthChecks(), 5 * 60 * 1000);
  }

  registerTenant(tenantId: string): void {
    if (!this.knownTenants.includes(tenantId)) {
      this.knownTenants.push(tenantId);
    }
  }

  async runHealthChecks(): Promise<void> {
    this.logger.log('Running partner health checks...');

    for (const tenantId of this.knownTenants) {
      try {
        const partners: PartnerRegistration[] = await this.partnerGatewayService.listPartners(tenantId);
        for (const partner of partners) {
          if (partner.status !== 'active') {
            continue;
          }
          await this.checkPartnerHealth(partner);
        }
      } catch (err: any) {
        this.logger.error(`Health check failed for tenant ${tenantId}: ${err.message}`);
      }
    }
  }

  private async checkPartnerHealth(partner: PartnerRegistration): Promise<void> {
    let status: PartnerHealthStatus['status'] = 'healthy';
    let details = '';
    let certExpiryDays: number | null = null;

    try {
      const certs: PartnerCertificate[] = await this.certificateService.listCertificates(partner.partnerId);
      const activeCerts = certs.filter((c: PartnerCertificate) => c.status === 'active');

      if (activeCerts.length === 0) {
        status = 'degraded';
        details = 'No active certificates';
      } else {
        const soonestExpiry = activeCerts
          .map((c: PartnerCertificate) => new Date(c.expiresAt).getTime())
          .sort((a: number, b: number) => a - b)[0];
        certExpiryDays = Math.ceil((soonestExpiry - Date.now()) / (1000 * 60 * 60 * 24));

        if (certExpiryDays < 0) {
          status = 'degraded';
          details = `Certificate expired ${Math.abs(certExpiryDays)} days ago`;
        } else if (certExpiryDays < 30) {
          status = 'degraded';
          details = `Certificate expires in ${certExpiryDays} days`;
        } else {
          details = 'All certificates valid';
        }
      }
    } catch (err: any) {
      status = 'unreachable';
      details = `Health check error: ${err.message}`;
    }

    const health: PartnerHealthStatus = {
      partnerId: partner.partnerId,
      tenantId: partner.tenantId,
      partnerTenantId: partner.partnerTenantId,
      status,
      certExpiryDays,
      lastCheckedAt: new Date(),
      details,
    };

    this.healthCache.set(partner.partnerId, health);

    if (status !== 'healthy') {
      this.logger.warn(`Partner ${partner.partnerId} health: ${status} - ${details}`);
    }
  }

  getPartnerHealth(partnerId: string): PartnerHealthStatus | undefined {
    return this.healthCache.get(partnerId);
  }

  getAllPartnerHealth(): PartnerHealthStatus[] {
    return Array.from(this.healthCache.values());
  }
}
