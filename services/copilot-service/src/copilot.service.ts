import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createLogger } from '@insurance/shared';
import { ClaimEntity } from './entities/ClaimEntity';
import { DocumentEntity } from './entities/DocumentEntity';

@Injectable()
export class CopilotService {
  private logger = createLogger({
    serviceName: 'copilot-service',
    prettyPrint: process.env.NODE_ENV !== 'production',
  });

  constructor(
    @InjectRepository(ClaimEntity) private readonly claimRepo: Repository<ClaimEntity>,
    @InjectRepository(DocumentEntity) private readonly docRepo: Repository<DocumentEntity>
  ) {}

  private formatCurrencyIRR(amount: number | null | undefined): string {
    if (amount === null || amount === undefined) return 'N/A';
    try {
      return `${Number(amount).toLocaleString('fa-IR')} ریال`;
    } catch {
      return String(amount);
    }
  }

  private buildClaimSummary(claim: ClaimEntity, docs: DocumentEntity[]): string {
    const extractedDocs = docs.filter((d) => d.status === 'extracted');
    const invoiceDocs = extractedDocs.filter((d) => d.documentType === 'invoice');
    const invoiceAmounts = invoiceDocs
      .map((d) => d.extractedFields?.totalAmount)
      .filter((x: any) => typeof x === 'number') as number[];

    const totalInvoice = invoiceAmounts.reduce((a, b) => a + b, 0);

    const lines: string[] = [];
    lines.push(`خلاصه پرونده خسارت: ${claim.claimNumber}`);
    lines.push(`وضعیت: ${claim.status}`);
    lines.push(`بیمه‌نامه: ${claim.policyId}`);
    lines.push(`تاریخ حادثه: ${claim.lossDate?.toISOString?.() ?? ''}`);
    lines.push(`نوع خسارت: ${claim.lossType}`);

    if (claim.assessedAmount != null) lines.push(`مبلغ ارزیابی‌شده: ${this.formatCurrencyIRR(claim.assessedAmount)}`);
    if (claim.approvedAmount != null) lines.push(`مبلغ تایید‌شده: ${this.formatCurrencyIRR(claim.approvedAmount)}`);
    if (claim.paidAmount != null) lines.push(`مبلغ پرداخت‌شده: ${this.formatCurrencyIRR(claim.paidAmount)}`);

    lines.push(`نیاز به بررسی انسانی: ${claim.requiresHumanTriage ? 'بله' : 'خیر'}`);
    lines.push(`تعداد اسناد: ${docs.length} (استخراج‌شده: ${extractedDocs.length})`);

    if (invoiceDocs.length > 0) {
      lines.push(
        `فاکتورها: ${invoiceDocs.length} | جمع مبلغ فاکتورهای استخراج‌شده: ${this.formatCurrencyIRR(totalInvoice)}`
      );
    }

    if (claim.description) {
      lines.push(`شرح: ${claim.description}`);
    }

    return lines.join('\n');
  }

  private buildDocumentSummary(doc: DocumentEntity): string {
    const fields = doc.extractedFields || {};
    const lines: string[] = [];
    lines.push(`خلاصه سند: ${doc.fileName}`);
    lines.push(`نوع: ${doc.documentType}`);
    lines.push(`وضعیت: ${doc.status}`);
    lines.push(`ClaimId: ${doc.claimId}`);

    if (doc.status === 'extracted') {
      if (fields.invoiceNumber) lines.push(`شماره فاکتور: ${fields.invoiceNumber}`);
      if (typeof fields.totalAmount === 'number') lines.push(`مبلغ کل: ${this.formatCurrencyIRR(fields.totalAmount)}`);
      if (fields.currency) lines.push(`ارز: ${fields.currency}`);
      if (typeof fields.confidence === 'number') lines.push(`اعتماد: ${fields.confidence}`);
    }

    return lines.join('\n');
  }

  async getClaimSummary(claimId: string) {
    const claim = await this.claimRepo.findOne({ where: { claimId } });
    if (!claim) {
      return { ok: false as const, status: 404, body: { success: false, error: { code: 'NOT_FOUND', message: 'Claim not found' } } };
    }

    const docs = await this.docRepo.find({ where: { claimId } });
    const summary = this.buildClaimSummary(claim, docs);

    return {
      ok: true as const,
      status: 200,
      body: {
        success: true,
        data: {
          claimId,
          summary,
          sources: {
            claim: { claimNumber: claim.claimNumber, status: claim.status },
            documents: docs.map((d) => ({ documentId: d.documentId, documentType: d.documentType, status: d.status })),
          },
        },
      },
    };
  }

  async getDocumentSummary(documentId: string) {
    const doc = await this.docRepo.findOne({ where: { documentId } });
    if (!doc) {
      return {
        ok: false as const,
        status: 404,
        body: { success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } },
      };
    }

    const summary = this.buildDocumentSummary(doc);

    return {
      ok: true as const,
      status: 200,
      body: {
        success: true,
        data: {
          documentId,
          summary,
          status: doc.status,
          documentType: doc.documentType,
        },
      },
    };
  }
}
