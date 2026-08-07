import { Controller, Get, Post, Body, Query, Param, Delete, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { KnowledgeLayerService, IndexDocumentParams, SearchParams } from './knowledge-layer.service';
import { Document } from './entities/document.entity';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermissions } from './permissions.decorator';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';

interface AuthenticatedRequest {
  tenantId?: string;
  user?: any;
}

@Controller('knowledge')
@UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
export class KnowledgeLayerController {
  constructor(private readonly knowledgeLayer: KnowledgeLayerService) {}

  // Tenant scoping (P0 fix): extract tenantId from the request (set by TenantGuard).
  private getTenantId(req: AuthenticatedRequest): string | undefined {
    return req.tenantId;
  }

  @Post('index')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('knowledge:index')
  async indexDocument(@Req() req: AuthenticatedRequest, @Body() params: IndexDocumentParams): Promise<Document> {
    // Tenant scoping (P0 fix): set tenantId from the authenticated request.
    params.tenantId = params.tenantId ?? this.getTenantId(req);
    return this.knowledgeLayer.indexDocument(params);
  }

  @Post('search')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('knowledge:search')
  async search(@Req() req: AuthenticatedRequest, @Body() params: SearchParams) {
    // Tenant scoping (P0 fix): set tenantId from the authenticated request.
    params.tenantId = params.tenantId ?? this.getTenantId(req);
    return this.knowledgeLayer.search(params);
  }

  @Get('documents/:id')
  @RequirePermissions('knowledge:view')
  async getDocument(@Req() req: AuthenticatedRequest, @Param('id') id: string): Promise<Document> {
    return this.knowledgeLayer.getDocument(id, this.getTenantId(req));
  }

  @Get('documents/external/:externalId')
  @RequirePermissions('knowledge:view')
  async getDocumentByExternalId(@Req() req: AuthenticatedRequest, @Param('externalId') externalId: string): Promise<Document> {
    return this.knowledgeLayer.getDocumentByExternalId(externalId, this.getTenantId(req));
  }

  @Get('documents')
  @RequirePermissions('knowledge:view')
  async getDocuments(@Req() req: AuthenticatedRequest, @Query() params: any) {
    const limit = Math.min(parseInt(params?.limit || '50', 10), 200);
    // P1 #8: pass cursor for cursor-based pagination (backward compatible)
    const result = await this.knowledgeLayer.getDocuments({ ...params, limit, tenantId: this.getTenantId(req) });
    // P1 #8: return cursor-based pagination info when cursor is used
    if (params?.cursor && typeof (result as any).hasNext !== 'undefined') {
      return {
        success: true,
        data: result.items,
        pagination: { hasNext: (result as any).hasNext, nextCursor: (result as any).nextCursor },
      };
    }
    return result;
  }

  @Delete('documents/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('knowledge:delete')
  async deleteDocument(@Req() req: AuthenticatedRequest, @Param('id') id: string): Promise<void> {
    return this.knowledgeLayer.deleteDocument(id, this.getTenantId(req));
  }

  @Post('documents/:id/reindex')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('knowledge:reindex')
  async reindexDocument(@Req() req: AuthenticatedRequest, @Param('id') id: string): Promise<Document> {
    return this.knowledgeLayer.reindexDocument(id, this.getTenantId(req));
  }

  @Get('stats')
  @RequirePermissions('knowledge:view')
  async getStats(@Req() req: AuthenticatedRequest) {
    return this.knowledgeLayer.getStats(this.getTenantId(req));
  }

  @Get('health')
  async health() {
    return { status: 'ok', service: 'knowledge-layer-service', timestamp: new Date().toISOString() };
  }
}
