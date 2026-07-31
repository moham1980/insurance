import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface TokenExchangeRequest {
  subjectToken: string;
  subjectTokenType: string;
  audience: string;
  scope: string;
  requestedTokenType?: string;
  actorClientId: string;
  agreementId: string;
  relationshipType: string;
}

export interface TokenExchangeResponse {
  accessToken: string;
  issuedTokenType: string;
  expiresIn: number;
  scope: string;
}

@Injectable()
export class TokenExchangeService {
  private readonly logger = new Logger(TokenExchangeService.name);
  private readonly FEDERATION_TOKEN_LIFETIME_SECONDS = 300;

  constructor(private readonly jwtService: JwtService) {}

  async exchangeToken(req: TokenExchangeRequest): Promise<TokenExchangeResponse> {
    if (!req.subjectToken || !req.audience || !req.scope) {
      throw new UnauthorizedException('Missing required token exchange parameters');
    }

    if (req.audience !== 'partner-gateway') {
      throw new UnauthorizedException(`Invalid audience: ${req.audience}. Must be 'partner-gateway'`);
    }

    const allowedScopes = ['quotes:write', 'quotes:read', 'policies:write', 'policies:read', 'claims:write', 'claims:read'];
    const requestedScopes = req.scope.split(' ').filter(s => s);
    const invalidScopes = requestedScopes.filter(s => !allowedScopes.includes(s));
    if (invalidScopes.length > 0) {
      throw new UnauthorizedException(`Invalid scopes requested: ${invalidScopes.join(', ')}`);
    }

    let subjectClaims: any;
    try {
      subjectClaims = this.jwtService.decode(req.subjectToken) as any;
    } catch {
      throw new UnauthorizedException('Invalid subject token');
    }

    const federationToken = await this.jwtService.signAsync(
      {
        sub: subjectClaims?.sub,
        act: {
          client_id: req.actorClientId,
        },
        agreement_id: req.agreementId,
        relationship_type: req.relationshipType,
        scope: req.scope,
        aud: req.audience,
        iss: 'insurance-auth-service',
        token_use: 'federation',
      },
      {
        expiresIn: this.FEDERATION_TOKEN_LIFETIME_SECONDS,
        notBefore: 0,
      },
    );

    this.logger.log(
      `Token exchanged for actor=${req.actorClientId}, agreement=${req.agreementId}, subject=${subjectClaims?.sub || 'none'}, scopes=${req.scope}`,
    );

    return {
      accessToken: federationToken,
      issuedTokenType: 'urn:ietf:params:oauth:token-type:access_token',
      expiresIn: this.FEDERATION_TOKEN_LIFETIME_SECONDS,
      scope: req.scope,
    };
  }
}
