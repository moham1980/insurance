import { Body, Controller, Get, Headers, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { FraudService } from './fraud.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermissions } from './permissions.decorator';
import { TenantGuard } from './tenant.guard';
import { auditLogger } from './audit.logger';

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
export class FraudController {
  constructor(private readonly fraudService: FraudService) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getTenantId(req: any): string | undefined {
    // TenantGuard sets req.tenantId from header or JWT
    return (req?.tenantId || req?.user?.tenantId) as string | undefined;
  }

  @Post('/fraud/compute-score')
  @RequirePermissions('fraud:triage')
  async computeScore(@Headers() headers: Record<string, any>, @Req() req: any, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = this.getTenantId(req);
    const actor = req?.user?.userId as string | undefined;
    auditLogger.info('fraud.compute_score.request', { correlationId, tenantId, actor, action: 'fraud:triage' });

    if (!body?.claimId || !body?.claimNumber || !body?.lossType) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'claimId, claimNumber, lossType are required' },
        correlationId,
      };
    }

    const { score, signals, holdClaim, threshold } = await this.fraudService.computeScore({
      correlationId,
      tenantId,
      actorUserId: actor,
      claimId: body.claimId,
      claimNumber: body.claimNumber,
      lossType: body.lossType,
      policyId: body.policyId,
    });

    return {
      success: true,
      data: { claimId: body.claimId, score, signals, holdClaim, threshold },
      correlationId,
    };
  }

  @Post('/fraud/cases/:claimId/open')
  @RequirePermissions('fraud:triage')
  async openCase(@Headers() headers: Record<string, any>, @Req() req: any, @Param('claimId') claimId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = this.getTenantId(req);
    const actor = req?.user?.userId as string | undefined;
    auditLogger.info('fraud.case_open.request', { correlationId, tenantId, actor, action: 'fraud:triage', claimId });

    const fraudCase = await this.fraudService.openCase({
      correlationId,
      tenantId,
      claimId,
      claimNumber: body?.claimNumber,
      claimantId: body?.claimantId,
      lossType: body?.lossType,
      claimAmount: typeof body?.claimAmount === 'number' ? body.claimAmount : undefined,
      policyId: body?.policyId,
      partyId: body?.partyId,
      score: body?.score,
      signals: body?.signals,
      notes: body?.notes,
      assignedTo: body?.assignedTo,
    });

    return {
      success: true,
      data: {
        fraudCaseId: fraudCase.fraudCaseId,
        claimId: fraudCase.claimId,
        status: fraudCase.status,
        holdClaim: fraudCase.holdClaim,
      },
      correlationId,
    };
  }

  @Post('/fraud/cases/:fraudCaseId/escalate')
  @RequirePermissions('fraud:escalate')
  async escalateCase(@Headers() headers: Record<string, any>, @Req() req: any, @Param('fraudCaseId') fraudCaseId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = this.getTenantId(req);
    const actor = req?.user?.userId as string | undefined;
    auditLogger.info('fraud.case_escalate.request', { correlationId, tenantId, actor, action: 'fraud:escalate', fraudCaseId });

    if (!body?.toUnit || !['siu', 'legal'].includes(body.toUnit)) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'toUnit must be siu or legal' },
        correlationId,
      };
    }

    const fraudCase = await this.fraudService.escalateCase({
      correlationId,
      tenantId,
      fraudCaseId,
      toUnit: body.toUnit,
      reasonCodes: body?.reasonCodes,
      notes: body?.notes,
      requiresHumanApproval: body?.requiresHumanApproval,
    });

    if (!fraudCase) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: `Fraud case ${fraudCaseId} not found` },
        correlationId,
      };
    }

    return {
      success: true,
      data: {
        fraudCaseId: fraudCase.fraudCaseId,
        status: fraudCase.status,
        holdClaim: fraudCase.holdClaim,
      },
      correlationId,
    };
  }

  @Post('/fraud/cases/:fraudCaseId/close')
  @RequirePermissions('fraud:investigate')
  async closeCase(@Headers() headers: Record<string, any>, @Req() req: any, @Param('fraudCaseId') fraudCaseId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = this.getTenantId(req);
    const actor = req?.user?.userId as string | undefined;
    auditLogger.info('fraud.case_close.request', { correlationId, tenantId, actor, action: 'fraud:investigate', fraudCaseId });

    if (!body?.resolution || !['confirmed', 'cleared'].includes(body.resolution)) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'resolution must be confirmed or cleared' },
        correlationId,
      };
    }

    const fraudCase = await this.fraudService.closeCase({
      correlationId,
      tenantId,
      fraudCaseId,
      resolution: body.resolution,
      notes: body.notes,
    });

    if (!fraudCase) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: `Fraud case ${fraudCaseId} not found` },
        correlationId,
      };
    }

    return {
      success: true,
      data: {
        fraudCaseId: fraudCase.fraudCaseId,
        status: fraudCase.status,
        holdClaim: fraudCase.holdClaim,
      },
      correlationId,
    };
  }

  @Get('/fraud/cases')
  @RequirePermissions('fraud:cases:list')
  async listCases(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Query('status') status?: string,
    @Query('claimId') claimId?: string,
    @Query('limit') limit: string = '20',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = this.getTenantId(req);
    const actor = req?.user?.userId as string | undefined;
    auditLogger.info('fraud.cases.list.request', { correlationId, tenantId, actor, action: 'fraud:cases:list' });

    const lim = Math.min(parseInt(limit, 10) || 20, 200);
    const off = parseInt(offset, 10);

    const { rows, total } = await this.fraudService.listCases({
      tenantId,
      status,
      claimId,
      limit: lim,
      offset: Number.isFinite(off) ? off : 0,
    });

    return {
      success: true,
      data: rows,
      pagination: {
        total,
        limit: lim,
        offset: Number.isFinite(off) ? off : 0,
      },
      correlationId,
    };
  }

  // ML model lifecycle

  @Post('/fraud/ml/train')
  @RequirePermissions('fraud:ml:train')
  async trainMLModel(@Headers() headers: Record<string, any>, @Req() req: any, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = this.getTenantId(req);
    const actor = req?.user?.userId as string | undefined;
    auditLogger.info('fraud.ml.train.request', { correlationId, tenantId, actor, action: 'fraud:ml:train' });

    if (!body?.modelName || !body?.modelVersion || !body?.modelType || !body?.modelConfig || !Array.isArray(body?.trainingData)) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'modelName, modelVersion, modelType, modelConfig, trainingData are required' },
        correlationId,
      };
    }

    const model = await this.fraudService.trainMLModel({
      tenantId,
      modelName: body.modelName,
      modelVersion: body.modelVersion,
      modelType: body.modelType,
      description: body.description,
      modelConfig: body.modelConfig,
      trainingData: body.trainingData,
      trainedBy: actor || 'unknown',
    });

    return {
      success: true,
      data: { modelId: model.id, status: model.status },
      correlationId,
    };
  }

  @Post('/fraud/ml/models/:modelId/deploy')
  @RequirePermissions('fraud:ml:deploy')
  async deployMLModel(@Headers() headers: Record<string, any>, @Req() req: any, @Param('modelId') modelId: string) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = this.getTenantId(req);
    const actor = req?.user?.userId as string | undefined;
    auditLogger.info('fraud.ml.deploy.request', { correlationId, tenantId, actor, action: 'fraud:ml:deploy', modelId });

    const model = await this.fraudService.deployMLModel(modelId, tenantId);
    return {
      success: true,
      data: { modelId: model.id, status: model.status, isDefault: model.isDefault },
      correlationId,
    };
  }

  @Post('/fraud/ml/predict')
  @RequirePermissions('fraud:ml:predict')
  async predictWithML(@Headers() headers: Record<string, any>, @Req() req: any, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = this.getTenantId(req);
    const actor = req?.user?.userId as string | undefined;
    auditLogger.info('fraud.ml.predict.request', { correlationId, tenantId, actor, action: 'fraud:ml:predict' });

    if (!body?.claimId || !body?.claimNumber || !body?.lossType || !body?.features) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'claimId, claimNumber, lossType, features are required' },
        correlationId,
      };
    }

    const prediction = await this.fraudService.predictWithML({
      claimId: body.claimId,
      claimNumber: body.claimNumber,
      lossType: body.lossType,
      policyId: body.policyId,
      features: body.features,
      tenantId,
    });

    return { success: true, data: prediction, correlationId };
  }

  @Get('/fraud/ml/models')
  @RequirePermissions('fraud:ml:view')
  async listMLModels(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Query('status') status?: string,
    @Query('modelType') modelType?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = this.getTenantId(req);
    const actor = req?.user?.userId as string | undefined;
    auditLogger.info('fraud.ml.models.list.request', { correlationId, tenantId, actor, action: 'fraud:ml:view' });

    const lim = Math.min(parseInt(limit, 10) || 50, 200);
    const off = parseInt(offset, 10);

    const { items, total } = await this.fraudService.listMLModels({
      tenantId,
      status: status as any,
      modelType: modelType as any,
      limit: lim,
      offset: Number.isFinite(off) ? off : 0,
    });

    return {
      success: true,
      data: items,
      pagination: { total, limit: lim, offset: Number.isFinite(off) ? off : 0 },
      correlationId,
    };
  }

  // Graph / network analytics

  @Post('/fraud/graph/entities')
  @RequirePermissions('fraud:graph:create')
  async createGraphEntity(@Headers() headers: Record<string, any>, @Req() req: any, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = this.getTenantId(req);
    const actor = req?.user?.userId as string | undefined;
    auditLogger.info('fraud.graph.entity.create.request', { correlationId, tenantId, actor, action: 'fraud:graph:create' });

    if (!body?.entityType || !body?.entityId || !body?.entityName) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'entityType, entityId, entityName are required' },
        correlationId,
      };
    }

    const entity = await this.fraudService.createGraphEntity({
      tenantId,
      entityType: body.entityType,
      entityId: body.entityId,
      entityName: body.entityName,
      description: body.description,
      attributes: body.attributes,
    });

    return { success: true, data: entity, correlationId };
  }

  @Post('/fraud/graph/relationships')
  @RequirePermissions('fraud:graph:create')
  async createGraphRelationship(@Headers() headers: Record<string, any>, @Req() req: any, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = this.getTenantId(req);
    const actor = req?.user?.userId as string | undefined;
    auditLogger.info('fraud.graph.relationship.create.request', { correlationId, tenantId, actor, action: 'fraud:graph:create' });

    if (!body?.sourceEntityId || !body?.targetEntityId || !body?.relationshipType) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'sourceEntityId, targetEntityId, relationshipType are required' },
        correlationId,
      };
    }

    const relationship = await this.fraudService.createGraphRelationship({
      tenantId,
      sourceEntityId: body.sourceEntityId,
      targetEntityId: body.targetEntityId,
      relationshipType: body.relationshipType,
      description: body.description,
      weight: body.weight,
      attributes: body.attributes,
    });

    return { success: true, data: relationship, correlationId };
  }

  @Get('/fraud/graph/suspicious-networks')
  @RequirePermissions('fraud:graph:view')
  async detectSuspiciousNetworks(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Query('minConnectionCount') minConnectionCount?: string,
    @Query('minFraudCaseCount') minFraudCaseCount?: string
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = this.getTenantId(req);
    const actor = req?.user?.userId as string | undefined;
    auditLogger.info('fraud.graph.suspicious_networks.request', { correlationId, tenantId, actor, action: 'fraud:graph:view' });

    const result = await this.fraudService.detectSuspiciousNetworks({
      tenantId,
      minConnectionCount: minConnectionCount ? parseInt(minConnectionCount, 10) : undefined,
      minFraudCaseCount: minFraudCaseCount ? parseInt(minFraudCaseCount, 10) : undefined,
    });

    return { success: true, data: result, correlationId };
  }

  // Irregularity alerts

  @Post('/fraud/alerts/detect')
  @RequirePermissions('fraud:alert:create')
  async detectIrregularities(@Headers() headers: Record<string, any>, @Req() req: any, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = this.getTenantId(req);
    const actor = req?.user?.userId as string | undefined;
    auditLogger.info('fraud.alerts.detect.request', { correlationId, tenantId, actor, action: 'fraud:alert:create' });

    if (!body?.claimId || !body?.claimData) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'claimId and claimData are required' },
        correlationId,
      };
    }

    const alerts = await this.fraudService.detectIrregularities({
      tenantId,
      claimId: body.claimId,
      claimData: body.claimData,
    });

    return { success: true, data: alerts, correlationId };
  }

  @Get('/fraud/alerts')
  @RequirePermissions('fraud:alert:view')
  async listIrregularityAlerts(
    @Headers() headers: Record<string, any>,
    @Req() req: any,
    @Query('claimId') claimId?: string,
    @Query('patternType') patternType?: string,
    @Query('severity') severity?: string,
    @Query('status') status?: string,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = this.getTenantId(req);
    const actor = req?.user?.userId as string | undefined;
    auditLogger.info('fraud.alerts.list.request', { correlationId, tenantId, actor, action: 'fraud:alert:view' });

    const lim = Math.min(parseInt(limit, 10) || 50, 200);
    const off = parseInt(offset, 10);

    const { items, total } = await this.fraudService.listIrregularityAlerts({
      tenantId,
      claimId,
      patternType: patternType as any,
      severity: severity as any,
      status: status as any,
      limit: lim,
      offset: Number.isFinite(off) ? off : 0,
    });

    return {
      success: true,
      data: items,
      pagination: { total, limit: lim, offset: Number.isFinite(off) ? off : 0 },
      correlationId,
    };
  }

  @Put('/fraud/alerts/:alertId')
  @RequirePermissions('fraud:alert:update')
  async updateIrregularityAlert(@Headers() headers: Record<string, any>, @Req() req: any, @Param('alertId') alertId: string, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = this.getTenantId(req);
    const actor = req?.user?.userId as string | undefined;
    auditLogger.info('fraud.alerts.update.request', { correlationId, tenantId, actor, action: 'fraud:alert:update', alertId });

    const alert = await this.fraudService.updateIrregularityAlert(alertId, {
      status: body?.status,
      assignedTo: body?.assignedTo || actor,
      notes: body?.notes,
      resolutionNotes: body?.resolutionNotes,
    });

    return { success: true, data: alert, correlationId };
  }
}
