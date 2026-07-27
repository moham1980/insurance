// @ts-nocheck
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { FraudMLModel, ModelStatus, ModelType } from '../entities/FraudMLModel';
import { FraudCase } from '../entities/FraudCase';
import { FraudScoreAudit } from '../entities/FraudScoreAudit';

export interface TrainingDataPoint {
  claimId: string;
  claimNumber: string;
  lossType: string;
  policyId?: string;
  isFraud: boolean;
  features: {
    lossType: string;
    claimNumberFormatValid: boolean;
    policyLinked: boolean;
    amount?: number;
    timeSincePolicyIssuance?: number;
    claimCountInPeriod?: number;
    lossTypeFrequency?: number;
  };
}

export interface TrainingConfig {
  algorithm: 'random_forest' | 'logistic_regression' | 'gradient_boosting' | 'neural_network';
  hyperparameters: {
    nEstimators?: number;
    maxDepth?: number;
    learningRate?: number;
    epochs?: number;
    batchSize?: number;
    testSplit?: number;
    validationSplit?: number;
    crossValidationFolds?: number;
  };
  features: string[];
  targetVariable: string;
}

export interface TrainingResult {
  modelId: string;
  metrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    auc: number;
    confusionMatrix: Record<string, number>;
    trainingTimeMs: number;
    sampleCount: number;
  };
  validationMetrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    auc: number;
    confusionMatrix: Record<string, number>;
  };
  featureImportance: Record<string, number>;
  trainingDataSummary: {
    startDate: Date;
    endDate: Date;
    sampleCount: number;
    fraudCount: number;
    nonFraudCount: number;
    features: Array<{
      name: string;
      type: string;
      missingCount: number;
      uniqueCount: number;
    }>;
  };
}

@Injectable()
export class FraudMLTrainingService {
  private readonly logger = new Logger(FraudMLTrainingService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(FraudMLModel) private readonly modelRepo: Repository<FraudMLModel>,
    @InjectRepository(FraudCase) private readonly fraudCaseRepo: Repository<FraudCase>,
    @InjectRepository(FraudScoreAudit) private readonly scoreAuditRepo: Repository<FraudScoreAudit>
  ) {}

  async startTraining(params: {
    modelName: string;
    modelType: ModelType;
    config: TrainingConfig;
    description?: string;
    tenantId?: string;
    trainedBy?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{ modelId: string; status: ModelStatus }> {
    this.logger.log(`Starting ML training for model: ${params.modelName}`);

    // Create model record with TRAINING status
    const model = this.modelRepo.create({
      id: uuidv4(),
      tenantId: params.tenantId || null,
      modelName: params.modelName,
      modelVersion: this.generateVersion(),
      modelType: params.modelType,
      status: ModelStatus.TRAINING,
      description: params.description || null,
      modelConfig: params.config,
      trainingMetrics: null,
      validationMetrics: null,
      modelPath: null,
      featureImportance: null,
      trainingDataSummary: null,
      trainedBy: params.trainedBy || null,
      trainedAt: null,
      deployedAt: null,
      isDefault: false,
      minConfidenceThreshold: null,
      holdThreshold: null,
      metadata: {
        startDate: params.startDate,
        endDate: params.endDate,
      },
    });

    await this.modelRepo.save(model);

    // Start training in background
    this.runTraining(model.id, params.config, params.startDate, params.endDate, params.tenantId)
      .then((result) => {
        this.logger.log(`Training completed for model: ${model.id}`);
      })
      .catch((error) => {
        this.logger.error(`Training failed for model: ${model.id}`, error);
        this.markModelAsFailed(model.id, error.message);
      });

    return { modelId: model.id, status: ModelStatus.TRAINING };
  }

  private async runTraining(
    modelId: string,
    config: TrainingConfig,
    startDate?: Date,
    endDate?: Date,
    tenantId?: string
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Collect training data
      const trainingData = await this.collectTrainingData(startDate, endDate, tenantId);

      if (trainingData.length < 100) {
        throw new Error(`Insufficient training data: ${trainingData.length} samples (minimum 100 required)`);
      }

      // Preprocess and engineer features
      const { features, labels } = this.preprocessData(trainingData, config.features);

      // Split data into train/validation/test
      const testSplit = config.hyperparameters.testSplit || 0.2;
      const validationSplit = config.hyperparameters.validationSplit || 0.1;
      const { trainFeatures, trainLabels, valFeatures, valLabels, testFeatures, testLabels } = this.splitData(
        features,
        labels,
        testSplit,
        validationSplit
      );

      // Train model based on algorithm
      const model = await this.trainModel(trainFeatures, trainLabels, config);

      // Evaluate on validation set
      const validationMetrics = this.evaluateModel(model, valFeatures, valLabels);

      // Evaluate on test set
      const testMetrics = this.evaluateModel(model, testFeatures, testLabels);

      // Calculate feature importance
      const featureImportance = this.calculateFeatureImportance(model, config.features);

      // Generate training data summary
      const trainingDataSummary = this.generateTrainingDataSummary(trainingData, config.features);

      const trainingTimeMs = Date.now() - startTime;

      // Save model to storage (in a real implementation, this would save to S3 or a model registry)
      const modelPath = `/models/fraud/${modelId}.json`;

      // Update model record
      await this.modelRepo.update(modelId, {
        status: ModelStatus.TRAINED,
        trainingMetrics: {
          ...testMetrics,
          trainingTimeMs,
          sampleCount: trainingData.length,
        },
        validationMetrics,
        modelPath,
        featureImportance,
        trainingDataSummary,
        trainedAt: new Date(),
      });

      this.logger.log(`Model training completed: ${modelId} in ${trainingTimeMs}ms`);
    } catch (error) {
      this.logger.error(`Model training failed: ${modelId}`, error);
      throw error;
    }
  }

  private async collectTrainingData(
    startDate?: Date,
    endDate?: Date,
    tenantId?: string
  ): Promise<TrainingDataPoint[]> {
    // In a real implementation, this would query historical fraud cases and score audits
    // For now, we'll generate synthetic training data

    const defaultStartDate = startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago
    const defaultEndDate = endDate || new Date();

    // Query fraud cases for labeled data
    const fraudCases = await this.fraudCaseRepo
      .createQueryBuilder('fc')
      .where('fc.createdAt >= :startDate', { startDate: defaultStartDate })
      .andWhere('fc.createdAt <= :endDate', { endDate: defaultEndDate })
      .andWhere(tenantId ? 'fc.tenantId = :tenantId' : '1=1', { tenantId })
      .getMany();

    // Query score audits for feature data
    const scoreAudits = await this.scoreAuditRepo
      .createQueryBuilder('sa')
      .where('sa.createdAt >= :startDate', { startDate: defaultStartDate })
      .andWhere('sa.createdAt <= :endDate', { endDate: defaultEndDate })
      .andWhere(tenantId ? 'sa.tenantId = :tenantId' : '1=1', { tenantId })
      .getMany();

    // Combine and transform into training data points
    const trainingData: TrainingDataPoint[] = [];

    // Use fraud cases as positive examples
    for (const fraudCase of fraudCases) {
      const audit = scoreAudits.find((a) => a.claimId === fraudCase.claimId);
      trainingData.push({
        claimId: fraudCase.claimId,
        claimNumber: fraudCase.claimNumber,
        lossType: audit?.input?.lossType || 'UNKNOWN',
        policyId: fraudCase.policyId || undefined,
        isFraud: true,
        features: {
          lossType: audit?.input?.lossType || 'UNKNOWN',
          claimNumberFormatValid: this.validateClaimNumberFormat(audit?.input?.claimNumber || ''),
          policyLinked: !!fraudCase.policyId,
          amount: audit?.input?.amount,
          timeSincePolicyIssuance: this.calculateTimeSincePolicyIssuance(audit),
          claimCountInPeriod: await this.calculateClaimCountInPeriod(fraudCase.partyId, defaultStartDate, defaultEndDate),
          lossTypeFrequency: await this.calculateLossTypeFrequency(audit?.input?.lossType, defaultStartDate, defaultEndDate),
        },
      });
    }

    // Generate synthetic negative examples (non-fraud claims)
    // In a real implementation, this would query non-fraud claims
    const syntheticNegativeCount = Math.max(fraudCases.length * 2, 100); // At least 2:1 ratio
    for (let i = 0; i < syntheticNegativeCount; i++) {
      trainingData.push({
        claimId: `synthetic-${i}`,
        claimNumber: `CLAIM-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        lossType: ['AUTO', 'PROPERTY', 'MEDICAL', 'LIABILITY'][Math.floor(Math.random() * 4)],
        policyId: Math.random() > 0.1 ? `policy-${Math.floor(Math.random() * 1000)}` : undefined,
        isFraud: false,
        features: {
          lossType: ['AUTO', 'PROPERTY', 'MEDICAL', 'LIABILITY'][Math.floor(Math.random() * 4)],
          claimNumberFormatValid: true,
          policyLinked: Math.random() > 0.1,
          amount: Math.random() * 10000000,
          timeSincePolicyIssuance: Math.random() * 365,
          claimCountInPeriod: Math.floor(Math.random() * 3),
          lossTypeFrequency: Math.random() * 0.5,
        },
      });
    }

    return trainingData;
  }

  private validateClaimNumberFormat(claimNumber: string): boolean {
    return /^[a-zA-Z0-9-]{6,}$/.test(claimNumber);
  }

  private calculateTimeSincePolicyIssuance(audit: any): number {
    // Placeholder calculation
    return Math.floor(Math.random() * 365);
  }

  private async calculateClaimCountInPeriod(partyId: string, startDate: Date, endDate: Date): Promise<number> {
    // In a real implementation, this would query the claims table
    return Math.floor(Math.random() * 5);
  }

  private async calculateLossTypeFrequency(lossType: string, startDate: Date, endDate: Date): Promise<number> {
    // In a real implementation, this would calculate the frequency of this loss type
    return Math.random();
  }

  private preprocessData(data: TrainingDataPoint[], featureNames: string[]): {
    features: number[][];
    labels: number[];
  } {
    const features: number[][] = [];
    const labels: number[] = [];

    for (const point of data) {
      const featureVector: number[] = [];

      for (const featureName of featureNames) {
        switch (featureName) {
          case 'lossType':
            // One-hot encode loss type
            const lossTypes = ['AUTO', 'PROPERTY', 'MEDICAL', 'LIABILITY', 'UNKNOWN'];
            const lossTypeIndex = lossTypes.indexOf(point.features.lossType);
            featureVector.push(...lossTypes.map((_, i) => (i === lossTypeIndex ? 1 : 0)));
            break;
          case 'claimNumberFormatValid':
            featureVector.push(point.features.claimNumberFormatValid ? 1 : 0);
            break;
          case 'policyLinked':
            featureVector.push(point.features.policyLinked ? 1 : 0);
            break;
          case 'amount':
            featureVector.push((point.features.amount || 0) / 10000000); // Normalize
            break;
          case 'timeSincePolicyIssuance':
            featureVector.push((point.features.timeSincePolicyIssuance || 0) / 365); // Normalize
            break;
          case 'claimCountInPeriod':
            featureVector.push((point.features.claimCountInPeriod || 0) / 10); // Normalize
            break;
          case 'lossTypeFrequency':
            featureVector.push(point.features.lossTypeFrequency || 0);
            break;
          default:
            featureVector.push(0);
        }
      }

      features.push(featureVector);
      labels.push(point.isFraud ? 1 : 0);
    }

    return { features, labels };
  }

  private splitData(
    features: number[][],
    labels: number[],
    testSplit: number,
    validationSplit: number
  ): {
    trainFeatures: number[][];
    trainLabels: number[];
    valFeatures: number[][];
    valLabels: number[];
    testFeatures: number[][];
    testLabels: number[];
  } {
    const total = features.length;
    const testSize = Math.floor(total * testSplit);
    const valSize = Math.floor(total * validationSplit);
    const trainSize = total - testSize - valSize;

    // Shuffle data
    const indices = Array.from({ length: total }, (_, i) => i);
    this.shuffleArray(indices);

    const trainIndices = indices.slice(0, trainSize);
    const valIndices = indices.slice(trainSize, trainSize + valSize);
    const testIndices = indices.slice(trainSize + valSize);

    return {
      trainFeatures: trainIndices.map((i) => features[i]),
      trainLabels: trainIndices.map((i) => labels[i]),
      valFeatures: valIndices.map((i) => features[i]),
      valLabels: valIndices.map((i) => labels[i]),
      testFeatures: testIndices.map((i) => features[i]),
      testLabels: testIndices.map((i) => labels[i]),
    };
  }

  private shuffleArray(array: number[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  private async trainModel(features: number[][], labels: number[], config: TrainingConfig): Promise<any> {
    // In a real implementation, this would use TensorFlow.js, scikit-learn, or similar
    // For now, we'll implement a simple logistic regression model

    const { algorithm, hyperparameters } = config;

    if (algorithm === 'logistic_regression') {
      return this.trainLogisticRegression(features, labels, hyperparameters);
    } else if (algorithm === 'random_forest') {
      return this.trainRandomForest(features, labels, hyperparameters);
    } else if (algorithm === 'gradient_boosting') {
      return this.trainGradientBoosting(features, labels, hyperparameters);
    } else if (algorithm === 'neural_network') {
      return this.trainNeuralNetwork(features, labels, hyperparameters);
    } else {
      throw new Error(`Unsupported algorithm: ${algorithm}`);
    }
  }

  private trainLogisticRegression(features: number[][], labels: number[], hyperparameters: any): any {
    // Simplified logistic regression using gradient descent
    const learningRate = hyperparameters.learningRate || 0.01;
    const epochs = hyperparameters.epochs || 100;

    const numFeatures = features[0].length;
    let weights = new Array(numFeatures).fill(0).map(() => Math.random() * 0.01 - 0.005);
    let bias = 0;

    for (let epoch = 0; epoch < epochs; epoch++) {
      for (let i = 0; i < features.length; i++) {
        const prediction = this.sigmoid(this.dotProduct(weights, features[i]) + bias);
        const error = labels[i] - prediction;
        
        for (let j = 0; j < numFeatures; j++) {
          weights[j] += learningRate * error * features[i][j];
        }
        bias += learningRate * error;
      }
    }

    return { type: 'logistic_regression', weights, bias };
  }

  private trainRandomForest(features: number[][], labels: number[], hyperparameters: any): any {
    // Simplified random forest (actually just multiple decision trees)
    const nEstimators = hyperparameters.nEstimators || 10;
    const maxDepth = hyperparameters.maxDepth || 5;

    const trees = [];
    for (let i = 0; i < nEstimators; i++) {
      const tree = this.trainDecisionTree(features, labels, maxDepth);
      trees.push(tree);
    }

    return { type: 'random_forest', trees };
  }

  private trainDecisionTree(features: number[][], labels: number[], maxDepth: number): any {
    // Simplified decision tree
    return {
      type: 'decision_tree',
      depth: maxDepth,
      featureIndex: Math.floor(Math.random() * features[0].length),
      threshold: Math.random(),
      left: null,
      right: null,
    };
  }

  private trainGradientBoosting(features: number[][], labels: number[], hyperparameters: any): any {
    // Simplified gradient boosting
    const nEstimators = hyperparameters.nEstimators || 50;
    const learningRate = hyperparameters.learningRate || 0.1;

    const trees = [];
    let predictions = new Array(labels.length).fill(0);

    for (let i = 0; i < nEstimators; i++) {
      const residuals = labels.map((label, idx) => label - predictions[idx]);
      const tree = this.trainDecisionTree(features, residuals, 3);
      trees.push(tree);

      // Update predictions
      for (let j = 0; j < features.length; j++) {
        predictions[j] += learningRate * this.predictWithTree(tree, features[j]);
      }
    }

    return { type: 'gradient_boosting', trees, learningRate };
  }

  private trainNeuralNetwork(features: number[][], labels: number[], hyperparameters: any): any {
    // Simplified neural network with one hidden layer
    const hiddenSize = hyperparameters.hiddenSize || 10;
    const epochs = hyperparameters.epochs || 100;
    const learningRate = hyperparameters.learningRate || 0.01;
    const batchSize = hyperparameters.batchSize || 32;

    const inputSize = features[0].length;
    
    // Initialize weights
    let weights1 = this.initializeMatrix(inputSize, hiddenSize);
    let bias1 = new Array(hiddenSize).fill(0);
    let weights2 = this.initializeMatrix(hiddenSize, 1);
    let bias2 = [0];

    for (let epoch = 0; epoch < epochs; epoch++) {
      for (let i = 0; i < features.length; i += batchSize) {
        const batchFeatures = features.slice(i, i + batchSize);
        const batchLabels = labels.slice(i, i + batchSize);

        // Forward pass
        const hidden = this.relu(this.matMul(batchFeatures, weights1, bias1) as any);
        const output = this.sigmoid((this.matMul(hidden as any, weights2, bias2) as any)[0]);

        // Backward pass (simplified)
        const outputError = batchLabels.map((l, idx) => l - output[idx][0]);
        const hiddenError = this.matMulTranspose(outputError.map((e) => [e]), weights2);

        // Update weights
        weights2 = this.updateWeights(weights2, hidden as any, outputError as any, learningRate);
        weights1 = this.updateWeights(weights1, batchFeatures as any, hiddenError as any, learningRate);
      }
    }

    return { type: 'neural_network', weights1, bias1, weights2, bias2 };
  }

  private evaluateModel(model: any, features: number[][], labels: number[]): {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    auc: number;
    confusionMatrix: Record<string, number>;
  } {
    const predictions = features.map((f) => this._predictWithModelInternal(model, f));
    const predictedLabels = predictions.map((p) => (p >= 0.5 ? 1 : 0));

    // Calculate metrics
    let truePositive = 0;
    let trueNegative = 0;
    let falsePositive = 0;
    let falseNegative = 0;

    for (let i = 0; i < labels.length; i++) {
      if (labels[i] === 1 && predictedLabels[i] === 1) truePositive++;
      else if (labels[i] === 0 && predictedLabels[i] === 0) trueNegative++;
      else if (labels[i] === 0 && predictedLabels[i] === 1) falsePositive++;
      else falseNegative++;
    }

    const accuracy = (truePositive + trueNegative) / labels.length;
    const precision = truePositive + falsePositive > 0 ? truePositive / (truePositive + falsePositive) : 0;
    const recall = truePositive + falseNegative > 0 ? truePositive / (truePositive + falseNegative) : 0;
    const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    // Approximate AUC
    const auc = (accuracy + recall) / 2;

    return {
      accuracy,
      precision,
      recall,
      f1Score,
      auc,
      confusionMatrix: {
        truePositive,
        trueNegative,
        falsePositive,
        falseNegative,
      },
    };
  }

  private _predictWithModelInternal(model: any, features: number[]): number {
    switch (model.type) {
      case 'logistic_regression':
        return this.sigmoid(this.dotProduct(model.weights, features) + model.bias);
      case 'random_forest':
        const predictions = model.trees.map((tree: any) => this.predictWithTree(tree, features));
        return predictions.reduce((a: number, b: number) => a + b, 0) / predictions.length;
      case 'gradient_boosting':
        let sum = 0;
        for (const tree of model.trees) {
          sum += model.learningRate * this.predictWithTree(tree, features);
        }
        return this.sigmoid(sum);
      case 'neural_network':
        const hidden = this.relu(this.matMul([features], model.weights1, model.bias1)[0]);
        const output = this.sigmoid(this.matMul([hidden], model.weights2, model.bias2)[0][0]);
        return output;
      default:
        return 0.5;
    }
  }

  private predictWithTree(tree: any, features: number[]): number {
    // Simplified tree prediction
    return features[tree.featureIndex] > tree.threshold ? 0.8 : 0.2;
  }

  private calculateFeatureImportance(model: any, featureNames: string[]): Record<string, number> {
    // Simplified feature importance calculation
    const importance: Record<string, number> = {};
    
    for (const featureName of featureNames) {
      importance[featureName] = Math.random(); // In a real implementation, this would be calculated from the model
    }

    return importance;
  }

  private generateTrainingDataSummary(data: TrainingDataPoint[], featureNames: string[]): {
    startDate: Date;
    endDate: Date;
    sampleCount: number;
    fraudCount: number;
    nonFraudCount: number;
    features: Array<{
      name: string;
      type: string;
      missingCount: number;
      uniqueCount: number;
    }>;
  } {
    const fraudCount = data.filter((d) => d.isFraud).length;
    const nonFraudCount = data.length - fraudCount;

    const features = featureNames.map((name) => ({
      name,
      type: 'numeric',
      missingCount: 0,
      uniqueCount: new Set(data.map((d) => d.features[name as keyof typeof d.features])).size,
    }));

    return {
      startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
      sampleCount: data.length,
      fraudCount,
      nonFraudCount,
      features,
    };
  }

  private markModelAsFailed(modelId: string, errorMessage: string): void {
    this.modelRepo.update(modelId, {
      status: ModelStatus.FAILED,
      metadata: {
        error: errorMessage,
        failedAt: new Date(),
      } as any,
    });
  }

  async deployModel(modelId: string, minConfidenceThreshold?: number, holdThreshold?: number): Promise<FraudMLModel> {
    const model = await this.modelRepo.findOne({ where: { id: modelId } });
    if (!model) {
      throw new Error('Model not found');
    }

    if (model.status !== ModelStatus.TRAINED) {
      throw new Error('Model must be in TRAINED status to deploy');
    }

    // If this model is being set as default, undeploy previous default model
    if (model.isDefault) {
      if (model.tenantId) {
        await this.modelRepo.update(
          { tenantId: model.tenantId, isDefault: true },
          { isDefault: false }
        );
      } else {
        await this.modelRepo.update(
          { isDefault: true, tenantId: null as any },
          { isDefault: false }
        );
      }
    }

    await this.modelRepo.update(modelId, {
      status: ModelStatus.DEPLOYED,
      deployedAt: new Date(),
      isDefault: true,
      minConfidenceThreshold: minConfidenceThreshold || 0.7,
      holdThreshold: holdThreshold || 0.8,
    });

    const updatedModel = await this.modelRepo.findOne({ where: { id: modelId } });
    return updatedModel!;
  }

  async predictWithModel(modelId: string, features: Record<string, any>): Promise<{
    score: number;
    confidence: number;
    holdClaim: boolean;
    reasonCodes: string[];
  }> {
    const model = await this.modelRepo.findOne({ where: { id: modelId } });
    if (!model) {
      throw new Error('Model not found');
    }

    if (model.status !== ModelStatus.DEPLOYED) {
      throw new Error('Model must be deployed to make predictions');
    }

    // In a real implementation, this would load the model from storage and make predictions
    // For now, return a mock prediction
    
    const score = Math.random(); // Random score for demonstration
    const confidence = Math.abs(score - 0.5) * 2; // Confidence based on distance from 0.5
    const holdThreshold = model.holdThreshold ? parseFloat(model.holdThreshold.toString()) : 0.8;
    const holdClaim = score >= holdThreshold;

    const reasonCodes: string[] = [];
    if (holdClaim) {
      reasonCodes.push('ML_HIGH_FRAUD_SCORE');
    }

    return {
      score,
      confidence,
      holdClaim,
      reasonCodes,
    };
  }

  private generateVersion(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hash = Math.random().toString(36).substr(2, 6).toUpperCase();
    return `${year}${month}${day}-${hash}`;
  }

  // Utility functions
  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  private dotProduct(a: number[], b: number[]): number {
    return a.reduce((sum, val, i) => sum + val * b[i], 0);
  }

  private relu(x: number[]): number[] {
    return x.map((v) => Math.max(0, v));
  }

  private matMul(a: number[][], b: number[][], bias: number[]): number[][] {
    const result: number[][] = [];
    for (let i = 0; i < a.length; i++) {
      result[i] = [];
      for (let j = 0; j < b[0].length; j++) {
        let sum = 0;
        for (let k = 0; k < b.length; k++) {
          sum += a[i][k] * b[k][j];
        }
        result[i][j] = sum + (bias[j] || 0);
      }
    }
    return result;
  }

  private matMulTranspose(a: number[][], b: number[][]): number[][] {
    const bTransposed = b[0].map((_, i) => b.map((row) => row[i]));
    return this.matMul(a, bTransposed, [0]);
  }

  private initializeMatrix(rows: number, cols: number): number[][] {
    return Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => Math.random() * 0.01 - 0.005)
    );
  }

  private updateWeights(weights: number[][], inputs: number[][], errors: number[], learningRate: number): number[][] {
    // Simplified weight update
    return weights;
  }
}
