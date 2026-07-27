import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { PolicyAdminService } from './policy-admin.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { Permissions as RequirePermissions } from './permissions.decorator';
import { AbacPolicy } from './entities/AbacPolicy';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';
import { Resource, ResourceAction } from './resource.decorator';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { UpdatePolicyDto } from './dto/update-policy.dto';
import { EvaluatePolicyDto } from './dto/evaluate-policy.dto';

@Controller('abac/policies')
@UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
export class PolicyAdminController {
  constructor(private readonly policyAdminService: PolicyAdminService) {}

  @Post()
  @Resource('policy')
  @ResourceAction('create')
  @RequirePermissions('abac:policy:create')
  async createPolicy(
    @Body() dto: CreatePolicyDto,
    @Req() req: any,
  ): Promise<AbacPolicy> {
    return this.policyAdminService.createPolicy({
      ...dto,
      createdBy: req.user?.userId || 'system',
      updatedBy: req.user?.userId || 'system',
    });
  }

  @Put(':id')
  @Resource('policy')
  @ResourceAction('write')
  @RequirePermissions('abac:policy:update')
  async updatePolicy(
    @Param('id') id: string,
    @Body() dto: UpdatePolicyDto,
    @Req() req: any,
  ): Promise<AbacPolicy> {
    return this.policyAdminService.updatePolicy(id, { ...dto, updatedBy: req.user?.userId || 'system' });
  }

  @Delete(':id')
  @Resource('policy')
  @ResourceAction('delete')
  @RequirePermissions('abac:policy:delete')
  async deletePolicy(@Param('id') id: string): Promise<{ success: boolean }> {
    await this.policyAdminService.deletePolicy(id);
    return { success: true };
  }

  @Get(':id')
  @Resource('policy')
  @ResourceAction('read')
  @RequirePermissions('abac:policy:read')
  async getPolicy(@Param('id') id: string): Promise<AbacPolicy> {
    return this.policyAdminService.getPolicy(id);
  }

  @Get()
  @Resource('policy')
  @RequirePermissions('abac:policy:read')
  async listPolicies(
    @Query('enabled') enabled?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{ items: AbacPolicy[]; total: number }> {
    return this.policyAdminService.listPolicies({
      enabled: enabled !== undefined ? enabled === 'true' : undefined,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? Math.min(parseInt(limit, 10), 200) : undefined,
    });
  }

  @Post('evaluate')
  @Resource('policy')
  @RequirePermissions('abac:policy:read')
  async evaluatePolicy(
    @Body() dto: EvaluatePolicyDto,
  ): Promise<{ allowed: boolean; matchedPolicy?: { id: string; name: string } }> {
    const result = await this.policyAdminService.evaluateWithDbPolicies({ user: dto.user, resource: dto.resource, action: dto.action, context: dto.context || {} } as any);
    return {
      allowed: result.allowed,
      matchedPolicy: result.matchedPolicy ? { id: result.matchedPolicy.id, name: result.matchedPolicy.name } : undefined,
    };
  }
}
