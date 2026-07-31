import { Injectable, Logger } from '@nestjs/common';

export interface RedactedTextResult {
  redactedText: string;
  redacted: boolean;
  spans: { type: string; start: number; end: number; replacement: string; original: string }[];
}

export interface DocumentClassification {
  documentType: string;
  confidence: number;
}

export interface FieldConfirmation {
  confirmationStatus: 'complete' | 'partial' | 'incomplete';
  missingFields: string[];
  invalidFields: string[];
  confidence: number;
}

@Injectable()
export class OcrRedactionService {
  private readonly logger = new Logger(OcrRedactionService.name);

  private readonly patterns: { type: string; regex: RegExp; replacement: string }[] = [
    { type: 'NATIONAL_ID', regex: /\b\d{10}\b/g, replacement: '[REDACTED_NATIONAL_ID]' },
    { type: 'CARD_NUMBER', regex: /\b(?:\d{4}[ -]?){3}\d{4}\b|\b\d{16}\b/g, replacement: '[REDACTED_CARD]' },
    { type: 'IBAN', regex: /\bIR\d{24}\b/gi, replacement: '[REDACTED_IBAN]' },
    { type: 'MOBILE', regex: /\b09\d{9}\b/g, replacement: '[REDACTED_MOBILE]' },
    { type: 'EMAIL', regex: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, replacement: '[REDACTED_EMAIL]' },
    { type: 'ACCOUNT_NUMBER', regex: /\b\d{2,4}-\d{6,}-\d{1,}\b|\b\d{10,20}\b/g, replacement: '[REDACTED_ACCOUNT]' },
  ];

  redactText(text: string): RedactedTextResult {
    const spans: RedactedTextResult['spans'] = [];
    for (const p of this.patterns) {
      const regex = new RegExp(p.regex.source, p.regex.flags.includes('g') ? p.regex.flags : p.regex.flags + 'g');
      let match: RegExpExecArray | null;
      while ((match = regex.exec(text)) !== null) {
        const start = match.index;
        const end = start + match[0].length;
        if (!spans.find((s) => s.start === start && s.end === end)) {
          spans.push({ type: p.type, start, end, replacement: p.replacement, original: match[0] });
        }
      }
    }

    const sortedSpans = [...spans].sort((a, b) => b.start - a.start);
    let redactedText = text;
    for (const span of sortedSpans) {
      redactedText = redactedText.slice(0, span.start) + span.replacement + redactedText.slice(span.end);
    }

    return { redactedText, redacted: spans.length > 0, spans };
  }

  classifyDocument(text: string, fileName?: string): DocumentClassification {
    const lower = `${text} ${fileName || ''}`.toLowerCase();
    let bestType = 'unknown';
    let bestScore = 0;

    const keywords: Record<string, string[]> = {
      invoice: ['فاکتور', 'invoice', 'شماره فاکتور', 'مبلغ کل', 'total amount', 'صورتحساب'],
      receipt: ['رسید', 'receipt', 'پرداخت', 'payment receipt', 'فیش'],
      national_id_card: ['کارت ملی', 'ملی', 'national id', 'کد ملی', 'تصویر کارت'],
      drivers_license: ['گواهینامه', 'license', '-driver', 'رانندگی'],
      policy: ['بیمه نامه', 'policy', 'بیمه‌نامه', 'شماره بیمه', 'حق بیمه', 'premium'],
      claim_report: ['گزارش خسارت', 'ادعا', 'claim', 'خسارت', 'incident report'],
      medical_report: ['گزارش پزشکی', 'medical', 'پزشک', 'بیمارستان', 'hospital'],
    };

    for (const [type, words] of Object.entries(keywords)) {
      let hits = 0;
      for (const word of words) {
        if (lower.includes(word.toLowerCase())) hits += 1;
      }
      const score = words.length > 0 ? hits / words.length : 0;
      if (hits > 0 && score > bestScore) {
        bestScore = score;
        bestType = type;
      }
    }

    const confidence = Math.min(Math.round((bestScore + 0.1) * 100) / 100, 0.95);
    return { documentType: bestType, confidence };
  }

  extractFields(text: string, documentType?: string): Record<string, any> {
    const fields: Record<string, any> = {};

    const amountMatch = text.match(/(?:مبلغ|amount|جمع|total|مبلغ کل)[:\s]*([\d,\.]+)/i);
    if (amountMatch) fields.totalAmount = this.parseNumber(amountMatch[1]);

    const invoiceMatch = text.match(/(?:شماره فاکتور|invoice\s*no|invoice number|صورتحساب)[:\s]*([\w\-/]+)/i);
    if (invoiceMatch) fields.invoiceNumber = invoiceMatch[1];

    const dateMatch = text.match(/(?:تاریخ|date)[:\s]*(\d{4}[/-]\d{1,2}[/-]\d{1,2}|\d{2}[/-]\d{1,2}[/-]\d{4})/i);
    if (dateMatch) fields.date = dateMatch[1];

    const mobileMatch = text.match(/\b09\d{9}\b/);
    if (mobileMatch) fields.mobile = mobileMatch[0];

    const nationalMatch = text.match(/\b\d{10}\b/);
    if (nationalMatch) fields.nationalId = nationalMatch[0];

    const plateMatch = text.match(/(?:پلاک|plate)[:\s]*([\w\s-]{5,})/i);
    if (plateMatch) fields.plateNumber = plateMatch[1].trim();

    const policyMatch = text.match(/(?:شماره بیمه نامه|policy number|policy no)[:\s]*([\w\-]+)/i);
    if (policyMatch) fields.policyNumber = policyMatch[1];

    if (documentType) fields.documentType = documentType;
    return fields;
  }

  confirmFields(documentType: string | undefined, fields: Record<string, any>): FieldConfirmation {
    const schemas: Record<string, string[]> = {
      invoice: ['invoiceNumber', 'totalAmount', 'date'],
      receipt: ['totalAmount', 'date'],
      national_id_card: ['nationalId', 'firstName', 'lastName'],
      drivers_license: ['nationalId', 'licenseNumber', 'expiryDate'],
      policy: ['policyNumber', 'startDate', 'endDate', 'coverageAmount'],
      claim_report: ['claimNumber', 'incidentDate', 'lossAmount'],
      medical_report: ['patientNationalId', 'doctorName', 'reportDate'],
    };

    const required = (documentType && schemas[documentType]) || [];
    const missing: string[] = [];
    const invalid: string[] = [];

    for (const key of required) {
      const value = fields[key];
      if (value === undefined || value === null || value === '') {
        missing.push(key);
      } else if (key.toLowerCase().includes('amount') && typeof value === 'number' && value <= 0) {
        invalid.push(key);
      }
    }

    const status: FieldConfirmation['confirmationStatus'] = missing.length === 0 && invalid.length === 0 ? 'complete' : missing.length === required.length ? 'incomplete' : 'partial';
    const confidence = required.length > 0 ? (required.length - missing.length - invalid.length) / required.length : 0.5;
    return { confirmationStatus: status, missingFields: missing, invalidFields: invalid, confidence: Math.max(0, Math.min(1, Number(confidence.toFixed(2)))) };
  }

  private parseNumber(value: string): number | null {
    const normalized = value.replace(/,/g, '').replace(/\//g, '.');
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? null : parsed;
  }
}
