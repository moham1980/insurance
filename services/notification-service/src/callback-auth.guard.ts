import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class CallbackAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'] as string | undefined;
    const configuredSecret = process.env.NOTIFICATION_CALLBACK_API_KEY;

    if (!configuredSecret) {
      // If no callback secret is configured, the callback endpoint must not be exposed.
      throw new UnauthorizedException({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Callback authentication is not configured' },
      });
    }

    if (!apiKey || apiKey !== configuredSecret) {
      throw new UnauthorizedException({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid callback API key' },
      });
    }

    // Optional provider-specific HMAC verification. If a provider header is supplied
    // together with NOTIFICATION_CALLBACK_HMAC_SECRET, the payload signature is checked.
    const provider = request.headers['x-provider-name'] as string | undefined;
    const signature = request.headers['x-provider-signature'] as string | undefined;
    const hmacSecret = process.env.NOTIFICATION_CALLBACK_HMAC_SECRET;
    if (provider && hmacSecret && signature) {
      const payload = JSON.stringify(request.body || {});
      const expected = crypto.createHmac('sha256', hmacSecret).update(payload).digest('hex');
      const provided = signature.toLowerCase().replace(/^sha256=/, '');
      if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided))) {
        throw new UnauthorizedException({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid callback signature' },
        });
      }
    }

    return true;
  }
}
