import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppDataSource } from './data-source';
import { ModelInventory } from './entities/ModelInventory';
import { ModelIntakeController } from './controllers/model-intake.controller';
import { GovernanceController } from './controllers/governance.controller';
import { HealthController } from './health.controller';
import { ModelLifecycleService } from './services/model-lifecycle.service';
import { ModelSwitchboardGovernanceService } from './services/model-switchboard-governance.service';
import { AIIncidentResponseService } from './services/ai-incident-response.service';
import { CommitteeAuditTrailService } from './services/committee-audit-trail.service';
import { DeploymentApprovalGateService } from './services/deployment-approval-gate.service';
import { MonitoringDashboardService } from './services/monitoring-dashboard.service';
import { MroDashboardService } from './services/mro-dashboard.service';
import { ValidationWorkflowService } from './services/validation-workflow.service';
import { EcosystemSyncService } from './services/ecosystem-sync.service';
import { BiasEvaluationSchedulerService } from './services/bias-evaluation-scheduler.service';

import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { OutboxEvent } from '@insurance/shared';
@Module({
  imports: [
    TypeOrmModule.forRoot(AppDataSource.options),
    TypeOrmModule.forFeature([ModelInventory]),
  ],
  controllers: [ModelIntakeController, GovernanceController, HealthController],
  providers: [
    AbacGuard, TenantGuard, JwtAuthGuard, PermissionsGuard,
    ModelLifecycleService, ModelSwitchboardGovernanceService,
    AIIncidentResponseService, CommitteeAuditTrailService,
    DeploymentApprovalGateService, MonitoringDashboardService,
    MroDashboardService, ValidationWorkflowService,
    EcosystemSyncService,
    BiasEvaluationSchedulerService,
  ],
})
export class AppModule {}
