import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { AuditRecord, AuditAction } from './entities/AuditRecord';

export interface AuditRecordDto {
  tenantId: string;
  actorUserId?: string | null;
  action: AuditAction;
  resourceType: string;
  resourceId?: string | null;
  correlationId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class AuditPersistenceService {
  constructor(
    @InjectRepository(AuditRecord) private readonly auditRepo: Repository<AuditRecord>,
  ) {}

  async record(dto: AuditRecordDto): Promise<AuditRecord> {
    const record = this.auditRepo.create({
      auditId: uuidv4(),
      tenantId: dto.tenantId,
      actorUserId: dto.actorUserId || null,
      action: dto.action,
      resourceType: dto.resourceType,
      resourceId: dto.resourceId || null,
      correlationId: dto.correlationId || null,
      before: dto.before || null,
      after: dto.after || null,
      metadata: dto.metadata || null,
    });
    return this.auditRepo.save(record);
  }
}
