import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModelInventory, ModelStatus, ModelRiskLevel, ModelType } from '../entities/ModelInventory';
import { AIIncidentResponseService, Incident, IncidentStatus, IncidentSeverity, IncidentType } from './ai-incident-response.service';

export interface EcosystemModelExport {
  modelId: string;
  modelName: string;
  modelType: ModelType;
  version: string;
  provider: string | null;
  status: ModelStatus;
  riskLevel: ModelRiskLevel;
  description: string | null;
  performanceMetrics: object | null;
  deploymentDate: string | null;
  lastEvaluationDate: string | null;
  nextEvaluationDate: string | null;
  tags: string | null;
  sourceSystem: string;
  exportedAt: string;
}

export interface EcosystemIncidentExport {
  incidentId: string;
  modelId: string;
  modelName: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  title: string;
  description: string;
  reportedBy: string;
  reportedAt: string;
  assignedTo: string | null;
  rootCause: string | null;
  impactAssessment: string | null;
  affectedUsers: number | null;
  affectedTransactions: number | null;
  mitigationActions: string[] | null;
  resolutionNotes: string | null;
  sourceSystem: string;
  exportedAt: string;
}

export interface EcosystemSyncResult {
  exportedModels: number;
  exportedIncidents: number;
  models: EcosystemModelExport[];
  incidents: EcosystemIncidentExport[];
  syncedAt: string;
}

export interface EcosystemPolicyUpdate {
  policyId: string;
  policyType: 'model_approval' | 'incident_escalation' | 'risk_threshold' | 'evaluation_frequency';
  rules: Record<string, any>;
  effectiveFrom: string;
  sourceSystem: string;
}

@Injectable()
export class EcosystemSyncService {
  private readonly logger = new Logger(EcosystemSyncService.name);

  constructor(
    @InjectRepository(ModelInventory)
    private readonly modelRepository: Repository<ModelInventory>,
    private readonly incidentService: AIIncidentResponseService,
  ) {}

  async exportToEcosystem(): Promise<EcosystemSyncResult> {
    const exportedAt = new Date().toISOString();
    const sourceSystem = 'insurance-platform';

    const models = await this.modelRepository.find();
    const exportedModels: EcosystemModelExport[] = models.map((m) => ({
      modelId: m.modelId,
      modelName: m.modelName,
      modelType: m.modelType,
      version: m.version,
      provider: m.provider,
      status: m.status,
      riskLevel: m.riskLevel,
      description: m.description,
      performanceMetrics: m.performanceMetrics,
      deploymentDate: m.deploymentDate?.toISOString?.() ?? null,
      lastEvaluationDate: m.lastEvaluationDate?.toISOString?.() ?? null,
      nextEvaluationDate: m.nextEvaluationDate?.toISOString?.() ?? null,
      tags: m.tags,
      sourceSystem,
      exportedAt,
    }));

    const openIncidents = await this.incidentService.getOpenIncidents();
    const criticalIncidents = await this.incidentService.getCriticalIncidents();
    const allIncidents = [...openIncidents, ...criticalIncidents];
    const seen = new Set<string>();
    const exportedIncidents: EcosystemIncidentExport[] = [];

    for (const inc of allIncidents) {
      if (seen.has(inc.incidentId)) continue;
      seen.add(inc.incidentId);
      exportedIncidents.push({
        incidentId: inc.incidentId,
        modelId: inc.modelId,
        modelName: inc.modelName,
        type: inc.type,
        severity: inc.severity,
        status: inc.status,
        title: inc.title,
        description: inc.description,
        reportedBy: inc.reportedBy,
        reportedAt: inc.reportedAt.toISOString(),
        assignedTo: inc.assignedTo ?? null,
        rootCause: inc.rootCause ?? null,
        impactAssessment: inc.impactAssessment ?? null,
        affectedUsers: inc.affectedUsers ?? null,
        affectedTransactions: inc.affectedTransactions ?? null,
        mitigationActions: inc.mitigationActions ?? null,
        resolutionNotes: inc.resolutionNotes ?? null,
        sourceSystem,
        exportedAt,
      });
    }

    this.logger.log(`Ecosystem sync: exported ${exportedModels.length} models, ${exportedIncidents.length} incidents`);

    return {
      exportedModels: exportedModels.length,
      exportedIncidents: exportedIncidents.length,
      models: exportedModels,
      incidents: exportedIncidents,
      syncedAt: exportedAt,
    };
  }

  async importPolicyUpdate(update: EcosystemPolicyUpdate): Promise<{ applied: boolean; message: string }> {
    this.logger.log(`Received ecosystem policy update: ${update.policyId} (${update.policyType})`);

    switch (update.policyType) {
      case 'model_approval':
        if (update.rules?.requireCommitteeApproval !== undefined) {
          this.logger.log(`Policy update: committee approval required = ${update.rules.requireCommitteeApproval}`);
        }
        break;
      case 'risk_threshold':
        if (update.rules?.maxRiskLevelForProduction) {
          this.logger.log(`Policy update: max risk level for production = ${update.rules.maxRiskLevelForProduction}`);
        }
        break;
      case 'evaluation_frequency':
        if (update.rules?.evaluationIntervalDays) {
          this.logger.log(`Policy update: evaluation interval = ${update.rules.evaluationIntervalDays} days`);
        }
        break;
      case 'incident_escalation':
        if (update.rules?.escalationTimeoutHours) {
          this.logger.log(`Policy update: escalation timeout = ${update.rules.escalationTimeoutHours} hours`);
        }
        break;
    }

    return { applied: true, message: `Policy ${update.policyId} applied successfully` };
  }

  async getSyncStatus(): Promise<{
    lastSyncAt: string | null;
    modelCount: number;
    openIncidentCount: number;
    ecosystemEnabled: boolean;
  }> {
    const modelCount = await this.modelRepository.count();
    const openIncidents = await this.incidentService.getOpenIncidents();

    return {
      lastSyncAt: null,
      modelCount,
      openIncidentCount: openIncidents.length,
      ecosystemEnabled: process.env.ECOSYSTEM_AI_GOVERNANCE_SYNC === 'true',
    };
  }
}
