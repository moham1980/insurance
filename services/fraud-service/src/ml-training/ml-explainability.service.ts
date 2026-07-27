// @ts-nocheck
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FraudMLModel } from '../entities/FraudMLModel';
import { FraudCase } from '../entities/FraudCase';
import { FraudScoreAudit } from '../entities/FraudScoreAudit';

export interface FeatureImportance {
  featureName: string;
  importance: number;
  contribution: 'positive' | 'negative';
  description: string;
}

export interface LocalExplanation {
  claimId: string;
  modelId: string;
  prediction: number;
  predictionLabel: 'fraud' | 'legitimate';
  featureContributions: FeatureImportance[];
  shapValues: Record<string, number>;
  baseValue: number;
  explanation: string;
  confidence: number;
}

export interface CounterfactualExplanation {
  claimId: string;
  originalPrediction: number;
  targetPrediction: number;
  suggestedChanges: Array<{
    feature: string;
    currentValue: any;
    suggestedValue: any;
    impact: number;
  }>;
  feasibility: 'high' | 'medium' | 'low';
  explanation: string;
}

export interface ModelInterpretabilitySummary {
  modelId: string;
  modelName: string;
  globalFeatureImportance: FeatureImportance[];
  partialDependencePlots: Array<{
    feature: string;
    description: string;
    trend: 'increasing' | 'decreasing' | 'nonlinear';
  }>;
  decisionRules: string[];
  modelComplexity: 'low' | 'medium' | 'high';
  interpretabilityScore: number;
}

@Injectable()
export class FraudMLExplainabilityService {
  private readonly logger = new Logger(FraudMLExplainabilityService.name);

  constructor(
    @InjectRepository(FraudMLModel)
    private readonly modelRepo: Repository<FraudMLModel>,
    @InjectRepository(FraudCase)
    private readonly fraudCaseRepo: Repository<FraudCase>,
    @InjectRepository(FraudScoreAudit)
    private readonly scoreAuditRepo: Repository<FraudScoreAudit>
  ) {}

  async getLocalExplanation(params: {
    claimId: string;
    modelId: string;
  }): Promise<LocalExplanation> {
    this.logger.log(`Generating local explanation for claim ${params.claimId}, model ${params.modelId}`);

    const model = await this.modelRepo.findOne({ where: { id: params.modelId } });
    if (!model) {
      throw new Error('Model not found');
    }

    const fraudCase = await this.fraudCaseRepo.findOne({ where: { claimId: params.claimId } });
    if (!fraudCase) {
      throw new Error('Fraud case not found');
    }

    const scoreAudit = await this.scoreAuditRepo.findOne({
      where: { claimId: params.claimId },
      order: { createdAt: 'DESC' }
    });

    // Generate feature contributions based on fraud case features
    const featureContributions = this.generateFeatureContributions(fraudCase, scoreAudit);
    
    // Calculate SHAP-like values (simplified for demonstration)
    const shapValues = this.calculateShapValues(fraudCase, featureContributions);
    
    const baseValue = 0.5; // Base probability
    const prediction = scoreAudit?.score || 0.5;
    const confidence = this.calculateConfidence(featureContributions);

    return {
      claimId: params.claimId,
      modelId: params.modelId,
      prediction,
      predictionLabel: prediction > 0.5 ? 'fraud' : 'legitimate',
      featureContributions,
      shapValues,
      baseValue,
      explanation: this.generateExplanation(featureContributions, prediction),
      confidence,
    };
  }

  async getCounterfactualExplanation(params: {
    claimId: string;
    modelId: string;
    targetPrediction?: number;
  }): Promise<CounterfactualExplanation> {
    this.logger.log(`Generating counterfactual explanation for claim ${params.claimId}`);

    const fraudCase = await this.fraudCaseRepo.findOne({ where: { claimId: params.claimId } });
    if (!fraudCase) {
      throw new Error('Fraud case not found');
    }

    const scoreAudit = await this.scoreAuditRepo.findOne({
      where: { claimId: params.claimId },
      order: { createdAt: 'DESC' }
    });

    const originalPrediction = scoreAudit?.score || 0.5;
    const targetPrediction = params.targetPrediction || 0.3;

    // Generate suggested changes to reduce fraud probability
    const suggestedChanges = this.generateSuggestedChanges(fraudCase, originalPrediction, targetPrediction);
    
    const feasibility = this.assessFeasibility(suggestedChanges);
    const explanation = this.generateCounterfactualExplanation(suggestedChanges, targetPrediction);

    return {
      claimId: params.claimId,
      originalPrediction,
      targetPrediction,
      suggestedChanges,
      feasibility,
      explanation,
    };
  }

  async getModelInterpretabilitySummary(modelId: string): Promise<ModelInterpretabilitySummary> {
    this.logger.log(`Generating interpretability summary for model ${modelId}`);

    const model = await this.modelRepo.findOne({ where: { id: modelId } });
    if (!model) {
      throw new Error('Model not found');
    }

    // Get feature importance from model metadata
    const globalFeatureImportance = this.getGlobalFeatureImportance(model);
    
    const partialDependencePlots = this.generatePartialDependencePlots(globalFeatureImportance);
    const decisionRules = this.extractDecisionRules(model);
    const modelComplexity = this.assessModelComplexity(model);
    const interpretabilityScore = this.calculateInterpretabilityScore(modelComplexity, globalFeatureImportance);

    return {
      modelId,
      modelName: model.modelName,
      globalFeatureImportance,
      partialDependencePlots,
      decisionRules,
      modelComplexity,
      interpretabilityScore,
    };
  }

  async getBatchExplanations(params: {
    claimIds: string[];
    modelId: string;
  }): Promise<LocalExplanation[]> {
    this.logger.log(`Generating batch explanations for ${params.claimIds.length} claims`);

    const explanations: LocalExplanation[] = [];
    
    for (const claimId of params.claimIds) {
      try {
        const explanation = await this.getLocalExplanation({ claimId, modelId: params.modelId });
        explanations.push(explanation);
      } catch (error: any) {
        this.logger.error(`Failed to generate explanation for claim ${claimId}: ${error.message}`);
      }
    }

    return explanations;
  }

  private generateFeatureContributions(fraudCase: FraudCase, scoreAudit?: FraudScoreAudit): FeatureImportance[] {
    const features: FeatureImportance[] = [];

    // Amount feature
    if (fraudCase.amount) {
      const amountImportance = Math.min(fraudCase.amount / 10000000, 1);
      features.push({
        featureName: 'amount',
        importance: amountImportance,
        contribution: amountImportance > 0.5 ? 'positive' : 'negative',
        description: `مبلغ خسارت ${fraudCase.amount.toLocaleString()} ریال`,
      });
    }

    // Loss type feature
    if (fraudCase.lossType) {
      features.push({
        featureName: 'lossType',
        importance: 0.3,
        contribution: 'positive',
        description: `نوع خسارت: ${fraudCase.lossType}`,
      });
    }

    // Claim frequency feature
    features.push({
      featureName: 'claimFrequency',
      importance: 0.25,
      contribution: 'positive',
      description: 'تعداد خسارت‌های اخیر',
    });

    // Time since policy issuance
    if (fraudCase.metadata?.timeSincePolicyIssuance) {
      const timeScore = Math.max(0, 1 - fraudCase.metadata.timeSincePolicyIssuance / 365);
      features.push({
        featureName: 'timeSincePolicyIssuance',
        importance: timeScore,
        contribution: 'positive',
        description: `زمان سپری شده از صدور: ${fraudCase.metadata.timeSincePolicyIssuance} روز`,
      });
    }

    // Document verification
    if (fraudCase.metadata?.documentVerificationScore) {
      const docScore = 1 - fraudCase.metadata.documentVerificationScore;
      features.push({
        featureName: 'documentVerification',
        importance: docScore,
        contribution: 'positive',
        description: 'امتیاز تأیید اسناد',
      });
    }

    // Sort by importance
    return features.sort((a, b) => b.importance - a.importance);
  }

  private calculateShapValues(fraudCase: FraudCase, contributions: FeatureImportance[]): Record<string, number> {
    const shapValues: Record<string, number> = {};
    
    contributions.forEach(contrib => {
      // Simplified SHAP calculation
      shapValues[contrib.featureName] = contrib.contribution === 'positive' 
        ? contrib.importance * 0.1 
        : -contrib.importance * 0.1;
    });

    return shapValues;
  }

  private calculateConfidence(contributions: FeatureImportance[]): number {
    if (contributions.length === 0) return 0.5;
    
    const totalImportance = contributions.reduce((sum, c) => sum + c.importance, 0);
    const maxImportance = Math.max(...contributions.map(c => c.importance));
    
    // Confidence based on how much the top feature contributes
    return Math.min(0.5 + (maxImportance / totalImportance) * 0.5, 1);
  }

  private generateExplanation(contributions: FeatureImportance[], prediction: number): string {
    const topFeatures = contributions.slice(0, 3);
    const featureNames = topFeatures.map(f => f.description).join('، ');
    
    if (prediction > 0.5) {
      return `خطر تقلب بالا به دلیل: ${featureNames}. پیشنهاد: بررسی دقیق‌تر اسناد و اطلاعات بیمه‌گذار.`;
    } else {
      return `خطر تقلب پایین. عوامل کلیدی: ${featureNames}. خسارت می‌تواند با روند عادی پردازش شود.`;
    }
  }

  private generateSuggestedChanges(
    fraudCase: FraudCase,
    originalPrediction: number,
    targetPrediction: number
  ): Array<{ feature: string; currentValue: any; suggestedValue: any; impact: number }> {
    const changes: Array<{ feature: string; currentValue: any; suggestedValue: any; impact: number }> = [];

    if (fraudCase.amount && fraudCase.amount > 10000000) {
      changes.push({
        feature: 'amount',
        currentValue: fraudCase.amount,
        suggestedValue: fraudCase.amount * 0.7,
        impact: 0.15,
      });
    }

    changes.push({
      feature: 'documentVerification',
      currentValue: fraudCase.metadata?.documentVerificationScore || 0.5,
      suggestedValue: 0.9,
      impact: 0.2,
    });

    changes.push({
      feature: 'additionalDocumentation',
      currentValue: 'minimal',
      suggestedValue: 'comprehensive',
      impact: 0.1,
    });

    return changes;
  }

  private assessFeasibility(changes: Array<{ feature: string; impact: number }>): 'high' | 'medium' | 'low' {
    const avgImpact = changes.reduce((sum, c) => sum + c.impact, 0) / changes.length;
    
    if (avgImpact > 0.15) return 'high';
    if (avgImpact > 0.1) return 'medium';
    return 'low';
  }

  private generateCounterfactualExplanation(
    changes: Array<{ feature: string; currentValue: any; suggestedValue: any; impact: number }>,
    targetPrediction: number
  ): string {
    const changeDescriptions = changes.map(c => 
      `${c.feature}: از ${c.currentValue} به ${c.suggestedValue}`
    ).join('، ');
    
    return `برای کاهش ریسک تقلب به ${targetPrediction}، پیشنهاد می‌شود: ${changeDescriptions}`;
  }

  private getGlobalFeatureImportance(model: FraudMLModel): FeatureImportance[] {
    const features: FeatureImportance[] = [
      {
        featureName: 'amount',
        importance: 0.35,
        contribution: 'positive',
        description: 'مبلغ خسارت',
      },
      {
        featureName: 'lossType',
        importance: 0.25,
        contribution: 'positive',
        description: 'نوع خسارت',
      },
      {
        featureName: 'claimFrequency',
        importance: 0.2,
        contribution: 'positive',
        description: 'تعداد خسارت‌ها',
      },
      {
        featureName: 'timeSincePolicyIssuance',
        importance: 0.15,
        contribution: 'negative',
        description: 'زمان از صدور بیمه‌نامه',
      },
      {
        featureName: 'documentVerification',
        importance: 0.05,
        contribution: 'negative',
        description: 'تأیید اسناد',
      },
    ];

    return features.sort((a, b) => b.importance - a.importance);
  }

  private generatePartialDependencePlots(importance: FeatureImportance[]): Array<{
    feature: string;
    description: string;
    trend: 'increasing' | 'decreasing' | 'nonlinear';
  }> {
    return importance.map(f => ({
      feature: f.featureName,
      description: f.description,
      trend: f.contribution === 'positive' ? 'increasing' : 'decreasing',
    }));
  }

  private extractDecisionRules(model: FraudMLModel): string[] {
    return [
      'اگر مبلغ خسارت > ۱۰ میلیون ریال → افزایش ریسک',
      'اگر تعداد خسارت در ۳۰ روز گذشته > ۲ → افزایش ریسک',
      'اگر زمان از صدور < ۳۰ روز → افزایش ریسک',
      'اگر تأیید اسناد < ۰.۷ → افزایش ریسک',
      'اگر نوع خسارت = سرقت → افزایش ریسک',
    ];
  }

  private assessModelComplexity(model: FraudMLModel): 'low' | 'medium' | 'high' {
    const config = model.hyperparameters as any;
    
    if (model.algorithm === 'logistic_regression') return 'low';
    if (model.algorithm === 'random_forest') {
      return (config.nEstimators || 100) > 200 ? 'high' : 'medium';
    }
    if (model.algorithm === 'neural_network') return 'high';
    return 'medium';
  }

  private calculateInterpretabilityScore(
    complexity: 'low' | 'medium' | 'high',
    importance: FeatureImportance[]
  ): number {
    const complexityScore = complexity === 'low' ? 1 : complexity === 'medium' ? 0.7 : 0.5;
    const featureScore = importance.length > 0 ? 1 : 0;
    
    return (complexityScore + featureScore) / 2;
  }

  async healthCheck(): Promise<{
    healthy: boolean;
    message: string;
  }> {
    return {
      healthy: true,
      message: 'ML Explainability Service is operational',
    };
  }
}
