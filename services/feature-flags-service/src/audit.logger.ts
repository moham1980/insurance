type AuditEntry = {
  action: string;
  resource: string;
  resourceId: string;
  actor: string;
  before?: any;
  after?: any;
  correlationId?: string;
  timestamp: string;
};

const entries: AuditEntry[] = [];
const MAX_ENTRIES = 10000;

export const auditLogger = {
  log(action: string, details: Omit<AuditEntry, 'action' | 'timestamp'>): void {
    const entry: AuditEntry = {
      action,
      timestamp: new Date().toISOString(),
      ...details,
    };
    entries.push(entry);
    if (entries.length > MAX_ENTRIES) entries.shift();
    console.log(`[AUDIT] ${entry.action} ${entry.resource}/${entry.resourceId} by ${entry.actor}`, {
      before: entry.before,
      after: entry.after,
      correlationId: entry.correlationId,
    });
  },

  getEntries(): AuditEntry[] {
    return [...entries];
  },
};
