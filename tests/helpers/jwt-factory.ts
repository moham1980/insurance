import * as jwt from 'jsonwebtoken';

export interface JwtPayload {
  sub: string;
  tenantId: string;
  roles: string[];
  organizationId?: string;
  exp?: number;
  iss?: string;
  aud?: string | string[];
  scope?: string;
}

export class JwtFactory {
  private static readonly SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
  private static readonly ISSUER = process.env.JWT_ISSUER || 'http://localhost:18001';
  private static readonly AUDIENCE = process.env.JWT_AUDIENCE || 'insurance-platform';

  static createToken(payload: JwtPayload, expiresIn: string = '1h'): string {
    return jwt.sign(
      {
        sub: payload.sub,
        tenantId: payload.tenantId,
        roles: payload.roles,
        ...(payload.organizationId && { organizationId: payload.organizationId }),
        iss: payload.iss ?? this.ISSUER,
        aud: payload.aud ?? this.AUDIENCE,
        ...(payload.scope && { scope: payload.scope }),
      },
      this.SECRET,
      { expiresIn: expiresIn as any },
    );
  }

  static createTokenWithRole(tenantId: string, role: string, organizationId?: string): string {
    return this.createToken({
      sub: `${role}-user`,
      tenantId,
      roles: [role],
      organizationId,
    });
  }

  static createAdminToken(tenantId: string = 'default-tenant'): string {
    return this.createToken({
      sub: 'admin-user',
      tenantId,
      roles: ['insurer_admin'],
    });
  }

  static createAgentToken(agentId: string, tenantId: string = 'default-tenant'): string {
    return this.createToken({
      sub: agentId,
      tenantId,
      roles: ['agent'],
    });
  }

  static createCustomerToken(customerId: string, tenantId: string = 'default-tenant'): string {
    return this.createToken({
      sub: customerId,
      tenantId,
      roles: ['customer'],
    });
  }

  static createUnderwriterToken(userId: string, tenantId: string = 'default-tenant'): string {
    return this.createToken({
      sub: userId,
      tenantId,
      roles: ['underwriter'],
    });
  }

  static createGatewayAdminToken(tenantId: string = 'default-tenant'): string {
    return this.createToken({
      sub: 'gateway-admin',
      tenantId,
      roles: ['platform_admin'],
      scope: 'gateway:admin',
    });
  }

  static decodeToken(token: string): JwtPayload {
    return jwt.verify(token, this.SECRET) as JwtPayload;
  }
}
