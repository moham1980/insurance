import { Controller, Post, Get, Put, Delete, Body, Param, Headers, Query, UseGuards , Req, Res} from '@nestjs/common';
import { KnowledgeService } from './knowledge.service';
import { ArticleStatus, ArticleCategory } from './entities/KnowledgeArticle';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';
import { RequirePermissions } from './permissions.decorator';

// Cache-Control header for article read endpoints (5-minute TTL by default).
const ARTICLE_CACHE_CONTROL = process.env.KNOWLEDGE_ARTICLE_CACHE_CONTROL || 'public, max-age=300';

@Controller('knowledge')
@UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
export class KnowledgeController {
  constructor(private readonly service: KnowledgeService) {}

  @Post('articles')
  @RequirePermissions('knowledge:articles:create')
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
  @RequirePermissions('knowledge:articles:update')
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
  @RequirePermissions('knowledge:articles:list')
  async searchArticles(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Query() query: any,
    @Res({ passthrough: true }) res: any,
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
    res.header('Cache-Control', ARTICLE_CACHE_CONTROL);
    return {
      success: true,
      data: result.items,
      pagination: { total: result.total, limit: query.limit || 20, offset: query.offset || 0 },
      correlationId,
    };
  }

  @Get('articles/:id')
  @RequirePermissions('knowledge:articles:view')
  async getArticle(@Param('id') id: string, @Res({ passthrough: true }) res: any) {
    const result = await this.service.getArticle(id);
    if (!result) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Article not found' },
      };
    }
    await this.service.incrementViewCount(id);
    res.header('Cache-Control', ARTICLE_CACHE_CONTROL);
    return {
      success: true,
      data: result,
    };
  }

  @Put('articles/:id')
  @RequirePermissions('knowledge:articles:update')
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
  @RequirePermissions('knowledge:articles:delete')
  async deleteArticle(@Param('id') id: string) {
    await this.service.deleteArticle(id);
    return {
      success: true,
      data: { deleted: true },
    };
  }

  @Get('articles')
  @RequirePermissions('knowledge:articles:list')
  async listArticles(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Query() query: any,
    @Res({ passthrough: true }) res: any,
  ) {
    const correlationId = headers['x-correlation-id'] || `kn-${Date.now()}`;
    const result = await this.service.listArticles({
      tenantId: req?.user?.tenantId || query.tenantId,
      category: query.category as ArticleCategory,
      status: query.status as ArticleStatus,
      limit: query.limit ? Math.min(parseInt(query.limit, 10), 200) : undefined,
      offset: query.offset ? parseInt(query.offset, 10) : undefined,
    });
    res.header('Cache-Control', ARTICLE_CACHE_CONTROL);
    return {
      success: true,
      data: result.items,
      pagination: { total: result.total, limit: query.limit || 20, offset: query.offset || 0 },
      correlationId,
    };
  }

  // ── Next Best Action ──────────────────────────────────────────────

  @Post('nba')
  @RequirePermissions('knowledge:nba:create')
  async createNba(@Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = headers['x-correlation-id'] || `kn-${Date.now()}`;
    const result = await this.service.createNba(body);
    return { success: true, data: result, correlationId };
  }

  @Get('nba/recommendations')
  @RequirePermissions('knowledge:nba:list')
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
  @RequirePermissions('knowledge:nba:view')
  async executeNba(@Param('id') id: string) {
    const result = await this.service.executeNba(id);
    if (!result) return { success: false, error: { code: 'NOT_FOUND', message: 'NBA not found' } };
    return { success: true, data: result };
  }
}
