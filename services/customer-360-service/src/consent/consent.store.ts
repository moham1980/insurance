import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ConsentRecord } from '../models/Customer360Profile';

@Injectable()
export class ConsentStore {
  private readonly logger = new Logger(ConsentStore.name);
  private readonly dataDir: string;

  constructor() {
    this.dataDir = process.env.CONSENT_DATA_PATH || './data/consents';
    try {
      fs.mkdirSync(this.dataDir, { recursive: true });
    } catch (e) {
      this.logger.warn(`Could not create consent data directory: ${this.dataDir}`, e);
    }
  }

  private filePath(customerId: string): string {
    const safeId = customerId.replace(/[^a-zA-Z0-9-]/g, '_');
    return path.join(this.dataDir, `${safeId}.json`);
  }

  private readAll(customerId: string): ConsentRecord[] {
    const file = this.filePath(customerId);
    try {
      const raw = fs.readFileSync(file, 'utf-8');
      const parsed = JSON.parse(raw) as ConsentRecord[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private writeAll(customerId: string, records: ConsentRecord[]): void {
    const file = this.filePath(customerId);
    try {
      fs.writeFileSync(file, JSON.stringify(records, null, 2), 'utf-8');
    } catch (e) {
      this.logger.error(`Failed to write consent store for ${customerId}`, e);
      throw new Error('Failed to persist consent record');
    }
  }

  list(customerId: string): ConsentRecord[] {
    return this.readAll(customerId).map((r) => this.withEffectiveStatus(r));
  }

  check(customerId: string, purpose: string): { purpose: string; granted: boolean; consent: ConsentRecord | null } {
    const records = this.readAll(customerId);
    const matching = records
      .filter((r) => r.purpose === purpose)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    const effective = matching ? this.withEffectiveStatus(matching) : null;
    return { purpose, granted: effective?.status === 'granted', consent: effective };
  }

  add(params: Omit<ConsentRecord, 'consentId' | 'createdAt' | 'updatedAt'>): ConsentRecord {
    const now = new Date();
    const record: ConsentRecord = {
      ...params,
      consentId: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    const records = this.readAll(params.customerId);
    records.push(record);
    this.writeAll(params.customerId, records);
    return record;
  }

  revoke(customerId: string, consentId: string, reason?: string): ConsentRecord | null {
    const records = this.readAll(customerId);
    const record = records.find((r) => r.consentId === consentId);
    if (!record) return null;

    record.status = 'revoked';
    record.revokedAt = new Date();
    record.revocationReason = reason || record.revocationReason;
    record.updatedAt = new Date();
    this.writeAll(customerId, records);
    return this.withEffectiveStatus(record);
  }

  private withEffectiveStatus(record: ConsentRecord): ConsentRecord {
    if (record.status !== 'granted') return record;
    if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
      return { ...record, status: 'expired' };
    }
    return record;
  }
}
