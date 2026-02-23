import { Injectable, Logger } from '@nestjs/common';
import { request } from 'undici';

type DeepSeekRole = 'system' | 'user' | 'assistant';

@Injectable()
export class DeepSeekService {
  private readonly logger = new Logger(DeepSeekService.name);

  private readonly baseUrl = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '');
  private readonly apiKey = process.env.DEEPSEEK_API_KEY;
  private readonly model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

  async analyzeText(input: {
    text: string;
    task?: 'insurance_document' | 'general';
    language?: 'fa' | 'en' | 'auto';
  }): Promise<{ summary: string; keyPoints: string[]; raw: string }> {
    if (!this.apiKey) {
      throw new Error('DEEPSEEK_API_KEY is not set');
    }

    const task = input.task || 'insurance_document';
    const language = input.language || 'auto';

    const system =
      task === 'insurance_document'
        ? 'You are an expert insurance claims analyst. Return concise, structured output.'
        : 'You are a helpful analyst. Return concise, structured output.';

    const userPrompt =
      language === 'fa'
        ? `متن زیر را تحلیل کن و خروجی را دقیقاً با این قالب برگردان:\n\nSUMMARY: ...\nKEY_POINTS:\n- ...\n- ...\n\nTEXT:\n${input.text}`
        : `Analyze the text and return output exactly in this format:\n\nSUMMARY: ...\nKEY_POINTS:\n- ...\n- ...\n\nTEXT:\n${input.text}`;

    const body = {
      model: this.model,
      messages: [
        { role: 'system' as DeepSeekRole, content: system },
        { role: 'user' as DeepSeekRole, content: userPrompt },
      ],
      temperature: 0.2,
    };

    const url = `${this.baseUrl}/v1/chat/completions`;

    try {
      const res = await request(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      });

      const json = (await res.body.json()) as any;
      const raw = json?.choices?.[0]?.message?.content;
      if (!raw || typeof raw !== 'string') {
        throw new Error('DeepSeek response missing content');
      }

      const { summary, keyPoints } = this.parseStructured(raw);
      return { summary, keyPoints, raw };
    } catch (error) {
      this.logger.error('DeepSeek analyzeText failed', error as any);
      throw error;
    }
  }

  private parseStructured(raw: string): { summary: string; keyPoints: string[] } {
    const summaryMatch = raw.match(/SUMMARY:\s*([\s\S]*?)(?:\nKEY_POINTS:|$)/i);
    const keyPointsMatch = raw.match(/KEY_POINTS:\s*([\s\S]*)/i);

    const summary = (summaryMatch?.[1] || raw).trim();

    const keyPointsBlock = (keyPointsMatch?.[1] || '').trim();
    const keyPoints = keyPointsBlock
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('-'))
      .map((l) => l.replace(/^[-]\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 10);

    return { summary, keyPoints };
  }
}
