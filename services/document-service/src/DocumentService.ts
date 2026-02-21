import { Request, Response } from 'express';
import { Repository } from 'typeorm';
import { BaseService } from '@insurance/shared';
import { Document } from './entities/Document';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import multer from 'multer';

interface LinkDocumentRequest {
  claimId: string;
  documentType: Document['documentType'];
  fileName: string;
  storageRef: string;
  mimeType?: string;
  fileSize?: number;
}

export class DocumentService extends BaseService {
  private documentRepo: Repository<Document>;
  private upload: multer.Multer;

  constructor(config: any) {
    super(config);

    const uploadDir = process.env.DOCUMENT_UPLOAD_DIR || path.join(process.cwd(), 'data', 'uploads');
    fs.mkdirSync(uploadDir, { recursive: true });

    const storage = multer.diskStorage({
      destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
        cb(null, uploadDir);
      },
      filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        cb(null, `${Date.now()}-${safeName}`);
      },
    });

    this.upload = multer({ storage });
  }

  getEntities(): any[] {
    return [Document];
  }

  async initialize(): Promise<void> {
    await super.initialize();
    this.documentRepo = this.dataSource.getRepository(Document);
  }

  setupRoutes(): void {
    // POST /documents/upload
    this.app.post(
      '/documents/upload',
      this.upload.single('file'),
      async (req: Request, res: Response) => {
        try {
          const correlationId = (req as any).correlationId;
          const claimId = (req.body.claimId as string) || '';
          const documentType = (req.body.documentType as Document['documentType']) || 'other';

          if (!claimId) {
            return res.status(400).json({
              success: false,
              error: { code: 'VALIDATION_ERROR', message: 'claimId is required' },
              correlationId,
            });
          }

          const file = (req as unknown as { file?: Express.Multer.File }).file;
          if (!file) {
            return res.status(400).json({
              success: false,
              error: { code: 'VALIDATION_ERROR', message: 'file is required (multipart/form-data)' },
              correlationId,
            });
          }

          const documentId = uuidv4();
          const storageRef = file.path;

          const doc = this.documentRepo.create({
            documentId,
            claimId,
            documentType,
            fileName: file.originalname,
            storageRef,
            mimeType: file.mimetype,
            fileSize: file.size,
            status: 'pending',
            extractedText: null,
            extractedFields: null,
          });

          await this.documentRepo.save(doc);

          await this.outboxPublisher.publish({
            topic: 'insurance.document.uploaded',
            eventType: 'DocumentUploaded',
            eventVersion: 1,
            correlationId,
            subject: {
              documentId: doc.documentId,
              claimId: doc.claimId,
            },
            payload: {
              documentId: doc.documentId,
              claimId: doc.claimId,
              documentType: doc.documentType,
              fileName: doc.fileName,
              storageRef: doc.storageRef,
              mimeType: doc.mimeType,
              fileSize: doc.fileSize,
              status: doc.status,
              createdAt: doc.createdAt?.toISOString?.() ?? new Date().toISOString(),
            },
          });

          return res.status(201).json({
            success: true,
            data: { documentId: doc.documentId, status: doc.status },
            correlationId,
          });
        } catch (error) {
          this.logger.error('Failed to upload document', error as Error, {
            correlationId: (req as any).correlationId,
          });
          return res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Failed to upload document' },
            correlationId: (req as any).correlationId,
          });
        }
      }
    );

    // POST /documents/link
    this.app.post('/documents/link', async (req: Request, res: Response) => {
      try {
        const correlationId = (req as any).correlationId;
        const body = req.body as LinkDocumentRequest;

        if (!body.claimId || !body.documentType || !body.fileName || !body.storageRef) {
          return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'claimId, documentType, fileName, storageRef are required' },
            correlationId,
          });
        }

        const doc = this.documentRepo.create({
          documentId: uuidv4(),
          claimId: body.claimId,
          documentType: body.documentType,
          fileName: body.fileName,
          storageRef: body.storageRef,
          mimeType: body.mimeType || null,
          fileSize: body.fileSize ?? null,
          status: 'pending',
          extractedText: null,
          extractedFields: null,
        });

        await this.documentRepo.save(doc);

        await this.outboxPublisher.publish({
          topic: 'insurance.document.linked',
          eventType: 'DocumentLinked',
          eventVersion: 1,
          correlationId,
          subject: {
            documentId: doc.documentId,
            claimId: doc.claimId,
          },
          payload: {
            documentId: doc.documentId,
            claimId: doc.claimId,
            documentType: doc.documentType,
            fileName: doc.fileName,
            storageRef: doc.storageRef,
            status: doc.status,
            createdAt: doc.createdAt?.toISOString?.() ?? new Date().toISOString(),
          },
        });

        return res.status(201).json({
          success: true,
          data: { documentId: doc.documentId, status: doc.status },
          correlationId,
        });
      } catch (error) {
        this.logger.error('Failed to link document', error as Error, {
          correlationId: (req as any).correlationId,
        });
        return res.status(500).json({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to link document' },
          correlationId: (req as any).correlationId,
        });
      }
    });

    // GET /documents/:documentId
    this.app.get('/documents/:documentId', async (req: Request, res: Response) => {
      const correlationId = (req as any).correlationId;
      const { documentId } = req.params;
      const doc = await this.documentRepo.findOne({ where: { documentId } });
      if (!doc) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Document not found' },
          correlationId,
        });
      }
      return res.json({ success: true, data: doc, correlationId });
    });

    // GET /documents?claimId=
    this.app.get('/documents', async (req: Request, res: Response) => {
      const correlationId = (req as any).correlationId;
      const { claimId, limit = '50', offset = '0' } = req.query;

      const qb = this.documentRepo.createQueryBuilder('d');
      if (claimId) {
        qb.andWhere('d.claim_id = :claimId', { claimId });
      }

      qb.orderBy('d.created_at', 'DESC')
        .limit(parseInt(limit as string, 10))
        .offset(parseInt(offset as string, 10));

      const [docs, total] = await qb.getManyAndCount();

      return res.json({
        success: true,
        data: docs,
        pagination: {
          total,
          limit: parseInt(limit as string, 10),
          offset: parseInt(offset as string, 10),
        },
        correlationId,
      });
    });
  }
}
