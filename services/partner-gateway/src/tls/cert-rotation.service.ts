import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CertificateService } from '../certificate.service';

@Injectable()
export class CertRotationService implements OnModuleInit {
  private readonly logger = new Logger(CertRotationService.name);
  private readonly EXPIRY_ALERT_DAYS = 30;

  constructor(private readonly certificateService: CertificateService) {}

  onModuleInit(): void {
    setInterval(() => this.checkExpiringCertificates(), 24 * 60 * 60 * 1000);
    setInterval(() => this.markExpiredCertificates(), 27 * 60 * 60 * 1000);
  }

  async checkExpiringCertificates(): Promise<void> {
    this.logger.log('Running scheduled certificate expiry check...');
    try {
      const expiring = await this.certificateService.getExpiringCertificates(this.EXPIRY_ALERT_DAYS);
      if (expiring.length > 0) {
        for (const cert of expiring) {
          const daysLeft = Math.ceil(
            (new Date(cert.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
          );
          if (daysLeft <= 0) {
            this.logger.error(
              `Certificate ${cert.certId} for partner ${cert.partnerId} has EXPIRED`,
            );
          } else {
            this.logger.warn(
              `Certificate ${cert.certId} for partner ${cert.partnerId} expires in ${daysLeft} days`,
            );
          }
        }
      } else {
        this.logger.log('No certificates expiring soon');
      }
    } catch (err: any) {
      this.logger.error(`Certificate expiry check failed: ${err.message}`);
    }
  }

  async markExpiredCertificates(): Promise<void> {
    this.logger.log('Running scheduled certificate expiration marking...');
    try {
      const expiring = await this.certificateService.getExpiringCertificates(0);
      for (const cert of expiring) {
        this.logger.warn(`Marking certificate ${cert.certId} as expired`);
      }
    } catch (err: any) {
      this.logger.error(`Certificate expiration marking failed: ${err.message}`);
    }
  }
}
