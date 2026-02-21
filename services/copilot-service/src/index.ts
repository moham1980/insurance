import express, { Request, Response } from 'express';
import { Repository } from 'typeorm';
import { createDataSource, createLogger } from '@insurance/shared';
import { ClaimEntity } from './entities/ClaimEntity';
import { DocumentEntity } from './entities/DocumentEntity';

const logger = createLogger({
  serviceName: 'copilot-service',
  prettyPrint: process.env.NODE_ENV !== 'production',
});

const app = express();
app.use(express.json());

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'postgres',
};

const httpPort = parseInt(process.env.PORT || '3005', 10);

let claimRepo: Repository<ClaimEntity>;
let docRepo: Repository<DocumentEntity>;

function formatCurrencyIRR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return 'N/A';
  try {
    return `${Number(amount).toLocaleString('fa-IR')} ریال`;
  } catch {
    return String(amount);
  }
}

function buildClaimSummary(claim: ClaimEntity, docs: DocumentEntity[]): string {
  const extractedDocs = docs.filter(d => d.status === 'extracted');
  const invoiceDocs = extractedDocs.filter(d => d.documentType === 'invoice');
  const invoiceAmounts = invoiceDocs
    .map(d => d.extractedFields?.totalAmount)
    .filter((x: any) => typeof x === 'number') as number[];

  const totalInvoice = invoiceAmounts.reduce((a, b) => a + b, 0);

  const lines: string[] = [];
  lines.push(`خلاصه پرونده خسارت: ${claim.claimNumber}`);
  lines.push(`وضعیت: ${claim.status}`);
  lines.push(`بیمه‌نامه: ${claim.policyId}`);
  lines.push(`تاریخ حادثه: ${claim.lossDate?.toISOString?.() ?? ''}`);
  lines.push(`نوع خسارت: ${claim.lossType}`);

  if (claim.assessedAmount != null) lines.push(`مبلغ ارزیابی‌شده: ${formatCurrencyIRR(claim.assessedAmount)}`);
  if (claim.approvedAmount != null) lines.push(`مبلغ تایید‌شده: ${formatCurrencyIRR(claim.approvedAmount)}`);
  if (claim.paidAmount != null) lines.push(`مبلغ پرداخت‌شده: ${formatCurrencyIRR(claim.paidAmount)}`);

  lines.push(`نیاز به بررسی انسانی: ${claim.requiresHumanTriage ? 'بله' : 'خیر'}`);
  lines.push(`تعداد اسناد: ${docs.length} (استخراج‌شده: ${extractedDocs.length})`);

  if (invoiceDocs.length > 0) {
    lines.push(`فاکتورها: ${invoiceDocs.length} | جمع مبلغ فاکتورهای استخراج‌شده: ${formatCurrencyIRR(totalInvoice)}`);
  }

  if (claim.description) {
    lines.push(`شرح: ${claim.description}`);
  }

  return lines.join('\n');
}

function buildDocumentSummary(doc: DocumentEntity): string {
  const fields = doc.extractedFields || {};
  const lines: string[] = [];
  lines.push(`خلاصه سند: ${doc.fileName}`);
  lines.push(`نوع: ${doc.documentType}`);
  lines.push(`وضعیت: ${doc.status}`);
  lines.push(`ClaimId: ${doc.claimId}`);

  if (doc.status === 'extracted') {
    if (fields.invoiceNumber) lines.push(`شماره فاکتور: ${fields.invoiceNumber}`);
    if (typeof fields.totalAmount === 'number') lines.push(`مبلغ کل: ${formatCurrencyIRR(fields.totalAmount)}`);
    if (fields.currency) lines.push(`ارز: ${fields.currency}`);
    if (typeof fields.confidence === 'number') lines.push(`اعتماد: ${fields.confidence}`);
  }

  return lines.join('\n');
}

function startRoutes(): void {
  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'copilot-service' });
  });

  // POST /copilot/claims/:claimId/summary
  app.post('/copilot/claims/:claimId/summary', async (req: Request, res: Response) => {
    const { claimId } = req.params;

    const claim = await claimRepo.findOne({ where: { claimId } });
    if (!claim) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Claim not found' } });
    }

    const docs = await docRepo.find({ where: { claimId } });
    const summary = buildClaimSummary(claim, docs);

    return res.json({
      success: true,
      data: {
        claimId,
        summary,
        sources: {
          claim: { claimNumber: claim.claimNumber, status: claim.status },
          documents: docs.map(d => ({ documentId: d.documentId, documentType: d.documentType, status: d.status })),
        },
      },
    });
  });

  // POST /copilot/documents/:documentId/summary
  app.post('/copilot/documents/:documentId/summary', async (req: Request, res: Response) => {
    const { documentId } = req.params;

    const doc = await docRepo.findOne({ where: { documentId } });
    if (!doc) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Document not found' } });
    }

    const summary = buildDocumentSummary(doc);

    return res.json({
      success: true,
      data: {
        documentId,
        summary,
        status: doc.status,
        documentType: doc.documentType,
      },
    });
  });
}

async function main(): Promise<void> {
  const dataSource = createDataSource({
    ...dbConfig,
    entities: [ClaimEntity, DocumentEntity],
    synchronize: false,
  });

  await dataSource.initialize();
  claimRepo = dataSource.getRepository(ClaimEntity);
  docRepo = dataSource.getRepository(DocumentEntity);

  startRoutes();

  app.listen(httpPort, () => {
    logger.info('copilot-service listening', { port: httpPort });
  });
}

main().catch((err) => {
  logger.error('Fatal error in copilot-service', err as Error);
  process.exit(1);
});
