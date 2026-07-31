import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { TokenExchangeService } from '../src/token-exchange/token-exchange.service';

describe('TokenExchangeService', () => {
  let service: TokenExchangeService;
  let jwtService: JwtService;

  beforeEach(() => {
    jwtService = new JwtService({
      secret: 'test-secret-key-for-federation',
      signOptions: { expiresIn: '300s' },
    });
    service = new TokenExchangeService(jwtService);
  });

  const validSubjectToken = () => {
    return jwtService.sign({ sub: 'user-123', tenantId: 'tenant-1' });
  };

  describe('exchangeToken', () => {
    it('should issue a federation token with valid parameters', async () => {
      const result = await service.exchangeToken({
        subjectToken: validSubjectToken(),
        subjectTokenType: 'urn:ietf:params:oauth:token-type:jwt',
        audience: 'partner-gateway',
        scope: 'quotes:write',
        actorClientId: 'broker-service-1',
        agreementId: 'agreement-123',
        relationshipType: 'carrier_broker',
      });

      expect(result.accessToken).toBeDefined();
      expect(result.issuedTokenType).toBe('urn:ietf:params:oauth:token-type:access_token');
      expect(result.expiresIn).toBe(300);
      expect(result.scope).toBe('quotes:write');

      const decoded = jwtService.decode(result.accessToken) as any;
      expect(decoded.aud).toBe('partner-gateway');
      expect(decoded.scope).toBe('quotes:write');
      expect(decoded.act.client_id).toBe('broker-service-1');
      expect(decoded.agreement_id).toBe('agreement-123');
      expect(decoded.relationship_type).toBe('carrier_broker');
      expect(decoded.token_use).toBe('federation');
      expect(decoded.iss).toBe('insurance-auth-service');
    });

    it('should reject invalid audience', async () => {
      await expect(
        service.exchangeToken({
          subjectToken: validSubjectToken(),
          subjectTokenType: 'urn:ietf:params:oauth:token-type:jwt',
          audience: 'wrong-audience',
          scope: 'quotes:write',
          actorClientId: 'broker-service-1',
          agreementId: 'agreement-123',
          relationshipType: 'carrier_broker',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject invalid scopes', async () => {
      await expect(
        service.exchangeToken({
          subjectToken: validSubjectToken(),
          subjectTokenType: 'urn:ietf:params:oauth:token-type:jwt',
          audience: 'partner-gateway',
          scope: 'admin:all',
          actorClientId: 'broker-service-1',
          agreementId: 'agreement-123',
          relationshipType: 'carrier_broker',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject missing subject token', async () => {
      await expect(
        service.exchangeToken({
          subjectToken: '',
          subjectTokenType: 'urn:ietf:params:oauth:token-type:jwt',
          audience: 'partner-gateway',
          scope: 'quotes:write',
          actorClientId: 'broker-service-1',
          agreementId: 'agreement-123',
          relationshipType: 'carrier_broker',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject missing audience', async () => {
      await expect(
        service.exchangeToken({
          subjectToken: validSubjectToken(),
          subjectTokenType: 'urn:ietf:params:oauth:token-type:jwt',
          audience: '',
          scope: 'quotes:write',
          actorClientId: 'broker-service-1',
          agreementId: 'agreement-123',
          relationshipType: 'carrier_broker',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should handle multiple valid scopes', async () => {
      const result = await service.exchangeToken({
        subjectToken: validSubjectToken(),
        subjectTokenType: 'urn:ietf:params:oauth:token-type:jwt',
        audience: 'partner-gateway',
        scope: 'quotes:write policies:read',
        actorClientId: 'broker-service-1',
        agreementId: 'agreement-123',
        relationshipType: 'carrier_broker',
      });

      expect(result.scope).toBe('quotes:write policies:read');
      const decoded = jwtService.decode(result.accessToken) as any;
      expect(decoded.scope).toBe('quotes:write policies:read');
    });

    it('should set token lifetime to max 5 minutes (300s)', async () => {
      const result = await service.exchangeToken({
        subjectToken: validSubjectToken(),
        subjectTokenType: 'urn:ietf:params:oauth:token-type:jwt',
        audience: 'partner-gateway',
        scope: 'quotes:write',
        actorClientId: 'broker-service-1',
        agreementId: 'agreement-123',
        relationshipType: 'carrier_broker',
      });

      expect(result.expiresIn).toBeLessThanOrEqual(300);
    });

    it('should include act claim with actor client_id', async () => {
      const result = await service.exchangeToken({
        subjectToken: validSubjectToken(),
        subjectTokenType: 'urn:ietf:params:oauth:token-type:jwt',
        audience: 'partner-gateway',
        scope: 'quotes:write',
        actorClientId: 'my-service-id',
        agreementId: 'agreement-123',
        relationshipType: 'carrier_broker',
      });

      const decoded = jwtService.decode(result.accessToken) as any;
      expect(decoded.act).toBeDefined();
      expect(decoded.act.client_id).toBe('my-service-id');
    });

    it('should not include refresh token', async () => {
      const result = await service.exchangeToken({
        subjectToken: validSubjectToken(),
        subjectTokenType: 'urn:ietf:params:oauth:token-type:jwt',
        audience: 'partner-gateway',
        scope: 'quotes:write',
        actorClientId: 'broker-service-1',
        agreementId: 'agreement-123',
        relationshipType: 'carrier_broker',
      });

      expect(result).not.toHaveProperty('refreshToken');
    });
  });
});
