import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeArticle } from './entities/KnowledgeArticle';
import { KnowledgeGraphEntity } from './entities/KnowledgeGraphEntity';
import { KnowledgeGraphRelationship } from './entities/KnowledgeGraphRelationship';
import { NextBestAction } from './entities/NextBestAction';
import { HealthController } from './health.controller';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { CacheService } from './cache.service';

import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';
import { OutboxEvent } from '@insurance/shared';
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || process.env.DB_NAME || 'postgres',
      schema: process.env.DB_SCHEMA || 'knowledge',
      synchronize: process.env.NODE_ENV !== 'production' && process.env.DB_SYNC === 'true',
      entities: [KnowledgeArticle, KnowledgeGraphEntity, KnowledgeGraphRelationship, NextBestAction, OutboxEvent],
    }),
    TypeOrmModule.forFeature([KnowledgeArticle, KnowledgeGraphEntity, KnowledgeGraphRelationship, NextBestAction, OutboxEvent]),
  ],
  controllers: [KnowledgeController, HealthController],
  providers: [AbacGuard, TenantGuard, KnowledgeService, JwtAuthGuard, PermissionsGuard, CacheService],
})
export class AppModule {}
