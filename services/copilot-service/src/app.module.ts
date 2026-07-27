import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClaimEntity } from './entities/ClaimEntity';
import { DocumentEntity } from './entities/DocumentEntity';
import { CopilotAudit } from './entities/CopilotAudit';
import { ModelInventory, ModelRiskAssessment, AIIncidentReport, ModelCard, ModelValidationReport } from './entities/ModelInventory';
import { CopilotController } from './copilot.controller';
import { CopilotService } from './copilot.service';
import { LLMService } from './llm.service';
import { EcosystemAiProvider } from './ecosystem-ai.provider';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { HealthController } from './health.controller';

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
      schema: process.env.DB_SCHEMA || 'public',
      entities: [ClaimEntity, DocumentEntity, CopilotAudit, ModelInventory, ModelRiskAssessment, AIIncidentReport, ModelCard, ModelValidationReport, OutboxEvent],
      synchronize: process.env.NODE_ENV !== 'production' && process.env.DB_SYNC === 'true',
    }),
    TypeOrmModule.forFeature([ClaimEntity, DocumentEntity, CopilotAudit, ModelInventory, ModelRiskAssessment, AIIncidentReport, ModelCard, ModelValidationReport, OutboxEvent]),
  ],
  controllers: [CopilotController, HealthController],
  providers: [AbacGuard, TenantGuard, CopilotService, LLMService, EcosystemAiProvider, JwtAuthGuard, PermissionsGuard],
})
export class AppModule {}
