import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ReplayProtectionService } from './replay-protection.service';
import { PartnerGatewayService } from './partner-gateway.service';

export interface TokenExchangeRequest {
  partnerId: string;
  subjectToken: string;
  subjectTokenType: string;
  audience: string;
  scope: string;
  requestedTokenType: string;
  nonce: string;
  requestHash: string;
  correlationId: string;
}

export interface TokenExchangeResponse {
  accessToken: string;
  issuedTokenType: string;
  expiresIn: number;
  scope: string;
}

@Injectable()
export class TokenExchangeProxyService {
  private readonly logger = new Logger(TokenExchangeProxyService.name);

  constructor(
    private readonly replayService: ReplayProtectionService,
    private readonly partnerService: PartnerGatewayService,
  ) {}

  async exchangeToken(req: TokenExchangeRequest): Promise<TokenExchangeResponse> {
    await this.replayService.checkAndStore(req.nonce, req.partnerId, req.requestHash);

    const partner = await this.partnerService.getPartner(req.partnerId);
    if (partner.status !== 'active') {
      throw new UnauthorizedException(`Partner ${req.partnerId} is not active`);
    }

    if (partner.allowedScopes.length > 0 && !partner.allowedScopes.includes(req.scope)) {
      throw new UnauthorizedException(`Scope ${req.scope} not allowed for partner ${req.partnerId}`);
    }

    if (!partner.tokenExchangeEndpoint) {
      throw new BadRequestException('Partner does not have a token exchange endpoint configured');
    }

    const body = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
      subject_token: req.subjectToken,
      subject_token_type: req.subjectTokenType,
      audience: req.audience,
      scope: req.scope,
      requested_token_type: req.requestedTokenType,
    });

    const response = await fetch(partner.tokenExchangeEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!response.ok) {
      const errText = await response.text();
      this.logger.error(`Token exchange failed for partner ${req.partnerId}: ${errText}`);
      throw new UnauthorizedException('Token exchange failed with partner IdP');
    }

    const tokens = await response.json() as {
      access_token: string;
      issued_token_type: string;
      expires_in: number;
      scope: string;
    };

    return {
      accessToken: tokens.access_token,
      issuedTokenType: tokens.issued_token_type,
      expiresIn: tokens.expires_in,
      scope: tokens.scope,
    };
  }
}
