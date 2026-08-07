import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsumedEvent, DeadLetterEvent, OutboxEvent } from '@insurance/shared';
import { DocumentEntity } from './entities/DocumentEntity';
import { DocumentAiAudit } from './entities/DocumentAiAudit';
import { DocumentAiJob } from './entities/DocumentAiJob';
import { DocumentAiUsageDaily } from './entities/DocumentAiUsageDaily';
import { DocumentAiEvalCase } from './entities/DocumentAiEvalCase';
import { DocumentAiEvalRun } from './entities/DocumentAiEvalRun';
import { DocumentAiEvalResult } from './entities/DocumentAiEvalResult';
import { HealthController } from './health.controller';
import { DocumentAiController } from './document-ai.controller';
import { DocumentAiConsumer } from './document-ai.consumer';
import { GeminiModule } from './gemini/gemini.module';
import { DeepSeekModule } from './deepseek/deepseek.module';
import { DocumentAiJobWorker } from './document-ai.job-worker';
import { DocumentAiProcessor } from './document-ai.processor';
import { DocumentAiService } from './document-ai.service';
import { DocumentAiEvalWorker } from './document-ai.eval-worker';
import { OcrService } from './ocr/ocr.service';
import { OcrRedactionService } from './ocr/ocr-redaction.service';
import { DocumentPreprocessingService } from './preprocessing/preprocessing.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { OcrRateLimitGuard } from './ocr-rate-limit.guard';
import { AsyncJobService } from './async-job.service'; // P2 #2: async processing

import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || process.env.DB_NAME || 'postgres',
      schema: process.env.DB_SCHEMA || 'document_ai',
      entities: [
        DocumentEntity,
        DocumentAiAudit,
        DocumentAiJob,
        DocumentAiUsageDaily,
        DocumentAiEvalCase,
        DocumentAiEvalRun,
        DocumentAiEvalResult,
        ConsumedEvent,
        DeadLetterEvent,
        OutboxEvent,
      ],
      synchronize: process.env.NODE_ENV !== 'production' && process.env.DB_SYNC === 'true',
    }),
    TypeOrmModule.forFeature([
      DocumentEntity,
      DocumentAiAudit,
      DocumentAiJob,
      DocumentAiUsageDaily,
      DocumentAiEvalCase,
      DocumentAiEvalRun,
      DocumentAiEvalResult,
      ConsumedEvent,
      DeadLetterEvent,
      OutboxEvent,
    ]),
    GeminiModule,
    DeepSeekModule,
  ],
  controllers: [HealthController, DocumentAiController],
  providers: [TenantGuard, AbacGuard, DocumentAiConsumer, DocumentAiProcessor, DocumentAiJobWorker, DocumentAiEvalWorker, DocumentAiService, OcrService, OcrRedactionService, DocumentPreprocessingService, JwtAuthGuard, PermissionsGuard, OcrRateLimitGuard, AsyncJobService],
})
export class AppModule {}
