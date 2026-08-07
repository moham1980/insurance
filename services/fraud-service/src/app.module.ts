import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { AbacGuard } from './abac.guard';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FraudCase } from './entities/FraudCase';
import { FraudScoreAudit } from './entities/FraudScoreAudit';
import { FraudMLModel } from './entities/FraudMLModel';
import { FraudGraphEntity } from './entities/FraudGraphEntity';
import { FraudGraphRelationship } from './entities/FraudGraphRelationship';
import { FraudIrregularityAlert } from './entities/FraudIrregularityAlert';
import { ConsumedEvent, OutboxEvent, DeadLetterEvent } from '@insurance/shared';
import { FraudDocumentAttachmentAudit } from './entities/FraudDocumentAttachmentAudit';
import { FraudController } from './fraud.controller';
import { FraudService } from './fraud.service';
import { FraudDocumentsConsumer } from './fraud-documents.consumer';
import { FraudClaimRegistrationConsumer } from './fraud-claim-registration.consumer';
import { FraudMLTrainingService } from './ml-training/ml-training.service';
import { FraudMLDriftDetectionService } from './ml-training/ml-drift-detection.service';
import { FraudMLExplainabilityService } from './ml-training/ml-explainability.service';
import { HealthController } from './health.controller';

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
      schema: process.env.DB_SCHEMA || 'public',
      entities: [FraudCase, FraudScoreAudit, FraudMLModel, FraudGraphEntity, FraudGraphRelationship, FraudIrregularityAlert, FraudDocumentAttachmentAudit, OutboxEvent, ConsumedEvent, DeadLetterEvent],
      synchronize: process.env.NODE_ENV !== 'production' && process.env.DB_SYNC === 'true',
    }),
    TypeOrmModule.forFeature([FraudCase, FraudScoreAudit, FraudMLModel, FraudGraphEntity, FraudGraphRelationship, FraudIrregularityAlert, FraudDocumentAttachmentAudit, OutboxEvent, ConsumedEvent, DeadLetterEvent]),
  ],
  controllers: [FraudController, HealthController],
  providers: [TenantGuard, FraudService, FraudDocumentsConsumer, FraudClaimRegistrationConsumer, FraudMLTrainingService, FraudMLDriftDetectionService, FraudMLExplainabilityService, JwtAuthGuard, PermissionsGuard, AbacGuard],
})
export class AppModule {}
