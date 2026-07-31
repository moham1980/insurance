import { Controller, Get, Headers, Query, Req, Res, UseGuards } from '@nestjs/common';
import { BiAggregateService } from './bi-aggregate.service';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { PermissionsGuard } from '../permissions.guard';
import { TenantGuard } from '../tenant.guard';
import { RequirePermissions } from '../permissions.decorator';
import { AbacGuard } from '../abac.guard';

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard, AbacGuard)
export class BiAggregateController {
  constructor(private readonly biAggregateService: BiAggregateService) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `bi-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  @Get('/reporting/bi/executive')
  @RequirePermissions('reporting:view')
  async executive(@Req() req: any, @Headers() headers: Record<string, any>) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const data = await this.biAggregateService.getExecutiveDashboard(tenantId);
    return { success: true, data, correlationId };
  }

  @Get('/reporting/bi/cockpit')
  @RequirePermissions('reporting:view')
  async cockpit(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const data = await this.biAggregateService.getCockpit({ tenantId, startDate, endDate });
    return { success: true, data, correlationId };
  }

  @Get('/reporting/bi/export')
  @RequirePermissions('reporting:view')
  async export(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Res() res: any,
    @Query('format') format: string = 'csv',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const data = await this.biAggregateService.getExecutiveDashboard(tenantId);
    const cockpit = await this.biAggregateService.getCockpit({ tenantId, startDate, endDate });

    const flat = this.flattenForExport(data, cockpit);

    if (format === 'csv') {
      const csv = this.toCSV(flat);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="bi-export-${Date.now()}.csv"`);
      return res.send(csv);
    }

    if (format === 'excel') {
      const tsv = this.toTSV(flat);
      res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="bi-export-${Date.now()}.xls"`);
      return res.send(tsv);
    }

    if (format === 'pdf') {
      const html = this.toPDFHtml(flat, correlationId);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="bi-export-${Date.now()}.pdf"`);
      return res.send(html);
    }

    return { success: false, error: { code: 'VALIDATION_ERROR', message: 'format must be csv, excel, or pdf' }, correlationId };
  }

  private flattenForExport(dashboard: Record<string, any>, cockpit: Record<string, any>): Array<{ section: string; metric: string; value: string }> {
    const rows: Array<{ section: string; metric: string; value: string }> = [];
    for (const [key, val] of Object.entries(dashboard)) {
      if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        for (const [k, v] of Object.entries(val)) {
          rows.push({ section: key, metric: k, value: String(v) });
        }
      } else if (Array.isArray(val)) {
        val.forEach((item: any, idx: number) => {
          if (typeof item === 'object' && item !== null) {
            for (const [k, v] of Object.entries(item)) {
              rows.push({ section: `${key}[${idx}]`, metric: k, value: String(v) });
            }
          }
        });
      } else {
        rows.push({ section: 'dashboard', metric: key, value: String(val) });
      }
    }
    for (const [key, val] of Object.entries(cockpit)) {
      rows.push({ section: 'cockpit', metric: key, value: String(val) });
    }
    return rows;
  }

  private toCSV(rows: Array<{ section: string; metric: string; value: string }>): string {
    const header = 'Section,Metric,Value';
    const lines = rows.map((r) => `"${r.section}","${r.metric}","${r.value}"`);
    return [header, ...lines].join('\n');
  }

  private toTSV(rows: Array<{ section: string; metric: string; value: string }>): string {
    const header = 'Section\tMetric\tValue';
    const lines = rows.map((r) => `${r.section}\t${r.metric}\t${r.value}`);
    return [header, ...lines].join('\n');
  }

  private toPDFHtml(rows: Array<{ section: string; metric: string; value: string }>, correlationId: string): string {
    const body = rows.map((r) => `<tr><td>${r.section}</td><td>${r.metric}</td><td>${r.value}</td></tr>`).join('');
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>BI Export</title><style>body{font-family:sans-serif}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f4f4f4}</style></head><body><h1>BI Executive Dashboard Export</h1><p>Correlation ID: ${correlationId}</p><table><thead><tr><th>Section</th><th>Metric</th><th>Value</th></tr></thead><tbody>${body}</tbody></table></body></html>`;
  }
}
