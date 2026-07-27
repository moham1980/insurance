import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { PermissionsGuard } from '../permissions.guard';
import { AbacGuard } from '../abac.guard';
import { TenantGuard } from '../tenant.guard';
import { RequirePermissions } from '../permissions.decorator';
import { AIIncidentResponseService } from '../services/ai-incident-response.service';
import { CommitteeAuditTrailService } from '../services/committee-audit-trail.service';
import { DeploymentApprovalGateService } from '../services/deployment-approval-gate.service';
import { MonitoringDashboardService } from '../services/monitoring-dashboard.service';
import { MroDashboardService } from '../services/mro-dashboard.service';
import { ValidationWorkflowService } from '../services/validation-workflow.service';
import { EcosystemSyncService } from '../services/ecosystem-sync.service';

@ApiTags('AI Governance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
@Controller('governance')
export class GovernanceController {
  constructor(
    private readonly incidentService: AIIncidentResponseService,
    private readonly committeeService: CommitteeAuditTrailService,
    private readonly approvalGateService: DeploymentApprovalGateService,
    private readonly monitoringService: MonitoringDashboardService,
    private readonly mroDashboardService: MroDashboardService,
    private readonly validationService: ValidationWorkflowService,
    private readonly ecosystemSyncService: EcosystemSyncService,
  ) {}

  @Post('incidents')
  @ApiOperation({ summary: 'Create an AI incident report' })
  @RequirePermissions('ai:governance:incidents:manage')
  async createIncident(@Body() body: {
    modelId: string;
    modelName: string;
    type: string;
    severity: string;
    title: string;
    description: string;
  }, @Req() req: any) {
    return this.incidentService.createIncident(
      body.modelId,
      body.modelName,
      body.type as any,
      body.severity as any,
      body.title,
      body.description,
      req?.user?.userId || req?.user?.sub || 'system',
    );
  }

  @Get('incidents/:incidentId')
  @ApiOperation({ summary: 'Get incident by ID' })
  @RequirePermissions('ai:governance:incidents:view')
  async getIncident(@Param('incidentId') incidentId: string) {
    return this.incidentService.getIncident(incidentId);
  }

  @Get('incidents')
  @ApiOperation({ summary: 'List incidents by status or severity' })
  @RequirePermissions('ai:governance:incidents:view')
  async listIncidents(
    @Query('status') status?: string,
    @Query('severity') severity?: string,
    @Query('modelId') modelId?: string,
  ) {
    if (modelId) return this.incidentService.getIncidentsByModel(modelId);
    if (status) return this.incidentService.getIncidentsByStatus(status as any);
    if (severity) return this.incidentService.getIncidentsBySeverity(severity as any);
    return this.incidentService.getOpenIncidents();
  }

  @Get('incidents/statistics')
  @ApiOperation({ summary: 'Get incident statistics' })
  @RequirePermissions('ai:governance:incidents:view')
  async getIncidentStatistics() {
    return this.incidentService.getIncidentStatistics();
  }

  @Put('incidents/:incidentId/assign')
  @ApiOperation({ summary: 'Assign incident' })
  @RequirePermissions('ai:governance:incidents:manage')
  async assignIncident(@Param('incidentId') incidentId: string, @Body() body: { assignedTo: string }) {
    return this.incidentService.assignIncident(incidentId, body.assignedTo);
  }

  @Put('incidents/:incidentId/investigate')
  @ApiOperation({ summary: 'Start investigation' })
  @RequirePermissions('ai:governance:incidents:manage')
  async startInvestigation(@Param('incidentId') incidentId: string, @Req() req: any) {
    return this.incidentService.startInvestigation(incidentId, req?.user?.userId || 'system');
  }

  @Put('incidents/:incidentId/mitigate')
  @ApiOperation({ summary: 'Mark incident as mitigated' })
  @RequirePermissions('ai:governance:incidents:manage')
  async markMitigated(@Param('incidentId') incidentId: string, @Req() req: any) {
    return this.incidentService.markMitigated(incidentId, req?.user?.userId || 'system');
  }

  @Put('incidents/:incidentId/resolve')
  @ApiOperation({ summary: 'Resolve incident' })
  @RequirePermissions('ai:governance:incidents:manage')
  async resolveIncident(@Param('incidentId') incidentId: string, @Body() body: { resolutionNotes: string }, @Req() req: any) {
    return this.incidentService.resolveIncident(incidentId, body.resolutionNotes, req?.user?.userId || 'system');
  }

  @Put('incidents/:incidentId/close')
  @ApiOperation({ summary: 'Close incident' })
  @RequirePermissions('ai:governance:incidents:manage')
  async closeIncident(@Param('incidentId') incidentId: string, @Req() req: any) {
    return this.incidentService.closeIncident(incidentId, req?.user?.userId || 'system');
  }

  @Post('committee/decisions')
  @ApiOperation({ summary: 'Record a committee decision' })
  @RequirePermissions('ai:governance:committee:manage')
  async recordDecision(@Body() body: any) {
    return this.committeeService.recordDecision(body);
  }

  @Get('committee/decisions/:decisionId')
  @ApiOperation({ summary: 'Get committee decision by ID' })
  @RequirePermissions('ai:governance:committee:view')
  async getDecision(@Param('decisionId') decisionId: string) {
    return this.committeeService.getDecision(decisionId);
  }

  @Get('committee/decisions')
  @ApiOperation({ summary: 'Get audit trail with filters' })
  @RequirePermissions('ai:governance:committee:view')
  async getAuditTrail(
    @Query('modelId') modelId?: string,
    @Query('committeeId') committeeId?: string,
    @Query('decisionType') decisionType?: string,
  ) {
    return this.committeeService.getAuditTrail({
      modelId,
      committeeId,
      decisionType: decisionType as any,
    });
  }

  @Get('committee/statistics/:committeeId')
  @ApiOperation({ summary: 'Get committee statistics' })
  @RequirePermissions('ai:governance:committee:view')
  async getCommitteeStatistics(@Param('committeeId') committeeId: string) {
    return this.committeeService.getCommitteeStatistics(committeeId);
  }

  @Post('approvals')
  @ApiOperation({ summary: 'Request deployment approval' })
  @RequirePermissions('ai:governance:approvals:manage')
  async requestApproval(@Body() body: any, @Req() req: any) {
    return this.approvalGateService.requestDeploymentApproval(
      body.modelId,
      body.modelVersion,
      body.environment,
      req?.user?.userId || 'system',
      body.validationReportId,
      body.riskAssessmentId,
    );
  }

  @Get('approvals/:requestId')
  @ApiOperation({ summary: 'Get approval request by ID' })
  @RequirePermissions('ai:governance:approvals:view')
  async getApprovalRequest(@Param('requestId') requestId: string) {
    return this.approvalGateService.getApprovalRequest(requestId);
  }

  @Put('approvals/:requestId/approve')
  @ApiOperation({ summary: 'Approve deployment request' })
  @RequirePermissions('ai:governance:approvals:manage')
  async approveRequest(@Param('requestId') requestId: string, @Body() body: { comments?: string }, @Req() req: any) {
    return this.approvalGateService.approveDeployment(requestId, req?.user?.userId || 'system', body.comments);
  }

  @Put('approvals/:requestId/reject')
  @ApiOperation({ summary: 'Reject deployment request' })
  @RequirePermissions('ai:governance:approvals:manage')
  async rejectRequest(@Param('requestId') requestId: string, @Body() body: { reason: string }, @Req() req: any) {
    return this.approvalGateService.rejectDeployment(requestId, req?.user?.userId || 'system', body.reason);
  }

  @Get('monitoring/metrics/:modelId')
  @ApiOperation({ summary: 'Get model metrics history' })
  @RequirePermissions('ai:governance:monitoring:view')
  async getModelMetrics(@Param('modelId') modelId: string, @Query('minutes') minutes?: string) {
    const mins = parseInt(minutes || '60', 10) || 60;
    return this.monitoringService.getMetricsHistory(modelId, mins);
  }

  @Post('monitoring/metrics')
  @ApiOperation({ summary: 'Record model metrics' })
  @RequirePermissions('ai:governance:monitoring:manage')
  async recordMetrics(@Body() body: any) {
    return this.monitoringService.recordMetrics(body);
  }

  @Get('monitoring/anomalies')
  @ApiOperation({ summary: 'List anomalies' })
  @RequirePermissions('ai:governance:monitoring:view')
  async getAnomalies(@Query('modelId') modelId?: string) {
    return this.monitoringService.getAnomalies(modelId);
  }

  @Get('monitoring/drift/:modelId')
  @ApiOperation({ summary: 'Get drift metrics for a model' })
  @RequirePermissions('ai:governance:monitoring:view')
  async getDriftMetrics(@Param('modelId') modelId: string) {
    return this.monitoringService.getDriftMetrics(modelId);
  }

  @Get('mro/dashboard')
  @ApiOperation({ summary: 'Get MRO dashboard metrics' })
  @RequirePermissions('ai:governance:mro:view')
  async getMroDashboard() {
    return this.mroDashboardService.getDashboardMetrics();
  }

  @Get('mro/alerts')
  @ApiOperation({ summary: 'Get MRO active alerts' })
  @RequirePermissions('ai:governance:mro:view')
  async getMroAlerts() {
    return this.mroDashboardService.getActiveAlerts();
  }

  @Post('validation/initiate')
  @ApiOperation({ summary: 'Initiate model validation' })
  @RequirePermissions('ai:governance:validation:manage')
  async initiateValidation(@Body() body: any, @Req() req: any) {
    return this.validationService.initiateValidation(
      body.modelId,
      body.modelVersion,
      body.validationType,
      req?.user?.userId || 'system',
    );
  }

  @Get('validation/:reportId')
  @ApiOperation({ summary: 'Get validation report by ID' })
  @RequirePermissions('ai:governance:validation:view')
  async getValidationReport(@Param('reportId') reportId: string) {
    return this.validationService.getValidationReport(reportId);
  }

  @Put('validation/:reportId/approve')
  @ApiOperation({ summary: 'Approve validation report' })
  @RequirePermissions('ai:governance:validation:manage')
  async approveValidationReport(@Param('reportId') reportId: string, @Req() req: any) {
    return this.validationService.approveValidationReport(reportId, req?.user?.userId || 'system');
  }

  @Put('validation/:reportId/reject')
  @ApiOperation({ summary: 'Reject validation report' })
  @RequirePermissions('ai:governance:validation:manage')
  async rejectValidationReport(@Param('reportId') reportId: string, @Body() body: { reason: string }, @Req() req: any) {
    return this.validationService.rejectValidationReport(reportId, req?.user?.userId || 'system', body.reason);
  }

  @Get('ecosystem-sync')
  @ApiOperation({ summary: 'Export local models and incidents to ecosystem A06 format' })
  @RequirePermissions('ai:governance:sync:view')
  async ecosystemSync() {
    return this.ecosystemSyncService.exportToEcosystem();
  }

  @Get('ecosystem-sync/status')
  @ApiOperation({ summary: 'Get ecosystem sync status' })
  @RequirePermissions('ai:governance:sync:view')
  async ecosystemSyncStatus() {
    return this.ecosystemSyncService.getSyncStatus();
  }

  @Post('ecosystem-sync/policy-update')
  @ApiOperation({ summary: 'Receive policy update from ecosystem AI governance' })
  @RequirePermissions('ai:governance:sync:manage')
  async receivePolicyUpdate(@Body() body: {
    policyId: string;
    policyType: 'model_approval' | 'incident_escalation' | 'risk_threshold' | 'evaluation_frequency';
    rules: Record<string, any>;
    effectiveFrom: string;
    sourceSystem: string;
  }) {
    return this.ecosystemSyncService.importPolicyUpdate(body);
  }
}
