import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { Permissions } from './permissions.decorator';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';
import { WorkspaceService } from './workspace.service';

@Controller('workspaces')
@UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
export class WorkspaceController {
  constructor(private readonly service: WorkspaceService) {}

  private actor(req: any) {
    return req?.user || {};
  }

  private tenantId(req: any) {
    return req?.user?.tenantId as string;
  }

  @Post()
  @Permissions('workspaces:manage')
  async create(@Req() req: any, @Body() body: any) {
    const data = await this.service.createWorkspace(this.tenantId(req), this.actor(req), body);
    return { success: true, data };
  }

  @Get()
  @Permissions('workspaces:manage')
  async list(
    @Req() req: any,
    @Query('partyId') partyId?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
  ) {
    const result = await this.service.listWorkspaces(this.tenantId(req), this.actor(req), {
      partyId,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });
    return { success: true, data: result.rows, pagination: { total: result.total, limit: parseInt(limit, 10), offset: parseInt(offset, 10) } };
  }

  @Get('mine')
  @Permissions('workspaces:view')
  async listMine(
    @Req() req: any,
    @Query('partyId') partyId: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
  ) {
    const result = await this.service.listMyWorkspaces(this.tenantId(req), this.actor(req), partyId, {
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });
    return { success: true, data: result.rows, pagination: { total: result.total, limit: parseInt(limit, 10), offset: parseInt(offset, 10) } };
  }

  @Get('organization/:organizationId')
  @Permissions('workspaces:view')
  async listByOrganization(
    @Req() req: any,
    @Param('organizationId') organizationId: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
  ) {
    const result = await this.service.listWorkspacesByOrganization(
      this.tenantId(req),
      this.actor(req),
      organizationId,
      { limit: parseInt(limit, 10), offset: parseInt(offset, 10) },
    );
    return { success: true, data: result.rows, pagination: { total: result.total, limit: parseInt(limit, 10), offset: parseInt(offset, 10) } };
  }

  @Get(':workspaceId')
  @Permissions('workspaces:view')
  async get(@Req() req: any, @Param('workspaceId') workspaceId: string) {
    const data = await this.service.getWorkspace(this.tenantId(req), this.actor(req), workspaceId);
    return { success: true, data };
  }

  @Post(':workspaceId/members')
  @Permissions('workspaces:manage')
  async addMember(
    @Req() req: any,
    @Param('workspaceId') workspaceId: string,
    @Body() body: { partyId: string; role: string; grantedAt?: string },
  ) {
    const data = await this.service.addMember(this.tenantId(req), this.actor(req), workspaceId, {
      ...body,
      grantedAt: body.grantedAt ? new Date(body.grantedAt) : undefined,
    });
    return { success: true, data };
  }

  @Delete(':workspaceId/members/:membershipId')
  @Permissions('workspaces:manage')
  async removeMember(
    @Req() req: any,
    @Param('workspaceId') workspaceId: string,
    @Param('membershipId') membershipId: string,
  ) {
    await this.service.removeMember(this.tenantId(req), this.actor(req), workspaceId, membershipId);
    return { success: true, data: { removed: true } };
  }
}
