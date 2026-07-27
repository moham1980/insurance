import { Controller, Post, Body, Get, Param, Put, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ModelInventory, ModelType, ModelStatus, ModelRiskLevel } from '../entities/ModelInventory';
import { ModelLifecycleService } from '../services/model-lifecycle.service';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { OutboxPublisher } from '@insurance/shared';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { PermissionsGuard } from '../permissions.guard';
import { AbacGuard } from '../abac.guard';
import { TenantGuard } from '../tenant.guard';
import { RequirePermissions } from '../permissions.decorator';

export interface CreateModelDto {
  modelName: string;
  modelType: ModelType;
  version: string;
  provider?: string;
  description?: string;
  parameters?: object;
  trainingDataSummary?: string;
  performanceMetrics?: object;
  tags?: string;
  metadata?: object;
}

export interface UpdateModelDto {
  description?: string;
  parameters?: object;
  performanceMetrics?: object;
  tags?: string;
  metadata?: object;
  riskLevel?: ModelRiskLevel;
}

@ApiTags('Model Intake')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
@Controller('models')
export class ModelIntakeController {
  constructor(
    private readonly modelLifecycleService: ModelLifecycleService,
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(ModelInventory)
    private readonly modelRepository: Repository<ModelInventory>,
) {}

  @Post()
  @ApiOperation({ summary: 'Register a new AI model' })
  @ApiResponse({ status: 201, description: 'Model registered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiBearerAuth()
  @RequirePermissions('ai:model:register')
  async registerModel(@Body() createModelDto: CreateModelDto, @Req() req: any): Promise<ModelInventory> {
    const model = this.modelRepository.create({
      modelName: createModelDto.modelName,
      modelType: createModelDto.modelType,
      version: createModelDto.version,
      provider: createModelDto.provider || null,
      status: 'development',
      description: createModelDto.description || null,
      parameters: createModelDto.parameters || null,
      riskLevel: 'medium',
      trainingDataSummary: createModelDto.trainingDataSummary || null,
      performanceMetrics: createModelDto.performanceMetrics || null,
      deploymentDate: null,
      lastEvaluationDate: null,
      nextEvaluationDate: null,
      tags: createModelDto.tags || null,
      metadata: createModelDto.metadata || null,
      createdBy: req?.user?.userId || req?.user?.sub || 'system',
    });

    const correlationId = uuidv4();

    await this.dataSource.transaction(async (manager) => {
      await manager.save(model);
      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.ai.model.registered',
        eventType: 'AiModelRegistered',
        eventVersion: 1,
        correlationId,
        subject: {
          modelId: model.modelId,
        },
        payload: {
          modelId: model.modelId,
          modelName: model.modelName,
          modelType: model.modelType,
          version: model.version,
          status: model.status,
          riskLevel: model.riskLevel,
          createdBy: model.createdBy,
          registeredAt: new Date().toISOString(),
        },
      });
    });

    return model;
  }

  @Get()
  @ApiOperation({ summary: 'List all registered models' })
  @ApiResponse({ status: 200, description: 'Models retrieved successfully' })
  @ApiBearerAuth()
  @RequirePermissions('ai:model:list')
  async listModels(@Query('limit') limit?: string, @Query('offset') offset?: string): Promise<{ models: ModelInventory[]; total: number }> {
    const lim = Math.min(parseInt(limit || '50', 10) || 50, 200);
    const off = parseInt(offset || '0', 10) || 0;
    const [models, total] = await this.modelRepository.findAndCount({ take: lim, skip: off, order: { createdAt: 'DESC' as any } });
    return {
      models,
      total,
    };
  }

  @Get(':modelId')
  @ApiOperation({ summary: 'Get model details by ID' })
  @ApiResponse({ status: 200, description: 'Model details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Model not found' })
  @ApiBearerAuth()
  @RequirePermissions('ai:model:view')
  async getModel(@Param('modelId') modelId: string): Promise<ModelInventory> {
    const model = await this.modelRepository.findOne({ where: { modelId } });
    if (!model) {
      throw new Error('Model not found');
    }
    return model;
  }

  @Get(':modelId/state')
  @ApiOperation({ summary: 'Get model lifecycle state' })
  @ApiResponse({ status: 200, description: 'Model state retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Model not found' })
  @ApiBearerAuth()
  @RequirePermissions('ai:model:view')
  async getModelState(@Param('modelId') modelId: string) {
    return this.modelLifecycleService.getModelState(modelId);
  }

  @Put(':modelId/transition')
  @ApiOperation({ summary: 'Transition model to new state' })
  @ApiResponse({ status: 200, description: 'Model transitioned successfully' })
  @ApiResponse({ status: 400, description: 'Invalid transition' })
  @ApiBearerAuth()
  @RequirePermissions('ai:model:transition')
  async transitionModel(
    @Param('modelId') modelId: string,
    @Body() body: { targetStatus: ModelStatus },
    @Req() req: any,
  ) {
    return this.modelLifecycleService.transitionModel(
      modelId,
      body.targetStatus,
      req?.user?.userId || req?.user?.sub || 'system',
    );
  }

  @Put(':modelId')
  @ApiOperation({ summary: 'Update model metadata' })
  @ApiResponse({ status: 200, description: 'Model updated successfully' })
  @ApiResponse({ status: 404, description: 'Model not found' })
  @ApiBearerAuth()
  @RequirePermissions('ai:model:update')
  async updateModel(
    @Param('modelId') modelId: string,
    @Body() updateModelDto: UpdateModelDto,
  ): Promise<ModelInventory> {
    const model = await this.modelRepository.findOne({ where: { modelId } });
    if (!model) {
      throw new Error('Model not found');
    }

    if (updateModelDto.description !== undefined) model.description = updateModelDto.description;
    if (updateModelDto.parameters !== undefined) model.parameters = updateModelDto.parameters;
    if (updateModelDto.performanceMetrics !== undefined) model.performanceMetrics = updateModelDto.performanceMetrics;
    if (updateModelDto.tags !== undefined) model.tags = updateModelDto.tags;
    if (updateModelDto.metadata !== undefined) model.metadata = updateModelDto.metadata;
    if (updateModelDto.riskLevel !== undefined) model.riskLevel = updateModelDto.riskLevel;

    return this.modelRepository.save(model);
  }

  @Delete(':modelId')
  @ApiOperation({ summary: 'Delete a model (soft delete)' })
  @ApiResponse({ status: 200, description: 'Model deleted successfully' })
  @ApiResponse({ status: 404, description: 'Model not found' })
  @ApiBearerAuth()
  @RequirePermissions('ai:model:delete')
  async deleteModel(@Param('modelId') modelId: string): Promise<{ message: string }> {
    const model = await this.modelRepository.findOne({ where: { modelId } });
    if (!model) {
      throw new Error('Model not found');
    }

    // Soft delete by setting status to retired
    await this.modelRepository.update(modelId, { status: 'retired' });
    return {
      message: `Model ${modelId} deleted successfully`,
    };
  }

  @Get('status/:status')
  @ApiOperation({ summary: 'Get models by status' })
  @ApiResponse({ status: 200, description: 'Models retrieved successfully' })
  @ApiBearerAuth()
  @RequirePermissions('ai:model:list')
  async getModelsByStatus(@Param('status') status: ModelStatus): Promise<ModelInventory[]> {
    return this.modelLifecycleService.getModelsByStatus(status);
  }

  @Get('evaluation/due')
  @ApiOperation({ summary: 'Get models needing evaluation' })
  @ApiResponse({ status: 200, description: 'Models retrieved successfully' })
  @ApiBearerAuth()
  @RequirePermissions('ai:model:list')
  async getModelsNeedingEvaluation(): Promise<ModelInventory[]> {
    return this.modelLifecycleService.getModelsNeedingEvaluation();
  }

  @Post('retire/deprecated')
  @ApiOperation({ summary: 'Auto-retire deprecated models' })
  @ApiResponse({ status: 200, description: 'Models retired successfully' })
  @ApiBearerAuth()
  @RequirePermissions('ai:model:retire')
  async retireDeprecatedModels(@Body() body: { daysThreshold?: number }): Promise<ModelInventory[]> {
    return this.modelLifecycleService.autoRetireDeprecatedModels(body.daysThreshold || 90);
  }

  @Get('transitions/rules')
  @ApiOperation({ summary: 'Get all transition rules' })
  @ApiResponse({ status: 200, description: 'Transition rules retrieved successfully' })
  @ApiBearerAuth()
  @RequirePermissions('ai:model:view')
  async getTransitionRules() {
    return this.modelLifecycleService.getTransitionRules();
  }
}
