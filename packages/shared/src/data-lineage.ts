/**
 * Data Lineage Tracking
 * Tracks the flow of data through the system for audit and compliance
 */

import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { LineageEventEntity } from './entities/LineageEventEntity';

export interface LineageEvent {
  id: string;
  timestamp: Date;
  sourceSystem: string;
  sourceEntity: string;
  sourceEntityId: string;
  operation: 'create' | 'read' | 'update' | 'delete' | 'transform' | 'export' | 'import';
  targetSystem?: string | null;
  targetEntity?: string | null;
  targetEntityId?: string | null;
  transformation?: string | null;
  userId?: string | null;
  tenantId?: string | null;
  metadata?: Record<string, any> | null;
}

export interface LineageQuery {
  sourceSystem?: string;
  sourceEntity?: string;
  sourceEntityId?: string;
  targetSystem?: string;
  targetEntity?: string;
  operation?: string;
  userId?: string;
  tenantId?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Data Lineage Service
 */
class DataLineageService {
  private repo?: Repository<LineageEventEntity>;
  private lineageEvents: LineageEvent[] = [];

  constructor(dataSource?: DataSource) {
    if (dataSource) {
      this.repo = dataSource.getRepository(LineageEventEntity);
    }
  }

  setDataSource(dataSource: DataSource): void {
    this.repo = dataSource.getRepository(LineageEventEntity);
  }

  /**
   * Record a lineage event
   */
  async recordEvent(event: Omit<LineageEvent, 'id' | 'timestamp'>): Promise<LineageEvent> {
    const lineageEvent: LineageEvent = {
      id: uuidv4(),
      timestamp: new Date(),
      ...event,
    };

    if (this.repo) {
      const entity = this.repo.create(lineageEvent);
      await this.repo.save(entity);
    } else {
      this.lineageEvents.push(lineageEvent);
    }

    return lineageEvent;
  }

  /**
   * Query lineage events
   */
  async queryEvents(query: LineageQuery): Promise<LineageEvent[]> {
    const events = this.repo
      ? (await this.repo.find({ order: { timestamp: 'DESC' } })).map(e => this.toRecord(e))
      : [...this.lineageEvents];

    let results = events;

    if (query.sourceSystem) {
      results = results.filter(e => e.sourceSystem === query.sourceSystem);
    }
    if (query.sourceEntity) {
      results = results.filter(e => e.sourceEntity === query.sourceEntity);
    }
    if (query.sourceEntityId) {
      results = results.filter(e => e.sourceEntityId === query.sourceEntityId);
    }
    if (query.targetSystem) {
      results = results.filter(e => e.targetSystem === query.targetSystem);
    }
    if (query.targetEntity) {
      results = results.filter(e => e.targetEntity === query.targetEntity);
    }
    if (query.operation) {
      results = results.filter(e => e.operation === query.operation);
    }
    if (query.userId) {
      results = results.filter(e => e.userId === query.userId);
    }
    if (query.tenantId) {
      results = results.filter(e => e.tenantId === query.tenantId);
    }
    if (query.startDate) {
      results = results.filter(e => e.timestamp >= query.startDate!);
    }
    if (query.endDate) {
      results = results.filter(e => e.timestamp <= query.endDate!);
    }

    return results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get data flow for a specific entity
   */
  async getDataFlow(entityId: string, entity: string): Promise<{
    upstream: LineageEvent[];
    downstream: LineageEvent[];
  }> {
    const all = this.repo ? (await this.repo.find()).map(e => this.toRecord(e)) : this.lineageEvents;

    const upstream = all.filter(e => e.targetEntityId === entityId && e.targetEntity === entity);
    const downstream = all.filter(e => e.sourceEntityId === entityId && e.sourceEntity === entity);

    return {
      upstream: upstream.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
      downstream: downstream.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
    };
  }

  /**
   * Get transformation history for an entity
   */
  async getTransformationHistory(entityId: string, entity: string): Promise<LineageEvent[]> {
    const all = this.repo ? (await this.repo.find()).map(e => this.toRecord(e)) : this.lineageEvents;

    return all
      .filter(e => e.sourceEntityId === entityId && e.sourceEntity === entity && e.operation === 'transform')
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Get data access history for an entity
   */
  async getAccessHistory(entityId: string, entity: string): Promise<LineageEvent[]> {
    const all = this.repo ? (await this.repo.find()).map(e => this.toRecord(e)) : this.lineageEvents;

    return all
      .filter(e => e.sourceEntityId === entityId && e.sourceEntity === entity && ['read', 'update', 'delete'].includes(e.operation))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Clear old lineage events (for data retention)
   */
  async clearOldEvents(retentionDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    if (this.repo) {
      const result = await this.repo
        .createQueryBuilder()
        .delete()
        .where('timestamp < :cutoff', { cutoff: cutoffDate })
        .execute();
      return result.affected || 0;
    }

    const beforeCount = this.lineageEvents.length;
    this.lineageEvents = this.lineageEvents.filter(e => e.timestamp >= cutoffDate);
    const afterCount = this.lineageEvents.length;

    return beforeCount - afterCount;
  }

  /**
   * Export lineage events for audit
   */
  async exportEvents(query: LineageQuery): Promise<string> {
    const events = await this.queryEvents(query);
    return JSON.stringify(events, null, 2);
  }

  private toRecord(entity: LineageEventEntity): LineageEvent {
    return { ...entity };
  }
}

// Export singleton instance
export const dataLineageService = new DataLineageService();

/**
 * Helper function to record data creation
 */
export async function recordDataCreation(params: {
  sourceSystem: string;
  sourceEntity: string;
  sourceEntityId: string;
  userId?: string;
  tenantId?: string;
  metadata?: Record<string, any>;
}): Promise<LineageEvent> {
  return dataLineageService.recordEvent({
    ...params,
    operation: 'create',
  });
}

/**
 * Helper function to record data update
 */
export async function recordDataUpdate(params: {
  sourceSystem: string;
  sourceEntity: string;
  sourceEntityId: string;
  transformation?: string;
  userId?: string;
  tenantId?: string;
  metadata?: Record<string, any>;
}): Promise<LineageEvent> {
  return dataLineageService.recordEvent({
    ...params,
    operation: 'update',
  });
}

/**
 * Helper function to record data transformation
 */
export async function recordDataTransformation(params: {
  sourceSystem: string;
  sourceEntity: string;
  sourceEntityId: string;
  targetSystem: string;
  targetEntity: string;
  targetEntityId: string;
  transformation: string;
  userId?: string;
  tenantId?: string;
  metadata?: Record<string, any>;
}): Promise<LineageEvent> {
  return dataLineageService.recordEvent({
    ...params,
    operation: 'transform',
  });
}

/**
 * Helper function to record data export
 */
export async function recordDataExport(params: {
  sourceSystem: string;
  sourceEntity: string;
  sourceEntityId: string;
  targetSystem: string;
  userId?: string;
  tenantId?: string;
  metadata?: Record<string, any>;
}): Promise<LineageEvent> {
  return dataLineageService.recordEvent({
    ...params,
    operation: 'export',
  });
}
