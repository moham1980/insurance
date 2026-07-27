/**
 * Data Lineage Tracking
 * Tracks the flow of data through the system for audit and compliance
 */

export interface LineageEvent {
  id: string;
  timestamp: Date;
  sourceSystem: string;
  sourceEntity: string;
  sourceEntityId: string;
  operation: 'create' | 'read' | 'update' | 'delete' | 'transform' | 'export' | 'import';
  targetSystem?: string;
  targetEntity?: string;
  targetEntityId?: string;
  transformation?: string;
  userId?: string;
  tenantId?: string;
  metadata?: Record<string, any>;
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
 * In-memory implementation (replace with persistent storage in production)
 */
class DataLineageService {
  private lineageEvents: LineageEvent[] = [];

  /**
   * Record a lineage event
   */
  recordEvent(event: Omit<LineageEvent, 'id' | 'timestamp'>): LineageEvent {
    const lineageEvent: LineageEvent = {
      id: `LINEAGE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...event,
    };

    this.lineageEvents.push(lineageEvent);
    return lineageEvent;
  }

  /**
   * Query lineage events
   */
  queryEvents(query: LineageQuery): LineageEvent[] {
    let results = [...this.lineageEvents];

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
  getDataFlow(entityId: string, entity: string): {
    upstream: LineageEvent[];
    downstream: LineageEvent[];
  } {
    const upstream = this.lineageEvents.filter(e => e.targetEntityId === entityId && e.targetEntity === entity);
    const downstream = this.lineageEvents.filter(e => e.sourceEntityId === entityId && e.sourceEntity === entity);

    return {
      upstream: upstream.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
      downstream: downstream.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
    };
  }

  /**
   * Get transformation history for an entity
   */
  getTransformationHistory(entityId: string, entity: string): LineageEvent[] {
    return this.lineageEvents
      .filter(e => e.sourceEntityId === entityId && e.sourceEntity === entity && e.operation === 'transform')
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Get data access history for an entity
   */
  getAccessHistory(entityId: string, entity: string): LineageEvent[] {
    return this.lineageEvents
      .filter(e => e.sourceEntityId === entityId && e.sourceEntity === entity && ['read', 'update', 'delete'].includes(e.operation))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Clear old lineage events (for data retention)
   */
  clearOldEvents(retentionDays: number): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const beforeCount = this.lineageEvents.length;
    this.lineageEvents = this.lineageEvents.filter(e => e.timestamp >= cutoffDate);
    const afterCount = this.lineageEvents.length;

    return beforeCount - afterCount;
  }

  /**
   * Export lineage events for audit
   */
  exportEvents(query: LineageQuery): string {
    const events = this.queryEvents(query);
    return JSON.stringify(events, null, 2);
  }
}

// Export singleton instance
export const dataLineageService = new DataLineageService();

/**
 * Helper function to record data creation
 */
export function recordDataCreation(params: {
  sourceSystem: string;
  sourceEntity: string;
  sourceEntityId: string;
  userId?: string;
  tenantId?: string;
  metadata?: Record<string, any>;
}): LineageEvent {
  return dataLineageService.recordEvent({
    ...params,
    operation: 'create',
  });
}

/**
 * Helper function to record data update
 */
export function recordDataUpdate(params: {
  sourceSystem: string;
  sourceEntity: string;
  sourceEntityId: string;
  transformation?: string;
  userId?: string;
  tenantId?: string;
  metadata?: Record<string, any>;
}): LineageEvent {
  return dataLineageService.recordEvent({
    ...params,
    operation: 'update',
  });
}

/**
 * Helper function to record data transformation
 */
export function recordDataTransformation(params: {
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
}): LineageEvent {
  return dataLineageService.recordEvent({
    ...params,
    operation: 'transform',
  });
}

/**
 * Helper function to record data export
 */
export function recordDataExport(params: {
  sourceSystem: string;
  sourceEntity: string;
  sourceEntityId: string;
  targetSystem: string;
  userId?: string;
  tenantId?: string;
  metadata?: Record<string, any>;
}): LineageEvent {
  return dataLineageService.recordEvent({
    ...params,
    operation: 'export',
  });
}
