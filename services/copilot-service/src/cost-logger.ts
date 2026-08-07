import { Logger } from '@nestjs/common';
import type { LLMProvider, LLMResponse } from './llm.service';

const logger = new Logger('CostLogger');

// Approximate cost per 1K tokens (in USD) by provider/model — used for estimated cost logging.
// These are rough defaults and can be overridden via env (COPILOT_COST_PER_1K_<PROVIDER>).
const DEFAULT_COST_PER_1K_TOKENS: Record<LLMProvider, number> = {
  openai: 0.02,
  gemini: 0.0015,
  deepseek: 0.0014,
  ollama: 0, // local model — no per-token cost
};

function getCostPer1k(provider: LLMProvider): number {
  const envKey = `COPILOT_COST_PER_1K_${provider.toUpperCase()}`;
  const envVal = process.env[envKey];
  if (envVal) {
    const parsed = parseFloat(envVal);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return DEFAULT_COST_PER_1K_TOKENS[provider] ?? 0;
}

/**
 * Logs the estimated cost of an LLM invocation.
 * Records token count, model name, provider, and estimated cost in USD and micro-cents.
 */
export function logLlmCost(response: LLMResponse, context?: { tenantId?: string; correlationId?: string; capability?: string }): void {
  const tokensUsed = response.tokensUsed ?? 0;
  const costPer1k = getCostPer1k(response.provider);
  const estimatedCostUsd = (tokensUsed / 1000) * costPer1k;
  // micro-cents = USD * 1_000_000 * 100 (1 micro-cent = 1e-8 USD); store as integer
  const costMicroCents = Math.round(estimatedCostUsd * 1_000_000 * 100);

  logger.log(
    `LLM cost: provider=${response.provider} model=${response.model} tokens=${tokensUsed} estimatedCost=$${estimatedCostUsd.toFixed(6)} (${costMicroCents} micro-cents)`,
  );

  // Structured log for downstream aggregation (e.g. by monitoring/observability stack)
  logger.log(
    JSON.stringify({
      type: 'llm_cost',
      provider: response.provider,
      model: response.model,
      tokensUsed,
      estimatedCostUsd: Number(estimatedCostUsd.toFixed(8)),
      costMicroCents,
      cached: response.cached ?? false,
      tenantId: context?.tenantId ?? null,
      correlationId: context?.correlationId ?? null,
      capability: context?.capability ?? null,
    }),
  );
}
