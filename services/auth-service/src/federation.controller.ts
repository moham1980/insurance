import { Body, Controller, Delete, Get, Headers, Param, Post, Query, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { FederationService, FederatedIdentityInfo } from './federation.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { PermissionsGuard } from './permissions.guard';
import { Permissions } from './permissions.decorator';
import { AuthService } from './auth.service';
import { TokenExchangeService } from './token-exchange/token-exchange.service';

@Controller('federation')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class FederationController {
  constructor(
    private readonly federationService: FederationService,
    private readonly authService: AuthService,
    private readonly tokenExchangeService: TokenExchangeService,
  ) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return uuidv4();
  }

  /**
   * Get configured identity providers
   */
  @Get('providers')
  @Roles('insurer_admin', 'head_office_ops')
  @Permissions('federation:read')
  getIdentityProviders(@Headers() headers: Record<string, any>) {
    const correlationId = this.getCorrelationId(headers);
    const providers = this.federationService.getIdentityProviders();
    
    return {
      success: true,
      data: { providers },
      correlationId,
    };
  }

  /**
   * Get authorization URL for a provider
   */
  @Get('authorize')
  @Permissions('federation:read')
  async getAuthorizationUrl(
    @Query('provider_id') providerId: string,
    @Query('redirect_uri') redirectUri: string,
    @Query('state') state: string | undefined,
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = this.getCorrelationId(headers);

    if (!providerId || !redirectUri) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'provider_id and redirect_uri are required' },
        correlationId,
      };
    }

    try {
      const result = await this.federationService.getAuthorizationUrl(providerId, redirectUri, state);
      return {
        success: true,
        data: result,
        correlationId,
      };
    } catch (error: any) {
      return {
        success: false,
        error: { code: 'FEDERATION_ERROR', message: 'Operation failed' },
        correlationId,
      };
    }
  }

  /**
   * Exchange authorization code for tokens
   */
  @Post('token')
  @Permissions('federation:manage')
  async exchangeCodeForTokens(
    @Body() body: { providerId: string; code: string; redirectUri: string; state: string },
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = this.getCorrelationId(headers);

    if (!body.providerId || !body.code || !body.redirectUri || !body.state) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'providerId, code, redirectUri and state are required' },
        correlationId,
      };
    }

    try {
      const tokens = await this.federationService.exchangeCodeForTokens(
        body.providerId,
        body.code,
        body.redirectUri,
        body.state,
      );
      return {
        success: true,
        data: tokens,
        correlationId,
      };
    } catch (error: any) {
      return {
        success: false,
        error: { code: 'TOKEN_EXCHANGE_FAILED', message: 'Operation failed' },
        correlationId,
      };
    }
  }

  /**
   * Get user info from provider
   */
  @Post('userinfo')
  @Permissions('federation:manage')
  async getUserInfo(
    @Body() body: { providerId: string; accessToken: string },
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = this.getCorrelationId(headers);

    if (!body.providerId || !body.accessToken) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'providerId and accessToken are required' },
        correlationId,
      };
    }

    try {
      const userInfo = await this.federationService.getUserInfo(body.providerId, body.accessToken);
      return {
        success: true,
        data: userInfo,
        correlationId,
      };
    } catch (error: any) {
      return {
        success: false,
        error: { code: 'USERINFO_FAILED', message: 'Operation failed' },
        correlationId,
      };
    }
  }

  /**
   * Link federated identity to user
   */
  @Post('link')
  @Roles('insurer_admin', 'head_office_ops')
  @Permissions('federation:manage')
  async linkFederatedIdentity(
    @Body() body: { userId: string; providerId: string; providerUserId: string; attributes: Record<string, any> },
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = this.getCorrelationId(headers);

    if (!body.userId || !body.providerId || !body.providerUserId) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'userId, providerId, and providerUserId are required' },
        correlationId,
      };
    }

    try {
      await this.federationService.linkFederatedIdentity(
        body.userId,
        body.providerId,
        body.providerUserId,
        body.attributes,
      );
      return {
        success: true,
        data: { message: 'Federated identity linked successfully' },
        correlationId,
      };
    } catch (error: any) {
      return {
        success: false,
        error: { code: 'LINK_FAILED', message: 'Operation failed' },
        correlationId,
      };
    }
  }

  /**
   * Unlink federated identity from user
   */
  @Post('unlink')
  @Roles('insurer_admin', 'head_office_ops')
  @Permissions('federation:manage')
  async unlinkFederatedIdentity(
    @Body() body: { userId: string; providerId: string },
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = this.getCorrelationId(headers);

    if (!body.userId || !body.providerId) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'userId and providerId are required' },
        correlationId,
      };
    }

    try {
      await this.federationService.unlinkFederatedIdentity(body.userId, body.providerId);
      return {
        success: true,
        data: { message: 'Federated identity unlinked successfully' },
        correlationId,
      };
    } catch (error: any) {
      return {
        success: false,
        error: { code: 'UNLINK_FAILED', message: 'Operation failed' },
        correlationId,
      };
    }
  }

  /**
   * Get user's federated identities
   */
  @Get('user/:userId/identities')
  @Roles('insurer_admin', 'head_office_ops')
  @Permissions('federation:read')
  async getUserFederatedIdentities(
    @Param('userId') userId: string,
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = this.getCorrelationId(headers);

    try {
      const identities = await this.federationService.getUserFederatedIdentities(userId);
      return {
        success: true,
        data: { identities },
        correlationId,
      };
    } catch (error: any) {
      return {
        success: false,
        error: { code: 'FETCH_FAILED', message: 'Operation failed' },
        correlationId,
      };
    }
  }

  /**
   * Refresh federated tokens
   */
  @Post('refresh')
  @Permissions('federation:manage')
  async refreshFederatedTokens(
    @Body() body: { providerId: string; refreshToken: string },
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = this.getCorrelationId(headers);

    if (!body.providerId || !body.refreshToken) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'providerId and refreshToken are required' },
        correlationId,
      };
    }

    try {
      const tokens = await this.federationService.refreshFederatedTokens(
        body.providerId,
        body.refreshToken,
      );
      return {
        success: true,
        data: tokens,
        correlationId,
      };
    } catch (error: any) {
      return {
        success: false,
        error: { code: 'REFRESH_FAILED', message: 'Operation failed' },
        correlationId,
      };
    }
  }

  @Post('token-exchange')
  @Permissions('federation:manage')
  async exchangeToken(
    @Body() body: {
      subjectToken: string;
      subjectTokenType: string;
      audience: string;
      scope: string;
      requestedTokenType?: string;
      actorClientId: string;
      agreementId: string;
      relationshipType: string;
    },
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = this.getCorrelationId(headers);

    if (!body.subjectToken || !body.audience || !body.scope || !body.actorClientId || !body.agreementId) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'subjectToken, audience, scope, actorClientId, agreementId are required' },
        correlationId,
      };
    }

    try {
      const result = await this.tokenExchangeService.exchangeToken(body);
      return {
        success: true,
        data: result,
        correlationId,
      };
    } catch (error: any) {
      return {
        success: false,
        error: { code: error.name || 'TOKEN_EXCHANGE_FAILED', message: error.message || 'Operation failed' },
        correlationId,
      };
    }
  }

  @Post('mtls/certificates')
  @Permissions('federation:manage')
  async registerMtlsCertificate(
    @Body() body: {
      organizationId: string;
      tenantId: string;
      commonName: string;
      fingerprint: string;
      pemContent: string;
      issuer?: string;
      validFrom: string;
      validTo: string;
      metadata?: Record<string, any>;
    },
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = this.getCorrelationId(headers);
    if (!body.organizationId || !body.commonName || !body.fingerprint || !body.pemContent || !body.validFrom || !body.validTo) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'organizationId, commonName, fingerprint, pemContent, validFrom, validTo are required' },
        correlationId,
      };
    }
    try {
      const cert = await this.federationService.registerMtlsCertificate(body);
      return { success: true, data: cert, correlationId };
    } catch (error: any) {
      return { success: false, error: { code: error.name || 'INTERNAL_ERROR', message: error.message }, correlationId };
    }
  }

  @Get('mtls/certificates/:organizationId')
  @Permissions('federation:read')
  async listMtlsCertificates(
    @Param('organizationId') organizationId: string,
    @Query('status') status: string,
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = this.getCorrelationId(headers);
    try {
      const certs = await this.federationService.listMtlsCertificates(organizationId, status);
      return { success: true, data: certs, correlationId };
    } catch (error: any) {
      return { success: false, error: { code: error.name || 'INTERNAL_ERROR', message: error.message }, correlationId };
    }
  }

  @Delete('mtls/certificates/:certificateId')
  @Permissions('federation:manage')
  async revokeMtlsCertificate(
    @Param('certificateId') certificateId: string,
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = this.getCorrelationId(headers);
    try {
      await this.federationService.revokeMtlsCertificate(certificateId);
      return { success: true, data: { certificateId, status: 'revoked' }, correlationId };
    } catch (error: any) {
      return { success: false, error: { code: error.name || 'INTERNAL_ERROR', message: error.message }, correlationId };
    }
  }
}

@Controller('federation/iam-ecosystem')
export class EcosystemCallbackController {
  constructor(
    private readonly federationService: FederationService,
    private readonly authService: AuthService,
  ) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return uuidv4();
  }

  @Post('callback')
  async ecosystemCallback(
    @Body() body: { code: string; redirectUri: string; state: string },
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = this.getCorrelationId(headers);

    if (!body.code || !body.redirectUri || !body.state) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'code, redirectUri and state are required' },
        correlationId,
      };
    }

    // Fail-fast if JWT_SECRET is missing — AuthService constructor will also enforce this.
    if (!process.env.JWT_SECRET) {
      throw new UnauthorizedException('JWT_SECRET is not configured');
    }

    try {
      const tokens = await this.federationService.exchangeCodeForTokens(
        'iam-ecosystem',
        body.code,
        body.redirectUri,
        body.state,
      );

      const userInfo = await this.federationService.getUserInfo(
        'iam-ecosystem',
        tokens.accessToken,
      );

      const ip = headers['x-forwarded-for'] || headers['x-real-ip'] || 'unknown';
      const { token, refreshToken, user } = await this.authService.federateLogin({
        providerId: 'iam-ecosystem',
        providerUserId: userInfo.providerUserId,
        email: userInfo.email,
        name: userInfo.name,
        attributes: userInfo.attributes,
        deviceFingerprint: body.state,
        ipAddress: typeof ip === 'string' ? ip : undefined,
        userAgent: headers['user-agent'] || undefined,
      });

      return {
        success: true,
        data: {
          accessToken: token,
          refreshToken,
          userId: user.userId,
          email: user.email,
          username: user.username,
          roles: user.roles,
          tenantId: user.tenantId,
        },
        correlationId,
      };
    } catch (error: any) {
      return {
        success: false,
        error: { code: 'ECOSYSTEM_CALLBACK_FAILED', message: 'Operation failed' },
        correlationId,
      };
    }
  }
}
