import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from './entities/Document';
import { OutboxEvent, ConsumedEvent, DeadLetterEvent, IdempotencyInterceptor } from '@insurance/shared';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { HealthController } from './health.controller';
import { DocumentClaimEventsConsumer } from './document-claim-events.consumer';
import { RetentionScheduler } from './retention.scheduler';
import { TenantGuard } from './tenant.guard';
import { BulkRateLimitGuard } from './bulk-rate-limit.guard'; // P2 #1: bulk rate limiting
import { AsyncJobService } from './async-job.service'; // P2 #2: async processing

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || process.env.DB_NAME || 'postgres',
      schema: process.env.DB_SCHEMA || 'public',
      entities: [Document, OutboxEvent, ConsumedEvent, DeadLetterEvent],
      synchronize: process.env.NODE_ENV !== 'production' && process.env.DB_SYNC === 'true',
    }),
    TypeOrmModule.forFeature([Document, OutboxEvent, ConsumedEvent, DeadLetterEvent]),
  ],
  controllers: [DocumentsController, HealthController],
  providers: [TenantGuard, DocumentsService, DocumentClaimEventsConsumer, RetentionScheduler, JwtAuthGuard, PermissionsGuard, IdempotencyInterceptor, BulkRateLimitGuard, AsyncJobService],
})
export class AppModule {}
