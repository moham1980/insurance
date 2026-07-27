import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgeLayerService } from './knowledge-layer.service';
import { KnowledgeLayerController } from './knowledge-layer.controller';
import { HealthController } from './health.controller';
import { Document } from './entities/document.entity';
import { DocumentChunk } from './entities/document-chunk.entity';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';

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
      entities: [Document, DocumentChunk, OutboxEvent],
    }),
    TypeOrmModule.forFeature([Document, DocumentChunk, OutboxEvent]),
  ],
  controllers: [KnowledgeLayerController, HealthController],
  providers: [TenantGuard, AbacGuard, KnowledgeLayerService, JwtAuthGuard, PermissionsGuard],
})
export class AppModule {}
