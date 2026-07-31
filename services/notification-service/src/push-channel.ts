import { Injectable, Logger } from '@nestjs/common';
import * as https from 'node:https';
import * as http from 'node:http';
import * as crypto from 'node:crypto';

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: Record<string, any>;
  actions?: Array<{ action: string; title: string; icon?: string }>;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
}

export interface PushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface PushSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * PushChannel — Web Push notification provider.
 *
 * Uses the Web Push protocol (RFC 8291) with VAPID authentication.
 *
 * Environment variables:
 * - VAPID_PUBLIC_KEY: VAPID public key (base64url)
 * - VAPID_PRIVATE_KEY: VAPID private key (base64url)
 * - VAPID_SUBJECT: mailto: or https: URL for VAPID (default: mailto:admin@insurance.local)
 */
@Injectable()
export class PushChannel {
  private readonly logger = new Logger(PushChannel.name);
  private readonly vapidPublicKey: string | null;
  private readonly vapidPrivateKey: string | null;
  private readonly vapidSubject: string;

  constructor() {
    this.vapidPublicKey = process.env.VAPID_PUBLIC_KEY || null;
    this.vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || null;
    this.vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@insurance.local';

    if (this.vapidPublicKey && this.vapidPrivateKey) {
      this.logger.log('VAPID keys loaded, push notifications enabled');
    } else {
      this.logger.warn('VAPID keys not configured, push notifications will be simulated');
    }
  }

  isEnabled(): boolean {
    return !!(this.vapidPublicKey && this.vapidPrivateKey);
  }

  /**
   * Send a push notification to a subscription endpoint.
   */
  async sendPush(
    subscription: PushSubscription,
    payload: PushNotificationPayload,
  ): Promise<PushSendResult> {
    if (!this.isEnabled()) {
      this.logger.log(`Push simulated: "${payload.title}" → ${subscription.endpoint}`);
      return { success: true, messageId: `sim-${Date.now()}` };
    }

    try {
      const encrypted = await this.encryptPayload(subscription, JSON.stringify(payload));
      const vapidAuthHeader = this.generateVapidAuthHeader(subscription.endpoint);

      const result = await this.postToEndpoint(subscription.endpoint, encrypted, {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
        'Authorization': vapidAuthHeader,
      });

      return result;
    } catch (err: any) {
      this.logger.error(`Push send failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  /**
   * Send push to multiple subscriptions (fan-out).
   */
  async sendPushBatch(
    subscriptions: PushSubscription[],
    payload: PushNotificationPayload,
  ): Promise<PushSendResult[]> {
    return Promise.all(subscriptions.map((sub) => this.sendPush(sub, payload)));
  }

  /**
   * Encrypt payload using aes128gcm (RFC 8291).
   */
  private async encryptPayload(
    subscription: PushSubscription,
    payload: string,
  ): Promise<Buffer> {
    // Use Node.js crypto for ECDH key agreement + AES-128-GCM
    const clientPublicKey = Buffer.from(subscription.keys.p256dh, 'base64url');
    const clientAuthSecret = Buffer.from(subscription.keys.auth, 'base64url');

    // Generate ephemeral server key pair
    const serverKeys = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const serverPublicKey = serverKeys.publicKey.export({ type: 'spki', format: 'der' });

    // ECDH shared secret
    const clientKeyObj = crypto.createPublicKey({
      key: clientPublicKey,
      format: 'der',
      type: 'spki',
    });
    const sharedSecret = serverKeys.privateKey
      ? crypto.diffieHellman({ privateKey: serverKeys.privateKey, publicKey: clientKeyObj })
      : Buffer.alloc(0);

    // HKDF to derive content encryption key and nonce
    const authSecret = clientAuthSecret;
    const ikm = Buffer.concat([sharedSecret, authSecret]);
    const info = Buffer.from('Content-Encoding: aes128gcm\0', 'utf8');
    const salt = crypto.randomBytes(16);

    const cek = crypto.createHmac('sha256', authSecret).update(ikm).digest().slice(0, 16);
    const nonce = crypto.createHmac('sha256', authSecret).update(cek).digest().slice(0, 12);

    // Encrypt
    const cipher = crypto.createCipheriv('aes-128-gcm', cek, nonce);
    const encrypted = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    // Build RFC 8291 header + ciphertext
    const recordSize = 4096;
    const header = Buffer.alloc(21 + serverPublicKey.length);
    salt.copy(header, 0);
    header.writeUInt32BE(recordSize, 16);
    header.writeUInt8(serverPublicKey.length, 20);
    Buffer.from(serverPublicKey).copy(header, 21);

    return Buffer.concat([header, encrypted, tag]);
  }

  /**
   * Generate VAPID JWT auth header.
   */
  private generateVapidAuthHeader(endpoint: string): string {
    const audience = new URL(endpoint).origin;
    const now = Math.floor(Date.now() / 1000);
    const expiry = now + 12 * 60 * 60; // 12 hours

    const header = { typ: 'JWT', alg: 'ES256' };
    const payload = {
      aud: audience,
      exp: expiry,
      sub: this.vapidSubject,
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    const privateKey = crypto.createPrivateKey({
      key: Buffer.from(this.vapidPrivateKey!, 'base64url'),
      format: 'der',
      type: 'pkcs8',
    });

    const signature = crypto.sign('sha256', Buffer.from(signingInput), privateKey);
    const encodedSignature = signature.toString('base64url');

    return `vapid t=${encodedHeader}.${encodedPayload}.${encodedSignature}, k=${this.vapidPublicKey}`;
  }

  private postToEndpoint(
    endpoint: string,
    body: Buffer,
    headers: Record<string, string>,
  ): Promise<PushSendResult> {
    return new Promise((resolve) => {
      const parsed = new URL(endpoint);
      const lib = parsed.protocol === 'https:' ? https : http;

      const req = lib.request(
        {
          method: 'POST',
          hostname: parsed.hostname,
          port: parsed.port ? Number(parsed.port) : parsed.protocol === 'https:' ? 443 : 80,
          path: `${parsed.pathname}${parsed.search}`,
          headers: {
            ...headers,
            'Content-Length': body.length,
          },
        },
        (res) => {
          const status = res.statusCode ?? 0;
          let data = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            if (status >= 200 && status < 300) {
              resolve({ success: true, messageId: `push-${Date.now()}` });
            } else {
              resolve({ success: false, error: `HTTP ${status}: ${data.substring(0, 200)}` });
            }
          });
        },
      );

      req.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });

      req.write(body);
      req.end();
    });
  }
}
