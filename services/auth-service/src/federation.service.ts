import { Injectable, Logger, UnauthorizedException, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FederatedIdentity } from './entities/FederatedIdentity';
import { User } from './entities/User';
import { MtlsCertificate } from './entities/MtlsCertificate';
import { StateStoreService } from './state-store.service';

/**
 * Federation Service
 * Handles federation with external identity providers (IdP) like Azure AD, Okta, Keycloak
 */
export interface FederatedIdentityInfo {
  provider: string;
  providerUserId: string;
  email: string;
  name: string;
  attributes: Record<string, any>;
}

export interface IdentityProvider {
  id: string;
  name: string;
  type: 'oidc' | 'saml' | 'oauth2';
  enabled: boolean;
  config: Record<string, any>;
}

@Injectable()
export class FederationService {
  private readonly logger = new Logger(FederationService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(FederatedIdentity)
    private readonly federatedIdentityRepository: Repository<FederatedIdentity>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(MtlsCertificate)
    private readonly mtlsCertificateRepository: Repository<MtlsCertificate>,
    private readonly stateStore: StateStoreService,
  ) {}

  /**
   * Get configured identity providers
   */
  getIdentityProviders(): IdentityProvider[] {
    const providers: IdentityProvider[] = [];

    // Azure AD
    const azureEnabled = this.configService.get('AZURE_AD_ENABLED', 'false') === 'true';
    if (azureEnabled) {
      providers.push({
        id: 'azure-ad',
        name: 'Azure Active Directory',
        type: 'oidc',
        enabled: true,
        config: {
          tenantId: this.configService.get('AZURE_AD_TENANT_ID'),
          clientId: this.configService.get('AZURE_AD_CLIENT_ID'),
          authority: this.configService.get('AZURE_AD_AUTHORITY'),
        },
      });
    }

    // Okta
    const oktaEnabled = this.configService.get('OKTA_ENABLED', 'false') === 'true';
    if (oktaEnabled) {
      providers.push({
        id: 'okta',
        name: 'Okta',
        type: 'oidc',
        enabled: true,
        config: {
          domain: this.configService.get('OKTA_DOMAIN'),
          clientId: this.configService.get('OKTA_CLIENT_ID'),
        },
      });
    }

    // Keycloak
    const keycloakEnabled = this.configService.get('KEYCLOAK_ENABLED', 'false') === 'true';
    if (keycloakEnabled) {
      providers.push({
        id: 'keycloak',
        name: 'Keycloak',
        type: 'oidc',
        enabled: true,
        config: {
          url: this.configService.get('KEYCLOAK_URL'),
          realm: this.configService.get('KEYCLOAK_REALM'),
          clientId: this.configService.get('KEYCLOAK_CLIENT_ID'),
        },
      });
    }

    // Ecosystem IAM (bank iam-service)
    const ecosystemEnabled = this.configService.get('ECOSYSTEM_IAM_ENABLED', 'false') === 'true';
    if (ecosystemEnabled) {
      providers.push({
        id: 'iam-ecosystem',
        name: 'Ecosystem IAM (Bank)',
        type: 'oidc',
        enabled: true,
        config: {
          issuer: this.configService.get('ECOSYSTEM_IAM_ISSUER', 'http://localhost:8080'),
          clientId: this.configService.get('ECOSYSTEM_IAM_CLIENT_ID', 'insurance-portal'),
          clientSecret: this.configService.get('ECOSYSTEM_IAM_CLIENT_SECRET', ''),
          authUrl: this.configService.get('ECOSYSTEM_IAM_AUTH_URL', ''),
          tokenUrl: this.configService.get('ECOSYSTEM_IAM_TOKEN_URL', ''),
          userInfoUrl: this.configService.get('ECOSYSTEM_IAM_USERINFO_URL', ''),
          jwksUri: this.configService.get('ECOSYSTEM_IAM_JWKS_URI', ''),
          scope: this.configService.get('ECOSYSTEM_IAM_SCOPE', 'openid profile email'),
        },
      });
    }

    return providers;
  }

  private validateRedirectUri(redirectUri: string): void {
    const allowed = this.configService.get<string>('FEDERATION_REDIRECT_URIS') || this.configService.get<string>('OIDC_REDIRECT_URIS');
    if (!allowed) {
      throw new BadRequestException('Federation redirect URI allow-list is not configured');
    }
    const allowedList = allowed.split(',').map((u) => u.trim()).filter(Boolean);
    if (!allowedList.includes(redirectUri)) {
      throw new BadRequestException('Redirect URI is not in the allow-list');
    }
  }

  /**
   * Get authorization URL for a specific identity provider with state, nonce, and PKCE.
   */
  async getAuthorizationUrl(providerId: string, redirectUri: string, state?: string): Promise<{ authUrl: string; state: string; nonce: string }> {
    const provider = this.getIdentityProviders().find(p => p.id === providerId);

    if (!provider || !provider.enabled) {
      throw new BadRequestException(`Identity provider ${providerId} not found or disabled`);
    }

    this.validateRedirectUri(redirectUri);

    const finalState = state || this.stateStore.generateState();
    const nonce = this.stateStore.generateNonce();
    const { codeVerifier, codeChallenge, codeChallengeMethod } = this.stateStore.generatePkce();

    await this.stateStore.save(finalState, {
      redirectUri,
      nonce,
      codeVerifier,
      providerId,
    });

    let authUrl = '';
    switch (provider.type) {
      case 'oidc':
        authUrl = this.getOidcAuthorizationUrl(provider, redirectUri, finalState, nonce, codeChallenge, codeChallengeMethod);
        break;
      case 'oauth2':
        authUrl = this.getOAuth2AuthorizationUrl(provider, redirectUri, finalState, codeChallenge, codeChallengeMethod);
        break;
      case 'saml':
        authUrl = this.getSamlAuthorizationUrl(provider, finalState);
        break;
      default:
        throw new BadRequestException(`Unsupported provider type: ${provider.type}`);
    }

    return { authUrl, state: finalState, nonce };
  }

  /**
   * Get OIDC authorization URL
   */
  private getOidcAuthorizationUrl(
    provider: IdentityProvider,
    redirectUri: string,
    state: string,
    nonce: string,
    codeChallenge: string,
    codeChallengeMethod: string,
  ): string {
    const config = provider.config;
    
    let authUrl = '';
    if (provider.id === 'azure-ad') {
      authUrl = `${config.authority}/${config.tenantId}/oauth2/v2.0/authorize`;
    } else if (provider.id === 'okta') {
      authUrl = `https://${config.domain}/oauth2/v1/authorize`;
    } else if (provider.id === 'keycloak') {
      authUrl = `${config.url}/realms/${config.realm}/protocol/openid-connect/auth`;
    } else if (provider.id === 'iam-ecosystem') {
      authUrl = config.authUrl || `${config.issuer}/oauth2/authorize`;
    }

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: redirectUri,
      scope: 'openid profile email',
      state: state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: codeChallengeMethod,
    });

    return `${authUrl}?${params.toString()}`;
  }

  /**
   * Get OAuth2 authorization URL
   */
  private getOAuth2AuthorizationUrl(
    provider: IdentityProvider,
    redirectUri: string,
    state: string,
    codeChallenge: string,
    codeChallengeMethod: string,
  ): string {
    // Generic OAuth2 implementation
    const config = provider.config;
    const authUrl = config.authUrl;

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: redirectUri,
      scope: config.scope || 'openid profile email',
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: codeChallengeMethod,
    });

    return `${authUrl}?${params.toString()}`;
  }

  /**
   * Get SAML authorization URL
   */
  private getSamlAuthorizationUrl(provider: IdentityProvider, state: string): string {
    const config = provider.config;
    return `${config.ssoUrl}?RelayState=${encodeURIComponent(state)}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(
    providerId: string,
    code: string,
    redirectUri: string,
    state: string,
  ): Promise<{ accessToken: string; idToken: string; refreshToken?: string; nonce: string }> {
    const provider = this.getIdentityProviders().find(p => p.id === providerId);

    if (!provider || !provider.enabled) {
      throw new BadRequestException(`Identity provider ${providerId} not found or disabled`);
    }

    if (!state) {
      throw new BadRequestException('Federation state is required');
    }

    const stateData = await this.stateStore.validate(state, redirectUri);
    if (!stateData) {
      throw new UnauthorizedException('Invalid or expired federation state');
    }

    // Validate state belongs to the requested provider
    if (stateData.providerId && stateData.providerId !== providerId) {
      throw new UnauthorizedException('Federation state does not match the requested provider');
    }

    try {
      switch (provider.type) {
        case 'oidc':
        case 'oauth2':
          return await this.exchangeOidcCode(provider, code, redirectUri, stateData.codeVerifier || '', stateData.nonce || '');
        case 'saml':
          throw new BadRequestException('SAML does not use code exchange');
        default:
          throw new BadRequestException(`Unsupported provider type: ${provider.type}`);
      }
    } catch (error) {
      this.logger.error(`Failed to exchange code for tokens for provider ${providerId}`, error);
      throw new UnauthorizedException('Failed to exchange authorization code for tokens');
    }
  }

  /**
   * Exchange OIDC code for tokens
   */
  private async exchangeOidcCode(
    provider: IdentityProvider,
    code: string,
    redirectUri: string,
    codeVerifier: string,
    nonce: string,
  ): Promise<{ accessToken: string; idToken: string; refreshToken?: string; nonce: string }> {
    const config = provider.config;

    let tokenUrl = '';
    if (provider.id === 'azure-ad') {
      tokenUrl = `${config.authority}/${config.tenantId}/oauth2/v2.0/token`;
    } else if (provider.id === 'okta') {
      tokenUrl = `https://${config.domain}/oauth2/v1/token`;
    } else if (provider.id === 'keycloak') {
      tokenUrl = `${config.url}/realms/${config.realm}/protocol/openid-connect/token`;
    } else if (provider.id === 'iam-ecosystem') {
      tokenUrl = config.tokenUrl || `${config.issuer}/oauth2/token`;
    }

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code_verifier: codeVerifier,
    });

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

    const tokens = await response.json() as {
      access_token: string;
      id_token: string;
      refresh_token?: string;
    };

    return {
      accessToken: tokens.access_token,
      idToken: tokens.id_token,
      refreshToken: tokens.refresh_token,
      nonce: nonce || '',
    };
  }

  /**
   * Get user info from identity provider
   */
  async getUserInfo(providerId: string, accessToken: string): Promise<FederatedIdentityInfo> {
    const provider = this.getIdentityProviders().find(p => p.id === providerId);

    if (!provider || !provider.enabled) {
      throw new BadRequestException(`Identity provider ${providerId} not found or disabled`);
    }

    try {
      switch (provider.type) {
        case 'oidc':
        case 'oauth2':
          return await this.getOidcUserInfo(provider, accessToken);
        case 'saml':
          throw new BadRequestException('SAML user info handled separately');
        default:
          throw new BadRequestException(`Unsupported provider type: ${provider.type}`);
      }
    } catch (error) {
      this.logger.error(`Failed to get user info from provider ${providerId}`, error);
      throw new UnauthorizedException('Failed to get user information');
    }
  }

  /**
   * Get OIDC user info
   */
  private async getOidcUserInfo(provider: IdentityProvider, accessToken: string): Promise<FederatedIdentityInfo> {
    const config = provider.config;
    
    let userInfoUrl = '';
    if (provider.id === 'azure-ad') {
      userInfoUrl = `${config.authority}/${config.tenantId}/openid/userinfo`;
    } else if (provider.id === 'okta') {
      userInfoUrl = `https://${config.domain}/oauth2/v1/userinfo`;
    } else if (provider.id === 'keycloak') {
      userInfoUrl = `${config.url}/realms/${config.realm}/protocol/openid-connect/userinfo`;
    } else if (provider.id === 'iam-ecosystem') {
      userInfoUrl = config.userInfoUrl || `${config.issuer}/oauth2/userinfo`;
    }

    const response = await fetch(userInfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new UnauthorizedException('Failed to get user information');
    }

    const userInfo = await response.json() as {
      sub?: string;
      oid?: string;
      email: string;
      name: string;
      given_name?: string;
      family_name?: string;
      picture?: string;
    };
    
    return {
      provider: provider.id,
      providerUserId: userInfo.sub || userInfo.oid || '',
      email: userInfo.email,
      name: userInfo.name || `${userInfo.given_name} ${userInfo.family_name}`,
      attributes: userInfo,
    };
  }

  /**
   * Link federated identity to local user
   */
  async linkFederatedIdentity(
    userId: string,
    providerId: string,
    providerUserId: string,
    attributes: Record<string, any>,
  ): Promise<void> {
    this.logger.log(`Linking federated identity for user ${userId} with provider ${providerId}`);
    
    // Implement database storage for federated identities
    // This stores the mapping between local user ID and external provider user ID
    
    try {
      const existingIdentity = await this.federatedIdentityRepository.findOne({
        where: { userId, providerId, providerUserId }
      });
      
      if (existingIdentity) {
        existingIdentity.attributes = attributes;
        existingIdentity.lastUsedAt = new Date();
        await this.federatedIdentityRepository.save(existingIdentity);
        this.logger.log(`Updated existing federated identity for user ${userId}`);
      } else {
        const federatedIdentity = this.federatedIdentityRepository.create({
          userId,
          providerId,
          providerUserId,
          attributes,
          linkedAt: new Date(),
          lastUsedAt: new Date(),
        });
        await this.federatedIdentityRepository.save(federatedIdentity);
        this.logger.log(`Created new federated identity for user ${userId}`);
      }
      
      const user = await this.userRepository.findOne({ where: { userId } });
      if (user) {
        if (attributes.email && !user.email) {
          user.email = attributes.email;
        }
        if (providerId === 'iam-ecosystem' && providerUserId && !user.globalUserId) {
          user.globalUserId = providerUserId;
        }
        await this.userRepository.save(user);
      }
    } catch (error) {
      this.logger.error(`Error linking federated identity for user ${userId}:`, error);
      throw new InternalServerErrorException('Failed to link federated identity');
    }
  }

  /**
   * Unlink federated identity
   * Implementation: Database removal for federated identities
   */
  async unlinkFederatedIdentity(userId: string, providerId: string): Promise<void> {
    this.logger.log(`Unlinking federated identity for user ${userId} with provider ${providerId}`);
    
    try {
      // Find the federated identity
      const federatedIdentity = await this.federatedIdentityRepository.findOne({
        where: { userId, providerId }
      });
      
      if (!federatedIdentity) {
        throw new NotFoundException(`Federated identity not found for user ${userId} and provider ${providerId}`);
      }
      
      // Remove the federated identity
      await this.federatedIdentityRepository.remove(federatedIdentity);
      this.logger.log(`Successfully unlinked federated identity for user ${userId} with provider ${providerId}`);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error unlinking federated identity for user ${userId}:`, error);
      throw new InternalServerErrorException('Failed to unlink federated identity');
    }
  }

  /**
   * Get federated identities for a user
   * Implementation: Database query for federated identities
   */
  async getUserFederatedIdentities(userId: string): Promise<FederatedIdentityInfo[]> {
    try {
      const federatedIdentities = await this.federatedIdentityRepository.find({
        where: { userId }
      });
      
      return federatedIdentities.map((identity) => ({
        provider: identity.providerId,
        providerUserId: identity.providerUserId,
        email: '',
        name: '',
        attributes: identity.attributes || {},
      }));
    } catch (error) {
      this.logger.error(`Error fetching federated identities for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Refresh federated identity tokens
   */
  async refreshFederatedTokens(
    providerId: string,
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken?: string }> {
    const provider = this.getIdentityProviders().find(p => p.id === providerId);

    if (!provider || !provider.enabled) {
      throw new BadRequestException(`Identity provider ${providerId} not found or disabled`);
    }

    const config = provider.config;
    
    let tokenUrl = '';
    if (provider.id === 'azure-ad') {
      tokenUrl = `${config.authority}/${config.tenantId}/oauth2/v2.0/token`;
    } else if (provider.id === 'okta') {
      tokenUrl = `https://${config.domain}/oauth2/v1/token`;
    } else if (provider.id === 'keycloak') {
      tokenUrl = `${config.url}/realms/${config.realm}/protocol/openid-connect/token`;
    } else if (provider.id === 'iam-ecosystem') {
      tokenUrl = config.tokenUrl || `${config.issuer}/oauth2/token`;
    }

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: config.clientId,
        client_secret: config.clientSecret,
      }),
    });

    if (!response.ok) {
      throw new UnauthorizedException('Failed to refresh tokens');
    }

    const tokens = await response.json() as {
      access_token: string;
      refresh_token?: string;
    };
    
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    };
  }

  async registerMtlsCertificate(dto: {
    organizationId: string;
    tenantId: string;
    commonName: string;
    fingerprint: string;
    pemContent: string;
    issuer?: string;
    validFrom: string;
    validTo: string;
    metadata?: Record<string, any>;
  }): Promise<MtlsCertificate> {
    const existing = await this.mtlsCertificateRepository.findOne({
      where: { fingerprint: dto.fingerprint },
    });
    if (existing) {
      throw new BadRequestException('Certificate with this fingerprint already exists');
    }

    const validFrom = new Date(dto.validFrom);
    const validTo = new Date(dto.validTo);
    if (validTo <= validFrom) {
      throw new BadRequestException('validTo must be after validFrom');
    }

    const cert = this.mtlsCertificateRepository.create({
      organizationId: dto.organizationId,
      tenantId: dto.tenantId,
      commonName: dto.commonName,
      fingerprint: dto.fingerprint,
      pemContent: dto.pemContent,
      issuer: dto.issuer || null,
      validFrom,
      validTo,
      status: 'active',
      metadata: dto.metadata || null,
    });
    return this.mtlsCertificateRepository.save(cert);
  }

  async listMtlsCertificates(organizationId: string, status?: string): Promise<MtlsCertificate[]> {
    const where: any = { organizationId };
    if (status) {
      where.status = status;
    }
    return this.mtlsCertificateRepository.find({ where, order: { createdAt: 'DESC' } });
  }

  async revokeMtlsCertificate(certificateId: string): Promise<void> {
    const cert = await this.mtlsCertificateRepository.findOne({
      where: { certificateId },
    });
    if (!cert) {
      throw new NotFoundException('Certificate not found');
    }
    cert.status = 'revoked';
    await this.mtlsCertificateRepository.save(cert);
  }
}
