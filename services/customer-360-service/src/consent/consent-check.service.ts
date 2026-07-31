import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { ConsentDbStore } from './consent-db.store';

/**
 * ConsentCheckService — Enforces consent before data aggregation.
 *
 * P7-13: Before Customer-360 aggregation, this service checks that
 * the customer has granted consent for the 'customer_360' purpose.
 * If consent is missing or revoked, aggregation is blocked.
 */
@Injectable()
export class ConsentCheckService {
  private readonly logger = new Logger(ConsentCheckService.name);

  static readonly PURPOSE_CUSTOMER_360 = 'customer_360';
  static readonly PURPOSE_PORTFOLIO_AGGREGATION = 'portfolio_aggregation';
  static readonly PURPOSE_CROSS_SERVICE_DATA = 'cross_service_data_access';

  constructor(private readonly consentDbStore: ConsentDbStore) {}

  /**
   * Assert that consent is granted for the given purpose.
   * Throws ForbiddenException if consent is missing or revoked.
   */
  async assertConsent(customerId: string, purpose: string = ConsentCheckService.PURPOSE_CUSTOMER_360): Promise<void> {
    const result = await this.consentDbStore.check(customerId, purpose);

    if (!result.granted) {
      this.logger.warn(`Consent denied for customer ${customerId}, purpose: ${purpose}, status: ${result.consent?.status || 'no_record'}`);
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'CONSENT_REQUIRED',
          message: `Customer has not granted consent for ${purpose}`,
          consentStatus: result.consent?.status || 'missing',
        },
      });
    }

    this.logger.debug(`Consent verified for customer ${customerId}, purpose: ${purpose}`);
  }

  /**
   * Check consent without throwing — returns boolean.
   */
  async hasConsent(customerId: string, purpose: string = ConsentCheckService.PURPOSE_CUSTOMER_360): Promise<boolean> {
    const result = await this.consentDbStore.check(customerId, purpose);
    return result.granted;
  }

  /**
   * Check consent for multiple purposes at once.
   * Returns the list of purposes that are NOT granted.
   */
  async checkMultiplePurposes(customerId: string, purposes: string[]): Promise<string[]> {
    const results = await Promise.all(
      purposes.map((p) => this.consentDbStore.check(customerId, p)),
    );
    return results.filter((r) => !r.granted).map((r) => r.purpose);
  }
}
