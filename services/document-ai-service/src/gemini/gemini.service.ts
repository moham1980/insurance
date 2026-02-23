import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY is not set');
    }

    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-pro';

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: modelName,
      generationConfig: {
        temperature: 0.1,
        topK: 32,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
    });
  }

  async analyzeImage(imageData: Buffer, mimeType: string, prompt: string): Promise<string> {
    try {
      const imagePart = {
        inlineData: {
          data: imageData.toString('base64'),
          mimeType: mimeType,
        },
      };

      const result = await this.model.generateContent([
        prompt,
        imagePart,
      ]);

      return result.response.text();
    } catch (error) {
      this.logger.error('Error analyzing image with Gemini:', error);
      throw error;
    }
  }

  async analyzeDocument(documentText: string, analysisType: 'insurance' | 'general' = 'insurance'): Promise<{
    summary: string;
    keyPoints: string[];
    riskLevel: 'low' | 'medium' | 'high';
    recommendations: string[];
  }> {
    try {
      const prompt = analysisType === 'insurance' 
        ? `Analyze this insurance document and provide:
           1. A concise summary
           2. Key points extracted
           3. Risk level assessment (low/medium/high)
           4. Recommendations for next steps
           
           Document content: ${documentText}`
        : `Analyze this document and provide a structured analysis with summary and key points.`;

      const result = await this.model.generateContent(prompt);
      const response = result.response.text();

      // Parse the response (you may need to adjust this based on actual response format)
      return {
        summary: response.substring(0, 500), // First 500 chars as summary
        keyPoints: this.extractKeyPoints(response),
        riskLevel: this.assessRiskLevel(response),
        recommendations: this.extractRecommendations(response),
      };
    } catch (error) {
      this.logger.error('Error analyzing document with Gemini:', error);
      throw error;
    }
  }

  async extractTextFromImage(imageData: Buffer, mimeType: string): Promise<string> {
    try {
      const imagePart = {
        inlineData: {
          data: imageData.toString('base64'),
          mimeType: mimeType,
        },
      };

      const prompt = 'Extract all text from this image. Return only the extracted text without any additional commentary.';
      const result = await this.model.generateContent([prompt, imagePart]);
      
      return result.response.text();
    } catch (error) {
      this.logger.error('Error extracting text from image with Gemini:', error);
      throw error;
    }
  }

  private extractKeyPoints(response: string): string[] {
    // Simple extraction - you may want to use regex or more sophisticated parsing
    const keyPointsMatch = response.match(/(?:key points|important|notable)[\s\S]*/i);
    if (keyPointsMatch) {
      return keyPointsMatch[0].split('\n')
        .filter(line => line.trim() && !line.match(/key points|important|notable/i))
        .map(line => line.replace(/^[-*]\s*/, '').trim())
        .slice(0, 5);
    }
    return [];
  }

  private assessRiskLevel(response: string): 'low' | 'medium' | 'high' {
    const text = response.toLowerCase();
    if (text.includes('high risk') || text.includes('critical') || text.includes('urgent')) {
      return 'high';
    } else if (text.includes('medium risk') || text.includes('moderate')) {
      return 'medium';
    }
    return 'low';
  }

  private extractRecommendations(response: string): string[] {
    const recommendationsMatch = response.match(/(?:recommendations|suggestions|next steps)[\s\S]*/i);
    if (recommendationsMatch) {
      return recommendationsMatch[0].split('\n')
        .filter(line => line.trim() && !line.match(/recommendations|suggestions|next steps/i))
        .map(line => line.replace(/^[-*]\s*/, '').trim())
        .slice(0, 5);
    }
    return [];
  }
}
