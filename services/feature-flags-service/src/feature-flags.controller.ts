import { Body, Controller, Delete, Get, Headers, Param, Put, Query, UseGuards } from '@nestjs/common';
import { FeatureFlagsService } from './feature-flags.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Permissions } from './permissions.decorator';
import { PermissionsGuard } from './permissions.guard';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';

@Controller()
export class FeatureFlagsController {
  constructor(private readonly flagsService: FeatureFlagsService) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  @Get('/health')
  health() {
    return { status: 'ok', service: 'feature-flags-service' };
  }

  @Get('/feature-flags')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Permissions('feature_flags:view')
  async list(@Headers() headers: Record<string, any>) {
    const correlationId = this.getCorrelationId(headers);
    const rows = await this.flagsService.listFeatureFlags();
    return {
      success: true,
      data: rows.map((x) => ({
        name: x.name,
        isEnabled: x.isEnabled,
        description: x.description,
        rolloutPercentage: x.rolloutPercentage,
        targetAudience: x.targetAudience,
        variantType: x.variantType,
        variants: x.variants,
        updatedAt: x.updatedAt,
      })),
      correlationId,
    };
  }

  @Get('/feature-flags/:key')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Permissions('feature_flags:view')
  async get(@Headers() headers: Record<string, any>, @Param('key') key: string) {
    const correlationId = this.getCorrelationId(headers);
    const row = await this.flagsService.getFeatureFlag(key);
    if (!row) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Feature flag not found' }, correlationId };
    }
    return {
      success: true,
      data: {
        name: row.name,
        isEnabled: row.isEnabled,
        description: row.description,
        rolloutPercentage: row.rolloutPercentage,
        targetAudience: row.targetAudience,
        variantType: row.variantType,
        variants: row.variants,
        updatedAt: row.updatedAt,
      },
      correlationId,
    };
  }

  // P2 #9: A/B testing — variant evaluation endpoint
  @Get('/feature-flags/:key/variant')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Permissions('feature_flags:view')
  async getVariant(
    @Headers() headers: Record<string, any>,
    @Param('key') key: string,
    @Query('userId') userId: string,
  ) {
    const correlationId = this.getCorrelationId(headers);
    if (!userId) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'userId query parameter is required' }, correlationId };
    }
    const result = await this.flagsService.evaluateVariant(key, userId);
    return { success: true, data: result, correlationId };
  }

  @Put('/feature-flags/:key')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Permissions('feature_flags:manage')
  async put(@Headers() headers: Record<string, any>, @Param('key') key: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);

    if (typeof body?.isEnabled !== 'boolean') {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'isEnabled is required (boolean)' }, correlationId };
    }

    const updated = await this.flagsService.upsertFeatureFlag({
      name: key,
      isEnabled: body.isEnabled,
      description: body.description,
      rolloutPercentage: body.rolloutPercentage,
      targetAudience: body.targetAudience,
      variantType: body.variantType,
      variants: body.variants,
    });

    return {
      success: true,
      data: {
        name: updated.name,
        isEnabled: updated.isEnabled,
        description: updated.description,
        rolloutPercentage: updated.rolloutPercentage,
        targetAudience: updated.targetAudience,
        variantType: updated.variantType,
        variants: updated.variants,
        updatedAt: updated.updatedAt,
      },
      correlationId,
    };
  }

  @Delete('/feature-flags/:key')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Permissions('feature_flags:manage')
  async delete(@Headers() headers: Record<string, any>, @Param('key') key: string) {
    const correlationId = this.getCorrelationId(headers);
    const deleted = await this.flagsService.deleteFeatureFlag(key);
    if (!deleted) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Feature flag not found' }, correlationId };
    }
    return { success: true, correlationId };
  }
}
