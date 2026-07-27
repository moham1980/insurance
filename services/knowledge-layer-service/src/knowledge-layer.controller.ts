import { Controller, Get, Post, Body, Query, Param, Delete, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { KnowledgeLayerService, IndexDocumentParams, SearchParams } from './knowledge-layer.service';
import { Document } from './entities/document.entity';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermissions } from './permissions.decorator';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';

@Controller('knowledge')
@UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
export class KnowledgeLayerController {
  constructor(private readonly knowledgeLayer: KnowledgeLayerService) {}

  @Post('index')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('knowledge:index')
  async indexDocument(@Body() params: IndexDocumentParams): Promise<Document> {
    return this.knowledgeLayer.indexDocument(params);
  }

  @Post('search')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('knowledge:search')
  async search(@Body() params: SearchParams) {
    return this.knowledgeLayer.search(params);
  }

  @Get('documents/:id')
  @RequirePermissions('knowledge:view')
  async getDocument(@Param('id') id: string): Promise<Document> {
    return this.knowledgeLayer.getDocument(id);
  }

  @Get('documents/external/:externalId')
  @RequirePermissions('knowledge:view')
  async getDocumentByExternalId(@Param('externalId') externalId: string): Promise<Document> {
    return this.knowledgeLayer.getDocumentByExternalId(externalId);
  }

  @Get('documents')
  @RequirePermissions('knowledge:view')
  async getDocuments(@Query() params: any) {
    const limit = Math.min(parseInt(params?.limit || '50', 10), 200);
    return this.knowledgeLayer.getDocuments({ ...params, limit });
  }

  @Delete('documents/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('knowledge:delete')
  async deleteDocument(@Param('id') id: string): Promise<void> {
    return this.knowledgeLayer.deleteDocument(id);
  }

  @Post('documents/:id/reindex')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('knowledge:reindex')
  async reindexDocument(@Param('id') id: string): Promise<Document> {
    return this.knowledgeLayer.reindexDocument(id);
  }

  @Get('stats')
  @RequirePermissions('knowledge:view')
  async getStats() {
    return this.knowledgeLayer.getStats();
  }

  @Get('health')
  async health() {
    return { status: 'ok', service: 'knowledge-layer-service', timestamp: new Date().toISOString() };
  }
}
