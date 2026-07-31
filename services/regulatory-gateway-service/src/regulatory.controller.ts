import { Body, Controller, Get, Headers, Post, Query, Req, Res, Put, Param, UseGuards } from '@nestjs/common';
import { RegulatoryService } from './regulatory.service';
import { LicenseValidationService, BrokerLicenseValidationRequest, LicenseStatusChangePayload } from './license-validation.service';
import { WarehouseFireInquiryService } from './warehouse-fire/warehouse-fire-inquiry.service';
import { SanhabSmsInquiryService } from './sanhab-sms/sanhab-sms-inquiry.service';
import type { SanhabSimulateBody, SanhabWebhookBody } from './regulatory.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';
import { RequirePermissions } from './permissions.decorator';
import { Public } from './public.decorator';

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
export class RegulatoryController {
  constructor(
    private readonly regulatoryService: RegulatoryService,
    private readonly licenseValidationService: LicenseValidationService,
    private readonly warehouseFireService: WarehouseFireInquiryService,
    private readonly sanhabSmsService: SanhabSmsInquiryService
  ) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  @Public()
  @Post('/reg/sanhab/webhook')
  async webhook(@Headers() headers: Record<string, any>, @Body() body: SanhabWebhookBody, @Res() res: any) {
    const correlationId = this.getCorrelationId(headers);

    const normalizedHeaders = Object.fromEntries(
      Object.entries(headers || {}).map(([k, v]) => [k, Array.isArray(v) ? v.join(',') : String(v)])
    ) as Record<string, string>;

    const { status, result } = await this.regulatoryService.handleWebhook({
      correlationId,
      body,
      headers: normalizedHeaders,
    });

    res.status(status).send(result);
  }

  @RequirePermissions('regulatory:retry')
  @Post('/reg/sanhab/simulate')
  async simulate(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: SanhabSimulateBody, @Res() res: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.tenantId as string | undefined;
    const actorUserId = req?.user?.sub as string | undefined;

    const { status, result } = await this.regulatoryService.simulate({ correlationId, tenantId, actorUserId, body });
    res.status(status).send(result);
  }

  @RequirePermissions('regulatory:inquiry')
  @Post('/reg/sanhab/inquiry')
  async inquiry(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: any, @Res() res: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = (req?.tenantId ?? req?.user?.tenantId) as string | undefined;
    const actorUserId = (req?.user?.sub ?? req?.user?.userId) as string | undefined;
    const authorization = (headers['authorization'] || headers['Authorization']) as string | undefined;

    const { status, result } = await this.regulatoryService.inquiry({
      correlationId,
      tenantId,
      actorUserId,
      authorization,
      body,
    });
    res.status(status).send(result);
  }

  @RequirePermissions('regulatory:events:list')
  @Get('/reg/sanhab/events')
  async list(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
    @Query('eventType') eventType?: string
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = (req?.tenantId ?? req?.user?.tenantId) as string | undefined;

    const lim = Math.min(parseInt(limit, 10) || 50, 200);
    const off = parseInt(offset, 10);

    return this.regulatoryService.listEvents({
      correlationId,
      tenantId,
      limit: Number.isFinite(lim) ? lim : 50,
      offset: Number.isFinite(off) ? off : 0,
      eventType,
    });
  }

  // Circuit Breaker Endpoints

  @RequirePermissions('regulatory:events:view')
  @Get('/reg/sanhab/circuit-breaker')
  async getCircuitBreakerStatus(@Headers() headers: Record<string, any>, @Req() req: any) {
    const correlationId = this.getCorrelationId(headers);

    const stats = this.regulatoryService.getCircuitBreakerStats();

    return {
      success: true,
      data: stats,
      correlationId,
    };
  }

  @RequirePermissions('regulatory:retry')
  @Put('/reg/sanhab/circuit-breaker/reset')
  async resetCircuitBreaker(@Headers() headers: Record<string, any>, @Req() req: any) {
    const correlationId = this.getCorrelationId(headers);

    this.regulatoryService.resetCircuitBreaker();

    return {
      success: true,
      data: { message: 'Circuit breaker reset successfully' },
      correlationId,
    };
  }

  @RequirePermissions('regulatory:events:view')
  @Get('/reg/sanhab/health-check')
  async sanhabHealthCheck(@Headers() headers: Record<string, any>, @Req() req: any) {
    const correlationId = this.getCorrelationId(headers);

    const health = await this.regulatoryService.sanhabHealthCheck();

    return {
      success: true,
      data: health,
      correlationId,
    };
  }

  // Warehouse Fire Inquiry Endpoints

  @RequirePermissions('regulatory:inquiry')
  @Post('/reg/warehouse-fire/inquire')
  async warehouseFireInquiry(
    @Headers() headers: Record<string, any>,
    @Body() body: {
      warehouseId?: string;
      nationalId?: string;
      licenseNumber?: string;
      address?: string;
      city?: string;
      province?: string;
      inquiryType: 'FIRE_HISTORY' | 'CURRENT_STATUS' | 'INSPECTION_REPORT' | 'COMPLIANCE_CHECK';
    }
  ) {
    const correlationId = this.getCorrelationId(headers);

    const result = await this.warehouseFireService.inquire(body);

    return {
      success: result.success,
      data: result,
      correlationId,
    };
  }

  @RequirePermissions('regulatory:inquiry')
  @Get('/reg/warehouse-fire/national-id/:nationalId')
  async warehouseFireInquiryByNationalId(
    @Param('nationalId') nationalId: string,
    @Query('inquiryType') inquiryType: string = 'FIRE_HISTORY',
    @Headers() headers: Record<string, any>
  ) {
    const correlationId = this.getCorrelationId(headers);

    const result = await this.warehouseFireService.inquireByNationalId(nationalId, inquiryType);

    return {
      success: result.success,
      data: result,
      correlationId,
    };
  }

  @RequirePermissions('regulatory:inquiry')
  @Get('/reg/warehouse-fire/license/:licenseNumber')
  async warehouseFireInquiryByLicense(
    @Param('licenseNumber') licenseNumber: string,
    @Query('inquiryType') inquiryType: string = 'FIRE_HISTORY',
    @Headers() headers: Record<string, any>
  ) {
    const correlationId = this.getCorrelationId(headers);

    const result = await this.warehouseFireService.inquireByLicenseNumber(licenseNumber, inquiryType);

    return {
      success: result.success,
      data: result,
      correlationId,
    };
  }

  @RequirePermissions('regulatory:inquiry')
  @Get('/reg/warehouse-fire/warehouse/:warehouseId')
  async warehouseFireInquiryByWarehouseId(
    @Param('warehouseId') warehouseId: string,
    @Query('inquiryType') inquiryType: string = 'FIRE_HISTORY',
    @Headers() headers: Record<string, any>
  ) {
    const correlationId = this.getCorrelationId(headers);

    const result = await this.warehouseFireService.inquireByWarehouseId(warehouseId, inquiryType);

    return {
      success: result.success,
      data: result,
      correlationId,
    };
  }

  @RequirePermissions('regulatory:events:view')
  @Get('/reg/warehouse-fire/health-check')
  async warehouseFireHealthCheck(@Headers() headers: Record<string, any>, @Req() req: any) {
    const correlationId = this.getCorrelationId(headers);

    const health = await this.warehouseFireService.healthCheck();

    return {
      success: true,
      data: health,
      correlationId,
    };
  }

  @RequirePermissions('regulatory:events:view')
  @Get('/reg/warehouse-fire/config')
  async getWarehouseFireConfig(@Headers() headers: Record<string, any>, @Req() req: any) {
    const correlationId = this.getCorrelationId(headers);

    const config = await this.warehouseFireService.getConfiguration();

    return {
      success: true,
      data: config,
      correlationId,
    };
  }

  @RequirePermissions('regulatory:retry')
  @Put('/reg/warehouse-fire/config')
  async updateWarehouseFireConfig(
    @Headers() headers: Record<string, any>,
    @Body() body: Partial<{
      apiUrl: string;
      apiKey: string;
      timeoutMs: number;
      enabled: boolean;
    }>
  ) {
    const correlationId = this.getCorrelationId(headers);

    const config = await this.warehouseFireService.updateConfig(body);

    return {
      success: true,
      data: config,
      correlationId,
    };
  }

  // Sanhab SMS Inquiry Endpoints

  @RequirePermissions('regulatory:inquiry')
  @Post('/reg/sanhab/sms/initiate')
  async initiateSmsInquiry(
    @Headers() headers: Record<string, any>,
    @Body() body: {
      phoneNumber: string;
      inquiryType: 'NATIONAL_ID_UNIQUE_CODE' | 'POLICY_NUMBER' | 'VIN';
      nationalId?: string;
      uniqueCode?: string;
      policyNumber?: string;
      vin?: string;
    }
  ) {
    const correlationId = this.getCorrelationId(headers);

    const result = await this.sanhabSmsService.initiateSmsInquiry(body);

    return {
      success: result.success,
      data: result,
      correlationId,
    };
  }

  @Public()
  @Post('/reg/sanhab/sms/reply')
  async handleSmsReply(
    @Headers() headers: Record<string, any>,
    @Body() body: {
      from: string;
      message: string;
    }
  ) {
    const correlationId = this.getCorrelationId(headers);

    const result = await this.sanhabSmsService.handleSmsReply(body.from, body.message);

    return {
      success: result.success,
      data: result,
      correlationId,
    };
  }

  @RequirePermissions('regulatory:events:view')
  @Get('/reg/sanhab/sms/inquiry/:inquiryId')
  async getSmsInquiry(
    @Param('inquiryId') inquiryId: string,
    @Headers() headers: Record<string, any>
  ) {
    const correlationId = this.getCorrelationId(headers);

    const inquiry = await this.sanhabSmsService.getPendingInquiry(inquiryId);

    if (!inquiry) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Inquiry not found' },
        correlationId,
      };
    }

    return {
      success: true,
      data: inquiry,
      correlationId,
    };
  }

  @RequirePermissions('regulatory:events:view')
  @Get('/reg/sanhab/sms/pending/:phoneNumber')
  async getPendingSmsInquiries(
    @Param('phoneNumber') phoneNumber: string,
    @Headers() headers: Record<string, any>
  ) {
    const correlationId = this.getCorrelationId(headers);

    const inquiries = await this.sanhabSmsService.getPendingInquiriesByPhone(phoneNumber);

    return {
      success: true,
      data: inquiries,
      correlationId,
    };
  }

  @RequirePermissions('regulatory:retry')
  @Post('/reg/sanhab/sms/inquiry/:inquiryId/cancel')
  async cancelSmsInquiry(
    @Param('inquiryId') inquiryId: string,
    @Headers() headers: Record<string, any>
  ) {
    const correlationId = this.getCorrelationId(headers);

    const cancelled = await this.sanhabSmsService.cancelInquiry(inquiryId);

    return {
      success: cancelled,
      data: { message: cancelled ? 'Inquiry cancelled' : 'Inquiry not found' },
      correlationId,
    };
  }

  @RequirePermissions('regulatory:events:view')
  @Get('/reg/sanhab/sms/health-check')
  async sanhabSmsHealthCheck(@Headers() headers: Record<string, any>, @Req() req: any) {
    const correlationId = this.getCorrelationId(headers);

    const health = await this.sanhabSmsService.healthCheck();

    return {
      success: true,
      data: health,
      correlationId,
    };
  }

  @RequirePermissions('regulatory:events:view')
  @Get('/reg/sanhab/sms/config')
  async getSmsInquiryConfig(@Headers() headers: Record<string, any>, @Req() req: any) {
    const correlationId = this.getCorrelationId(headers);

    const config = await this.sanhabSmsService.getConfiguration();

    return {
      success: true,
      data: config,
      correlationId,
    };
  }

  @RequirePermissions('regulatory:retry')
  @Put('/reg/sanhab/sms/config')
  async updateSmsInquiryConfig(
    @Headers() headers: Record<string, any>,
    @Body() body: Partial<{
      enabled: boolean;
      smsProvider: 'KAVENEGAR' | 'TWILIO' | 'MELLIPAYAMAK';
      shortCode: string;
      apiKey: string;
      timeoutMs: number;
      maxRetries: number;
    }>
  ) {
    const correlationId = this.getCorrelationId(headers);

    const config = await this.sanhabSmsService.updateConfig(body);

    return {
      success: true,
      data: config,
      correlationId,
    };
  }

  @RequirePermissions('regulatory:inquiry')
  @Post('/reg/broker-license/validate')
  async validateBrokerLicense(
    @Headers() headers: Record<string, any>,
    @Body() body: { brokerCentralCode: string; licenseNumber: string; licenseType?: 'life' | 'non_life' | 'both'; scope?: string[] }
  ) {
    const correlationId = this.getCorrelationId(headers);
    const result = await this.licenseValidationService.validate(body);
    return {
      success: result.valid,
      data: result,
      correlationId,
    };
  }

  @RequirePermissions('regulatory:inquiry')
  @Post('/reg/broker-license/validate-batch')
  async validateBrokerLicenseBatch(
    @Headers() headers: Record<string, any>,
    @Body() body: { licenses: Array<{ brokerCentralCode: string; licenseNumber: string; licenseType?: 'life' | 'non_life' | 'both'; scope?: string[] }> }
  ) {
    const correlationId = this.getCorrelationId(headers);
    if (!body?.licenses || !Array.isArray(body.licenses) || body.licenses.length === 0) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'licenses array is required' },
        correlationId,
      };
    }
    const result = await this.licenseValidationService.validateBatch(body.licenses);
    return {
      success: true,
      data: result,
      correlationId,
    };
  }

  @Public()
  @Post('/reg/broker-license/status-change')
  async handleLicenseStatusChange(
    @Headers() headers: Record<string, any>,
    @Body() body: LicenseStatusChangePayload
  ) {
    const correlationId = this.getCorrelationId(headers);
    if (!body?.brokerCentralCode || !body?.licenseNumber || !body?.newStatus) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'brokerCentralCode, licenseNumber, and newStatus are required' },
        correlationId,
      };
    }
    const result = await this.licenseValidationService.handleStatusChangeWebhook(body);
    return {
      success: true,
      data: { changeId: result.changeId, authServiceNotified: result.authServiceNotified },
      correlationId,
    };
  }

  @RequirePermissions('regulatory:events:view')
  @Get('/reg/broker-license/status-changes')
  async getLicenseStatusChangeHistory(
    @Headers() headers: Record<string, any>,
    @Query('brokerCentralCode') brokerCentralCode?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
  ) {
    const correlationId = this.getCorrelationId(headers);
    const result = await this.licenseValidationService.getStatusChangeHistory(
      brokerCentralCode,
      parseInt(limit, 10) || 50,
      parseInt(offset, 10) || 0,
    );
    return {
      success: true,
      data: result.rows,
      pagination: { total: result.total, limit: parseInt(limit, 10) || 50, offset: parseInt(offset, 10) || 0 },
      correlationId,
    };
  }

  @RequirePermissions('regulatory:events:view')
  @Get('/reg/warehouse-fire/history')
  async getWarehouseFireHistory(
    @Headers() headers: Record<string, any>,
    @Query('nationalId') nationalId?: string,
    @Query('licenseNumber') licenseNumber?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('inquiryType') inquiryType?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
  ) {
    const correlationId = this.getCorrelationId(headers);
    const result = await this.warehouseFireService.getInquiryHistory({
      nationalId,
      licenseNumber,
      warehouseId,
      inquiryType,
      limit: parseInt(limit, 10) || 50,
      offset: parseInt(offset, 10) || 0,
    });
    return {
      success: true,
      data: result.rows,
      pagination: { total: result.total, limit: parseInt(limit, 10) || 50, offset: parseInt(offset, 10) || 0 },
      correlationId,
    };
  }

  @RequirePermissions('regulatory:events:view')
  @Get('/reg/sanhab/circuit-breaker/:type')
  async getCircuitBreakerStatsByType(
    @Param('type') type: string,
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const stats = this.regulatoryService.getCircuitBreakerStatsByType(type);
    return {
      success: true,
      data: stats,
      correlationId,
    };
  }

  @RequirePermissions('regulatory:events:view')
  @Get('/reg/sanhab/circuit-breakers')
  async getAllCircuitBreakerStats(@Headers() headers: Record<string, any>) {
    const correlationId = this.getCorrelationId(headers);
    const stats = this.regulatoryService.getAllCircuitBreakerStats();
    return {
      success: true,
      data: stats,
      correlationId,
    };
  }
}
