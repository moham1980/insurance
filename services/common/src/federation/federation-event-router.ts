interface MinimalLogger {
  info(msg: string, context?: Record<string, unknown>): void;
  warn(msg: string, context?: Record<string, unknown>): void;
  error(msg: string, context?: Record<string, unknown>): void;
  debug(msg: string, context?: Record<string, unknown>): void;
}

export interface FederationEventRoute {
  topic: string;
  targetTenantIds: string[];
  sourceTenantId: string;
  allowedOrganizations: string[];
}

export interface PartitionSelectorConfig {
  partitionStrategy: 'by_tenant' | 'by_organization' | 'round_robin';
  partitionCount: number;
}

export class FederationEventRouter {
  private readonly logger: MinimalLogger;
  private readonly routeCache = new Map<string, FederationEventRoute[]>();

  constructor(
    private readonly config: PartitionSelectorConfig = { partitionStrategy: 'by_tenant', partitionCount: 12 },
    logger?: MinimalLogger,
  ) {
    this.logger = logger || { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} } as any;
  }

  resolveTopic(sourceTenantId: string, eventType: string): string {
    return `${sourceTenantId}.${eventType}.events`;
  }

  resolveRoutes(
    sourceTenantId: string,
    eventType: string,
    projectedIn: string[],
    sourceOrganizationId: string,
    targetOrganizations: string[],
  ): FederationEventRoute[] {
    const topic = this.resolveTopic(sourceTenantId, eventType);
    const cacheKey = `${topic}:${projectedIn.join(',')}`;

    if (this.routeCache.has(cacheKey)) {
      return this.routeCache.get(cacheKey)!;
    }

    const routes: FederationEventRoute[] = projectedIn.map((tenantType) => ({
      topic,
      targetTenantIds: [tenantType],
      sourceTenantId,
      allowedOrganizations: targetOrganizations,
    }));

    this.routeCache.set(cacheKey, routes);
    return routes;
  }

  selectPartition(tenantId: string, organizationId: string): number {
    switch (this.config.partitionStrategy) {
      case 'by_tenant': {
        let hash = 0;
        for (let i = 0; i < tenantId.length; i++) {
          hash = ((hash << 5) - hash + tenantId.charCodeAt(i)) | 0;
        }
        return Math.abs(hash) % this.config.partitionCount;
      }
      case 'by_organization': {
        let hash = 0;
        for (let i = 0; i < organizationId.length; i++) {
          hash = ((hash << 5) - hash + organizationId.charCodeAt(i)) | 0;
        }
        return Math.abs(hash) % this.config.partitionCount;
      }
      case 'round_robin':
      default:
        return Math.floor(Math.random() * this.config.partitionCount);
    }
  }

  isEventAllowedForTenant(
    sourceTenantId: string,
    targetTenantId: string,
    eventType: string,
    sorMatrix: Record<string, { owner: string; projectedIn: string[] }>,
  ): boolean {
    const entityConfig = sorMatrix[eventType];
    if (!entityConfig) {
      this.logger.warn('Event type not found in SOR matrix', { eventType });
      return false;
    }
    if (entityConfig.owner === sourceTenantId) {
      return entityConfig.projectedIn.includes(targetTenantId);
    }
    return false;
  }

  clearCache(): void {
    this.routeCache.clear();
  }
}
