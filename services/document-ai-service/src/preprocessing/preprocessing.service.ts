import { Injectable, Logger } from '@nestjs/common';
import { ImagePreprocessingOptions, DocumentFormat } from '../ocr/ocr.service';

export enum DocumentType {
  INVOICE = 'invoice',
  CONTRACT = 'contract',
  ID_CARD = 'id_card',
  POLICY = 'policy',
  CLAIM_FORM = 'claim_form',
  MEDICAL_REPORT = 'medical_report',
  RECEIPT = 'receipt',
  BANK_STATEMENT = 'bank_statement',
  INSURANCE_CERTIFICATE = 'insurance_certificate',
  UNKNOWN = 'unknown',
}

export enum Language {
  PERSIAN = 'fa',
  ENGLISH = 'en',
  ARABIC = 'ar',
  MIXED = 'mixed',
}

export interface PreprocessingResult {
  processedImageBuffer?: Buffer;
  detectedLanguage: Language;
  detectedDocumentType: DocumentType;
  confidence: number;
  preprocessingSteps: string[];
  metadata: {
    originalSize?: number;
    processedSize?: number;
    rotationApplied?: number;
    deskewingApplied?: boolean;
    contrastEnhanced?: boolean;
  };
}

export interface DocumentClassificationFeatures {
  hasLines?: boolean;
  hasTables?: boolean;
  hasSignatures?: boolean;
  hasBarcodes?: boolean;
  lineCount?: number;
  wordCount?: number;
  averageWordLength?: number;
}

@Injectable()
export class DocumentPreprocessingService {
  private readonly logger = new Logger(DocumentPreprocessingService.name);

  async preprocessDocument(
    imageBuffer: Buffer,
    mimeType: string,
    options?: ImagePreprocessingOptions
  ): Promise<PreprocessingResult> {
    const startTime = Date.now();
    const preprocessingSteps: string[] = [];
    const metadata: PreprocessingResult['metadata'] = {
      originalSize: imageBuffer.length,
    };

    let processedBuffer = imageBuffer;

    // Apply preprocessing steps
    if (options?.grayscale) {
      processedBuffer = await this.applyGrayscale(processedBuffer);
      preprocessingSteps.push('grayscale');
      metadata.processedSize = processedBuffer.length;
    }

    if (options?.binarize) {
      processedBuffer = await this.applyBinarization(processedBuffer);
      preprocessingSteps.push('binarize');
      metadata.processedSize = processedBuffer.length;
    }

    if (options?.deskew) {
      const { buffer: deskewedBuffer, angle } = await this.applyDeskew(processedBuffer);
      processedBuffer = deskewedBuffer;
      preprocessingSteps.push('deskew');
      metadata.rotationApplied = angle;
      metadata.deskewingApplied = true;
      metadata.processedSize = processedBuffer.length;
    }

    if (options?.enhanceContrast) {
      processedBuffer = await this.enhanceContrast(processedBuffer);
      preprocessingSteps.push('enhance_contrast');
      metadata.contrastEnhanced = true;
      metadata.processedSize = processedBuffer.length;
    }

    if (options?.resizeWidth) {
      processedBuffer = await this.resizeImage(processedBuffer, options.resizeWidth);
      preprocessingSteps.push(`resize_to_${options.resizeWidth}px`);
      metadata.processedSize = processedBuffer.length;
    }

    // Detect language
    const detectedLanguage = await this.detectLanguage(processedBuffer);

    // Classify document type
    const { documentType, confidence } = await this.classifyDocumentType(processedBuffer, mimeType);

    const processingTimeMs = Date.now() - startTime;
    this.logger.log(`Document preprocessing completed in ${processingTimeMs}ms`, {
      steps: preprocessingSteps,
      language: detectedLanguage,
      documentType,
      confidence,
    });

    return {
      processedImageBuffer: processedBuffer,
      detectedLanguage,
      detectedDocumentType: documentType,
      confidence,
      preprocessingSteps,
      metadata,
    };
  }

  async detectLanguage(textOrBuffer: Buffer | string): Promise<Language> {
    // For now, use a simple heuristic
    // In a real implementation, you would use libraries like franc, langdetect, or cld3

    let text: string;
    if (Buffer.isBuffer(textOrBuffer)) {
      // Extract a sample of text from the buffer for language detection
      text = textOrBuffer.toString('utf-8', 0, Math.min(1000, textOrBuffer.length));
    } else {
      text = textOrBuffer;
    }

    // Simple heuristic for Persian/Arabic detection
    const persianArabicPattern = /[\u0600-\u06FF]/;
    const englishPattern = /[a-zA-Z]/;

    const hasPersianArabic = persianArabicPattern.test(text);
    const hasEnglish = englishPattern.test(text);

    if (hasPersianArabic && hasEnglish) {
      return Language.MIXED;
    } else if (hasPersianArabic) {
      return Language.PERSIAN;
    } else if (hasEnglish) {
      return Language.ENGLISH;
    } else {
      return Language.ENGLISH; // Default to English
    }
  }

  async classifyDocumentType(
    buffer: Buffer,
    mimeType: string
  ): Promise<{ documentType: DocumentType; confidence: number }> {
    // For now, use simple heuristics based on file type and content
    // In a real implementation, you would use ML models for classification

    let text = '';
    try {
      text = buffer.toString('utf-8', 0, Math.min(2000, buffer.length));
    } catch {
      // If binary, use heuristics based on mimeType
    }

    const lowerText = text.toLowerCase();
    let documentType = DocumentType.UNKNOWN;
    let confidence = 0.5;

    // Simple keyword-based classification
    if (lowerText.includes('invoice') || lowerText.includes('فاکتور') || lowerText.includes('صورتحساب')) {
      documentType = DocumentType.INVOICE;
      confidence = 0.7;
    } else if (lowerText.includes('contract') || lowerText.includes('قرارداد')) {
      documentType = DocumentType.CONTRACT;
      confidence = 0.7;
    } else if (lowerText.includes('policy') || lowerText.includes('بیمه‌نامه')) {
      documentType = DocumentType.POLICY;
      confidence = 0.7;
    } else if (lowerText.includes('claim') || lowerText.includes('ادعا') || lowerText.includes('خسارت')) {
      documentType = DocumentType.CLAIM_FORM;
      confidence = 0.7;
    } else if (lowerText.includes('medical') || lowerText.includes('پزشکی')) {
      documentType = DocumentType.MEDICAL_REPORT;
      confidence = 0.7;
    } else if (lowerText.includes('receipt') || lowerText.includes('رسید')) {
      documentType = DocumentType.RECEIPT;
      confidence = 0.7;
    } else if (lowerText.includes('bank') || lowerText.includes('بانک')) {
      documentType = DocumentType.BANK_STATEMENT;
      confidence = 0.7;
    } else if (lowerText.includes('certificate') || lowerText.includes('گواهی')) {
      documentType = DocumentType.INSURANCE_CERTIFICATE;
      confidence = 0.7;
    }

    // Adjust confidence based on mimeType
    if (mimeType === DocumentFormat.PDF) {
      confidence += 0.1;
    }

    return { documentType, confidence: Math.min(confidence, 1.0) };
  }

  async applyGrayscale(buffer: Buffer): Promise<Buffer> {
    // For now, return the original buffer
    // In a real implementation, you would use libraries like sharp or jimp
    this.logger.debug('Grayscale preprocessing requested');
    return buffer;
  }

  async applyBinarization(buffer: Buffer): Promise<Buffer> {
    // For now, return the original buffer
    // In a real implementation, you would use libraries like sharp or jimp
    // to apply thresholding (e.g., Otsu's method)
    this.logger.debug('Binarization preprocessing requested');
    return buffer;
  }

  async applyDeskew(buffer: Buffer): Promise<{ buffer: Buffer; angle: number }> {
    // For now, return the original buffer with no rotation
    // In a real implementation, you would use libraries like opencv-js or deskew
    // to detect and correct skew angle
    this.logger.debug('Deskew preprocessing requested');
    return { buffer, angle: 0 };
  }

  async enhanceContrast(buffer: Buffer): Promise<Buffer> {
    // For now, return the original buffer
    // In a real implementation, you would use libraries like sharp or jimp
    // to apply histogram equalization or CLAHE
    this.logger.debug('Contrast enhancement preprocessing requested');
    return buffer;
  }

  async resizeImage(buffer: Buffer, width: number): Promise<Buffer> {
    // For now, return the original buffer
    // In a real implementation, you would use libraries like sharp or jimp
    this.logger.debug(`Resize preprocessing requested to ${width}px`);
    return buffer;
  }

  async extractFeatures(buffer: Buffer): Promise<DocumentClassificationFeatures> {
    // For now, return empty features
    // In a real implementation, you would analyze the image for:
    // - Line detection
    // - Table detection
    // - Signature detection
    // - Barcode detection
    // - Text density
    // - Layout analysis
    return {};
  }

  async getRecommendedPreprocessing(mimeType: string, isScanned?: boolean): Promise<ImagePreprocessingOptions> {
    const options: ImagePreprocessingOptions = {};

    if (mimeType.startsWith('image/')) {
      options.grayscale = true;
      options.deskew = true;
      options.enhanceContrast = true;
    }

    if (isScanned) {
      options.binarize = true;
      options.deskew = true;
    }

    return options;
  }

  async detectScannedDocument(buffer: Buffer): Promise<boolean> {
    // For now, assume it's not scanned
    // In a real implementation, you would analyze:
    // - Noise levels
    // - Rotation artifacts
    // - Scan lines
    // - DPI indicators
    return false;
  }
}
