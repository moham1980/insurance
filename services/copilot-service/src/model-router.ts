import { Injectable, Logger } from '@nestjs/common';
import type { LLMProvider } from './llm.service';

export interface ModelRouteConfig {
  provider: LLMProvider;
  model: string;
  costPer1kTokens: number;
  qualityScore: number; // 0-1
  maxTokensPerDay: number;
  latencyMs: number;
}

export interface ModelRouterOptions {
  costBudgetPerDay?: number;
  qualityThreshold?: number;
  preferLowCost?: boolean;
}

export interface ModelRouteResult {
  provider: LLMProvider;
  model: string;
  estimatedCost: number;
  qualityScore: number;
  withinBudget: boolean;
  meetsQualityThreshold: boolean;
}

/**
 * ModelRouter — Routes LLM requests to the best provider based on cost budget and quality threshold.
 *
 * P7-14: Enforces costBudgetPerDay and qualityThreshold constraints.
 *
 * Environment variables:
 * - MODEL_COST_BUDGET_PER_DAY: Maximum cost per day in USD (default: 50)
 * - MODEL_QUALITY_THRESHOLD: Minimum quality score 0-1 (default: 0.7)
 */
@Injectable()
export class ModelRouter {
  private readonly logger = new Logger(ModelRouter.name);

  private readonly costBudgetPerDay: number;
  private readonly qualityThreshold: number;

  private readonly models: ModelRouteConfig[] = [
    {
      provider: 'deepseek',
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      costPer1kTokens: parseFloat(process.env.DEEPSEEK_COST_PER_1K || '0.002'),
      qualityScore: parseFloat(process.env.DEEPSEEK_QUALITY_SCORE || '0.82'),
      maxTokensPerDay: parseInt(process.env.DEEPSEEK_MAX_TOKENS_PER_DAY || '2000000', 10),
      latencyMs: parseInt(process.env.DEEPSEEK_LATENCY_MS || '3000', 10),
    },
    {
      provider: 'openai',
      model: process.env.OPENAI_MODEL || 'gpt-4',
      costPer1kTokens: parseFloat(process.env.OPENAI_COST_PER_1K || '0.03'),
      qualityScore: parseFloat(process.env.OPENAI_QUALITY_SCORE || '0.95'),
      maxTokensPerDay: parseInt(process.env.OPENAI_MAX_TOKENS_PER_DAY || '1000000', 10),
      latencyMs: parseInt(process.env.OPENAI_LATENCY_MS || '2000', 10),
    },
    {
      provider: 'gemini',
      model: process.env.GEMINI_MODEL || 'gemini-pro',
      costPer1kTokens: parseFloat(process.env.GEMINI_COST_PER_1K || '0.001'),
      qualityScore: parseFloat(process.env.GEMINI_QUALITY_SCORE || '0.78'),
      maxTokensPerDay: parseInt(process.env.GEMINI_MAX_TOKENS_PER_DAY || '3000000', 10),
      latencyMs: parseInt(process.env.GEMINI_LATENCY_MS || '2500', 10),
    },
    {
      provider: 'ollama',
      model: process.env.OLLAMA_MODEL || 'llama2',
      costPer1kTokens: 0,
      qualityScore: parseFloat(process.env.OLLAMA_QUALITY_SCORE || '0.65'),
      maxTokensPerDay: parseInt(process.env.OLLAMA_MAX_TOKENS_PER_DAY || '5000000', 10),
      latencyMs: parseInt(process.env.OLLAMA_LATENCY_MS || '5000', 10),
    },
  ];

  private dailySpend: Map<string, number> = new Map();
  private dailyDate: string = new Date().toISOString().slice(0, 10);

  constructor() {
    this.costBudgetPerDay = parseFloat(process.env.MODEL_COST_BUDGET_PER_DAY || '50');
    this.qualityThreshold = parseFloat(process.env.MODEL_QUALITY_THRESHOLD || '0.7');
    this.logger.log(`ModelRouter initialized: budget=$${this.costBudgetPerDay}/day, qualityThreshold=${this.qualityThreshold}`);
  }

  /**
   * Route to the best available model within budget and quality constraints.
   */
  route(estimatedTokens: number, options?: ModelRouterOptions): ModelRouteResult {
    const budget = options?.costBudgetPerDay ?? this.costBudgetPerDay;
    const qualityThreshold = options?.qualityThreshold ?? this.qualityThreshold;
    const preferLowCost = options?.preferLowCost ?? true;

    this.resetDailyIfNeeded();

    // Filter models that meet quality threshold
    const qualified = this.models.filter((m) => m.qualityScore >= qualityThreshold);

    if (qualified.length === 0) {
      this.logger.warn(`No models meet quality threshold ${qualityThreshold}, falling back to best available`);
      const best = this.models.reduce((a, b) => (a.qualityScore > b.qualityScore ? a : b));
      return this.buildResult(best, estimatedTokens);
    }

    // Filter models within daily budget
    const withinBudget = qualified.filter((m) => {
      const spent = this.dailySpend.get(m.provider) || 0;
      const estimatedCost = (estimatedTokens / 1000) * m.costPer1kTokens;
      return spent + estimatedCost <= budget;
    });

    if (withinBudget.length === 0) {
      this.logger.warn(`No models within daily budget $${budget}, using cheapest qualified model`);
      const cheapest = qualified.reduce((a, b) => (a.costPer1kTokens < b.costPer1kTokens ? a : b));
      return this.buildResult(cheapest, estimatedTokens);
    }

    // Sort by cost (low-cost preference) or quality
    if (preferLowCost) {
      withinBudget.sort((a, b) => a.costPer1kTokens - b.costPer1kTokens);
    } else {
      withinBudget.sort((a, b) => b.qualityScore - a.qualityScore);
    }

    return this.buildResult(withinBudget[0], estimatedTokens);
  }

  /**
   * Record actual token usage for budget tracking.
   */
  recordUsage(provider: LLMProvider, tokensUsed: number): void {
    this.resetDailyIfNeeded();
    const model = this.models.find((m) => m.provider === provider);
    if (!model) return;

    const cost = (tokensUsed / 1000) * model.costPer1kTokens;
    const current = this.dailySpend.get(provider) || 0;
    this.dailySpend.set(provider, current + cost);

    this.logger.debug(`Recorded usage: ${provider} ${tokensUsed} tokens, $${cost.toFixed(4)}, daily total: $${(this.dailySpend.get(provider) || 0).toFixed(4)}`);
  }

  /**
   * Get current daily spend per provider.
   */
  getDailySpend(): Record<string, number> {
    this.resetDailyIfNeeded();
    return Object.fromEntries(this.dailySpend);
  }

  /**
   * Get total daily spend across all providers.
   */
  getTotalDailySpend(): number {
    this.resetDailyIfNeeded();
    return Array.from(this.dailySpend.values()).reduce((a, b) => a + b, 0);
  }

  private buildResult(model: ModelRouteConfig, estimatedTokens: number): ModelRouteResult {
    const estimatedCost = (estimatedTokens / 1000) * model.costPer1kTokens;
    const spent = this.dailySpend.get(model.provider) || 0;
    return {
      provider: model.provider,
      model: model.model,
      estimatedCost,
      qualityScore: model.qualityScore,
      withinBudget: spent + estimatedCost <= this.costBudgetPerDay,
      meetsQualityThreshold: model.qualityScore >= this.qualityThreshold,
    };
  }

  private resetDailyIfNeeded(): void {
    const today = new Date().toISOString().slice(0, 10);
    if (today !== this.dailyDate) {
      this.dailySpend.clear();
      this.dailyDate = today;
      this.logger.log(`Daily spend reset for ${today}`);
    }
  }
}
