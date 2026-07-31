import { Body, Controller, Delete, Get, Headers, Param, Post, Put, Query, Req, Res, UseGuards } from '@nestjs/common';
import { CopilotService } from './copilot.service';
import { RagService } from './rag/rag.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermissions } from './permissions.decorator';
import { auditLogger } from './audit.logger';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';

@Controller()
export class CopilotController {
  constructor(
    private readonly copilotService: CopilotService,
    private readonly ragService: RagService,
  ) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  @Get('/health')
  health() {
    return { status: 'ok', service: 'copilot-service' };
  }

  @Post('/copilot/claims/:claimId/summary')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('copilot:claims:summary')
  async claimSummary(@Param('claimId') claimId: string, @Headers() headers: Record<string, any>, @Req() req: any, @Res() res: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user?.userId as string | undefined;
    auditLogger.info('copilot.claims.summary.request', { correlationId, tenantId, actor, action: 'copilot:claims:summary', claimId });

    const result = await this.copilotService.getClaimSummary({ claimId, headers, correlationId, tenantId, actorUserId: actor });
    return res.status(result.status).json(result.body);
  }

  @Post('/copilot/documents/:documentId/summary')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('copilot:documents:summary')
  async docSummary(@Param('documentId') documentId: string, @Headers() headers: Record<string, any>, @Req() req: any, @Res() res: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user?.userId as string | undefined;
    auditLogger.info('copilot.documents.summary.request', {
      correlationId,
      tenantId,
      actor,
      action: 'copilot:documents:summary',
      documentId,
    });

    const result = await this.copilotService.getDocumentSummary({ documentId, headers, correlationId, tenantId, actorUserId: actor });
    return res.status(result.status).json(result.body);
  }

  @Post('/copilot/qa')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('copilot:qa')
  async askQuestion(
    @Body() body: any,
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Res() res: any
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user?.userId as string | undefined;

    auditLogger.info('copilot.qa.request', {
      correlationId,
      tenantId,
      actor,
      action: 'copilot:qa',
      contextType: body?.contextType,
      resourceId: body?.resourceId,
    });

    const result = await this.copilotService.askQuestion({
      contextType: body?.contextType,
      resourceId: body?.resourceId,
      question: body?.question,
      headers,
      correlationId,
      tenantId,
      actorUserId: actor,
      provider: body?.provider,
    });

    return res.status(result.status).json(result.body);
  }

  @Post('/copilot/next-best-action')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('copilot:next-best-action')
  async getNextBestAction(
    @Body() body: any,
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Res() res: any
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user?.userId as string | undefined;

    auditLogger.info('copilot.next_best_action.request', {
      correlationId,
      tenantId,
      actor,
      action: 'copilot:next-best-action',
      contextType: body?.contextType,
      resourceId: body?.resourceId,
    });

    const result = await this.copilotService.getNextBestAction({
      contextType: body?.contextType,
      resourceId: body?.resourceId,
      headers,
      correlationId,
      tenantId,
      actorUserId: actor,
      provider: body?.provider,
    });

    return res.status(result.status).json(result.body);
  }

  @Get('/copilot/providers')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('copilot:view')
  async getAvailableProviders(@Res() res: any) {
    const providers = this.copilotService.getAvailableProviders();
    return res.status(200).json({
      success: true,
      data: { providers },
    });
  }

  // Model Inventory endpoints
  @Post('/copilot/models/register')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('copilot:manage')
  async registerModel(@Body() body: any, @Headers() headers: Record<string, any>, @Req() req: any, @Res() res: any) {
    const correlationId = this.getCorrelationId(headers);
    const actor = req?.user?.userId as string | undefined;

    auditLogger.info('copilot.models.register.request', {
      correlationId,
      actor,
      action: 'copilot:manage',
      modelName: body?.modelName,
      modelType: body?.modelType,
    });

    try {
      const model = await this.copilotService.registerModel({
        modelName: body.modelName,
        modelType: body.modelType,
        version: body.version,
        provider: body.provider,
        description: body.description,
        parameters: body.parameters,
        riskLevel: body.riskLevel,
        trainingDataSummary: body.trainingDataSummary,
        performanceMetrics: body.performanceMetrics,
        tags: body.tags,
        createdBy: actor,
      });

      return res.status(201).json({
        success: true,
        data: { modelId: model.modelId },
        correlationId,
      });
    } catch (e: any) {
      auditLogger.error('copilot.models.register.error', e, {
        correlationId,
        action: 'copilot:manage',
      });
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to register model' },
        correlationId,
      });
    }
  }

  @Put('/copilot/models/:modelId/status')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('copilot:manage')
  async updateModelStatus(@Param('modelId') modelId: string, @Body() body: any, @Headers() headers: Record<string, any>, @Req() req: any, @Res() res: any) {
    const correlationId = this.getCorrelationId(headers);
    const actor = req?.user?.userId as string | undefined;

    auditLogger.info('copilot.models.update_status.request', {
      correlationId,
      actor,
      action: 'copilot:manage',
      modelId,
      status: body?.status,
    });

    try {
      const model = await this.copilotService.updateModelStatus(modelId, body.status);
      if (!model) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Model not found' },
          correlationId,
        });
      }

      return res.status(200).json({
        success: true,
        data: { modelId: model.modelId, status: model.status },
        correlationId,
      });
    } catch (e: any) {
      auditLogger.error('copilot.models.update_status.error', e, {
        correlationId,
        action: 'copilot:manage',
      });
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update model status' },
        correlationId,
      });
    }
  }

  @Get('/copilot/models/:modelId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('copilot:view')
  async getModel(@Param('modelId') modelId: string, @Headers() headers: Record<string, any>, @Req() req: any, @Res() res: any) {
    const correlationId = this.getCorrelationId(headers);

    const model = await this.copilotService.getModel(modelId);
    if (!model) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Model not found' },
        correlationId,
      });
    }

    return res.status(200).json({
      success: true,
      data: model,
      correlationId,
    });
  }

  @Get('/copilot/models')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('copilot:view')
  async listModels(@Headers() headers: Record<string, any>, @Query() query: any, @Res() res: any) {
    const correlationId = this.getCorrelationId(headers);

    const result = await this.copilotService.listModels({
      modelType: query.modelType,
      status: query.status,
      riskLevel: query.riskLevel,
      limit: Math.min(parseInt(query.limit || '50', 10), 200),
      offset: parseInt(query.offset || '0', 10),
    });

    return res.status(200).json({
      success: true,
      data: result,
      correlationId,
    });
  }

  @Delete('/copilot/models/:modelId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('copilot:manage')
  async deleteModel(@Param('modelId') modelId: string, @Headers() headers: Record<string, any>, @Req() req: any, @Res() res: any) {
    const correlationId = this.getCorrelationId(headers);
    const actor = req?.user?.userId as string | undefined;

    auditLogger.info('copilot.models.delete.request', {
      correlationId,
      actor,
      action: 'copilot:manage',
      modelId,
    });

    const result = await this.copilotService.deleteModel(modelId);
    if (!result) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Model not found' },
        correlationId,
      });
    }

    return res.status(200).json({
      success: true,
      data: { deleted: true },
      correlationId,
    });
  }

  // Model Risk Assessment endpoints
  @Post('/copilot/models/:modelId/risk-assessment')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('copilot:manage')
  async createRiskAssessment(@Param('modelId') modelId: string, @Body() body: any, @Headers() headers: Record<string, any>, @Req() req: any, @Res() res: any) {
    const correlationId = this.getCorrelationId(headers);
    const actor = req?.user?.userId as string | undefined;

    auditLogger.info('copilot.risk_assessment.create.request', {
      correlationId,
      actor,
      action: 'copilot:manage',
      modelId,
      assessmentVersion: body?.assessmentVersion,
    });

    try {
      const assessment = await this.copilotService.createRiskAssessment({
        modelId,
        assessmentVersion: body.assessmentVersion,
        riskScore: body.riskScore,
        riskFactors: body.riskFactors,
        mitigationPlan: body.mitigationPlan,
        createdBy: actor,
      });

      return res.status(201).json({
        success: true,
        data: { assessmentId: assessment.assessmentId },
        correlationId,
      });
    } catch (e: any) {
      auditLogger.error('copilot.risk_assessment.create.error', e, {
        correlationId,
        action: 'copilot:manage',
      });
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create risk assessment' },
        correlationId,
      });
    }
  }

  @Put('/copilot/risk-assessment/:assessmentId/approve')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('copilot:manage')
  async approveRiskAssessment(@Param('assessmentId') assessmentId: string, @Body() body: any, @Headers() headers: Record<string, any>, @Req() req: any, @Res() res: any) {
    const correlationId = this.getCorrelationId(headers);
    const actor = req?.user?.userId as string | undefined;

    auditLogger.info('copilot.risk_assessment.approve.request', {
      correlationId,
      actor,
      action: 'copilot:manage',
      assessmentId,
    });

    const assessment = await this.copilotService.approveRiskAssessment(assessmentId, actor || 'unknown', body.notes);
    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Risk assessment not found' },
        correlationId,
      });
    }

    return res.status(200).json({
      success: true,
      data: { assessmentId: assessment.assessmentId, status: assessment.status },
      correlationId,
    });
  }

  @Put('/copilot/risk-assessment/:assessmentId/reject')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('copilot:manage')
  async rejectRiskAssessment(@Param('assessmentId') assessmentId: string, @Body() body: any, @Headers() headers: Record<string, any>, @Req() req: any, @Res() res: any) {
    const correlationId = this.getCorrelationId(headers);
    const actor = req?.user?.userId as string | undefined;

    auditLogger.info('copilot.risk_assessment.reject.request', {
      correlationId,
      actor,
      action: 'copilot:manage',
      assessmentId,
    });

    const assessment = await this.copilotService.rejectRiskAssessment(assessmentId, actor || 'unknown', body.notes);
    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Risk assessment not found' },
        correlationId,
      });
    }

    return res.status(200).json({
      success: true,
      data: { assessmentId: assessment.assessmentId, status: assessment.status },
      correlationId,
    });
  }

  @Get('/copilot/risk-assessment/:assessmentId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('copilot:view')
  async getRiskAssessment(@Param('assessmentId') assessmentId: string, @Headers() headers: Record<string, any>, @Req() req: any, @Res() res: any) {
    const correlationId = this.getCorrelationId(headers);

    const assessment = await this.copilotService.getRiskAssessment(assessmentId);
    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Risk assessment not found' },
        correlationId,
      });
    }

    return res.status(200).json({
      success: true,
      data: assessment,
      correlationId,
    });
  }

  @Get('/copilot/models/:modelId/risk-assessments')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('copilot:view')
  async listRiskAssessmentsForModel(@Param('modelId') modelId: string, @Headers() headers: Record<string, any>, @Req() req: any, @Res() res: any) {
    const correlationId = this.getCorrelationId(headers);

    const assessments = await this.copilotService.listRiskAssessmentsForModel(modelId);

    return res.status(200).json({
      success: true,
      data: assessments,
      correlationId,
    });
  }

  // AI Incident Report endpoints
  @Post('/copilot/incidents')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('copilot:manage')
  async createIncident(@Body() body: any, @Headers() headers: Record<string, any>, @Req() req: any, @Res() res: any) {
    const correlationId = this.getCorrelationId(headers);
    const actor = req?.user?.userId as string | undefined;

    auditLogger.info('copilot.incidents.create.request', {
      correlationId,
      actor,
      action: 'copilot:manage',
      incidentType: body?.incidentType,
      severity: body?.severity,
    });

    try {
      const incident = await this.copilotService.createIncidentReport({
        modelId: body.modelId,
        incidentType: body.incidentType,
        description: body.description,
        severity: body.severity,
        affectedSystems: body.affectedSystems,
        impactSummary: body.impactSummary,
        occurredAt: body.occurredAt ? new Date(body.occurredAt) : undefined,
        reportedBy: body.reportedBy,
        createdBy: actor,
      });

      return res.status(201).json({
        success: true,
        data: { incidentId: incident.incidentId },
        correlationId,
      });
    } catch (e: any) {
      auditLogger.error('copilot.incidents.create.error', e, {
        correlationId,
        action: 'copilot:manage',
      });
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create incident report' },
        correlationId,
      });
    }
  }

  @Put('/copilot/incidents/:incidentId/status')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('copilot:manage')
  async updateIncidentStatus(@Param('incidentId') incidentId: string, @Body() body: any, @Headers() headers: Record<string, any>, @Req() req: any, @Res() res: any) {
    const correlationId = this.getCorrelationId(headers);
    const actor = req?.user?.userId as string | undefined;

    auditLogger.info('copilot.incidents.update_status.request', {
      correlationId,
      actor,
      action: 'copilot:manage',
      incidentId,
      status: body?.status,
    });

    const incident = await this.copilotService.updateIncidentStatus(incidentId, body.status, actor);
    if (!incident) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Incident not found' },
        correlationId,
      });
    }

    return res.status(200).json({
      success: true,
      data: { incidentId: incident.incidentId, status: incident.status },
      correlationId,
    });
  }

  @Put('/copilot/incidents/:incidentId/resolve')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('copilot:manage')
  async resolveIncident(@Param('incidentId') incidentId: string, @Body() body: any, @Headers() headers: Record<string, any>, @Req() req: any, @Res() res: any) {
    const correlationId = this.getCorrelationId(headers);

    auditLogger.info('copilot.incidents.resolve.request', {
      correlationId,
      action: 'copilot:manage',
      incidentId,
    });

    const incident = await this.copilotService.resolveIncident(incidentId, body.resolution, body.rootCause);
    if (!incident) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Incident not found' },
        correlationId,
      });
    }

    return res.status(200).json({
      success: true,
      data: { incidentId: incident.incidentId, status: incident.status },
      correlationId,
    });
  }

  @Get('/copilot/incidents/:incidentId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('copilot:view')
  async getIncident(@Param('incidentId') incidentId: string, @Headers() headers: Record<string, any>, @Req() req: any, @Res() res: any) {
    const correlationId = this.getCorrelationId(headers);

    const incident = await this.copilotService.getIncident(incidentId);
    if (!incident) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Incident not found' },
        correlationId,
      });
    }

    return res.status(200).json({
      success: true,
      data: incident,
      correlationId,
    });
  }

  @Get('/copilot/incidents')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('copilot:view')
  async listIncidents(@Headers() headers: Record<string, any>, @Query() query: any, @Res() res: any) {
    const correlationId = this.getCorrelationId(headers);

    const result = await this.copilotService.listIncidents({
      modelId: query.modelId,
      severity: query.severity,
      status: query.status,
      limit: Math.min(parseInt(query.limit || '50', 10), 200),
      offset: parseInt(query.offset || '0', 10),
    });

    return res.status(200).json({
      success: true,
      data: result,
      correlationId,
    });
  }

  // Model Card endpoints
  @Post('/copilot/models/:modelId/model-card')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('copilot:manage')
  async createModelCard(@Param('modelId') modelId: string, @Body() body: any, @Headers() headers: Record<string, any>, @Req() req: any, @Res() res: any) {
    const correlationId = this.getCorrelationId(headers);
    const actor = req?.user?.userId as string | undefined;

    auditLogger.info('copilot.model_card.create.request', {
      correlationId,
      actor,
      action: 'copilot:manage',
      modelId,
      version: body?.version,
    });

    try {
      const card = await this.copilotService.createModelCard({
        modelId,
        version: body.version,
        modelDetails: body.modelDetails,
        intendedUse: body.intendedUse,
        limitations: body.limitations,
        trainingData: body.trainingData,
        evaluationMetrics: body.evaluationMetrics,
        ethicalConsiderations: body.ethicalConsiderations,
        citations: body.citations,
        createdBy: actor,
      });

      return res.status(201).json({
        success: true,
        data: { cardId: card.cardId },
        correlationId,
      });
    } catch (e: any) {
      auditLogger.error('copilot.model_card.create.error', e, {
        correlationId,
        action: 'copilot:manage',
      });
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create model card' },
        correlationId,
      });
    }
  }

  @Put('/copilot/model-card/:cardId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('copilot:manage')
  async updateModelCard(@Param('cardId') cardId: string, @Body() body: any, @Headers() headers: Record<string, any>, @Res() res: any) {
    const correlationId = this.getCorrelationId(headers);

    auditLogger.info('copilot.model_card.update.request', {
      correlationId,
      action: 'copilot:manage',
      cardId,
    });

    const card = await this.copilotService.updateModelCard(cardId, {
      modelDetails: body.modelDetails,
      intendedUse: body.intendedUse,
      limitations: body.limitations,
      trainingData: body.trainingData,
      evaluationMetrics: body.evaluationMetrics,
      ethicalConsiderations: body.ethicalConsiderations,
      citations: body.citations,
    });

    if (!card) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Model card not found' },
        correlationId,
      });
    }

    return res.status(200).json({
      success: true,
      data: { cardId: card.cardId },
      correlationId,
    });
  }

  @Get('/copilot/model-card/:cardId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('copilot:view')
  async getModelCard(@Param('cardId') cardId: string, @Headers() headers: Record<string, any>, @Req() req: any, @Res() res: any) {
    const correlationId = this.getCorrelationId(headers);

    const card = await this.copilotService.getModelCard(cardId);
    if (!card) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Model card not found' },
        correlationId,
      });
    }

    return res.status(200).json({
      success: true,
      data: card,
      correlationId,
    });
  }

  @Get('/copilot/models/:modelId/model-card')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('copilot:view')
  async getModelCardByVersion(@Param('modelId') modelId: string, @Query('version') version: string, @Headers() headers: Record<string, any>, @Res() res: any) {
    const correlationId = this.getCorrelationId(headers);

    const card = await this.copilotService.getModelCardByVersion(modelId, version);
    if (!card) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Model card not found' },
        correlationId,
      });
    }

    return res.status(200).json({
      success: true,
      data: card,
      correlationId,
    });
  }

  @Get('/copilot/models/:modelId/model-cards')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('copilot:view')
  async listModelCardsForModel(@Param('modelId') modelId: string, @Headers() headers: Record<string, any>, @Req() req: any, @Res() res: any) {
    const correlationId = this.getCorrelationId(headers);

    const cards = await this.copilotService.listModelCardsForModel(modelId);

    return res.status(200).json({
      success: true,
      data: cards,
      correlationId,
    });
  }

  // Model Validation Report endpoints
  @Post('/copilot/models/:modelId/validation-report')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('copilot:manage')
  async createValidationReport(@Param('modelId') modelId: string, @Body() body: any, @Headers() headers: Record<string, any>, @Req() req: any, @Res() res: any) {
    const correlationId = this.getCorrelationId(headers);
    const actor = req?.user?.userId as string | undefined;

    auditLogger.info('copilot.validation_report.create.request', {
      correlationId,
      actor,
      action: 'copilot:manage',
      modelId,
      version: body?.version,
      validationType: body?.validationType,
    });

    try {
      const report = await this.copilotService.createValidationReport({
        modelId,
        version: body.version,
        validationType: body.validationType,
        testResults: body.testResults,
        performanceMetrics: body.performanceMetrics,
        dataQualityMetrics: body.dataQualityMetrics,
        biasFairnessMetrics: body.biasFairnessMetrics,
        complianceCheck: body.complianceCheck,
        recommendations: body.recommendations,
        createdBy: actor,
      });

      return res.status(201).json({
        success: true,
        data: { reportId: report.reportId },
        correlationId,
      });
    } catch (e: any) {
      auditLogger.error('copilot.validation_report.create.error', e, {
        correlationId,
        action: 'copilot:manage',
      });
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create validation report' },
        correlationId,
      });
    }
  }

  @Put('/copilot/validation-report/:reportId/status')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('copilot:manage')
  async updateValidationStatus(@Param('reportId') reportId: string, @Body() body: any, @Headers() headers: Record<string, any>, @Req() req: any, @Res() res: any) {
    const correlationId = this.getCorrelationId(headers);
    const actor = req?.user?.userId as string | undefined;

    auditLogger.info('copilot.validation_report.update_status.request', {
      correlationId,
      actor,
      action: 'copilot:manage',
      reportId,
      status: body?.status,
    });

    const report = await this.copilotService.updateValidationStatus(
      reportId,
      body.status,
      actor || 'unknown',
      body.testResults,
      body.performanceMetrics,
    );

    if (!report) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Validation report not found' },
        correlationId,
      });
    }

    return res.status(200).json({
      success: true,
      data: { reportId: report.reportId, status: report.status },
      correlationId,
    });
  }

  @Get('/copilot/validation-report/:reportId')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('copilot:view')
  async getValidationReport(@Param('reportId') reportId: string, @Headers() headers: Record<string, any>, @Req() req: any, @Res() res: any) {
    const correlationId = this.getCorrelationId(headers);

    const report = await this.copilotService.getValidationReport(reportId);
    if (!report) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Validation report not found' },
        correlationId,
      });
    }

    return res.status(200).json({
      success: true,
      data: report,
      correlationId,
    });
  }

  @Get('/copilot/models/:modelId/validation-reports')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('copilot:view')
  async listValidationReportsForModel(@Param('modelId') modelId: string, @Headers() headers: Record<string, any>, @Req() req: any, @Res() res: any) {
    const correlationId = this.getCorrelationId(headers);

    const reports = await this.copilotService.listValidationReportsForModel(modelId);

    return res.status(200).json({
      success: true,
      data: reports,
      correlationId,
    });
  }

  // Underwriter Assistant endpoint
  @Post('/copilot/underwriting/assist')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('copilot:qa')
  async assistUnderwriting(@Body() body: any, @Headers() headers: Record<string, any>, @Req() req: any, @Res() res: any) {
    const correlationId = this.getCorrelationId(headers);
    const actor = req?.user?.userId as string | undefined;

    auditLogger.info('copilot.underwriting.assist.request', {
      correlationId,
      actor,
      action: 'copilot:qa',
      policyId: body?.policyId,
      customerId: body?.customerId,
    });

    try {
      const result = await this.copilotService.assistUnderwriting({
        policyId: body.policyId,
        customerId: body.customerId,
        productType: body.productType,
        coverageAmount: body.coverageAmount,
        riskFactors: body.riskFactors,
        headers,
        correlationId,
        tenantId: req?.user?.tenantId as string | undefined,
        actorUserId: actor,
        provider: body.provider,
      });

      return res.status(200).json({
        success: true,
        data: result,
        correlationId,
      });
    } catch (e: any) {
      auditLogger.error('copilot.underwriting.assist.error', e, {
        correlationId,
        action: 'copilot:qa',
      });
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to assist underwriting' },
        correlationId,
      });
    }
  }

  // Complaint Triage endpoint
  @Post('/copilot/complaints/triage')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('copilot:qa')
  async triageComplaint(@Body() body: any, @Headers() headers: Record<string, any>, @Req() req: any, @Res() res: any) {
    const correlationId = this.getCorrelationId(headers);
    const actor = req?.user?.userId as string | undefined;

    auditLogger.info('copilot.complaint.triage.request', {
      correlationId,
      actor,
      action: 'copilot:qa',
      complaintId: body?.complaintId,
      customerId: body?.customerId,
    });

    try {
      const result = await this.copilotService.triageComplaint({
        complaintId: body.complaintId,
        customerId: body.customerId,
        description: body.description,
        category: body.category,
        severity: body.severity,
        headers,
        correlationId,
        tenantId: req?.user?.tenantId as string | undefined,
        actorUserId: actor,
        provider: body.provider,
      });

      return res.status(200).json({
        success: true,
        data: result,
        correlationId,
      });
    } catch (e: any) {
      auditLogger.error('copilot.complaint.triage.error', e, {
        correlationId,
        action: 'copilot:qa',
      });
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to triage complaint' },
        correlationId,
      });
    }
  }

  // Recovery Discovery endpoint
  @Post('/copilot/recovery/discover')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('copilot:qa')
  async discoverRecovery(@Body() body: any, @Headers() headers: Record<string, any>, @Req() req: any, @Res() res: any) {
    const correlationId = this.getCorrelationId(headers);
    const actor = req?.user?.userId as string | undefined;

    auditLogger.info('copilot.recovery.discover.request', {
      correlationId,
      actor,
      action: 'copilot:qa',
      claimId: body?.claimId,
      policyId: body?.policyId,
    });

    try {
      const result = await this.copilotService.discoverRecovery({
        claimId: body.claimId,
        customerId: body.customerId,
        policyId: body.policyId,
        lossAmount: body.lossAmount,
        coverageType: body.coverageType,
        headers,
        correlationId,
        tenantId: req?.user?.tenantId as string | undefined,
        actorUserId: actor,
        provider: body.provider,
      });

      return res.status(200).json({
        success: true,
        data: result,
        correlationId,
      });
    } catch (e: any) {
      auditLogger.error('copilot.recovery.discover.error', e, {
        correlationId,
        action: 'copilot:qa',
      });
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to discover recovery' },
        correlationId,
      });
    }
  }

  // Pricing Support endpoint
  @Post('/copilot/pricing/assist')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('copilot:qa')
  async assistPricing(@Body() body: any, @Headers() headers: Record<string, any>, @Req() req: any, @Res() res: any) {
    const correlationId = this.getCorrelationId(headers);
    const actor = req?.user?.userId as string | undefined;

    auditLogger.info('copilot.pricing.assist.request', {
      correlationId,
      actor,
      action: 'copilot:qa',
      customerId: body?.customerId,
      productType: body?.productType,
    });

    try {
      const result = await this.copilotService.assistPricing({
        customerId: body.customerId,
        productType: body.productType,
        coverageAmount: body.coverageAmount,
        riskProfile: body.riskProfile,
        marketData: body.marketData,
        headers,
        correlationId,
        tenantId: req?.user?.tenantId as string | undefined,
        actorUserId: actor,
        provider: body.provider,
      });

      return res.status(200).json({
        success: true,
        data: result,
        correlationId,
      });
    } catch (e: any) {
      auditLogger.error('copilot.pricing.assist.error', e, {
        correlationId,
        action: 'copilot:qa',
      });
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to assist pricing' },
        correlationId,
      });
    }
  }

  // Self-service Assistant endpoint
  @Post('/copilot/selfservice/assist')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('copilot:view')
  async assistSelfService(@Body() body: any, @Headers() headers: Record<string, any>, @Req() req: any, @Res() res: any) {
    const correlationId = this.getCorrelationId(headers);
    const actor = req?.user?.userId as string | undefined;

    auditLogger.info('copilot.selfservice.assist.request', {
      correlationId,
      actor,
      action: 'copilot:view',
      customerId: body?.customerId,
      query: body?.query,
    });

    try {
      const result = await this.copilotService.assistSelfService({
        customerId: body.customerId,
        query: body.query,
        intent: body.intent,
        context: body.context,
        headers,
        correlationId,
        tenantId: req?.user?.tenantId as string | undefined,
        actorUserId: actor,
        provider: body.provider,
      });

      return res.status(200).json({
        success: true,
        data: result,
        correlationId,
      });
    } catch (e: any) {
      auditLogger.error('copilot.selfservice.assist.error', e, {
        correlationId,
        action: 'copilot:view',
      });
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to assist self-service' },
        correlationId,
      });
    }
  }

  @Post('/copilot/ecosystem/consult')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('copilot:qa')
  async ecosystemConsult(
    @Body() body: { query: string; context?: string; contextType?: string },
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Res() res: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user?.userId as string | undefined;

    if (!body.query) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'query is required' },
        correlationId,
      });
    }

    try {
      const result = await this.copilotService.ecosystemConsult({
        query: body.query,
        context: body.context,
        contextType: body.contextType as any,
        correlationId,
        tenantId,
        actorUserId: actor,
        headers,
      });
      return res.status(result.status).json(result.body);
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: { code: 'ECOSYSTEM_AI_ERROR', message: error.message },
        correlationId,
      });
    }
  }

  // Next Best Action (NBA) engine endpoints
  @Post('/copilot/nba/:contextType/:resourceId/actions')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('copilot:next-best-action')
  async generateNbaActions(
    @Param('contextType') contextType: string,
    @Param('resourceId') resourceId: string,
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Res() res: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user?.userId as string | undefined;

    auditLogger.info('copilot.nba.generate.request', {
      correlationId,
      tenantId,
      actor,
      action: 'copilot:next-best-action',
      contextType,
      resourceId,
    });

    if (!['claim', 'policy', 'complaint'].includes(contextType)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Unsupported contextType' },
        correlationId,
      });
    }

    const result = await this.copilotService.getNextBestAction({
      contextType: contextType as any,
      resourceId,
      headers,
      correlationId,
      tenantId,
      actorUserId: actor,
    });
    return res.status(result.status).json(result.body);
  }

  @Post('/copilot/nba/:logId/execute')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('copilot:next-best-action')
  async executeNbaAction(
    @Param('logId') logId: string,
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Res() res: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const actor = req?.user?.userId as string | undefined;

    auditLogger.info('copilot.nba.execute.request', {
      correlationId,
      actor,
      action: 'copilot:next-best-action',
      logId,
    });

    const result = await this.copilotService.executeNbaAction(logId, actor);
    return res.status(result.status).json({ ...result.body, correlationId });
  }

  @Post('/copilot/nba/:logId/opt-out')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('copilot:next-best-action')
  async optOutNbaAction(
    @Param('logId') logId: string,
    @Body() body: { reason?: string },
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Res() res: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const actor = req?.user?.userId as string | undefined;

    auditLogger.info('copilot.nba.opt_out.request', {
      correlationId,
      actor,
      action: 'copilot:next-best-action',
      logId,
      reason: body?.reason,
    });

    const result = await this.copilotService.optOutNbaAction(logId, body?.reason);
    return res.status(result.status).json({ ...result.body, correlationId });
  }

  @Get('/copilot/nba/actions')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('copilot:view')
  async listNbaActions(
    @Query('contextType') contextType: string,
    @Query('resourceId') resourceId: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Res() res: any,
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user?.userId as string | undefined;

    const result = await this.copilotService.listNbaActionLogs({
      contextType,
      resourceId,
      tenantId,
      actorUserId: actor,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });

    return res.status(200).json({
      success: true,
      data: result.rows,
      pagination: { total: result.total, limit: parseInt(limit, 10), offset: parseInt(offset, 10) },
      correlationId,
    });
  }

  // Recommend Product endpoint
  @Post('/copilot/recommend-product')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('copilot:qa')
  async recommendProduct(@Body() body: any, @Headers() headers: Record<string, any>, @Req() req: any, @Res() res: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user?.userId as string | undefined;

    auditLogger.info('copilot.recommend-product.request', {
      correlationId,
      tenantId,
      actor,
      action: 'copilot:qa',
      customerId: body?.customerId,
      productType: body?.productType,
    });

    try {
      const result = await this.ragService.recommendProduct({
        customerId: body?.customerId,
        customerProfile: body?.customerProfile,
        productType: body?.productType,
        budget: body?.budget,
        riskFactors: body?.riskFactors,
        tenantId,
        actorUserId: actor,
        correlationId,
        headers,
      });

      return res.status(200).json({
        success: true,
        data: result,
        correlationId,
      });
    } catch (e: any) {
      auditLogger.error('copilot.recommend-product.error', e, { correlationId });
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to recommend product' },
        correlationId,
      });
    }
  }

  // Draft Communication endpoint
  @Post('/copilot/draft-communication')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @RequirePermissions('copilot:qa')
  async draftCommunication(@Body() body: any, @Headers() headers: Record<string, any>, @Req() req: any, @Res() res: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user?.userId as string | undefined;

    auditLogger.info('copilot.draft-communication.request', {
      correlationId,
      tenantId,
      actor,
      action: 'copilot:qa',
      type: body?.type,
      contextType: body?.contextType,
    });

    try {
      const result = await this.ragService.draftCommunication({
        type: body?.type || 'email',
        recipient: body?.recipient,
        subject: body?.subject,
        context: body?.context,
        contextType: body?.contextType,
        tone: body?.tone,
        language: body?.language,
        tenantId,
        actorUserId: actor,
        correlationId,
        headers,
      });

      return res.status(200).json({
        success: true,
        data: result,
        correlationId,
      });
    } catch (e: any) {
      auditLogger.error('copilot.draft-communication.error', e, { correlationId });
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to draft communication' },
        correlationId,
      });
    }
  }
}
