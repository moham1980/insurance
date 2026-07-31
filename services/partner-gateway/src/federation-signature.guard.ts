import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ReplayProtectionService } from './replay-protection.service';
import { PartnerAuthService } from './partner-auth.service';
import { CertificateService } from './certificate.service';

@Injectable()
export class FederationSignatureGuard implements CanActivate {
  private readonly logger = new Logger(FederationSignatureGuard.name);

  constructor(
    private readonly replayService: ReplayProtectionService,
    private readonly authService: PartnerAuthService,
    private readonly certService: CertificateService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const path = request.url.split('?')[0];
    const body = request.body;
    const headers = request.headers;

    const nonce = headers['x-federation-nonce'] || headers['X-Federation-Nonce'];
    const timestamp = headers['x-federation-timestamp'] || headers['X-Federation-Timestamp'];
    const signature = headers['x-federation-signature'] || headers['X-Federation-Signature'];
    const signingKeyId = headers['x-federation-signing-key-id'] || headers['X-Federation-Signing-Key-Id'];
    const certSubject = headers['x-partner-cert-subject'] || headers['X-Partner-Cert-Subject'];

    if (!nonce || !timestamp || !signature || !signingKeyId) {
      throw new BadRequestException(
        'Missing required federation headers: X-Federation-Nonce, X-Federation-Timestamp, X-Federation-Signature, X-Federation-Signing-Key-Id',
      );
    }

    if (!certSubject) {
      throw new BadRequestException('Missing X-Partner-Cert-Subject header');
    }

    const authResult = await this.authService.authenticateByCertSubject(certSubject);

    const activeCert = await this.certService.getActiveCertificate(authResult.partnerId);
    if (!activeCert) {
      throw new ForbiddenException(`No active certificate for partner ${authResult.partnerId}`);
    }

    await this.replayService.validateFederationRequest(
      method,
      path,
      body,
      authResult.partnerId,
      { nonce, timestamp, signature, signingKeyId },
      activeCert.publicCertPem,
    );

    request.federationAuth = authResult;
    return true;
  }
}
