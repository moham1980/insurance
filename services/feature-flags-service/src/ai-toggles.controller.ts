import { Body, Controller, Get, Headers, Param, Put, UseGuards } from '@nestjs/common';
import { FeatureFlagsService } from './feature-flags.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Permissions } from './permissions.decorator';
import { PermissionsGuard } from './permissions.guard';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';

@Controller()
export class AiTogglesController {
  constructor(private readonly flagsService: FeatureFlagsService) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  @Get('/ai-toggles')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Permissions('ai_toggles:view')
  async list(@Headers() headers: Record<string, any>) {
    const correlationId = this.getCorrelationId(headers);
    const rows = await this.flagsService.listAiToggles();
    return {
      success: true,
      data: rows.map((x) => ({
        name: x.name,
        isEnabled: x.isEnabled,
        description: x.description,
        modelName: x.modelName,
        modelVersion: x.modelVersion,
        config: x.config,
        updatedAt: x.updatedAt,
      })),
      correlationId,
    };
  }

  @Get('/ai-toggles/:name')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Permissions('ai_toggles:view')
  async get(@Headers() headers: Record<string, any>, @Param('name') name: string) {
    const correlationId = this.getCorrelationId(headers);
    const row = await this.flagsService.getAiToggle(name);
    if (!row) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'AI toggle not found' }, correlationId };
    }
    return {
      success: true,
      data: {
        name: row.name,
        isEnabled: row.isEnabled,
        description: row.description,
        modelName: row.modelName,
        modelVersion: row.modelVersion,
        config: row.config,
        updatedAt: row.updatedAt,
      },
      correlationId,
    };
  }

  @Put('/ai-toggles/:name')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Permissions('ai_toggles:manage')
  async put(@Headers() headers: Record<string, any>, @Param('name') name: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);

    if (typeof body?.isEnabled !== 'boolean') {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'isEnabled is required (boolean)' }, correlationId };
    }

    const updated = await this.flagsService.upsertAiToggle({
      name,
      isEnabled: body.isEnabled,
      description: body.description,
      modelName: body.modelName,
      modelVersion: body.modelVersion,
      config: body.config,
    });

    return {
      success: true,
      data: {
        name: updated.name,
        isEnabled: updated.isEnabled,
        description: updated.description,
        modelName: updated.modelName,
        modelVersion: updated.modelVersion,
        config: updated.config,
        updatedAt: updated.updatedAt,
      },
      correlationId,
    };
  }
}
