import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';
import { SAML } from '@node-saml/node-saml';
import { StateStoreService } from './state-store.service';

/**
 * SSO Service
 * Handles Single Sign-On with OIDC (OpenID Connect) and SAML
 */
@Injectable()
export class SsoService {
  private readonly logger = new Logger(SsoService.name);
  private jwksClient: JwksClient | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly stateStore: StateStoreService,
  ) {}

  private validateRedirectUri(redirectUri: string): void {
    const allowed = this.configService.get<string>('OIDC_REDIRECT_URIS');
    if (!allowed) {
      throw new BadRequestException('OIDC redirect URI allow-list is not configured');
    }
    const allowedList = allowed.split(',').map((u) => u.trim()).filter(Boolean);
    if (!allowedList.includes(redirectUri)) {
      throw new BadRequestException('Redirect URI is not in the allow-list');
    }
  }

  /**
   * Generate OIDC authorization URL with state, nonce, and PKCE.
   * If the caller does not provide a state, one is generated server-side.
   */
  async generateOidcAuthUrl(redirectUri: string, state?: string): Promise<{ authUrl: string; state: string; nonce: string }> {
    const clientId = this.configService.get<string>('OIDC_CLIENT_ID');
    const authUrl = this.configService.get<string>('OIDC_AUTH_URL');
    const scope = this.configService.get<string>('OIDC_SCOPE', 'openid profile email');

    if (!clientId || !authUrl) {
      throw new BadRequestException('OIDC configuration is incomplete');
    }

    this.validateRedirectUri(redirectUri);

    const finalState = state || this.stateStore.generateState();
    const nonce = this.stateStore.generateNonce();
    const { codeVerifier, codeChallenge, codeChallengeMethod } = this.stateStore.generatePkce();

    await this.stateStore.save(finalState, {
      redirectUri,
      nonce,
      codeVerifier,
      flowType: 'oidc',
    });

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scope,
      state: finalState,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: codeChallengeMethod,
    });

    return { authUrl: `${authUrl}?${params.toString()}`, state: finalState, nonce };
  }

  /**
   * Exchange authorization code for tokens.
   * State must be validated server-side; code_verifier is added when PKCE is used.
   */
  async exchangeCodeForTokens(code: string, redirectUri: string, state: string): Promise<{
    accessToken: string;
    idToken: string;
    refreshToken?: string;
    expiresIn: number;
    nonce: string;
  }> {
    const clientId = this.configService.get<string>('OIDC_CLIENT_ID');
    const clientSecret = this.configService.get<string>('OIDC_CLIENT_SECRET');
    const tokenUrl = this.configService.get<string>('OIDC_TOKEN_URL');

    if (!clientId || !clientSecret || !tokenUrl) {
      throw new BadRequestException('OIDC configuration is incomplete');
    }

    if (!state) {
      throw new BadRequestException('OIDC state is required');
    }

    const stateData = await this.stateStore.validate(state, redirectUri);
    if (!stateData) {
      throw new UnauthorizedException('Invalid or expired OIDC state');
    }

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
      code_verifier: stateData.codeVerifier || '',
    });

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      });

      if (!response.ok) {
        throw new UnauthorizedException('Failed to exchange authorization code for tokens');
      }

      const tokens = await response.json() as any;

      return {
        accessToken: tokens.access_token,
        idToken: tokens.id_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
        nonce: stateData.nonce || '',
      };
    } catch (error) {
      this.logger.error('Failed to exchange code for tokens', error);
      throw new UnauthorizedException('Failed to exchange authorization code for tokens');
    }
  }

  private getJwksClient(): JwksClient | null {
    if (this.jwksClient) return this.jwksClient;
    const jwksUri = this.configService.get<string>('OIDC_JWKS_URI');
    if (!jwksUri) return null;
    this.jwksClient = new JwksClient({
      jwksUri,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 86400000, // 24 hours
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });
    return this.jwksClient;
  }

  private async getKeyFromJwks(kid: string): Promise<string> {
    const client = this.getJwksClient();
    if (!client) {
      throw new BadRequestException('OIDC_JWKS_URI is not configured');
    }
    const key = await client.getSigningKey(kid);
    return key.getPublicKey();
  }

  private getExpectedAlgorithm(): string {
    return this.configService.get<string>('OIDC_SIGNING_ALGORITHM', 'RS256');
  }

  private async getSigningKey(idToken: string): Promise<string> {
    const decoded = jwt.decode(idToken, { complete: true });
    if (!decoded || !decoded.header) {
      throw new BadRequestException('Invalid ID token format');
    }

    const expectedAlg = this.getExpectedAlgorithm();
    if (decoded.header.alg !== expectedAlg) {
      throw new BadRequestException(
        `Unexpected ID token algorithm: ${decoded.header.alg}. Expected ${expectedAlg}`,
      );
    }

    const jwksUri = this.configService.get<string>('OIDC_JWKS_URI');

    // If JWKS is configured, always use it. Do not fall back to static keys.
    if (jwksUri) {
      if (!decoded.header.kid) {
        throw new BadRequestException('ID token does not contain a kid and JWKS is configured');
      }
      try {
        const jwksKey = await this.getKeyFromJwks(decoded.header.kid);
        this.logger.debug('Resolved signing key from JWKS', { kid: decoded.header.kid });
        return jwksKey;
      } catch (err) {
        this.logger.error('Failed to resolve key from JWKS', {
          kid: decoded.header.kid,
          error: (err as Error).message,
        });
        throw new BadRequestException('Failed to resolve signing key from JWKS');
      }
    }

    // Static key path only when JWKS is not configured
    if (expectedAlg.startsWith('HS')) {
      const secretKey = this.configService.get<string>('OIDC_SECRET_KEY');
      if (!secretKey) {
        throw new BadRequestException('OIDC_SECRET_KEY is required for symmetric signing');
      }
      return secretKey;
    }

    const publicKey = this.configService.get<string>('OIDC_PUBLIC_KEY');
    if (!publicKey) {
      throw new BadRequestException('OIDC_PUBLIC_KEY is required for asymmetric signing');
    }
    return publicKey;
  }

  /**
   * Verify and decode ID token with JWKS or static key
   */
  async verifyIdToken(idToken: string, nonce?: string): Promise<{
    sub: string;
    email: string;
    name: string;
    given_name?: string;
    family_name?: string;
    picture?: string;
    email_verified?: boolean;
  }> {
    const clientId = this.configService.get<string>('OIDC_CLIENT_ID');
    const issuer = this.configService.get<string>('OIDC_ISSUER');

    if (!clientId || !issuer) {
      throw new BadRequestException('OIDC configuration is incomplete');
    }

    try {
      const key = await this.getSigningKey(idToken);
      const verifyOptions: jwt.VerifyOptions = {
        issuer,
        audience: clientId,
        clockTolerance: 60,
        algorithms: [this.getExpectedAlgorithm() as jwt.Algorithm],
      };

      const payload = jwt.verify(idToken, key, verifyOptions) as any;

      if (nonce && payload.nonce !== nonce) {
        throw new UnauthorizedException('ID token nonce does not match the authorization request');
      }

      const requireEmailVerified = this.configService.get<string>('OIDC_REQUIRE_EMAIL_VERIFIED', 'true') === 'true';
      if (requireEmailVerified && payload.email_verified !== true) {
        throw new UnauthorizedException('Email address is not verified');
      }

      return {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        given_name: payload.given_name,
        family_name: payload.family_name,
        picture: payload.picture,
        email_verified: payload.email_verified,
      };
    } catch (error) {
      this.logger.error('Failed to verify ID token', error);
      throw new UnauthorizedException('Failed to verify ID token');
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    expiresIn: number;
  }> {
    const clientId = this.configService.get<string>('OIDC_CLIENT_ID');
    const clientSecret = this.configService.get<string>('OIDC_CLIENT_SECRET');
    const tokenUrl = this.configService.get<string>('OIDC_TOKEN_URL');

    if (!clientId || !clientSecret || !tokenUrl) {
      throw new BadRequestException('OIDC configuration is incomplete');
    }

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      if (!response.ok) {
        throw new UnauthorizedException('Failed to refresh access token');
      }

      const tokens = await response.json() as any;
      
      return {
        accessToken: tokens.access_token,
        expiresIn: tokens.expires_in,
      };
    } catch (error) {
      this.logger.error('Failed to refresh access token', error);
      throw new UnauthorizedException('Failed to refresh access token');
    }
  }

  /**
   * Generate SAML SSO URL with server-side relay state binding and real AuthnRequest.
   */
  async generateSamlSsoUrl(idpId: string, relayState?: string): Promise<{ ssoUrl: string; relayState: string }> {
    const ssoUrl = this.configService.get<string>(`SAML_${idpId}_SSO_URL`);

    if (!ssoUrl) {
      throw new BadRequestException(`SAML configuration for IDP ${idpId} is incomplete`);
    }

    const serverRelayState = this.stateStore.generateState();
    await this.stateStore.save(serverRelayState, {
      providerId: idpId,
      flowType: 'saml',
      clientState: relayState,
    });

    const saml = this.getSamlProvider(idpId);

    try {
      const authnRequestUrl = await saml.getAuthorizeUrlAsync(serverRelayState, undefined, { additionalParams: {} });
      return { ssoUrl: authnRequestUrl, relayState: serverRelayState };
    } catch (error: any) {
      this.logger.warn(`Failed to generate real SAML AuthnRequest for ${idpId}, falling back to plain SSO URL`, error?.message);
      const fallback = `${ssoUrl}?RelayState=${encodeURIComponent(serverRelayState)}`;
      return { ssoUrl: fallback, relayState: serverRelayState };
    }
  }

  private getSamlProvider(idpId: string): SAML {
    const ssoUrl = this.configService.get<string>(`SAML_${idpId}_SSO_URL`);
    const cert = this.configService.get<string>(`SAML_${idpId}_CERT`) || this.configService.get<string>('SAML_CERT');
    const issuer = this.configService.get<string>(`SAML_${idpId}_ISSUER`) || this.configService.get<string>('SAML_ISSUER');
    const decryptionPvk = this.configService.get<string>(`SAML_${idpId}_DECRYPTION_KEY`) || this.configService.get<string>('SAML_DECRYPTION_KEY');
    const privateKey = this.configService.get<string>(`SAML_${idpId}_PRIVATE_KEY`) || this.configService.get<string>('SAML_PRIVATE_KEY');

    if (!cert) {
      throw new BadRequestException(`SAML certificate for IDP ${idpId} is not configured`);
    }

    return new SAML({
      issuer: issuer || 'insurance-enterprise-auth',
      cert,
      entryPoint: ssoUrl || undefined,
      decryptionPvk: decryptionPvk || undefined,
      privateKey: privateKey || undefined,
      wantAssertionsSigned: true,
      wantAuthnResponseSigned: true,
      signatureAlgorithm: 'sha256',
      digestAlgorithm: 'sha256',
    });
  }

  /**
   * Handle SAML response with real assertion parsing, signature validation
   * and server-side relay-state binding.
   */
  async handleSamlResponse(samlResponse: string, relayState: string): Promise<{
    userId: string;
    attributes: Record<string, string>;
    relayState?: string;
    clientState?: string;
  }> {
    this.logger.log('Processing SAML response');

    const stateData = await this.stateStore.validate(relayState);
    if (!stateData || stateData.flowType !== 'saml') {
      throw new UnauthorizedException('Invalid or expired SAML relay state');
    }

    const idpId = stateData.providerId || this.configService.get<string>('SAML_IDP_DEFAULT', 'default');
    const saml = this.getSamlProvider(idpId);

    try {
      const profile = await saml.validatePostResponseAsync({ SAMLResponse: samlResponse });
      const attributes: Record<string, string> = {};

      // Map SAML attributes using configured attribute mapping
      const attributeMappingStr = this.configService.get<string>(`SAML_${idpId}_ATTRIBUTE_MAPPING`)
        || this.configService.get<string>('SAML_ATTRIBUTE_MAPPING');
      const attributeMapping: Record<string, string> = attributeMappingStr ? JSON.parse(attributeMappingStr) : {
        email: 'email',
        name: 'name',
        givenName: 'given_name',
        surname: 'family_name',
      };

      for (const [samlAttr, localAttr] of Object.entries(attributeMapping)) {
        const value = (profile as any).attributes?.[samlAttr] || (profile as any)[samlAttr];
        if (value !== undefined) {
          attributes[localAttr] = String(value);
        }
      }

      // Also include raw SAML attributes
      if ((profile as any).attributes) {
        for (const [key, value] of Object.entries((profile as any).attributes)) {
          if (!attributes[key]) {
            attributes[key] = String(value);
          }
        }
      }

      const userId = (profile as any).nameID || attributes.email || 'unknown';

      this.logger.log('SAML assertion validated successfully', { userId, idpId });

      return {
        userId,
        attributes,
        relayState,
        clientState: stateData.clientState,
      };
    } catch (error: any) {
      this.logger.error('SAML assertion validation failed', error);
      throw new UnauthorizedException('SAML assertion validation failed');
    }
  }

  /**
   * Get configured SSO providers
   */
  getSsoProviders(): Array<{
    id: string;
    name: string;
    type: 'oidc' | 'saml';
    enabled: boolean;
  }> {
    const providers: Array<{
      id: string;
      name: string;
      type: 'oidc' | 'saml';
      enabled: boolean;
    }> = [];

    // Check OIDC configuration
    if (this.configService.get('OIDC_CLIENT_ID')) {
      providers.push({
        id: 'oidc',
        name: 'OpenID Connect',
        type: 'oidc',
        enabled: true,
      });
    }

    // Check SAML IDPs
    const samlIdps = this.configService.get('SAML_IDPS', '');
    if (samlIdps) {
      const idpList = samlIdps.split(',');
      for (const idp of idpList) {
        providers.push({
          id: idp.trim(),
          name: `SAML - ${idp.trim()}`,
          type: 'saml',
          enabled: this.configService.get(`SAML_${idp.trim()}_SSO_URL`) !== undefined,
        });
      }
    }

    return providers;
  }

  /**
   * Check if SSO is configured and enabled
   */
  isSsoEnabled(): boolean {
    return this.getSsoProviders().some(p => p.enabled);
  }
}
