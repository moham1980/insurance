import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { Permissions } from './permissions.decorator';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';
import { BrandConfigService } from './brand-config.service';

@Controller('brand-configs')
@UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
export class BrandConfigController {
  constructor(private readonly service: BrandConfigService) {}

  private tenant(req: any) {
    return req?.user?.tenantId as string;
  }

  @Post()
  @Permissions('brand:manage')
  async create(@Req() req: any, @Body() body: any) {
    const data = await this.service.create(this.tenant(req), body);
    return { success: true, data };
  }

  @Get()
  @Permissions('brand:manage')
  async list(
    @Req() req: any,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
  ) {
    const result = await this.service.list(this.tenant(req), {
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });
    return { success: true, data: result.rows, pagination: { total: result.total, limit: parseInt(limit, 10), offset: parseInt(offset, 10) } };
  }

  @Get(':brandKey')
  @Permissions('brand:manage')
  async get(@Req() req: any, @Param('brandKey') brandKey: string) {
    const data = await this.service.getByKey(this.tenant(req), brandKey);
    return { success: true, data };
  }

  @Put(':brandKey')
  @Permissions('brand:manage')
  async update(@Req() req: any, @Param('brandKey') brandKey: string, @Body() body: any) {
    const data = await this.service.update(this.tenant(req), brandKey, body);
    return { success: true, data };
  }
}
