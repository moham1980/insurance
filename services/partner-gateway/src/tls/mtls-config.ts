import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

export interface MtlsConfig {
  cert: string;
  key: string;
  ca: string;
  rejectUnauthorized: boolean;
}

@Injectable()
export class MtlsConfigService {
  private readonly logger = new Logger(MtlsConfigService.name);

  getMtlsConfig(): MtlsConfig {
    const certPath = process.env.MTLS_CLIENT_CERT_PATH || '';
    const keyPath = process.env.MTLS_CLIENT_KEY_PATH || '';
    const caPath = process.env.MTLS_CA_PATH || '';

    if (!certPath || !keyPath) {
      this.logger.warn('mTLS client cert/key paths not configured; mTLS will not be enforced');
      return { cert: '', key: '', ca: '', rejectUnauthorized: false };
    }

    try {
      const cert = fs.readFileSync(certPath, 'utf-8');
      const key = fs.readFileSync(keyPath, 'utf-8');
      const ca = caPath ? fs.readFileSync(caPath, 'utf-8') : '';

      this.logger.log(`mTLS configured: cert=${path.basename(certPath)}, ca=${caPath ? path.basename(caPath) : 'none'}`);

      return {
        cert,
        key,
        ca,
        rejectUnauthorized: true,
      };
    } catch (err: any) {
      this.logger.error(`Failed to load mTLS certificates: ${err.message}`);
      throw new Error(`mTLS configuration error: ${err.message}`);
    }
  }

  getHttpsAgent(): https.Agent {
    const config = this.getMtlsConfig();
    return new https.Agent({
      cert: config.cert,
      key: config.key,
      ca: config.ca,
      rejectUnauthorized: config.rejectUnauthorized,
    });
  }
}
