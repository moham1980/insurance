import { Body, Controller, Headers, Post } from '@nestjs/common';
import { RegulatoryIntegrationService } from './regulatory-integration.service';

function getCorrelationId(headers: Record<string, any>): string {
  return headers['x-correlation-id'] || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

@Controller('api/v1/regulatory')
export class RegulatoryWebhookController {
  constructor(
    private readonly regulatoryService: RegulatoryIntegrationService,
  ) {}

  @Post('license-status-change')
  async handleLicenseStatusChange(
    @Headers() headers: Record<string, any>,
    @Body() body: {
      brokerCentralCode: string;
      licenseNumber: string;
      previousStatus: string;
      newStatus: string;
      reason?: string;
      expiryDate?: string | null;
      source?: string;
    },
  ) {
    const correlationId = getCorrelationId(headers);

    if (!body?.brokerCentralCode || !body?.licenseNumber || !body?.newStatus) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'brokerCentralCode, licenseNumber, and newStatus are required' },
        correlationId,
      };
    }

    try {
      const result = await this.regulatoryService.handleLicenseStatusChangeNotification(body);
      return { success: true, data: result, correlationId };
    } catch (error: any) {
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
        correlationId,
      };
    }
  }
}
