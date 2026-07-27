import { Body, Controller, Get, Headers, Post, Query, UseGuards } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { SsoService } from './sso.service';
import { AuthService } from './auth.service';
import { AccessAuditService } from './access-audit.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('sso')
export class SsoController {
  constructor(
    private readonly ssoService: SsoService,
    private readonly authService: AuthService,
    private readonly auditService: AccessAuditService,
  ) {}

  private readonly rateLimitWindowMs = 60 * 1000;
  private readonly rateLimitMax = 30;
  private readonly rateLimits = new Map<string, { count: number; windowStart: number }>();

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return uuidv4();
  }

  private getClientIp(headers: Record<string, any>): string {
    const ip = headers['x-forwarded-for'] || headers['x-real-ip'];
    return typeof ip === 'string' ? ip.split(',')[0].trim() : 'unknown';
  }

  private checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();
    const entry = this.rateLimits.get(ip);
    if (!entry || now - entry.windowStart > this.rateLimitWindowMs) {
      this.rateLimits.set(ip, { count: 1, windowStart: now });
      return { allowed: true };
    }
    if (entry.count >= this.rateLimitMax) {
      const retryAfter = Math.ceil((entry.windowStart + this.rateLimitWindowMs - now) / 1000);
      return { allowed: false, retryAfter };
    }
    entry.count += 1;
    return { allowed: true };
  }

  /**
   * Get available SSO providers
   */
  @Get('providers')
  getSsoProviders() {
    const providers = this.ssoService.getSsoProviders();
    return {
      success: true,
      data: {
        providers,
        ssoEnabled: this.ssoService.isSsoEnabled(),
      },
    };
  }

  /**
   * Generate OIDC authorization URL with state, nonce, and PKCE.
   */
  @Get('oidc/auth-url')
  async getOidcAuthUrl(
    @Query('redirect_uri') redirectUri: string,
    @Query('state') state: string | undefined,
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const clientIp = this.getClientIp(headers);
    const rateLimit = this.checkRateLimit(clientIp);
    if (!rateLimit.allowed) {
      return { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' }, correlationId };
    }

    if (!redirectUri) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'redirect_uri is required' },
        correlationId,
      };
    }

    try {
      const result = await this.ssoService.generateOidcAuthUrl(redirectUri, state);
      return {
        success: true,
        data: result,
        correlationId,
      };
    } catch (error: any) {
      return {
        success: false,
        error: { code: 'SSO_ERROR', message: 'Operation failed' },
        correlationId,
      };
    }
  }

  /**
   * Exchange OIDC authorization code for tokens
   */
  @Post('oidc/token')
  async exchangeCodeForTokens(
    @Body() body: { code: string; redirectUri: string; state?: string },
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const clientIp = this.getClientIp(headers);
    const rateLimit = this.checkRateLimit(clientIp);
    if (!rateLimit.allowed) {
      return { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' }, correlationId };
    }

    if (!body.code || !body.redirectUri || !body.state) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'code, redirectUri and state are required' },
        correlationId,
      };
    }

    try {
      const tokens = await this.ssoService.exchangeCodeForTokens(body.code, body.redirectUri, body.state);
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
   * Verify ID token
   */
  @Post('oidc/verify')
  async verifyIdToken(
    @Body() body: { idToken: string; nonce?: string },
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const clientIp = this.getClientIp(headers);
    const rateLimit = this.checkRateLimit(clientIp);
    if (!rateLimit.allowed) {
      return { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' }, correlationId };
    }

    if (!body.idToken || !body.nonce) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'idToken and nonce are required' },
        correlationId,
      };
    }

    try {
      const userInfo = await this.ssoService.verifyIdToken(body.idToken, body.nonce);
      return {
        success: true,
        data: userInfo,
        correlationId,
      };
    } catch (error: any) {
      return {
        success: false,
        error: { code: 'TOKEN_VERIFICATION_FAILED', message: 'Operation failed' },
        correlationId,
      };
    }
  }

  /**
   * Refresh access token
   */
  @Post('oidc/refresh')
  async refreshAccessToken(
    @Body() body: { refreshToken: string },
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const clientIp = this.getClientIp(headers);
    const rateLimit = this.checkRateLimit(clientIp);
    if (!rateLimit.allowed) {
      return { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' }, correlationId };
    }

    if (!body.refreshToken) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'refreshToken is required' },
        correlationId,
      };
    }

    try {
      const tokens = await this.ssoService.refreshAccessToken(body.refreshToken);
      return {
        success: true,
        data: tokens,
        correlationId,
      };
    } catch (error: any) {
      return {
        success: false,
        error: { code: 'TOKEN_REFRESH_FAILED', message: 'Operation failed' },
        correlationId,
      };
    }
  }

  /**
   * Generate SAML SSO URL with server-bound relay state.
   */
  @Get('saml/sso')
  async getSamlSsoUrl(
    @Query('idp_id') idpId: string,
    @Query('relay_state') relayState: string | undefined,
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const clientIp = this.getClientIp(headers);
    const rateLimit = this.checkRateLimit(clientIp);
    if (!rateLimit.allowed) {
      return { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' }, correlationId };
    }

    if (!idpId) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'idp_id is required' },
        correlationId,
      };
    }

    try {
      const result = await this.ssoService.generateSamlSsoUrl(idpId, relayState);
      return {
        success: true,
        data: result,
        correlationId,
      };
    } catch (error: any) {
      return {
        success: false,
        error: { code: 'SSO_ERROR', message: 'Operation failed' },
        correlationId,
      };
    }
  }

  /**
   * Handle SAML response (ACS callback) and convert to local user/tenant.
   */
  @Post('saml/acs')
  async handleSamlResponse(
    @Body() body: { samlResponse: string; relayState: string },
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const clientIp = this.getClientIp(headers);
    const rateLimit = this.checkRateLimit(clientIp);
    if (!rateLimit.allowed) {
      return { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' }, correlationId };
    }

    if (!body.samlResponse || !body.relayState) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'samlResponse and relayState are required' },
        correlationId,
      };
    }

    const ip = headers['x-forwarded-for'] || headers['x-real-ip'] || 'unknown';
    const userAgent = headers['user-agent'] || undefined;

    try {
      const userInfo = await this.ssoService.handleSamlResponse(body.samlResponse, body.relayState);
      const { token, refreshToken, user } = await this.authService.federateLogin({
        providerId: 'saml',
        providerUserId: userInfo.userId,
        email: userInfo.attributes.email || `${userInfo.userId}@saml.federated`,
        name: userInfo.attributes.name || userInfo.userId,
        attributes: userInfo.attributes,
        deviceFingerprint: userInfo.relayState,
        ipAddress: typeof ip === 'string' ? ip : undefined,
        userAgent,
      });

      this.auditService.logAccess({
        userId: user.userId,
        resourceType: 'sso',
        action: 'saml_acs',
        decision: 'allow',
        tenantId: user.tenantId || undefined,
        context: { providerId: 'saml', providerUserId: userInfo.userId, correlationId },
        ipAddress: typeof ip === 'string' ? ip : undefined,
        userAgent,
      }).catch(() => {});

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
      this.auditService.logAccess({
        userId: 'anonymous',
        resourceType: 'sso',
        action: 'saml_acs',
        decision: 'deny',
        context: { correlationId, relayState: body.relayState },
        ipAddress: typeof ip === 'string' ? ip : undefined,
        userAgent,
      }).catch(() => {});

      return {
        success: false,
        error: { code: 'SAML_PROCESSING_FAILED', message: 'Operation failed' },
        correlationId,
      };
    }
  }

  /**
   * Complete OIDC login by exchanging code, verifying ID token and mapping to local user/tenant.
   */
  @Post('oidc/callback')
  async oidcCallback(
    @Body() body: { code: string; redirectUri: string; state: string },
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const clientIp = this.getClientIp(headers);
    const rateLimit = this.checkRateLimit(clientIp);
    if (!rateLimit.allowed) {
      return { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' }, correlationId };
    }

    if (!body.code || !body.redirectUri || !body.state) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'code, redirectUri and state are required' },
        correlationId,
      };
    }

    const ip = headers['x-forwarded-for'] || headers['x-real-ip'] || 'unknown';
    const userAgent = headers['user-agent'] || undefined;

    try {
      const tokens = await this.ssoService.exchangeCodeForTokens(body.code, body.redirectUri, body.state);
      const userInfo = await this.ssoService.verifyIdToken(tokens.idToken, tokens.nonce);
      const { token, refreshToken, user } = await this.authService.federateLogin({
        providerId: 'oidc',
        providerUserId: userInfo.sub,
        email: userInfo.email,
        name: userInfo.name || `${userInfo.given_name || ''} ${userInfo.family_name || ''}`.trim() || userInfo.sub,
        attributes: userInfo as any,
        deviceFingerprint: body.state,
        ipAddress: typeof ip === 'string' ? ip : undefined,
        userAgent,
      });

      this.auditService.logAccess({
        userId: user.userId,
        resourceType: 'sso',
        action: 'oidc_callback',
        decision: 'allow',
        tenantId: user.tenantId || undefined,
        context: { providerId: 'oidc', providerUserId: userInfo.sub, correlationId },
        ipAddress: typeof ip === 'string' ? ip : undefined,
        userAgent,
      }).catch(() => {});

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
      this.auditService.logAccess({
        userId: 'anonymous',
        resourceType: 'sso',
        action: 'oidc_callback',
        decision: 'deny',
        context: { correlationId, state: body.state },
        ipAddress: typeof ip === 'string' ? ip : undefined,
        userAgent,
      }).catch(() => {});

      return {
        success: false,
        error: { code: 'OIDC_CALLBACK_FAILED', message: 'Operation failed' },
        correlationId,
      };
    }
  }
}
