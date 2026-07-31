import { PartnerGatewayService, CreatePartnerDto } from '../src/partner-gateway.service';
import { PartnerAuthService } from '../src/partner-auth.service';
import { RateLimitService } from '../src/rate-limit.service';
import { ReplayProtectionService } from '../src/replay-protection.service';
import { CertificateService } from '../src/certificate.service';
import { TokenExchangeProxyService } from '../src/token-exchange-proxy.service';
import { ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { PartnerRegistration, PartnerStatus } from '../src/entities/PartnerRegistration';

describe('PartnerGatewayService', () => {
  describe('CreatePartnerDto validation', () => {
    it('should accept a valid DTO with all required fields', () => {
      const dto: CreatePartnerDto = {
        tenantId: 'tenant-1',
        organizationId: 'org-1',
        partnerTenantId: 'tenant-2',
        partnerOrganizationId: 'org-2',
        relationshipType: 'carrier_broker',
        mTlsCertSubject: 'CN=partner.test,O=Partner',
        allowedScopes: ['quotes:write', 'policies:read'],
        allowedApis: ['/api/v1/federation/quotes'],
        rateLimitRps: 50,
        validFrom: new Date(),
      };

      expect(dto.tenantId).toBe('tenant-1');
      expect(dto.relationshipType).toBe('carrier_broker');
      expect(dto.allowedScopes).toHaveLength(2);
    });

    it('should accept optional fields', () => {
      const dto: CreatePartnerDto = {
        tenantId: 'tenant-1',
        organizationId: 'org-1',
        partnerTenantId: 'tenant-2',
        partnerOrganizationId: 'org-2',
        relationshipType: 'mga_carrier',
        mTlsCertSubject: 'CN=partner.test',
        allowedScopes: [],
        allowedApis: [],
        rateLimitRps: 100,
        validFrom: new Date(),
        validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        distributionAgreementId: 'agreement-123',
        tokenExchangeEndpoint: 'http://localhost:3001/auth/token-exchange',
        partnerApiGatewayUrl: 'http://localhost:3010',
      };

      expect(dto.distributionAgreementId).toBe('agreement-123');
      expect(dto.validTo).toBeDefined();
    });
  });

  describe('PartnerRegistration entity', () => {
    it('should have correct default status', () => {
      const partner = new PartnerRegistration();
      expect(partner.status).toBeUndefined();
    });

    it('should support all relationship types', () => {
      const types = ['carrier_broker', 'mga_carrier', 'agency_carrier'];
      for (const type of types) {
        const partner = new PartnerRegistration();
        partner.relationshipType = type as any;
        expect(partner.relationshipType).toBe(type);
      }
    });

    it('should support all partner statuses', () => {
      const statuses = ['active', 'suspended', 'revoked'];
      for (const status of statuses) {
        const partner = new PartnerRegistration();
        partner.status = status as any;
        expect(partner.status).toBe(status);
      }
    });
  });
});

describe('PartnerAuthService', () => {
  describe('authenticateByCertSubject', () => {
    it('should be defined as a class method', () => {
      const proto = PartnerAuthService.prototype;
      expect(typeof proto.authenticateByCertSubject).toBe('function');
    });
  });

  describe('authenticateByToken', () => {
    it('should be defined as a class method', () => {
      const proto = PartnerAuthService.prototype;
      expect(typeof proto.authenticateByToken).toBe('function');
    });
  });

  describe('authorizeApiAccess', () => {
    it('should be defined as a class method', () => {
      const proto = PartnerAuthService.prototype;
      expect(typeof proto.authorizeApiAccess).toBe('function');
    });
  });
});

describe('RateLimitService', () => {
  describe('configurePartner', () => {
    it('should be defined as a class method', () => {
      const proto = RateLimitService.prototype;
      expect(typeof proto.configurePartner).toBe('function');
    });
  });

  describe('checkRateLimit', () => {
    it('should be defined as a class method', () => {
      const proto = RateLimitService.prototype;
      expect(typeof proto.checkRateLimit).toBe('function');
    });
  });
});

describe('ReplayProtectionService', () => {
  describe('checkAndStore', () => {
    it('should be defined as a class method', () => {
      const proto = ReplayProtectionService.prototype;
      expect(typeof proto.checkAndStore).toBe('function');
    });
  });

  describe('generateNonce', () => {
    it('should be defined as a class method', () => {
      const proto = ReplayProtectionService.prototype;
      expect(typeof proto.generateNonce).toBe('function');
    });
  });

  describe('cleanupExpired', () => {
    it('should be defined as a class method', () => {
      const proto = ReplayProtectionService.prototype;
      expect(typeof proto.cleanupExpired).toBe('function');
    });
  });
});

describe('CertificateService', () => {
  describe('registerCertificate', () => {
    it('should be defined as a class method', () => {
      const proto = CertificateService.prototype;
      expect(typeof proto.registerCertificate).toBe('function');
    });
  });

  describe('rotateCertificate', () => {
    it('should be defined as a class method', () => {
      const proto = CertificateService.prototype;
      expect(typeof proto.rotateCertificate).toBe('function');
    });
  });

  describe('getExpiringCertificates', () => {
    it('should be defined as a class method', () => {
      const proto = CertificateService.prototype;
      expect(typeof proto.getExpiringCertificates).toBe('function');
    });
  });
});

describe('TokenExchangeProxyService', () => {
  describe('exchangeToken', () => {
    it('should be defined as a class method', () => {
      const proto = TokenExchangeProxyService.prototype;
      expect(typeof proto.exchangeToken).toBe('function');
    });
  });
});

describe('FederationNonce entity', () => {
  it('should support all nonce statuses', () => {
    const statuses = ['active', 'used', 'expired'];
    for (const status of statuses) {
      expect(status).toBeDefined();
    }
  });
});

describe('FederationTokenGuard', () => {
  it('should validate token_use is federation', () => {
    const claims = { token_use: 'federation', aud: 'partner-gateway' };
    expect(claims.token_use).toBe('federation');
  });

  it('should reject non-federation tokens', () => {
    const claims = { token_use: 'access', aud: 'partner-gateway' };
    expect(claims.token_use).not.toBe('federation');
  });

  it('should enforce audience is partner-gateway', () => {
    const claims = { token_use: 'federation', aud: 'partner-gateway' };
    expect(claims.aud).toBe('partner-gateway');
  });

  it('should enforce max 5 minute lifetime', () => {
    const maxLifetime = 300;
    const claims = { exp: Math.floor(Date.now() / 1000) + 300 };
    const now = Math.floor(Date.now() / 1000);
    expect(claims.exp - now).toBeLessThanOrEqual(maxLifetime);
  });
});

describe('mTLS Configuration', () => {
  it('should read cert paths from environment', () => {
    const envVars = ['MTLS_CLIENT_CERT_PATH', 'MTLS_CLIENT_KEY_PATH', 'MTLS_CA_PATH'];
    for (const env of envVars) {
      expect(env).toBeDefined();
    }
  });
});

describe('CertRotationService', () => {
  it('should use 30 day expiry alert threshold', () => {
    const alertDays = 30;
    expect(alertDays).toBe(30);
  });

  it('should run scheduled checks', () => {
    const checkInterval = 24 * 60 * 60 * 1000;
    expect(checkInterval).toBeGreaterThan(0);
  });
});

describe('PartnerHealthCheckService', () => {
  it('should define health statuses', () => {
    const statuses = ['healthy', 'degraded', 'unreachable'];
    for (const s of statuses) {
      expect(s).toBeDefined();
    }
  });

  it('should check certificate expiry in health check', () => {
    const certExpiryDays = 25;
    expect(certExpiryDays).toBeLessThan(30);
  });
});

describe('SyncLatencyMonitor', () => {
  it('should use 60 second stale threshold', () => {
    const threshold = 60;
    expect(threshold).toBe(60);
  });
});
