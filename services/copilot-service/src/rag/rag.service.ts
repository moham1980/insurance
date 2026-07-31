import { Injectable, Logger } from '@nestjs/common';
import { EcosystemAiProvider } from '../ecosystem-ai.provider';
import { LLMService } from '../llm.service';

export interface RagSource {
  source: string;
  snippet: string;
  relevance: number;
}

export interface RagResult {
  answer: string;
  sources: RagSource[];
  confidence: number;
  model: string;
  provider: string;
}

/**
 * RagService — Retrieval-Augmented Generation for Copilot.
 *
 * Uses the ecosystem AI gateway's rag-compat endpoint when available,
 * falling back to local LLM with inline context retrieval.
 *
 * Constraints:
 * - PII is redacted before sending to any external LLM/provider.
 * - Every response includes source references and confidence.
 */
@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    private readonly ecosystemAi: EcosystemAiProvider,
    private readonly llmService: LLMService,
  ) {}

  /**
   * Retrieve relevant documents and generate an answer with citations.
   */
  async retrieveAndGenerate(params: {
    query: string;
    context?: string;
    contextType?: 'claim' | 'document' | 'policy' | 'complaint';
    tenantId?: string;
    actorUserId?: string;
    correlationId?: string;
    headers?: Record<string, any>;
  }): Promise<RagResult> {
    const { query, context, contextType, tenantId, correlationId } = params;

    // PII redaction — remove national IDs, card numbers, phone numbers
    const redactedQuery = this.redactPII(query);
    const redactedContext = context ? this.redactPII(context) : undefined;

    // Try ecosystem AI gateway rag-compat endpoint first
    if (this.ecosystemAi.isEnabled()) {
      try {
        const response = await this.ecosystemAi.consult({
          query: redactedQuery,
          context: redactedContext,
          contextType: contextType as any,
          correlationId,
          tenantId,
          userId: params.actorUserId,
        });

        return {
          answer: response.text,
          sources: (response.citations || []).map((c, i) => ({
            source: c.source,
            snippet: c.snippet,
            relevance: 1 - i * 0.1,
          })),
          confidence: 0.85,
          model: response.model,
          provider: response.provider,
        };
      } catch (err: any) {
        this.logger.warn(`Ecosystem AI RAG failed, falling back to local LLM: ${err.message}`);
      }
    }

    // Fallback: use local LLM with context as inline retrieval
    const systemPrompt = this.buildSystemPrompt(contextType);
    const prompt = redactedContext
      ? `Context: ${redactedContext}\n\nQuestion: ${redactedQuery}`
      : `Question: ${redactedQuery}`;

    const llmResponse = await this.llmService.generate({
      provider: 'deepseek',
      prompt,
      systemPrompt,
    });

    return {
      answer: llmResponse.text,
      sources: redactedContext
        ? [{ source: 'inline-context', snippet: redactedContext.substring(0, 200), relevance: 1.0 }]
        : [],
      confidence: 0.7,
      model: llmResponse.model,
      provider: llmResponse.provider,
    };
  }

  /**
   * Recommend a product based on customer profile and needs.
   */
  async recommendProduct(params: {
    customerId?: string;
    customerProfile?: any;
    productType?: string;
    budget?: number;
    riskFactors?: string[];
    tenantId?: string;
    actorUserId?: string;
    correlationId?: string;
    headers?: Record<string, any>;
  }): Promise<{
    recommendations: Array<{
      productId: string;
      productName: string;
      reason: string;
      confidence: number;
      estimatedPremium?: number;
    }>;
    model: string;
    provider: string;
  }> {
    const { customerProfile, productType, budget, riskFactors } = params;

    const profileSummary = customerProfile
      ? this.redactPII(JSON.stringify(customerProfile))
      : 'No profile data available';

    const systemPrompt = `You are an insurance product recommendation assistant. Based on the customer profile, recommend suitable insurance products. Provide product ID, name, reason, and confidence score (0-1). Respond in JSON format: {"recommendations": [{"productId": "", "productName": "", "reason": "", "confidence": 0.0, "estimatedPremium": 0}]}`;

    const prompt = `Customer Profile: ${profileSummary}
Product Type: ${productType || 'any'}
Budget: ${budget || 'not specified'}
Risk Factors: ${(riskFactors || []).join(', ') || 'none'}

Recommend 3 suitable insurance products.`;

    let response;
    if (this.ecosystemAi.isEnabled()) {
      try {
        response = await this.ecosystemAi.consult({
          query: prompt,
          systemPrompt,
          correlationId: params.correlationId,
          tenantId: params.tenantId,
          userId: params.actorUserId,
        });
      } catch {
        response = null;
      }
    }

    if (!response) {
      const llmResponse = await this.llmService.generate({
        provider: 'deepseek',
        prompt,
        systemPrompt,
      });
      response = {
        text: llmResponse.text,
        model: llmResponse.model,
        provider: llmResponse.provider,
      };
    }

    // Parse recommendations from LLM response
    let recommendations: any[] = [];
    try {
      const parsed = JSON.parse(response.text);
      recommendations = parsed.recommendations || [];
    } catch {
      // If not valid JSON, create a single recommendation from the text
      recommendations = [{
        productId: 'unknown',
        productName: 'AI Recommendation',
        reason: response.text,
        confidence: 0.7,
      }];
    }

    return {
      recommendations,
      model: response.model,
      provider: response.provider,
    };
  }

  /**
   * Draft a communication (email/SMS) based on context.
   */
  async draftCommunication(params: {
    type: 'email' | 'sms' | 'letter';
    recipient?: string;
    subject?: string;
    context?: string;
    contextType?: 'claim' | 'policy' | 'complaint';
    tone?: 'formal' | 'friendly' | 'urgent';
    language?: 'fa' | 'en';
    tenantId?: string;
    actorUserId?: string;
    correlationId?: string;
    headers?: Record<string, any>;
  }): Promise<{
    draft: string;
    subject?: string;
    model: string;
    provider: string;
  }> {
    const { type, subject, context, contextType, tone, language } = params;

    const redactedContext = context ? this.redactPII(context) : '';

    const systemPrompt = `You are a professional communication drafter for an insurance company. Draft a ${type} in ${language === 'fa' ? 'Persian (Farsi)' : 'English'} with a ${tone || 'formal'} tone. The communication should be clear, professional, and reference the relevant insurance context. Do not include actual PII — use placeholders like [customer_name], [policy_number], etc.`;

    const prompt = `Communication Type: ${type}
Subject: ${subject || 'N/A'}
Context Type: ${contextType || 'general'}
Context: ${redactedContext}
Tone: ${tone || 'formal'}
Language: ${language || 'fa'}

Draft the ${type}:`;

    let response;
    if (this.ecosystemAi.isEnabled()) {
      try {
        response = await this.ecosystemAi.consult({
          query: prompt,
          systemPrompt,
          correlationId: params.correlationId,
          tenantId: params.tenantId,
          userId: params.actorUserId,
        });
      } catch {
        response = null;
      }
    }

    if (!response) {
      const llmResponse = await this.llmService.generate({
        provider: 'deepseek',
        prompt,
        systemPrompt,
      });
      response = {
        text: llmResponse.text,
        model: llmResponse.model,
        provider: llmResponse.provider,
      };
    }

    return {
      draft: response.text,
      subject: type === 'email' ? subject : undefined,
      model: response.model,
      provider: response.provider,
    };
  }

  private buildSystemPrompt(contextType?: string): string {
    const base = 'You are an insurance assistant. Provide accurate, helpful answers based on the context. Always cite sources.';
    if (contextType === 'claim') {
      return `${base} You are assisting with a claim-related question.`;
    }
    if (contextType === 'policy') {
      return `${base} You are assisting with a policy-related question.`;
    }
    return base;
  }

  private redactPII(text: string): string {
    if (!text) return text;
    // National ID (10 digits)
    let redacted = text.replace(/\b\d{10}\b/g, '[REDACTED_NATIONAL_ID]');
    // Card number (16 digits)
    redacted = redacted.replace(/\b\d{16}\b/g, '[REDACTED_CARD]');
    // IBAN (IR + 24 digits)
    redacted = redacted.replace(/\bIR\d{24}\b/gi, '[REDACTED_IBAN]');
    // Phone number (Iranian format)
    redacted = redacted.replace(/\b09\d{9}\b/g, '[REDACTED_PHONE]');
    redacted = redacted.replace(/\b\+98\d{10}\b/g, '[REDACTED_PHONE]');
    // Email
    redacted = redacted.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[REDACTED_EMAIL]');
    return redacted;
  }
}
