import { Injectable, Logger } from '@nestjs/common';

export interface EcosystemAiConsultRequest {
  query: string;
  context?: string;
  contextType?: 'claim' | 'document' | 'policy' | 'complaint';
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  correlationId?: string;
  tenantId?: string;
  userId?: string;
}

export interface EcosystemAiConsultResponse {
  text: string;
  model: string;
  provider: string;
  citations?: Array<{ source: string; snippet: string }>;
  raw?: any;
}

/**
 * EcosystemAiClient
 * Lightweight HTTP client for calling ecosystem-ai-gateway from orchestrator sagas.
 * Used for AI-assisted claim assessment and other consultative use-cases during saga execution.
 *
 * Environment variables:
 * - ECOSYSTEM_AI_GATEWAY_URL: Base URL of ecosystem-ai-gateway (default: http://localhost:8540)
 * - ECOSYSTEM_AI_TIMEOUT_MS: Request timeout (default: 60000)
 */
@Injectable()
export class EcosystemAiClient {
  private readonly logger = new Logger(EcosystemAiClient.name);
  private readonly gatewayUrl: string;
  private readonly timeoutMs: number;

  constructor() {
    this.gatewayUrl = process.env.ECOSYSTEM_AI_GATEWAY_URL || 'http://localhost:8540';
    this.timeoutMs = parseInt(process.env.ECOSYSTEM_AI_TIMEOUT_MS || '60000', 10);
  }

  async consult(request: EcosystemAiConsultRequest): Promise<EcosystemAiConsultResponse> {
    const endpoint = `${this.gatewayUrl}/api/v1/ecosystem-ai/consult`;

    const envelope = {
      query: request.query,
      context: request.context || '',
      contextType: request.contextType || 'general',
      systemPrompt: request.systemPrompt,
      parameters: {
        maxTokens: request.maxTokens || 2000,
        temperature: request.temperature ?? 0.5,
      },
      metadata: {
        source: 'orchestrator-service',
        correlationId: request.correlationId,
        tenantId: request.tenantId,
        userId: request.userId,
      },
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(request.correlationId ? { 'X-Correlation-Id': request.correlationId } : {}),
        },
        body: JSON.stringify(envelope),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Ecosystem AI gateway returned ${response.status}: ${errorBody}`);
      }

      const result = await response.json() as any;

      return {
        text: result.response || result.text || result.content || '',
        model: result.model || 'ecosystem-ai',
        provider: 'ecosystem',
        citations: result.citations || [],
        raw: result,
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Ecosystem AI gateway timeout');
      }
      this.logger.error(`Ecosystem AI consult failed: ${error.message}`);
      throw error;
    }
  }

  async consultClaimAssessment(params: {
    claimId: string;
    claimSummary: string;
    documentsSummary?: string;
    policyDetails?: string;
    correlationId?: string;
  }): Promise<{ recommendation: string; riskLevel: string; reasoning: string }> {
    const context = [
      `Claim ID: ${params.claimId}`,
      `Claim Summary: ${params.claimSummary}`,
      params.documentsSummary ? `Documents: ${params.documentsSummary}` : '',
      params.policyDetails ? `Policy: ${params.policyDetails}` : '',
    ].filter(Boolean).join('\n');

    const response = await this.consult({
      query: 'بر اساس اطلاعات خسارت زیر، ارزیابی ریسک و توصیه برای تصمیم‌گیری ارائه بده. شامل: ۱. توصیه کلی ۲. سطح ریسک ۳. دلیل',
      context,
      contextType: 'claim',
      systemPrompt: 'You are an expert insurance claim assessor. Provide assessment in Persian (Farsi).',
      maxTokens: 1500,
      temperature: 0.3,
      correlationId: params.correlationId,
    });

    return {
      recommendation: response.text,
      riskLevel: 'medium',
      reasoning: response.text,
    };
  }
}
