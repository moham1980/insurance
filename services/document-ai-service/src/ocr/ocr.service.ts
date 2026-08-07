import { Injectable, Logger } from '@nestjs/common';
import * as Tesseract from 'tesseract.js';
import * as vision from '@google-cloud/vision';
import { logOcrCost } from '../cost-logger';

export enum OcrProvider {
  TESSERACT = 'tesseract',
  GOOGLE_VISION = 'google_vision',
}

export enum DocumentFormat {
  PDF = 'application/pdf',
  JPEG = 'image/jpeg',
  PNG = 'image/png',
  TIFF = 'image/tiff',
  BMP = 'image/bmp',
  GIF = 'image/gif',
  DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  DOC = 'application/msword',
  XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  XLS = 'application/vnd.ms-excel',
  EML = 'message/rfc822',
  MSG = 'application/vnd.ms-outlook',
}

export interface OcrResult {
  text: string;
  confidence: number;
  provider: OcrProvider;
  processingTimeMs: number;
  format: DocumentFormat;
  regions?: Array<{
    text: string;
    confidence: number;
    boundingBox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
}

export interface ImagePreprocessingOptions {
  grayscale?: boolean;
  binarize?: boolean;
  deskew?: boolean;
  enhanceContrast?: boolean;
  resizeWidth?: number;
  handwritingMode?: boolean;
}

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private visionClient: vision.ImageAnnotatorClient | null = null;

  constructor() {
    // Initialize Google Vision client if credentials are provided
    if (process.env.GOOGLE_CLOUD_PROJECT && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      try {
        this.visionClient = new vision.ImageAnnotatorClient();
        this.logger.log('Google Vision client initialized');
      } catch (error) {
        this.logger.warn('Failed to initialize Google Vision client', error);
      }
    }
  }

  async extractText(
    imageBuffer: Buffer,
    mimeType: string,
    provider: OcrProvider = OcrProvider.TESSERACT,
    language: string = 'fas+eng',
    options?: ImagePreprocessingOptions
  ): Promise<OcrResult> {
    const startTime = Date.now();

    try {
      let result: OcrResult;
      if (provider === OcrProvider.GOOGLE_VISION && this.visionClient) {
        result = await this.extractWithGoogleVision(imageBuffer, mimeType, options);
      } else {
        result = await this.extractWithTesseract(imageBuffer, mimeType, language, options);
      }
      // Cost tracking: log provider, page/image size, and estimated cost after each OCR extraction
      logOcrCost(result, { bytes: imageBuffer.length });
      return result;
    } catch (error) {
      this.logger.error(`OCR extraction failed with provider ${provider}`, error);
      throw error;
    }
  }

  async extractWithFallback(
    imageBuffer: Buffer,
    mimeType: string,
    preferredProvider: OcrProvider = OcrProvider.TESSERACT,
    language: string = 'fas+eng',
    options?: ImagePreprocessingOptions
  ): Promise<OcrResult> {
    const providers = [preferredProvider, OcrProvider.TESSERACT].filter((v, i, a) => a.indexOf(v) === i);
    let lastError: Error | null = null;

    for (const provider of providers) {
      try {
        this.logger.log(`Attempting OCR with provider: ${provider}`);
        return await this.extractText(imageBuffer, mimeType, provider, language, options);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(`OCR failed with provider ${provider}, trying fallback`, { error: lastError.message });
      }
    }

    throw lastError || new Error('All OCR providers failed');
  }

  private async extractWithTesseract(
    imageBuffer: Buffer,
    mimeType: string,
    language: string,
    options?: ImagePreprocessingOptions
  ): Promise<OcrResult> {
    const startTime = Date.now();

    try {
      // Use handwriting mode for handwritten documents
      const oem = options?.handwritingMode ? 1 : 3; // 1 = LSTM, 3 = Default
      const psm = options?.handwritingMode ? 6 : 3; // 6 = Assume a single uniform block of text, 3 = Fully automatic page segmentation

      const result = await Tesseract.recognize(imageBuffer, language, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            this.logger.debug(`Tesseract progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      });

      const processingTimeMs = Date.now() - startTime;

      // Extract regions with bounding boxes
      const regions = result.data.words.map((word) => ({
        text: word.text,
        confidence: word.confidence / 100,
        boundingBox: {
          x: word.bbox.x0,
          y: word.bbox.y0,
          width: word.bbox.x1 - word.bbox.x0,
          height: word.bbox.y1 - word.bbox.y0,
        },
      }));

      return {
        text: result.data.text,
        confidence: result.data.confidence / 100,
        provider: OcrProvider.TESSERACT,
        processingTimeMs,
        format: mimeType as DocumentFormat,
        regions,
      };
    } catch (error) {
      this.logger.error('Tesseract OCR failed', error);
      throw error;
    }
  }

  private async extractWithGoogleVision(
    imageBuffer: Buffer,
    mimeType: string,
    options?: ImagePreprocessingOptions
  ): Promise<OcrResult> {
    const startTime = Date.now();

    if (!this.visionClient) {
      throw new Error('Google Vision client not initialized');
    }

    try {
      // Use DOCUMENT_TEXT_DETECTION for handwriting support
      const [result] = await this.visionClient.documentTextDetection({
        image: { content: imageBuffer.toString('base64') },
      });

      const processingTimeMs = Date.now() - startTime;
      const fullTextAnnotation = result.fullTextAnnotation;

      if (!fullTextAnnotation || !fullTextAnnotation.text) {
        return {
          text: '',
          confidence: 0,
          provider: OcrProvider.GOOGLE_VISION,
          processingTimeMs,
          format: mimeType as DocumentFormat,
        };
      }

      // Extract regions with bounding boxes
      const regions: OcrResult['regions'] = [];
      if (fullTextAnnotation.pages) {
        for (const page of fullTextAnnotation.pages) {
          for (const block of page.blocks || []) {
            if (block.blockType === 'TEXT' && block.boundingBox && block.paragraphs) {
              for (const paragraph of block.paragraphs) {
                for (const word of paragraph.words || []) {
                  const wordText = word.symbols?.map((s) => s.text).join('') || '';
                  if (wordText) {
                    const vertices = block.boundingBox?.vertices || [];
                    const x = vertices[0]?.x || 0;
                    const y = vertices[0]?.y || 0;
                    const x2 = vertices[2]?.x || x;
                    const y2 = vertices[2]?.y || y;

                    regions.push({
                      text: wordText,
                      confidence: block.confidence ? block.confidence / 100 : 0.9,
                      boundingBox: {
                        x,
                        y,
                        width: x2 - x,
                        height: y2 - y,
                      },
                    });
                  }
                }
              }
            }
          }
        }
      }

      return {
        text: fullTextAnnotation.text,
        confidence: 0.9, // Google Vision doesn't provide overall confidence
        provider: OcrProvider.GOOGLE_VISION,
        processingTimeMs,
        format: mimeType as DocumentFormat,
        regions,
      };
    } catch (error) {
      this.logger.error('Google Vision OCR failed', error);
      throw error;
    }
  }

  async preprocessImage(
    imageBuffer: Buffer,
    options: ImagePreprocessingOptions = {}
  ): Promise<Buffer> {
    // For now, return the original buffer
    // In a real implementation, you would use image processing libraries like sharp or jimp
    // to apply grayscale, binarization, deskewing, contrast enhancement, etc.

    if (Object.keys(options).length === 0) {
      return imageBuffer;
    }

    this.logger.log('Image preprocessing requested', options);

    // Placeholder for actual image preprocessing
    // This would require libraries like sharp, jimp, or canvas
    return imageBuffer;
  }

  async extractTextFromPdf(
    pdfBuffer: Buffer,
    provider: OcrProvider = OcrProvider.TESSERACT,
    language: string = 'fas+eng',
    options?: ImagePreprocessingOptions
  ): Promise<OcrResult> {
    // For now, return a placeholder
    // In a real implementation, you would use libraries like pdf2pic, pdf-parse, or pdf-lib
    // to convert PDF pages to images and then perform OCR

    this.logger.log('PDF text extraction requested');

    return {
      text: '',
      confidence: 0,
      provider,
      processingTimeMs: 0,
      format: DocumentFormat.PDF,
    };
  }

  async extractTextFromWord(
    docBuffer: Buffer,
    mimeType: string
  ): Promise<OcrResult> {
    // For now, return a placeholder
    // In a real implementation, you would use libraries like mammoth (for .docx) or antiword (for .doc)
    // to extract text from Word documents

    this.logger.log('Word document text extraction requested', { mimeType });

    return {
      text: '',
      confidence: 0,
      provider: OcrProvider.TESSERACT,
      processingTimeMs: 0,
      format: mimeType as DocumentFormat,
    };
  }

  async extractTextFromExcel(
    excelBuffer: Buffer,
    mimeType: string
  ): Promise<OcrResult> {
    // For now, return a placeholder
    // In a real implementation, you would use libraries like xlsx or exceljs
    // to extract text from Excel files

    this.logger.log('Excel file text extraction requested', { mimeType });

    return {
      text: '',
      confidence: 0,
      provider: OcrProvider.TESSERACT,
      processingTimeMs: 0,
      format: mimeType as DocumentFormat,
    };
  }

  async extractTextFromEmail(
    emailBuffer: Buffer,
    mimeType: string
  ): Promise<OcrResult> {
    // For now, return a placeholder
    // In a real implementation, you would use libraries like mailparser or emailjs-mime-parser
    // to extract text and attachments from email files

    this.logger.log('Email text extraction requested', { mimeType });

    return {
      text: '',
      confidence: 0,
      provider: OcrProvider.TESSERACT,
      processingTimeMs: 0,
      format: mimeType as DocumentFormat,
    };
  }

  async extractTextFromDocument(
    documentBuffer: Buffer,
    mimeType: string,
    provider: OcrProvider = OcrProvider.TESSERACT,
    language: string = 'fas+eng',
    preprocessingOptions?: ImagePreprocessingOptions
  ): Promise<OcrResult> {
    // Preprocess if options provided
    const processedBuffer = preprocessingOptions
      ? await this.preprocessImage(documentBuffer, preprocessingOptions)
      : documentBuffer;

    // Handle different document types
    if (mimeType === DocumentFormat.PDF) {
      return await this.extractTextFromPdf(processedBuffer, provider, language, preprocessingOptions);
    } else if (mimeType.startsWith('image/')) {
      return await this.extractText(processedBuffer, mimeType, provider, language, preprocessingOptions);
    } else if (mimeType === DocumentFormat.DOCX || mimeType === DocumentFormat.DOC) {
      return await this.extractTextFromWord(processedBuffer, mimeType);
    } else if (mimeType === DocumentFormat.XLSX || mimeType === DocumentFormat.XLS) {
      return await this.extractTextFromExcel(processedBuffer, mimeType);
    } else if (mimeType === DocumentFormat.EML || mimeType === DocumentFormat.MSG) {
      return await this.extractTextFromEmail(processedBuffer, mimeType);
    } else {
      throw new Error(`Unsupported document type: ${mimeType}`);
    }
  }

  getSupportedFormats(): DocumentFormat[] {
    return [
      DocumentFormat.PDF,
      DocumentFormat.JPEG,
      DocumentFormat.PNG,
      DocumentFormat.TIFF,
      DocumentFormat.BMP,
      DocumentFormat.GIF,
      DocumentFormat.DOCX,
      DocumentFormat.DOC,
      DocumentFormat.XLSX,
      DocumentFormat.XLS,
      DocumentFormat.EML,
      DocumentFormat.MSG,
    ];
  }

  isFormatSupported(mimeType: string): boolean {
    return this.getSupportedFormats().includes(mimeType as DocumentFormat);
  }
}
