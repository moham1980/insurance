import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { PaymentReportService } from './payment-report.service';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { PermissionsGuard } from '../permissions.guard';
import { TenantGuard } from '../tenant.guard';
import { RequirePermissions } from '../permissions.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
export class CollectionsReportController {
  constructor(private readonly reportService: PaymentReportService) {}

  private readonly BROKER_ROLES = ['broker_owner', 'broker_staff', 'agency_owner', 'agency_staff'];

  private enforceBrokerFilter(req: any, queryOrgId?: string): string | undefined {
    const roles: string[] = req?.user?.roles || (req?.user?.role ? [req.user.role] : []);
    const isBroker = roles.some(r => this.BROKER_ROLES.includes(r));
    if (isBroker) {
      return req?.user?.organizationId || queryOrgId;
    }
    return queryOrgId;
  }

  @Get('collections')
  @RequirePermissions('billing:reports:view')
  async collections(@Req() req: any, @Query() query: any) {
    const tenantId = req.user.tenantId as string;
    const organizationId = this.enforceBrokerFilter(req, query.organizationId);
    const result = await this.reportService.collectionsReport({
      tenantId,
      organizationId,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });
    return { success: true, data: result };
  }

  @Get('outstanding-invoices')
  @RequirePermissions('billing:reports:view')
  async outstandingInvoices(@Req() req: any, @Query() query: any) {
    const tenantId = req.user.tenantId as string;
    const organizationId = this.enforceBrokerFilter(req, query.organizationId);
    const result = await this.reportService.outstandingInvoices({
      tenantId,
      organizationId,
    });
    return { success: true, data: result };
  }

  @Get('settlements')
  @RequirePermissions('billing:reports:view')
  async settlements(@Req() req: any, @Query() query: any) {
    const tenantId = req.user.tenantId as string;
    const organizationId = this.enforceBrokerFilter(req, query.organizationId);
    const result = await this.reportService.settlementsReport({
      tenantId,
      organizationId,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });
    return { success: true, data: result };
  }

  @Get('escrow-balance')
  @RequirePermissions('billing:reports:view')
  async escrowBalance(@Req() req: any, @Query() query: any) {
    const tenantId = req.user.tenantId as string;
    const result = await this.reportService.escrowBalance({
      tenantId,
      escrowAccountRef: query.escrowAccountRef,
    });
    return { success: true, data: result };
  }

  @Get('commission-aging')
  @RequirePermissions('billing:reports:view')
  async commissionAging(@Req() req: any, @Query() query: any) {
    const tenantId = req.user.tenantId as string;
    const organizationId = this.enforceBrokerFilter(req, query.organizationId);
    const result = await this.reportService.commissionAgingReport({
      tenantId,
      organizationId,
    });
    return { success: true, data: result };
  }
}
