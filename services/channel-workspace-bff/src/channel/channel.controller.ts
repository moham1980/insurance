import { Body, Controller, Get, Headers, Param, Post, Query, Req } from '@nestjs/common';
import { ChannelBffService } from './channel-bff.service';

function extractToken(req: any): string {
  const auth = req?.headers?.authorization || '';
  return auth.startsWith('Bearer ') ? auth : '';
}

@Controller('channel')
export class ChannelController {
  constructor(private readonly bff: ChannelBffService) {}

  private cid(headers: Record<string, any>): string {
    return headers['x-correlation-id'] || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // --- Dashboard ---

  @Get('dashboard')
  async getDashboard(@Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.getChannelDashboard(extractToken(req));
    return { success: true, data, correlationId: this.cid(headers) };
  }

  // --- Workspace ---

  @Get('workspaces')
  async listWorkspaces(@Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.listWorkspaces(extractToken(req));
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Get('workspaces/:workspaceId')
  async getWorkspace(@Param('workspaceId') workspaceId: string, @Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.getWorkspace(extractToken(req), workspaceId);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Get('workspaces/mine')
  async getMyWorkspaces(@Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.getMyWorkspaces(extractToken(req));
    return { success: true, data, correlationId: this.cid(headers) };
  }

  // --- Offerings ---

  @Get('offerings')
  async listOfferings(
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
    @Req() req: any,
    @Headers() headers: Record<string, any>,
  ) {
    const data = await this.bff.listOfferings(extractToken(req), { limit: +limit, offset: +offset });
    return { success: true, data, correlationId: this.cid(headers) };
  }

  // --- Submissions & RFQ ---

  @Get('submissions')
  async listSubmissions(
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
    @Req() req: any,
    @Headers() headers: Record<string, any>,
  ) {
    const data = await this.bff.listSubmissions(extractToken(req), { limit: +limit, offset: +offset });
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Post('submissions')
  async createSubmission(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: any) {
    const data = await this.bff.createSubmission(extractToken(req), body);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Get('submissions/:submissionId/quotes/compare')
  async compareQuotes(@Param('submissionId') submissionId: string, @Req() req: any, @Headers() headers: Record<string, any>) {
    const data = await this.bff.compareQuotes(extractToken(req), submissionId);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  // --- Commissions ---

  @Get('commissions')
  async listCommissions(
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
    @Req() req: any,
    @Headers() headers: Record<string, any>,
  ) {
    const data = await this.bff.listCommissions(extractToken(req), { limit: +limit, offset: +offset });
    return { success: true, data, correlationId: this.cid(headers) };
  }

  // --- Customers ---

  @Get('customers')
  async listCustomers(
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
    @Req() req: any,
    @Headers() headers: Record<string, any>,
  ) {
    const data = await this.bff.listCustomers(extractToken(req), { limit: +limit, offset: +offset });
    return { success: true, data, correlationId: this.cid(headers) };
  }

  // --- Partners ---

  @Get('partners')
  async listPartners(
    @Query('kind') kind?: string,
    @Query('status') status?: string,
    @Query('organizationId') organizationId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Req() req?: any,
    @Headers() headers?: Record<string, any>,
  ) {
    const data = await this.bff.listPartners(extractToken(req), {
      kind,
      status,
      organizationId,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
    return { success: true, data, correlationId: this.cid(headers) };
  }

  @Post('partners')
  async upsertPartner(@Req() req: any, @Headers() headers: Record<string, any>, @Body() body: any) {
    const data = await this.bff.upsertPartner(extractToken(req), body);
    return { success: true, data, correlationId: this.cid(headers) };
  }

  // --- Sub-Agents ---

  @Get('sub-agents')
  async listSubAgents(
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Req() req?: any,
    @Headers() headers?: Record<string, any>,
  ) {
    const data = await this.bff.listPartners(extractToken(req), {
      kind: 'sub_agent',
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
    return { success: true, data, correlationId: this.cid(headers) };
  }
}
