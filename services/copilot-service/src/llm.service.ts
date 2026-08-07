import { Injectable, Logger } from '@nestjs/common';
import * as http from 'node:http';
import * as https from 'node:https';
import { ModelRouter } from './model-router';
import { logLlmCost } from './cost-logger';

export type LLMProvider = 'openai' | 'gemini' | 'deepseek' | 'ollama';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  baseUrl?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

export interface LLMResponse {
  text: string;
  model: string;
  tokensUsed?: number;
  provider: LLMProvider;
  cached?: boolean;
}

@Injectable()
export class LLMService {
  private readonly logger = new Logger(LLMService.name);
  private readonly configs: Map<LLMProvider, LLMConfig> = new Map();

  constructor(private readonly modelRouter: ModelRouter) {
    this.loadConfigs();
  }

  private loadConfigs() {
    // Load OpenAI config
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      this.configs.set('openai', {
        provider: 'openai',
        apiKey: openaiKey,
        baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
        model: process.env.OPENAI_MODEL || 'gpt-4',
        maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000', 10),
        temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
        timeout: parseInt(process.env.OPENAI_TIMEOUT || '30000', 10),
      });
    }

    // Load Gemini config
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      this.configs.set('gemini', {
        provider: 'gemini',
        apiKey: geminiKey,
        baseUrl: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta',
        model: process.env.GEMINI_MODEL || 'gemini-pro',
        maxTokens: parseInt(process.env.GEMINI_MAX_TOKENS || '2000', 10),
        temperature: parseFloat(process.env.GEMINI_TEMPERATURE || '0.7'),
        timeout: parseInt(process.env.GEMINI_TIMEOUT || '30000', 10),
      });
    }

    // Load DeepSeek config
    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    if (deepseekKey) {
      this.configs.set('deepseek', {
        provider: 'deepseek',
        apiKey: deepseekKey,
        baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
        model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
        maxTokens: parseInt(process.env.DEEPSEEK_MAX_TOKENS || '2000', 10),
        temperature: parseFloat(process.env.DEEPSEEK_TEMPERATURE || '0.7'),
        timeout: parseInt(process.env.DEEPSEEK_TIMEOUT || '30000', 10),
      });
    }

    // Load Ollama config
    const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.configs.set('ollama', {
      provider: 'ollama',
      apiKey: 'ollama', // Ollama doesn't require API key
      baseUrl: ollamaUrl,
      model: process.env.OLLAMA_MODEL || 'llama2',
      maxTokens: parseInt(process.env.OLLAMA_MAX_TOKENS || '2000', 10),
      temperature: parseFloat(process.env.OLLAMA_TEMPERATURE || '0.7'),
      timeout: parseInt(process.env.OLLAMA_TIMEOUT || '60000', 10),
    });

    this.logger.log(`Loaded ${this.configs.size} LLM provider(s)`);
  }

  getAvailableProviders(): LLMProvider[] {
    return Array.from(this.configs.keys());
  }

  hasProvider(provider: LLMProvider): boolean {
    return this.configs.has(provider);
  }

  private async httpPost(url: string, headers: Record<string, string>, body: any, timeout: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const parsed = new URL(url);
      const lib = parsed.protocol === 'https:' ? https : http;

      const req = lib.request(
        {
          method: 'POST',
          hostname: parsed.hostname,
          port: parsed.port ? Number(parsed.port) : parsed.protocol === 'https:' ? 443 : 80,
          path: `${parsed.pathname}${parsed.search}`,
          headers,
          timeout,
        },
        (res) => {
          const status = res.statusCode ?? 0;
          let data = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            if (status < 200 || status >= 300) {
              return reject(new Error(`HTTP ${status}: ${data}`));
            }
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(e);
            }
          });
        }
      );

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.write(JSON.stringify(body));
      req.end();
    });
  }

  /**
   * Main generation entrypoint with model routing.
   * Applies costBudgetPerDay and qualityThreshold via ModelRouter.
   */
  async generate(options: {
    prompt: string;
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
    provider?: LLMProvider;
    costBudgetPerDay?: number;
    qualityThreshold?: number;
    preferLowCost?: boolean;
  }): Promise<LLMResponse> {
    const estimatedTokens = this.estimateTokens(options.prompt, options.systemPrompt, options.maxTokens);

    // If provider is explicitly specified, use it directly (but still record usage)
    const provider = options.provider
      ? options.provider
      : this.modelRouter.route(estimatedTokens, {
          costBudgetPerDay: options.costBudgetPerDay,
          qualityThreshold: options.qualityThreshold,
          preferLowCost: options.preferLowCost,
        }).provider;

    if (!options.provider) {
      const route = this.modelRouter.route(estimatedTokens, {
        costBudgetPerDay: options.costBudgetPerDay,
        qualityThreshold: options.qualityThreshold,
        preferLowCost: options.preferLowCost,
      });
      this.logger.log(`ModelRouter selected: ${route.provider}/${route.model} (estimated $${route.estimatedCost.toFixed(4)}, quality ${route.qualityScore})`);
    }

    const response = await this.generateText(provider, options.prompt, {
      systemPrompt: options.systemPrompt,
      maxTokens: options.maxTokens,
      temperature: options.temperature,
    });

    this.modelRouter.recordUsage(response.provider, response.tokensUsed || estimatedTokens);
    return response;
  }

  private estimateTokens(prompt: string, systemPrompt?: string, maxTokens?: number): number {
    // Rough estimation: 1 token ≈ 4 chars for Latin, 2 chars for Persian/CJK
    const text = `${systemPrompt || ''}\n${prompt}`;
    const charTokenRatio = /[\u0600-\u06FF\u4E00-\u9FFF]/.test(text) ? 2 : 4;
    const promptTokens = Math.ceil(text.length / charTokenRatio);
    return promptTokens + (maxTokens || 1000);
  }

  async generateText(
    provider: LLMProvider,
    prompt: string,
    options?: {
      systemPrompt?: string;
      maxTokens?: number;
      temperature?: number;
    }
  ): Promise<LLMResponse> {
    const config = this.configs.get(provider);
    if (!config) {
      throw new Error(`Provider ${provider} not configured`);
    }

    const maxTokens = options?.maxTokens ?? config.maxTokens;
    const temperature = options?.temperature ?? config.temperature;

    try {
      let response: LLMResponse;
      if (provider === 'openai' || provider === 'deepseek') {
        response = await this.callOpenAICompatible(config, prompt, options?.systemPrompt, maxTokens, temperature, provider);
      } else if (provider === 'gemini') {
        response = await this.callGemini(config, prompt, options?.systemPrompt, maxTokens, temperature);
      } else if (provider === 'ollama') {
        response = await this.callOllama(config, prompt, options?.systemPrompt, maxTokens, temperature);
      } else {
        throw new Error(`Unsupported provider: ${provider}`);
      }
      // Cost tracking: log token count, model name, and estimated cost after each AI provider call
      logLlmCost(response);
      return response;
    } catch (error: any) {
      this.logger.error(`LLM call failed for provider ${provider}: ${error.message}`);
      throw error;
    }
  }

  private async callOpenAICompatible(
    config: LLMConfig,
    prompt: string,
    systemPrompt: string | undefined,
    maxTokens: number,
    temperature: number,
    provider: LLMProvider
  ): Promise<LLMResponse> {
    const url = `${config.baseUrl}/chat/completions`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    };

    const messages: any[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const body = {
      model: config.model,
      messages,
      max_tokens: maxTokens,
      temperature,
    };

    const response = await this.httpPost(url, headers, body, config.timeout || 30000);

    return {
      text: response.choices?.[0]?.message?.content || '',
      model: response.model || config.model,
      tokensUsed: response.usage?.total_tokens,
      provider,
    };
  }

  private async callGemini(
    config: LLMConfig,
    prompt: string,
    systemPrompt: string | undefined,
    maxTokens: number,
    temperature: number
  ): Promise<LLMResponse> {
    const url = `${config.baseUrl}/models/${config.model}:generateContent?key=${config.apiKey}`;
    const headers = {
      'Content-Type': 'application/json',
    };

    const contents: any[] = [];
    if (systemPrompt) {
      contents.push({ role: 'user', parts: [{ text: systemPrompt }] });
      contents.push({ role: 'model', parts: [{ text: 'Understood. Please proceed.' }] });
    }
    contents.push({ role: 'user', parts: [{ text: prompt }] });

    const body = {
      contents,
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature,
      },
    };

    const response = await this.httpPost(url, headers, body, config.timeout || 30000);

    return {
      text: response.candidates?.[0]?.content?.parts?.[0]?.text || '',
      model: config.model,
      tokensUsed: response.usageMetadata?.totalTokenCount,
      provider: 'gemini',
    };
  }

  private async callOllama(
    config: LLMConfig,
    prompt: string,
    systemPrompt: string | undefined,
    maxTokens: number,
    temperature: number
  ): Promise<LLMResponse> {
    const url = `${config.baseUrl}/api/generate`;
    const headers = {
      'Content-Type': 'application/json',
    };

    const body = {
      model: config.model,
      prompt,
      system: systemPrompt,
      options: {
        num_predict: maxTokens,
        temperature,
      },
      stream: false,
    };

    const response = await this.httpPost(url, headers, body, config.timeout || 60000);

    return {
      text: response.response || '',
      model: config.model,
      tokensUsed: response.eval_count,
      provider: 'ollama',
    };
  }

  async generateWithFallback(
    providers: LLMProvider[],
    prompt: string,
    options?: {
      systemPrompt?: string;
      maxTokens?: number;
      temperature?: number;
    }
  ): Promise<LLMResponse> {
    const errors: Array<{ provider: LLMProvider; error: string }> = [];

    for (const provider of providers) {
      if (!this.hasProvider(provider)) {
        this.logger.warn(`Provider ${provider} not configured, skipping`);
        continue;
      }

      try {
        return await this.generateText(provider, prompt, options);
      } catch (error: any) {
        this.logger.error(`Provider ${provider} failed: ${error.message}`);
        errors.push({ provider, error: error.message });
      }
    }

    throw new Error(`All providers failed: ${errors.map(e => `${e.provider}: ${e.error}`).join(', ')}`);
  }

  async generateSummary(
    context: string,
    contextType: 'claim' | 'document' | 'policy' | 'complaint',
    provider?: LLMProvider
  ): Promise<LLMResponse> {
    const systemPrompt = this.getSummarySystemPrompt(contextType);
    const userPrompt = this.getSummaryUserPrompt(context, contextType);

    if (provider) {
      return this.generateText(provider, userPrompt, {
        systemPrompt,
        maxTokens: 1000,
        temperature: 0.5,
      });
    }

    return this.generate({
      prompt: userPrompt,
      systemPrompt,
      maxTokens: 1000,
      temperature: 0.5,
    });
  }

  async answerQuestion(
    context: string,
    question: string,
    contextType: 'claim' | 'document' | 'policy' | 'complaint',
    provider?: LLMProvider
  ): Promise<LLMResponse> {
    const systemPrompt = this.getQASystemPrompt(contextType);
    const userPrompt = this.getQAUserPrompt(context, question);

    if (provider) {
      return this.generateText(provider, userPrompt, {
        systemPrompt,
        maxTokens: 1500,
        temperature: 0.3,
      });
    }

    return this.generate({
      prompt: userPrompt,
      systemPrompt,
      maxTokens: 1500,
      temperature: 0.3,
    });
  }

  async generateNextBestAction(
    context: string,
    contextType: 'claim' | 'policy' | 'complaint',
    provider?: LLMProvider
  ): Promise<LLMResponse> {
    const systemPrompt = this.getNextBestActionSystemPrompt(contextType);
    const userPrompt = this.getNextBestActionUserPrompt(context);

    if (provider) {
      return this.generateText(provider, userPrompt, {
        systemPrompt,
        maxTokens: 800,
        temperature: 0.4,
      });
    }

    return this.generate({
      prompt: userPrompt,
      systemPrompt,
      maxTokens: 800,
      temperature: 0.4,
    });
  }

  private getSummarySystemPrompt(contextType: string): string {
    return `You are an expert insurance analyst. Your task is to provide a concise, accurate summary of the ${contextType} information provided below. Focus on key details, amounts, dates, and status. Write in Persian (Farsi).`;
  }

  private getSummaryUserPrompt(context: string, contextType: string): string {
    return `Context (${contextType}):\n\n${context}\n\nPlease provide a concise summary in Persian.`;
  }

  private getQASystemPrompt(contextType: string): string {
    return `You are an expert insurance analyst. Answer the user's question based on the ${contextType} context provided. Be accurate, concise, and cite specific details from the context. If the answer cannot be found in the context, state that clearly. Write in Persian (Farsi).`;
  }

  private getQAUserPrompt(context: string, question: string): string {
    return `Context:\n\n${context}\n\nQuestion: ${question}\n\nAnswer in Persian.`;
  }

  private getNextBestActionSystemPrompt(contextType: string): string {
    return `You are an expert insurance analyst. Based on the ${contextType} context, suggest the most appropriate next action(s) for the case handler. Prioritize actions that resolve issues efficiently and improve customer experience. Provide specific, actionable recommendations. Write in Persian (Farsi).`;
  }

  private getNextBestActionUserPrompt(context: string): string {
    return `Context:\n\n${context}\n\nWhat are the recommended next actions for this case? Provide specific, actionable recommendations in Persian.`;
  }
}
