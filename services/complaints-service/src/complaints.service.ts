import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { OutboxPublisher } from '@insurance/shared';
import { Complaint, type ComplaintStatus, type ComplaintType } from './entities/Complaint';
import { ComplaintAttachment } from './entities/ComplaintAttachment';
import { ComplaintAudit, type ComplaintAuditEventType } from './entities/ComplaintAudit';
import { ComplaintMobileOtpChallenge } from './entities/ComplaintMobileOtpChallenge';

@Injectable()
export class ComplaintsService {
  private readonly logger = new Logger(ComplaintsService.name);
  private outboxPublisher: OutboxPublisher;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Complaint) private readonly complaintsRepo: Repository<Complaint>,
    @InjectRepository(ComplaintAttachment) private readonly attachmentsRepo: Repository<ComplaintAttachment>,
    @InjectRepository(ComplaintAudit) private readonly auditRepo: Repository<ComplaintAudit>,
    @InjectRepository(ComplaintMobileOtpChallenge) private readonly otpRepo: Repository<ComplaintMobileOtpChallenge>
  ) {
    // OutboxPublisher is now created per-operation inside transactions
  }

  private async publishComplaintEvent(params: {
    topic: string;
    eventType: string;
    correlationId?: string;
    tenantId?: string;
    actorUserId?: string;
    complaint: Complaint;
    payload?: Record<string, any>;
  }): Promise<void> {
    const correlationId = params.correlationId || uuidv4();
    const c = params.complaint;

    await this.dataSource.transaction(async (manager) => {
      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
      topic: params.topic,
      eventType: params.eventType,
      eventVersion: 1,
      correlationId,
      subject: {
        ...(params.tenantId ? { tenantId: String(params.tenantId) } : {}),
        complaintId: c.complaintId,
        ...(c.policyId ? { policyId: String(c.policyId) } : {}),
        ...(c.claimId ? { claimId: String(c.claimId) } : {}),
      },
      payload: {
        complaintId: c.complaintId,
        complaintType: c.complaintType,
        status: c.status,
        policyId: c.policyId,
        claimId: c.claimId,
        policyNumber: c.policyNumber,
        assignedTo: c.assignedTo,
        slaFirstResponseDueAt: c.slaFirstResponseDueAt,
        slaResolutionDueAt: c.slaResolutionDueAt,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        complainantMobile: c.complainantMobile,
        complainantMobileVerified: c.complainantMobileVerified,
        complainantMobileVerifiedAt: c.complainantMobileVerifiedAt,
        tenantId: params.tenantId || null,
        actorUserId: params.actorUserId || null,
        ...(params.payload ? params.payload : {}),
      },
    });
    });
  }

  private getOtpTtlSeconds(): number {
    const v = process.env.COMPLAINTS_OTP_TTL_SECONDS;
    const n = v ? parseInt(v, 10) : 300;
    if (!Number.isFinite(n) || n < 30) return 300;
    return n;
  }

  private getOtpRateLimitSeconds(): number {
    const v = process.env.COMPLAINTS_OTP_RATE_LIMIT_SECONDS;
    const n = v ? parseInt(v, 10) : 60;
    if (!Number.isFinite(n) || n < 5) return 60;
    return n;
  }

  private getOtpMaxAttempts(): number {
    const v = process.env.COMPLAINTS_OTP_MAX_ATTEMPTS;
    const n = v ? parseInt(v, 10) : 5;
    if (!Number.isFinite(n) || n < 1) return 5;
    return n;
  }

  private generateOtpCode(): string {
    const n = crypto.randomInt(0, 1000000);
    return String(n).padStart(6, '0');
  }

  private hashOtp(code: string, salt: string): string {
    return crypto
      .createHash('sha256')
      .update(`${code}:${salt}`)
      .digest('hex');
  }

  async requestComplaintMobileOtp(params: {
    complaintId: string;
    requestedBy: string | null;
    audit?: { correlationId?: string; tenantId?: string; actorUserId?: string };
  }): Promise<{ challengeId: string; expiresAt: Date }> {
    const c = await this.getComplaint(params.complaintId);
    if (!c) {
      const err: any = new Error('Complaint not found');
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (!c.complainantMobile || c.complainantMobile.trim().length === 0) {
      const err: any = new Error('complainantMobile is required');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    if (c.complainantMobileVerified) {
      const err: any = new Error('complainantMobile is already verified');
      err.code = 'ALREADY_VERIFIED';
      throw err;
    }

    const rateLimitSeconds = this.getOtpRateLimitSeconds();
    const since = new Date(Date.now() - rateLimitSeconds * 1000);
    const recent = await this.otpRepo
      .createQueryBuilder('x')
      .where('x.complaint_id = :complaintId', { complaintId: params.complaintId })
      .andWhere('x.created_at >= :since', { since: since.toISOString() })
      .orderBy('x.created_at', 'DESC')
      .getOne();
    if (recent) {
      const err: any = new Error('OTP request rate limited');
      err.code = 'RATE_LIMITED';
      throw err;
    }

    const code = this.generateOtpCode();
    const salt = crypto.randomBytes(16).toString('hex');
    const codeHash = this.hashOtp(code, salt);

    const ttlSeconds = this.getOtpTtlSeconds();
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const now = new Date();

    const maxAttempts = this.getOtpMaxAttempts();

    const ch = this.otpRepo.create({
      complaintId: params.complaintId,
      mobile: c.complainantMobile,
      codeHash,
      codeSalt: salt,
      expiresAt,
      status: 'sent',
      attempts: 0,
      maxAttempts,
      lastAttemptAt: null,
      sentAt: now,
      verifiedAt: null,
      requestedBy: params.requestedBy,
      verifiedBy: null,
      correlationId: params.audit?.correlationId ?? null,
      tenantId: params.audit?.tenantId ?? null,
      createdAt: now,
    });
    await this.otpRepo.save(ch);

    await this.writeAudit({
      complaintId: params.complaintId,
      eventType: 'mobile_otp_requested',
      correlationId: params.audit?.correlationId,
      tenantId: params.audit?.tenantId,
      actorUserId: params.audit?.actorUserId ?? params.requestedBy ?? undefined,
      fromStatus: null,
      toStatus: null,
      reason: null,
      details: {
        challengeId: ch.challengeId,
        expiresAt: expiresAt.toISOString(),
      },
    });

    await this.publishComplaintEvent({
      topic: 'insurance.complaint.mobile_otp_requested',
      eventType: 'ComplaintMobileOtpRequested',
      correlationId: params.audit?.correlationId,
      tenantId: params.audit?.tenantId,
      actorUserId: params.audit?.actorUserId ?? params.requestedBy ?? undefined,
      complaint: c,
      payload: {
        challengeId: ch.challengeId,
        expiresAt: expiresAt.toISOString(),
      },
    });

    // OTP delivery adapter is environment-specific; in this repository we rely on audit-grade logging and provider integration outside this service.
    // Do not return the OTP code.

    return { challengeId: ch.challengeId, expiresAt };
  }

  async verifyComplaintMobileOtp(params: {
    complaintId: string;
    code: string;
    verifiedBy: string | null;
    audit?: { correlationId?: string; tenantId?: string; actorUserId?: string };
  }): Promise<Complaint> {
    const c = await this.getComplaint(params.complaintId);
    if (!c) {
      const err: any = new Error('Complaint not found');
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (!c.complainantMobile || c.complainantMobile.trim().length === 0) {
      const err: any = new Error('complainantMobile is required');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    if (c.complainantMobileVerified) {
      return c;
    }

    const now = new Date();
    const ch = await this.otpRepo
      .createQueryBuilder('x')
      .where('x.complaint_id = :complaintId', { complaintId: params.complaintId })
      .andWhere('x.mobile = :mobile', { mobile: c.complainantMobile })
      .andWhere('x.status IN (:...statuses)', { statuses: ['sent'] })
      .orderBy('x.created_at', 'DESC')
      .getOne();
    if (!ch) {
      const err: any = new Error('OTP challenge not found');
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (ch.expiresAt.getTime() <= now.getTime()) {
      ch.status = 'expired';
      await this.otpRepo.save(ch);
      const err: any = new Error('OTP expired');
      err.code = 'OTP_EXPIRED';
      throw err;
    }

    if (ch.attempts >= ch.maxAttempts) {
      ch.status = 'locked';
      await this.otpRepo.save(ch);
      const err: any = new Error('OTP attempts exceeded');
      err.code = 'OTP_LOCKED';
      throw err;
    }

    const code = String(params.code || '').trim();
    if (!code) {
      const err: any = new Error('code is required');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const expected = this.hashOtp(code, ch.codeSalt);
    if (expected !== ch.codeHash) {
      ch.attempts = (ch.attempts || 0) + 1;
      ch.lastAttemptAt = now;
      if (ch.attempts >= ch.maxAttempts) {
        ch.status = 'locked';
      }
      await this.otpRepo.save(ch);
      const err: any = new Error('Invalid OTP');
      err.code = 'INVALID_OTP';
      throw err;
    }

    ch.status = 'verified';
    ch.verifiedAt = now;
    ch.verifiedBy = params.verifiedBy;
    ch.lastAttemptAt = now;
    await this.otpRepo.save(ch);

    c.complainantMobileVerified = true;
    c.complainantMobileVerifiedAt = now;
    c.updatedAt = now;
    await this.complaintsRepo.save(c);

    await this.writeAudit({
      complaintId: params.complaintId,
      eventType: 'mobile_verified',
      correlationId: params.audit?.correlationId,
      tenantId: params.audit?.tenantId,
      actorUserId: params.audit?.actorUserId ?? params.verifiedBy ?? undefined,
      fromStatus: null,
      toStatus: null,
      reason: null,
      details: {
        challengeId: ch.challengeId,
        verifiedAt: now.toISOString(),
      },
    });

    await this.publishComplaintEvent({
      topic: 'insurance.complaint.mobile_verified',
      eventType: 'ComplaintMobileVerified',
      correlationId: params.audit?.correlationId,
      tenantId: params.audit?.tenantId,
      actorUserId: params.audit?.actorUserId ?? params.verifiedBy ?? undefined,
      complaint: c,
      payload: {
        challengeId: ch.challengeId,
        verifiedAt: now.toISOString(),
      },
    });

    return c;
  }

  async publishComplaintSlaBreachedEvent(params: {
    complaint: Complaint;
    breachedAt: Date;
    slaHours: number | null;
    elapsedHours: number;
    audit?: { correlationId?: string; tenantId?: string; actorUserId?: string };
  }): Promise<void> {
    await this.publishComplaintEvent({
      topic: 'insurance.complaint.sla_breached',
      eventType: 'ComplaintSlaBreached',
      correlationId: params.audit?.correlationId,
      tenantId: params.audit?.tenantId,
      actorUserId: params.audit?.actorUserId,
      complaint: params.complaint,
      payload: {
        breachedAt: params.breachedAt.toISOString(),
        slaHours: params.slaHours,
        elapsedHours: params.elapsedHours,
      },
    });
  }

  private async writeAudit(params: {
    complaintId: string;
    eventType: ComplaintAuditEventType;
    correlationId?: string;
    tenantId?: string;
    actorUserId?: string;
    fromStatus?: string | null;
    toStatus?: string | null;
    reason?: string | null;
    details?: Record<string, any> | null;
  }): Promise<void> {
    const rec = this.auditRepo.create({
      complaintId: params.complaintId,
      eventType: params.eventType,
      correlationId: params.correlationId ?? null,
      tenantId: params.tenantId ?? null,
      actorUserId: params.actorUserId ?? null,
      fromStatus: params.fromStatus ?? null,
      toStatus: params.toStatus ?? null,
      reason: params.reason ?? null,
      details: params.details ?? null,
    });

    await this.auditRepo.save(rec);
  }

  private getSlaFirstResponseHoursDefault(): number | null {
    const v = process.env.COMPLAINTS_SLA_FIRST_RESPONSE_HOURS;
    if (!v) return null;
    const n = parseInt(v, 10);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  }

  private getSlaResolutionHoursDefault(): number | null {
    const v = process.env.COMPLAINTS_SLA_RESOLUTION_HOURS;
    if (!v) return null;
    const n = parseInt(v, 10);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
  }

  async createComplaint(params: {
    complaintType: ComplaintType;
    description: string;
    policyCompanyName?: string | null;
    policyNumber?: string | null;
    policyTitle?: string | null;
    policyId?: string | null;
    claimId?: string | null;
    complainantNationalId?: string | null;
    complainantBirthDate?: string | null;
    complainantMobile?: string | null;
    complainantAddress?: string | null;
    complainantRepresentativeStatus?: string | null;
    assignedTo?: string | null;
    createdBy?: string | null;
    slaFirstResponseDueAt?: Date | null;
    slaResolutionDueAt?: Date | null;
    audit?: { correlationId?: string; tenantId?: string; actorUserId?: string };
  }): Promise<Complaint> {
    const now = new Date();
    const frDefaultH = this.getSlaFirstResponseHoursDefault();
    const resDefaultH = this.getSlaResolutionHoursDefault();

    const slaFirstResponseDueAt =
      params.slaFirstResponseDueAt ?? (frDefaultH ? new Date(now.getTime() + frDefaultH * 60 * 60 * 1000) : null);
    const slaResolutionDueAt =
      params.slaResolutionDueAt ?? (resDefaultH ? new Date(now.getTime() + resDefaultH * 60 * 60 * 1000) : null);

    const c = this.complaintsRepo.create({
      complaintId: uuidv4(),
      complaintType: params.complaintType,
      status: 'open',
      policyCompanyName: params.policyCompanyName ?? null,
      policyNumber: params.policyNumber ?? null,
      policyTitle: params.policyTitle ?? null,
      policyId: params.policyId ?? null,
      claimId: params.claimId ?? null,
      complainantNationalId: params.complainantNationalId ?? null,
      complainantBirthDate: params.complainantBirthDate ?? null,
      complainantMobile: params.complainantMobile ?? null,
      complainantMobileVerified: false,
      complainantMobileVerifiedAt: null,
      complainantAddress: params.complainantAddress ?? null,
      complainantRepresentativeStatus: params.complainantRepresentativeStatus ?? null,
      description: params.description,
      assignedTo: params.assignedTo ?? null,
      slaFirstResponseDueAt,
      slaResolutionDueAt,
      firstResponseAt: null,
      resolvedAt: null,
      escalatedAt: null,
      resolutionSummary: null,
      createdBy: params.createdBy ?? null,
      createdAt: now,
      updatedAt: now,
    });

    await this.complaintsRepo.save(c);

    await this.writeAudit({
      complaintId: c.complaintId,
      eventType: 'created',
      correlationId: params.audit?.correlationId,
      tenantId: params.audit?.tenantId,
      actorUserId: params.audit?.actorUserId,
      fromStatus: null,
      toStatus: c.status,
      reason: null,
      details: {
        complaintType: c.complaintType,
        policyNumber: c.policyNumber,
        claimId: c.claimId,
        assignedTo: c.assignedTo,
      },
    });

    await this.publishComplaintEvent({
      topic: 'insurance.complaint.created',
      eventType: 'ComplaintCreated',
      correlationId: params.audit?.correlationId,
      tenantId: params.audit?.tenantId,
      actorUserId: params.audit?.actorUserId,
      complaint: c,
    });

    return c;
  }

  async escalateComplaint(params: {
    complaintId: string;
    escalatedReason: string;
    escalatedBy: string;
    assignedTo?: string | null;
    audit?: { correlationId?: string; tenantId?: string; actorUserId?: string };
  }): Promise<Complaint | null> {
    const c = await this.getComplaint(params.complaintId);
    if (!c) return null;

    const fromStatus = c.status;

    c.status = 'escalated';
    c.escalatedAt = new Date();
    c.escalatedReason = params.escalatedReason;
    c.escalatedBy = params.escalatedBy;
    if (params.assignedTo !== undefined) {
      c.assignedTo = params.assignedTo ?? null;
    }
    c.updatedAt = new Date();

    await this.complaintsRepo.save(c);

    await this.writeAudit({
      complaintId: c.complaintId,
      eventType: 'escalated',
      correlationId: params.audit?.correlationId,
      tenantId: params.audit?.tenantId,
      actorUserId: params.audit?.actorUserId ?? params.escalatedBy,
      fromStatus,
      toStatus: c.status,
      reason: params.escalatedReason,
      details: {
        escalatedBy: params.escalatedBy,
        assignedTo: c.assignedTo,
      },
    });

    await this.publishComplaintEvent({
      topic: 'insurance.complaint.escalated',
      eventType: 'ComplaintEscalated',
      correlationId: params.audit?.correlationId,
      tenantId: params.audit?.tenantId,
      actorUserId: params.audit?.actorUserId ?? params.escalatedBy,
      complaint: c,
      payload: {
        fromStatus,
        toStatus: c.status,
        escalatedReason: params.escalatedReason,
        escalatedBy: params.escalatedBy,
      },
    });

    return c;
  }

  async getComplaint(complaintId: string): Promise<Complaint | null> {
    return await this.complaintsRepo.findOne({ where: { complaintId } });
  }

  async listComplaints(params: {
    status?: string;
    complaintType?: string;
    policyNumber?: string;
    claimId?: string;
    complainantNationalId?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: Complaint[]; total: number }> {
    const qb = this.complaintsRepo.createQueryBuilder('c');

    if (params.status) qb.andWhere('c.status = :status', { status: params.status });
    if (params.complaintType) qb.andWhere('c.complaint_type = :complaintType', { complaintType: params.complaintType });
    if (params.policyNumber) qb.andWhere('c.policy_number = :policyNumber', { policyNumber: params.policyNumber });
    if (params.claimId) qb.andWhere('c.claim_id = :claimId', { claimId: params.claimId });
    if (params.complainantNationalId)
      qb.andWhere('c.complainant_national_id = :nid', { nid: params.complainantNationalId });

    qb.orderBy('c.created_at', 'DESC').limit(params.limit).offset(params.offset);

    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  async updateStatus(params: {
    complaintId: string;
    status: ComplaintStatus;
    resolutionSummary?: string | null;
    audit?: { correlationId?: string; tenantId?: string; actorUserId?: string };
  }): Promise<Complaint | null> {
    const c = await this.getComplaint(params.complaintId);
    if (!c) return null;

    const fromStatus = c.status;

    c.status = params.status;
    c.updatedAt = new Date();

    if (params.status === 'in_review' && !c.firstResponseAt) {
      c.firstResponseAt = new Date();
    }

    if (params.status === 'resolved') {
      c.resolvedAt = new Date();
    }

    if (params.status === 'escalated') {
      c.escalatedAt = new Date();
    }

    if (params.resolutionSummary !== undefined) {
      c.resolutionSummary = params.resolutionSummary ?? null;
    }

    await this.complaintsRepo.save(c);

    await this.writeAudit({
      complaintId: c.complaintId,
      eventType: 'status_changed',
      correlationId: params.audit?.correlationId,
      tenantId: params.audit?.tenantId,
      actorUserId: params.audit?.actorUserId,
      fromStatus,
      toStatus: c.status,
      reason: null,
      details: {
        resolutionSummary: params.resolutionSummary ?? null,
      },
    });

    if (params.status === 'resolved') {
      await this.publishComplaintEvent({
        topic: 'insurance.complaint.resolved',
        eventType: 'ComplaintResolved',
        correlationId: params.audit?.correlationId,
        tenantId: params.audit?.tenantId,
        actorUserId: params.audit?.actorUserId,
        complaint: c,
        payload: {
          fromStatus,
          toStatus: c.status,
          resolutionSummary: params.resolutionSummary ?? null,
          resolvedAt: c.resolvedAt,
        },
      });
    } else {
      await this.publishComplaintEvent({
        topic: 'insurance.complaint.status_changed',
        eventType: 'ComplaintStatusChanged',
        correlationId: params.audit?.correlationId,
        tenantId: params.audit?.tenantId,
        actorUserId: params.audit?.actorUserId,
        complaint: c,
        payload: {
          fromStatus,
          toStatus: c.status,
          resolutionSummary: params.resolutionSummary ?? null,
        },
      });
    }

    return c;
  }

  async attachDocument(params: {
    complaintId: string;
    documentId: string;
    notes?: string | null;
    createdBy?: string | null;
    audit?: { correlationId?: string; tenantId?: string; actorUserId?: string };
  }): Promise<ComplaintAttachment> {
    const a = this.attachmentsRepo.create({
      complaintAttachmentId: uuidv4(),
      complaintId: params.complaintId,
      documentId: params.documentId,
      notes: params.notes ?? null,
      createdBy: params.createdBy ?? null,
      createdAt: new Date(),
    });

    await this.attachmentsRepo.save(a);

    await this.writeAudit({
      complaintId: params.complaintId,
      eventType: 'attachment_added',
      correlationId: params.audit?.correlationId,
      tenantId: params.audit?.tenantId,
      actorUserId: params.audit?.actorUserId ?? params.createdBy ?? undefined,
      fromStatus: null,
      toStatus: null,
      reason: null,
      details: {
        complaintAttachmentId: a.complaintAttachmentId,
        documentId: a.documentId,
      },
    });

    const complaint = await this.getComplaint(params.complaintId);
    if (complaint) {
      await this.publishComplaintEvent({
        topic: 'insurance.complaint.attachment_added',
        eventType: 'ComplaintAttachmentAdded',
        correlationId: params.audit?.correlationId,
        tenantId: params.audit?.tenantId,
        actorUserId: params.audit?.actorUserId ?? params.createdBy ?? undefined,
        complaint,
        payload: {
          complaintAttachmentId: a.complaintAttachmentId,
          documentId: a.documentId,
          notes: a.notes,
          createdBy: a.createdBy,
        },
      });
    }

    return a;
  }

  async listAttachments(complaintId: string): Promise<ComplaintAttachment[]> {
    return await this.attachmentsRepo.find({ where: { complaintId }, order: { createdAt: 'DESC' } });
  }

  async getDashboard(params: { now: Date }): Promise<{
    totalsByStatus: Array<{ status: ComplaintStatus; total: number }>;
    totalsByType: Array<{ complaintType: ComplaintType; total: number }>;
    sla: {
      firstResponseOverdueOpen: number;
      resolutionOverdueOpen: number;
    };
  }> {
    const nowIso = params.now.toISOString();

    const totalsByStatusRaw = await this.complaintsRepo
      .createQueryBuilder('c')
      .select('c.status', 'status')
      .addSelect('COUNT(*)', 'total')
      .groupBy('c.status')
      .getRawMany();

    const totalsByTypeRaw = await this.complaintsRepo
      .createQueryBuilder('c')
      .select('c.complaint_type', 'complaintType')
      .addSelect('COUNT(*)', 'total')
      .groupBy('c.complaint_type')
      .getRawMany();

    const firstResponseOverdueOpen = await this.complaintsRepo
      .createQueryBuilder('c')
      .where('c.status IN (:...statuses)', { statuses: ['open', 'in_review', 'escalated'] })
      .andWhere('c.first_response_at IS NULL')
      .andWhere('c.sla_first_response_due_at IS NOT NULL')
      .andWhere('c.sla_first_response_due_at < :now', { now: nowIso })
      .getCount();

    const resolutionOverdueOpen = await this.complaintsRepo
      .createQueryBuilder('c')
      .where('c.status IN (:...statuses)', { statuses: ['open', 'in_review', 'escalated'] })
      .andWhere('c.resolved_at IS NULL')
      .andWhere('c.sla_resolution_due_at IS NOT NULL')
      .andWhere('c.sla_resolution_due_at < :now', { now: nowIso })
      .getCount();

    return {
      totalsByStatus: totalsByStatusRaw.map((r: any) => ({ status: r.status as ComplaintStatus, total: parseInt(r.total, 10) || 0 })),
      totalsByType: totalsByTypeRaw.map((r: any) => ({ complaintType: r.complaintType as ComplaintType, total: parseInt(r.total, 10) || 0 })),
      sla: {
        firstResponseOverdueOpen,
        resolutionOverdueOpen,
      },
    };
  }

  // Recurring causes analysis methods
  private extractCausesFromDescription(description: string): string[] {
    if (!description || description.trim().length === 0) return [];

    const causes: string[] = [];
    const lowerDesc = description.toLowerCase();

    // Common complaint cause keywords (Persian and English)
    const causeKeywords = [
      { keywords: ['تأخیر', 'delay', 'late', 'تاخیر'], cause: 'تأخیر در پرداخت' },
      { keywords: ['پرداخت', 'payment', 'پرداخت نشده'], cause: 'مسائل پرداخت' },
      { keywords: ['خسارت', 'damage', 'claim'], cause: 'مشکلات خسارت' },
      { keywords: ['بیمه', 'policy', 'قرارداد'], cause: 'مسائل بیمه‌نامه' },
      { keywords: ['کارشناس', 'adjuster', 'ارزیاب'], cause: 'مشکلات ارزیاب' },
      { keywords: ['نرخ', 'rate', 'مبلغ'], cause: 'اختلاف در مبلغ' },
      { keywords: ['خدمات', 'service', 'پشتیبانی'], cause: 'کیفیت خدمات' },
      { keywords: ['سرویس', 'service'], cause: 'کیفیت خدمات' },
      { keywords: ['اطلاعات', 'information', 'اطلاع‌رسانی'], cause: 'کمبود اطلاعات' },
      { keywords: ['مستند', 'document', 'مدارک'], cause: 'مشکلات مدارک' },
      { keywords: ['تماس', 'call', 'پاسخگویی'], cause: 'مشکلات تماس' },
      { keywords: ['نماینده', 'agent', 'کارگزار'], cause: 'مشکلات نماینده' },
      { keywords: ['پورسانت', 'commission', 'کمیسیون'], cause: 'مسائل کمیسیون' },
      { keywords: ['تمدید', 'renewal', 'تمدید'], cause: 'مشکلات تمدید' },
      { keywords: ['فسخ', 'cancellation', 'لغو'], cause: 'مشکلات فسخ' },
      { keywords: ['فرانشیز', 'deductible', 'کسورات'], cause: 'اختلاف فرانشیز' },
      { keywords: ['نواقص', 'defect', 'نقص'], cause: 'نواقص پوشش' },
      { keywords: ['پوشش', 'coverage', 'بیمه‌شده'], cause: 'نواقص پوشش' },
      { keywords: ['شعب', 'branch', 'دفتر'], cause: 'مشکلات شعبه' },
      { keywords: ['سیستم', 'system', 'اپلیکیشن'], cause: 'مشکلات سیستم' },
    ];

    for (const causeGroup of causeKeywords) {
      for (const keyword of causeGroup.keywords) {
        if (lowerDesc.includes(keyword)) {
          if (!causes.includes(causeGroup.cause)) {
            causes.push(causeGroup.cause);
          }
          break;
        }
      }
    }

    // If no keywords matched, use simple NLP-based extraction (first meaningful phrase)
    if (causes.length === 0 && description.length > 0) {
      const words = description.split(/\s+/).filter(w => w.length > 3);
      if (words.length > 0) {
        causes.push(words.slice(0, 3).join(' '));
      }
    }

    return causes;
  }

  async analyzeRecurringCauses(params: {
    startDate?: Date;
    endDate?: Date;
    complaintType?: ComplaintType;
    minOccurrences?: number;
  }): Promise<{
    causes: Array<{
      cause: string;
      count: number;
      percentage: number;
      avgResolutionTimeHours: number;
      recentExamples: Array<{
        complaintId: string;
        description: string;
        createdAt: Date;
        status: ComplaintStatus;
      }>;
    }>;
    totalComplaints: number;
    analyzedComplaints: number;
  }> {
    const qb = this.complaintsRepo.createQueryBuilder('c');

    if (params.startDate) {
      qb.andWhere('c.created_at >= :startDate', { startDate: params.startDate });
    }
    if (params.endDate) {
      qb.andWhere('c.created_at <= :endDate', { endDate: params.endDate });
    }
    if (params.complaintType) {
      qb.andWhere('c.complaint_type = :complaintType', { complaintType: params.complaintType });
    }

    const complaints = await qb.orderBy('c.created_at', 'DESC').getMany();
    const minOccurrences = params.minOccurrences || 2;

    const causeMap = new Map<string, {
      count: number;
      complaintIds: string[];
      totalResolutionHours: number;
      resolutionCount: number;
    }>();

    let analyzedCount = 0;

    for (const complaint of complaints) {
      const causes = this.extractCausesFromDescription(complaint.description || '');
      analyzedCount++;

      for (const cause of causes) {
        const existing = causeMap.get(cause) || {
          count: 0,
          complaintIds: [],
          totalResolutionHours: 0,
          resolutionCount: 0,
        };

        existing.count++;
        existing.complaintIds.push(complaint.complaintId);

        if (complaint.resolvedAt && complaint.createdAt) {
          const hours = (new Date(complaint.resolvedAt).getTime() - new Date(complaint.createdAt).getTime()) / (1000 * 60 * 60);
          existing.totalResolutionHours += hours;
          existing.resolutionCount++;
        }

        causeMap.set(cause, existing);
      }
    }

    // Build response with only causes meeting minimum occurrence threshold
    const causes = [];
    const totalComplaints = complaints.length;

    for (const [cause, data] of causeMap.entries()) {
      if (data.count >= minOccurrences) {
        const recentExamples = await this.complaintsRepo
          .createQueryBuilder('c')
          .where('c.complaint_id IN (:...ids)', { ids: data.complaintIds.slice(0, 5) })
          .select(['c.complaintId', 'c.description', 'c.createdAt', 'c.status'])
          .getMany();

        causes.push({
          cause,
          count: data.count,
          percentage: totalComplaints > 0 ? (data.count / totalComplaints) * 100 : 0,
          avgResolutionTimeHours: data.resolutionCount > 0 ? data.totalResolutionHours / data.resolutionCount : 0,
          recentExamples: recentExamples.map(c => ({
            complaintId: c.complaintId,
            description: c.description || '',
            createdAt: c.createdAt,
            status: c.status,
          })),
        });
      }
    }

    // Sort by count descending
    causes.sort((a, b) => b.count - a.count);

    this.logger.log(`Analyzed ${analyzedCount} complaints, found ${causes.length} recurring causes`);

    return {
      causes,
      totalComplaints,
      analyzedComplaints: analyzedCount,
    };
  }

  async getCauseTrends(params: {
    cause: string;
    days?: number;
  }): Promise<{
    cause: string;
    trend: Array<{
      date: string;
      count: number;
    }>;
    total: number;
    avgPerDay: number;
  }> {
    const days = params.days || 30;
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const complaints = await this.complaintsRepo
      .createQueryBuilder('c')
      .where('c.created_at >= :startDate', { startDate })
      .where('c.created_at <= :endDate', { endDate })
      .getMany();

    const dailyCount = new Map<string, number>();
    let total = 0;

    for (const complaint of complaints) {
      const causes = this.extractCausesFromDescription(complaint.description || '');
      if (causes.includes(params.cause)) {
        const dateKey = complaint.createdAt.toISOString().split('T')[0];
        dailyCount.set(dateKey, (dailyCount.get(dateKey) || 0) + 1);
        total++;
      }
    }

    // Build trend array
    const trend = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      trend.push({
        date: dateKey,
        count: dailyCount.get(dateKey) || 0,
      });
    }

    return {
      cause: params.cause,
      trend,
      total,
      avgPerDay: days > 0 ? total / days : 0,
    };
  }

  // Central Insurance auto-send methods
  private getCentralInsuranceApiUrl(): string {
    return process.env.CENTRAL_INSURANCE_API_URL || 'https://api.bimehmarkazi.ir/v1/complaints';
  }

  private getCentralInsuranceApiKey(): string {
    return process.env.CENTRAL_INSURANCE_API_KEY || '';
  }

  private isCentralInsuranceEnabled(): boolean {
    return process.env.CENTRAL_INSURANCE_ENABLED === 'true' && this.getCentralInsuranceApiKey().length > 0;
  }

  async sendToCentralInsurance(params: {
    complaintId: string;
    correlationId?: string;
    tenantId?: string;
    actorUserId?: string;
  }): Promise<{
    success: boolean;
    sentAt?: Date;
    trackingNumber?: string;
    error?: string;
  }> {
    if (!this.isCentralInsuranceEnabled()) {
      this.logger.warn('Central Insurance integration is not enabled');
      return { success: false, error: 'Central Insurance integration is not enabled' };
    }

    const complaint = await this.getComplaint(params.complaintId);
    if (!complaint) {
      return { success: false, error: 'Complaint not found' };
    }

    const attachments = await this.listAttachments(params.complaintId);

    // Build Central Insurance payload
    const payload = {
      trackingNumber: complaint.complaintId,
      complaintType: complaint.complaintType,
      policyNumber: complaint.policyNumber || null,
      claimNumber: null, // Could be derived from claimId if needed
      complainantMobile: complaint.complainantMobile || null,
      description: complaint.description || '',
      status: complaint.status,
      createdAt: complaint.createdAt?.toISOString(),
      resolvedAt: complaint.resolvedAt?.toISOString() || null,
      firstResponseAt: complaint.firstResponseAt?.toISOString() || null,
      resolutionSummary: complaint.resolutionSummary || null,
      attachments: attachments.map(a => ({
        documentId: a.documentId,
        notes: a.notes,
        createdAt: a.createdAt?.toISOString(),
      })),
    };

    try {
      const apiUrl = this.getCentralInsuranceApiUrl();
      const apiKey = this.getCentralInsuranceApiKey();

      this.logger.log(`Sending complaint ${params.complaintId} to Central Insurance API: ${apiUrl}`);

      const response = await this.callCentralInsuranceApi(apiUrl, apiKey, payload);

      // Update complaint with Central Insurance tracking info
      complaint.metadata = {
        ...(complaint.metadata || {}),
        centralInsurance: {
          sentAt: new Date().toISOString(),
          trackingNumber: response.trackingNumber,
          status: 'sent',
        },
      };
      await this.complaintsRepo.save(complaint);

      await this.writeAudit({
        complaintId: params.complaintId,
        eventType: 'central_insurance_sent',
        correlationId: params.correlationId,
        tenantId: params.tenantId,
        actorUserId: params.actorUserId,
        fromStatus: null,
        toStatus: null,
        reason: null,
        details: {
          trackingNumber: response.trackingNumber,
          sentAt: new Date().toISOString(),
        },
      });

      this.logger.log(`Successfully sent complaint ${params.complaintId} to Central Insurance. Tracking: ${response.trackingNumber}`);

      return {
        success: true,
        sentAt: new Date(),
        trackingNumber: response.trackingNumber,
      };
    } catch (error: any) {
      this.logger.error(`Failed to send complaint ${params.complaintId} to Central Insurance: ${error.message}`);

      // Update complaint with error info
      complaint.metadata = {
        ...(complaint.metadata || {}),
        centralInsurance: {
          lastAttemptAt: new Date().toISOString(),
          lastError: error.message,
          status: 'failed',
        },
      };
      await this.complaintsRepo.save(complaint);

      return {
        success: false,
        error: error.message || 'Failed to send to Central Insurance',
      };
    }
  }

  private async callCentralInsuranceApi(apiUrl: string, apiKey: string, payload: any): Promise<{ trackingNumber: string }> {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Central Insurance API returned ${res.status}`);
    }

    const result: any = await res.json().catch(() => ({}));
    const trackingNumber = result?.trackingNumber || result?.data?.trackingNumber;
    if (!trackingNumber || typeof trackingNumber !== 'string') {
      throw new Error('Central Insurance API response missing trackingNumber');
    }

    return { trackingNumber };
  }

  async autoSendOnResolution(params: {
    complaintId: string;
    correlationId?: string;
    tenantId?: string;
    actorUserId?: string;
  }): Promise<void> {
    const complaint = await this.getComplaint(params.complaintId);
    if (!complaint) return;

    // Only auto-send when complaint is resolved
    if (complaint.status !== 'resolved') {
      return;
    }

    // Check if already sent
    const ciData = (complaint.metadata as any)?.centralInsurance;
    if (ciData?.status === 'sent') {
      this.logger.log(`Complaint ${params.complaintId} already sent to Central Insurance`);
      return;
    }

    // Send to Central Insurance
    await this.sendToCentralInsurance({
      complaintId: params.complaintId,
      correlationId: params.correlationId,
      tenantId: params.tenantId,
      actorUserId: params.actorUserId,
    });
  }

  async getCentralInsuranceStatus(params: {
    complaintId: string;
  }): Promise<{
    sent: boolean;
    sentAt?: Date;
    trackingNumber?: string;
    status?: string;
    lastError?: string;
    lastAttemptAt?: Date;
  } | null> {
    const complaint = await this.getComplaint(params.complaintId);
    if (!complaint) return null;

    const ciData = (complaint.metadata as any)?.centralInsurance;
    if (!ciData) {
      return { sent: false };
    }

    return {
      sent: ciData.status === 'sent',
      sentAt: ciData.sentAt ? new Date(ciData.sentAt) : undefined,
      trackingNumber: ciData.trackingNumber,
      status: ciData.status,
      lastError: ciData.lastError,
      lastAttemptAt: ciData.lastAttemptAt ? new Date(ciData.lastAttemptAt) : undefined,
    };
  }

  async retryFailedCentralInsuranceSend(params: {
    complaintId: string;
    correlationId?: string;
    tenantId?: string;
    actorUserId?: string;
  }): Promise<{
    success: boolean;
    sentAt?: Date;
    trackingNumber?: string;
    error?: string;
  }> {
    const complaint = await this.getComplaint(params.complaintId);
    if (!complaint) {
      return { success: false, error: 'Complaint not found' };
    }

    const ciData = (complaint.metadata as any)?.centralInsurance;
    if (!ciData || ciData.status !== 'failed') {
      return { success: false, error: 'Complaint has not failed to send to Central Insurance' };
    }

    return this.sendToCentralInsurance({
      complaintId: params.complaintId,
      correlationId: params.correlationId,
      tenantId: params.tenantId,
      actorUserId: params.actorUserId,
    });
  }
}
