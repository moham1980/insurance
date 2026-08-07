import { Injectable, Logger, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';
import { PartnerGatewayService } from './partner-gateway.service';
import { CertificateService } from './certificate.service';
import { PartnerRegistration } from './entities/PartnerRegistration';
import { PartnerCertificate } from './entities/PartnerCertificate';

export interface AuthResult {
  partnerId: string;
  tenantId: string;
  partnerTenantId: string;
  organizationId: string;
  allowedScopes: string[];
  allowedApis: string[];
  relationshipType: string;
}

@Injectable()
export class PartnerAuthService {
  private readonly logger = new Logger(PartnerAuthService.name);

  private readonly jwksClient: JwksClient;

  constructor(
    private readonly partnerService: PartnerGatewayService,
    private readonly certService: CertificateService,
  ) {
    const issuer = process.env.IAM_ISSUER || 'http://localhost:8080';
    const jwksUri = process.env.JWKS_URI || `${issuer}/.well-known/jwks.json`;
    this.jwksClient = new JwksClient({
      jwksUri,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 600000,
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });
  }

  async authenticateByCertSubject(certSubject: string): Promise<AuthResult> {
    const partner = await this.partnerService.getPartnerByCertSubject(certSubject);
    if (!partner) {
      throw new UnauthorizedException(`No active partner found for cert subject: ${certSubject}`);
    }
    if (partner.status !== 'active') {
      throw new ForbiddenException(`Partner ${partner.partnerId} is not active (status: ${partner.status})`);
    }

    const activeCert = await this.certService.getActiveCertificate(partner.partnerId);
    if (!activeCert) {
      throw new UnauthorizedException(`No active certificate for partner ${partner.partnerId}`);
    }

    if (new Date(activeCert.expiresAt) < new Date()) {
      throw new UnauthorizedException(`Certificate for partner ${partner.partnerId} has expired`);
    }

    return this.buildAuthResult(partner);
  }

  async authenticateByToken(
    token: string,
    requiredAudience: string,
    requiredScope: string,
  ): Promise<AuthResult> {
    const decoded = await this.verifyJwt(token);
    if (!decoded) {
      throw new UnauthorizedException('Invalid token format');
    }

    if (decoded.aud !== requiredAudience) {
      throw new ForbiddenException(`Token audience mismatch: expected ${requiredAudience}, got ${decoded.aud}`);
    }

    if (!decoded.scope || !decoded.scope.split(' ').includes(requiredScope)) {
      throw new ForbiddenException(`Token does not have required scope: ${requiredScope}`);
    }

    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      throw new UnauthorizedException('Token has expired');
    }

    if (decoded.token_use && decoded.token_use !== 'federation') {
      throw new ForbiddenException('Token is not a federation token');
    }

    const partnerId = decoded.agreement_id || decoded.partner_id;
    if (!partnerId) {
      throw new UnauthorizedException('Token missing partner/agreement identifier');
    }

    const partner = await this.partnerService.getPartner(partnerId);
    if (partner.status !== 'active') {
      throw new ForbiddenException(`Partner ${partnerId} is not active`);
    }

    return this.buildAuthResult(partner);
  }

  async authorizeApiAccess(
    partnerId: string,
    requestedApi: string,
    requestedScope: string,
  ): Promise<void> {
    const partner = await this.partnerService.getPartner(partnerId);
    if (partner.status !== 'active') {
      throw new ForbiddenException(`Partner ${partnerId} is not active`);
    }

    if (!partner.allowedApis.includes(requestedApi)) {
      throw new ForbiddenException(`Partner ${partnerId} is not authorized for API: ${requestedApi}`);
    }

    if (!partner.allowedScopes.includes(requestedScope)) {
      throw new ForbiddenException(`Partner ${partnerId} is not authorized for scope: ${requestedScope}`);
    }
  }

  private buildAuthResult(partner: PartnerRegistration): AuthResult {
    return {
      partnerId: partner.partnerId,
      tenantId: partner.tenantId,
      partnerTenantId: partner.partnerTenantId,
      organizationId: partner.organizationId,
      allowedScopes: partner.allowedScopes,
      allowedApis: partner.allowedApis,
      relationshipType: partner.relationshipType,
    };
  }

  /**
   * Verify JWT signature — uses jwt.verify() instead of manual base64 decode.
   * Supports RS256 (JWKS) and HS256 (local secret) algorithms.
   */
  private async verifyJwt(token: string): Promise<Record<string, any> | null> {
    try {
      const decoded = jwt.decode(token, { complete: true }) as any;
      if (decoded?.header?.alg === 'RS256' && decoded?.header?.kid) {
        const key = await this.jwksClient.getSigningKey(decoded.header.kid);
        const signingKey = key.getPublicKey();
        return jwt.verify(token, signingKey, { algorithms: ['RS256'] }) as Record<string, any>;
      }
      // Fallback to HS256 with local secret
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        this.logger.error('JWT_SECRET not configured for HS256 token verification');
        return null;
      }
      return jwt.verify(token, secret, { algorithms: ['HS256'] }) as Record<string, any>;
    } catch (err: any) {
      this.logger.debug(`JWT verification failed: ${err?.message || err}`);
      return null;
    }
  }
}
