import { Controller, Get, Headers, Param, Req, UseGuards } from '@nestjs/common';
import { Customer360Service } from './customer-360.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';

@Controller('customer-360')
@UseGuards(JwtAuthGuard, AbacGuard, TenantGuard)
export class Customer360Controller {
  constructor(private readonly customer360Service: Customer360Service) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  @Get(':customerId')
  async getCustomerProfile(
    @Param('customerId') customerId: string,
    @Headers() headers: Record<string, any>,
    @Req() req: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const authToken = req.headers['authorization'] || '';

    try {
      const profile = await this.customer360Service.getCustomer360Profile(customerId, authToken);
      return {
        success: true,
        data: profile,
        correlationId,
      };
    } catch (error: any) {
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: error.message },
        correlationId,
      };
    }
  }
}
