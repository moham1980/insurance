import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class FederationTokenGuard implements CanActivate {
  private readonly logger = new Logger(FederationTokenGuard.name);

  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = authHeader.substring(7);

    let claims: any;
    try {
      claims = await this.jwtService.verifyAsync(token);
    } catch (err: any) {
      this.logger.warn(`Federation token validation failed: ${err.message}`);
      throw new UnauthorizedException('Invalid federation token');
    }

    if (claims.token_use !== 'federation') {
      throw new UnauthorizedException('Token is not a federation token');
    }

    if (claims.aud !== 'partner-gateway') {
      throw new UnauthorizedException(`Invalid audience: ${claims.aud}`);
    }

    const now = Math.floor(Date.now() / 1000);
    if (claims.exp && claims.exp - now > 300) {
      throw new UnauthorizedException('Token lifetime exceeds maximum (5 minutes)');
    }

    request.federationContext = {
      subjectId: claims.sub,
      actorClientId: claims.act?.client_id,
      agreementId: claims.agreement_id,
      relationshipType: claims.relationship_type,
      scopes: claims.scope?.split(' ') || [],
    };

    return true;
  }
}
