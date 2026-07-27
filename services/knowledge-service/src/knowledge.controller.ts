import { Controller, Post, Get, Put, Delete, Body, Param, Headers, Query, UseGuards , Req} from '@nestjs/common';
import { KnowledgeService } from './knowledge.service';
import { ArticleStatus, ArticleCategory } from './entities/KnowledgeArticle';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';

@Controller('knowledge')
@UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
export class KnowledgeController {
  constructor(private readonly service: KnowledgeService) {}

  @Post('articles')
  async createArticle(
    @Headers() headers: Record<string, any>,
    @Body() body: {
      tenantId: string;
      title: string;
      content: string;
      summary?: string;
      category: ArticleCategory;
      tags?: string[];
      authorId?: string;
      metadata?: Record<string, any>;
    },
  ) {
    const correlationId = headers['x-correlation-id'] || `kn-${Date.now()}`;
    const result = await this.service.createArticle(body);
    return {
      success: true,
      data: result,
      correlationId,
    };
  }

  @Put('articles/:id/publish')
  async publishArticle(
    @Param('id') id: string,
    @Headers() headers: Record<string, any>,
  ) {
    const correlationId = headers['x-correlation-id'] || `kn-${Date.now()}`;
    const result = await this.service.publishArticle(id);
    return {
      success: true,
      data: result,
      correlationId,
    };
  }

  @Get('articles/search')
  async searchArticles(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Query() query: any,
  ) {
    const correlationId = headers['x-correlation-id'] || `kn-${Date.now()}`;
    const result = await this.service.searchArticles({
      tenantId: req?.user?.tenantId || query.tenantId,
      query: query.q,
      category: query.category as ArticleCategory,
      tags: query.tags ? query.tags.split(',') : undefined,
      status: query.status as ArticleStatus,
      limit: query.limit ? Math.min(parseInt(query.limit, 10), 200) : undefined,
      offset: query.offset ? parseInt(query.offset, 10) : undefined,
    });
    return {
      success: true,
      data: result.items,
      pagination: { total: result.total, limit: query.limit || 20, offset: query.offset || 0 },
      correlationId,
    };
  }

  @Get('articles/:id')
  async getArticle(@Param('id') id: string) {
    const result = await this.service.getArticle(id);
    if (!result) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Article not found' },
      };
    }
    await this.service.incrementViewCount(id);
    return {
      success: true,
      data: result,
    };
  }

  @Put('articles/:id')
  async updateArticle(
    @Param('id') id: string,
    @Headers() headers: Record<string, any>,
    @Body() body: {
      title?: string;
      content?: string;
      summary?: string;
      category?: ArticleCategory;
      tags?: string[];
      metadata?: Record<string, any>;
    },
  ) {
    const correlationId = headers['x-correlation-id'] || `kn-${Date.now()}`;
    const result = await this.service.updateArticle(id, body);
    return {
      success: true,
      data: result,
      correlationId,
    };
  }

  @Delete('articles/:id')
  async deleteArticle(@Param('id') id: string) {
    await this.service.deleteArticle(id);
    return {
      success: true,
      data: { deleted: true },
    };
  }

  @Get('articles')
  async listArticles(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Query() query: any,
  ) {
    const correlationId = headers['x-correlation-id'] || `kn-${Date.now()}`;
    const result = await this.service.listArticles({
      tenantId: req?.user?.tenantId || query.tenantId,
      category: query.category as ArticleCategory,
      status: query.status as ArticleStatus,
      limit: query.limit ? Math.min(parseInt(query.limit, 10), 200) : undefined,
      offset: query.offset ? parseInt(query.offset, 10) : undefined,
    });
    return {
      success: true,
      data: result.items,
      pagination: { total: result.total, limit: query.limit || 20, offset: query.offset || 0 },
      correlationId,
    };
  }

  // ── Next Best Action ──────────────────────────────────────────────

  @Post('nba')
  async createNba(@Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = headers['x-correlation-id'] || `kn-${Date.now()}`;
    const result = await this.service.createNba(body);
    return { success: true, data: result, correlationId };
  }

  @Get('nba/recommendations')
  async getRecommendations(@Headers() headers: Record<string, any>, @Req() req: any, @Query() query: any) {
    const correlationId = headers['x-correlation-id'] || `kn-${Date.now()}`;
    const result = await this.service.getRecommendations({
      tenantId: req?.user?.tenantId || query.tenantId,
      customerId: query.customerId,
      limit: query.limit ? Math.min(parseInt(query.limit, 10), 200) : undefined,
    });
    return { success: true, data: result, correlationId };
  }

  @Post('nba/:id/execute')
  async executeNba(@Param('id') id: string) {
    const result = await this.service.executeNba(id);
    if (!result) return { success: false, error: { code: 'NOT_FOUND', message: 'NBA not found' } };
    return { success: true, data: result };
  }
}
