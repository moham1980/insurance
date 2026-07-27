import { Injectable, Logger } from '@nestjs/common';

export interface EcosystemAiRequest {
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

export interface EcosystemAiResponse {
  text: string;
  model: string;
  provider: string;
  tokensUsed?: number;
  citations?: Array<{ source: string; snippet: string }>;
  raw?: any;
}

/**
 * EcosystemAiProvider
 * Routes AI requests to the ecosystem AI gateway (port 8540) when ECOSYSTEM_AI_ENABLED=true.
 * Falls back to local LLM providers when the gateway is unavailable.
 *
 * Environment variables:
 * - ECOSYSTEM_AI_ENABLED: 'true' to enable ecosystem routing (default: 'false')
 * - ECOSYSTEM_AI_GATEWAY_URL: Base URL of ecosystem-ai-gateway (default: http://localhost:8540)
 * - ECOSYSTEM_AI_TIMEOUT_MS: Request timeout (default: 60000)
 */
@Injectable()
export class EcosystemAiProvider {
  private readonly logger = new Logger(EcosystemAiProvider.name);
  private readonly enabled: boolean;
  private readonly gatewayUrl: string;
  private readonly timeoutMs: number;

  constructor() {
    this.enabled = process.env.ECOSYSTEM_AI_ENABLED === 'true';
    this.gatewayUrl = process.env.ECOSYSTEM_AI_GATEWAY_URL || 'http://localhost:8540';
    this.timeoutMs = parseInt(process.env.ECOSYSTEM_AI_TIMEOUT_MS || '60000', 10);

    if (this.enabled) {
      this.logger.log(`Ecosystem AI provider enabled, gateway: ${this.gatewayUrl}`);
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async consult(request: EcosystemAiRequest): Promise<EcosystemAiResponse> {
    if (!this.enabled) {
      throw new Error('Ecosystem AI provider is not enabled');
    }

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
        source: 'insurance-copilot',
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
          ...(request.tenantId ? { 'X-Tenant-Id': request.tenantId } : {}),
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
        tokensUsed: result.tokensUsed || result.usage?.total_tokens,
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

  async ragQuery(query: string, context?: string, correlationId?: string): Promise<EcosystemAiResponse> {
    if (!this.enabled) {
      throw new Error('Ecosystem AI provider is not enabled');
    }

    const endpoint = `${this.gatewayUrl}/api/v1/ecosystem-ai/rag-compat`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(correlationId ? { 'X-Correlation-Id': correlationId } : {}),
        },
        body: JSON.stringify({
          query,
          context: context || '',
          topK: 5,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Ecosystem AI RAG returned ${response.status}: ${errorBody}`);
      }

      const result = await response.json() as any;

      return {
        text: result.answer || result.response || '',
        model: result.model || 'ecosystem-ai-rag',
        provider: 'ecosystem',
        citations: result.citations || result.sources || [],
        raw: result,
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Ecosystem AI RAG timeout');
      }
      this.logger.error(`Ecosystem AI RAG failed: ${error.message}`);
      throw error;
    }
  }
}
