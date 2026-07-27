import fs from 'fs';
import os from 'os';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { DocumentsService, ALLOWED_MIMETYPES, DOCUMENT_TYPES } from './documents.service';
import { Document } from './entities/Document';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let mockRepo: any;
  let mockDataSource: any;
  let uploadDir: string;

  beforeAll(() => {
    uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doc-service-test-'));
    process.env.DOCUMENT_UPLOAD_DIR = uploadDir;
    process.env.DOCUMENT_DOWNLOAD_SECRET = 'test-secret';
  });

  afterAll(() => {
    fs.rmSync(uploadDir, { recursive: true, force: true });
    delete process.env.DOCUMENT_UPLOAD_DIR;
    delete process.env.DOCUMENT_DOWNLOAD_SECRET;
  });

  beforeEach(() => {
    mockRepo = {
      create: jest.fn((dto) => ({ ...dto } as Document)),
      save: jest.fn((doc) => Promise.resolve({ ...doc, documentId: doc.documentId || uuidv4() })),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn(() => {
        const builder: any = {
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          offset: jest.fn().mockReturnThis(),
          getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        };
        return builder;
      }),
    };

    mockDataSource = {
      transaction: jest.fn(async (fn: any) => {
        const manager = {
          getRepository: jest.fn(() => ({
            create: jest.fn((dto: any) => dto),
            save: jest.fn(() => Promise.resolve({})),
          })),
        };
        return fn(manager);
      }),
    };

    service = new DocumentsService(mockDataSource, mockRepo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('prepareUpload', () => {
    it('returns a tenant-prefixed relative storageRef and a temp path', () => {
      const tenantId = uuidv4();
      const result = service.prepareUpload(tenantId, 'invoice.pdf');
      expect(result.storageRef).toMatch(new RegExp(`^tenants/${tenantId}/\\d+-`));
      expect(result.storageRef).toContain('invoice.pdf');
      expect(path.isAbsolute(result.tempPath)).toBe(true);
      expect(result.tempPath.startsWith(uploadDir)).toBe(true);
    });

    it('sanitises unsafe characters in file names', () => {
      const tenantId = uuidv4();
      const result = service.prepareUpload(tenantId, '../etc/passwd');
      expect(result.storageRef).not.toContain('..');
      expect(result.storageRef).toMatch(/^tenants/);
    });
  });

  describe('createFromUpload', () => {
    it('stores tenantId and a relative storageRef (not an absolute filesystem path)', async () => {
      const tenantId = uuidv4();
      const tempFile = path.join(uploadDir, `test-${uuidv4()}.pdf`);
      fs.writeFileSync(tempFile, Buffer.from('fake pdf'));

      const upload = service.prepareUpload(tenantId, 'invoice.pdf');
      fs.renameSync(tempFile, upload.tempPath);

      const doc = await service.createFromUpload({
        correlationId: uuidv4(),
        tenantId,
        documentType: 'invoice',
        file: {
          originalname: 'invoice.pdf',
          tempPath: upload.tempPath,
          storageRef: upload.storageRef,
          mimetype: 'application/pdf',
          size: 8,
        },
      });

      expect(doc.tenantId).toBe(tenantId);
      expect(doc.storageRef).toMatch(new RegExp(`^tenants/${tenantId}/`));
      expect(path.isAbsolute(doc.storageRef)).toBe(false);
      expect(mockRepo.save).toHaveBeenCalled();
      expect(mockDataSource.transaction).toHaveBeenCalledTimes(doc.claimId ? 2 : 1);
    });

    it('rejects unsupported document types', async () => {
      const tenantId = uuidv4();
      await expect(
        service.createFromUpload({
          correlationId: uuidv4(),
          tenantId,
          documentType: 'invalid_type' as any,
          file: {
            originalname: 'file.pdf',
            tempPath: path.join(uploadDir, 'dummy'),
            storageRef: `tenants/${tenantId}/dummy`,
            mimetype: 'application/pdf',
            size: 8,
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('getDocument', () => {
    it('queries by tenantId and documentId', async () => {
      const tenantId = uuidv4();
      const documentId = uuidv4();
      const expected = { documentId, tenantId } as Document;
      mockRepo.findOne.mockResolvedValue(expected);

      const result = await service.getDocument(documentId, tenantId);

      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { documentId, tenantId } });
      expect(result).toBe(expected);
    });
  });

  describe('signed URLs', () => {
    it('generates and verifies a signed URL token', () => {
      const tenantId = uuidv4();
      const documentId = uuidv4();
      const userId = uuidv4();

      const signed = service.generateSignedUrl({ documentId, tenantId, userId, ttlSeconds: 60 });
      expect(signed.url).toContain('/documents/' + documentId + '/download?token=');
      expect(signed.expiresAt).toBeDefined();

      const url = new URL('http://localhost' + signed.url);
      const token = url.searchParams.get('token')!;
      const verified = service.verifySignedUrl(token);

      expect(verified.documentId).toBe(documentId);
      expect(verified.tenantId).toBe(tenantId);
      expect(verified.sub).toBe(userId);
    });

    it('rejects a tampered token', () => {
      const tenantId = uuidv4();
      const documentId = uuidv4();
      const userId = uuidv4();

      const signed = service.generateSignedUrl({ documentId, tenantId, userId, ttlSeconds: 60 });
      const url = new URL('http://localhost' + signed.url);
      const token = url.searchParams.get('token')!;
      const tampered = token.replace(/./g, 'a');
      expect(() => service.verifySignedUrl(tampered)).toThrow('signature');
    });
  });

  describe('validateStorageRef', () => {
    it('throws for a cross-tenant storageRef', () => {
      const tenantA = uuidv4();
      const tenantB = uuidv4();
      expect(() => service['validateStorageRef'](`tenants/${tenantB}/file.pdf`, tenantA)).toThrow('CROSS_TENANT_STORAGE_REF');
    });

    it('allows object storage URLs', () => {
      const tenantA = uuidv4();
      expect(() => service['validateStorageRef']('s3://bucket/tenants/any/file.pdf', tenantA)).not.toThrow();
    });
  });
});
