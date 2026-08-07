import { Logger } from '@nestjs/common';
import { OcrProvider, OcrResult } from './ocr/ocr.service';

const logger = new Logger('CostLogger');

// Approximate cost per page (in USD) by OCR provider — used for estimated cost logging.
// These are rough defaults and can be overridden via env (DOCUMENT_AI_COST_PER_PAGE_<PROVIDER>).
const DEFAULT_COST_PER_PAGE: Record<OcrProvider, number> = {
  [OcrProvider.TESSERACT]: 0, // local engine — no per-page cost
  [OcrProvider.GOOGLE_VISION]: 0.0015, // ~$1.50 per 1000 pages (DOCUMENT_TEXT_DETECTION)
};

function getCostPerPage(provider: OcrProvider): number {
  const envKey = `DOCUMENT_AI_COST_PER_PAGE_${provider.toUpperCase()}`;
  const envVal = process.env[envKey];
  if (envVal) {
    const parsed = parseFloat(envVal);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return DEFAULT_COST_PER_PAGE[provider] ?? 0;
}

/**
 * Logs the estimated cost of an OCR extraction.
 * Records provider, page/image size, processing time, and estimated cost in USD and micro-cents.
 */
export function logOcrCost(
  result: OcrResult,
  context?: { tenantId?: string; correlationId?: string; bytes?: number },
): void {
  const costPerPage = getCostPerPage(result.provider);
  // Estimate pages: for single-image OCR, assume 1 page; for large buffers, estimate by size.
  const estimatedPages = context?.bytes && context.bytes > 500_000 ? Math.ceil(context.bytes / 500_000) : 1;
  const estimatedCostUsd = estimatedPages * costPerPage;
  // micro-cents = USD * 1_000_000 * 100 (1 micro-cent = 1e-8 USD); store as integer
  const costMicroCents = Math.round(estimatedCostUsd * 1_000_000 * 100);
  const charCount = result.text.length;

  logger.log(
    `OCR cost: provider=${result.provider} pages=${estimatedPages} chars=${charCount} processingMs=${result.processingTimeMs} estimatedCost=$${estimatedCostUsd.toFixed(6)} (${costMicroCents} micro-cents)`,
  );

  // Structured log for downstream aggregation (e.g. by monitoring/observability stack)
  logger.log(
    JSON.stringify({
      type: 'ocr_cost',
      provider: result.provider,
      estimatedPages,
      charCount,
      confidence: result.confidence,
      processingTimeMs: result.processingTimeMs,
      estimatedCostUsd: Number(estimatedCostUsd.toFixed(8)),
      costMicroCents,
      tenantId: context?.tenantId ?? null,
      correlationId: context?.correlationId ?? null,
    }),
  );
}
