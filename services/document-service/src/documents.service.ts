import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { OutboxPublisher } from '@insurance/shared';
import { Document } from './entities/Document';

@Injectable()
export class DocumentsService {
  private outboxPublisher: OutboxPublisher;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Document) private readonly documentRepo: Repository<Document>
  ) {
    this.outboxPublisher = new OutboxPublisher(this.dataSource);
  }

  async createFromUpload(params: {
    correlationId: string;
    claimId: string;
    documentType: Document['documentType'];
    file: {
      originalname: string;
      path: string;
      mimetype: string;
      size: number;
    };
  }): Promise<Document> {
    const doc = this.documentRepo.create({
      documentId: uuidv4(),
      claimId: params.claimId,
      documentType: params.documentType,
      fileName: params.file.originalname,
      storageRef: params.file.path,
      mimeType: params.file.mimetype,
      fileSize: params.file.size,
      status: 'pending',
      extractedText: null,
      extractedFields: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.documentRepo.save(doc);

    await this.outboxPublisher.publish({
      topic: 'insurance.document.uploaded',
      eventType: 'DocumentUploaded',
      eventVersion: 1,
      correlationId: params.correlationId,
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

    return doc;
  }

  async linkDocument(params: {
    correlationId: string;
    claimId: string;
    documentType: Document['documentType'];
    fileName: string;
    storageRef: string;
    mimeType?: string;
    fileSize?: number;
  }): Promise<Document> {
    const doc = this.documentRepo.create({
      documentId: uuidv4(),
      claimId: params.claimId,
      documentType: params.documentType,
      fileName: params.fileName,
      storageRef: params.storageRef,
      mimeType: params.mimeType || null,
      fileSize: params.fileSize ?? null,
      status: 'pending',
      extractedText: null,
      extractedFields: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.documentRepo.save(doc);

    await this.outboxPublisher.publish({
      topic: 'insurance.document.linked',
      eventType: 'DocumentLinked',
      eventVersion: 1,
      correlationId: params.correlationId,
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

    return doc;
  }

  async getDocument(documentId: string): Promise<Document | null> {
    return this.documentRepo.findOne({ where: { documentId } });
  }

  async listDocuments(params: { claimId?: string; limit: number; offset: number }): Promise<{ rows: Document[]; total: number }> {
    const qb = this.documentRepo.createQueryBuilder('d');

    if (params.claimId) {
      qb.andWhere('d.claim_id = :claimId', { claimId: params.claimId });
    }

    qb.orderBy('d.created_at', 'DESC')
      .limit(params.limit)
      .offset(params.offset);

    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }
}
