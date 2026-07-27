import { Injectable } from '@nestjs/common';

/**
 * Tenant Isolation Service
 * Provides utilities for enforcing tenant isolation across different layers
 */
@Injectable()
export class TenantIsolationService {
  /**
   * Add tenant filter to database query
   */
  addTenantFilter(queryBuilder: any, tenantId: string, tenantColumn: string = 'tenant_id'): any {
    return queryBuilder.andWhere(`${tenantColumn} = :tenantId`, { tenantId });
  }

  /**
   * Add tenant filter to cache key
   */
  addTenantToCacheKey(key: string, tenantId: string): string {
    return `tenant:${tenantId}:${key}`;
  }

  /**
   * Add tenant prefix to queue topic
   */
  addTenantToQueueTopic(topic: string, tenantId: string): string {
    return `tenant.${tenantId}.${topic}`;
  }

  /**
   * Add tenant prefix to file storage path
   */
  addTenantToFilePath(path: string, tenantId: string): string {
    return `/tenants/${tenantId}${path}`;
  }

  /**
   * Validate tenant ID format
   */
  isValidTenantId(tenantId: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(tenantId);
  }

  /**
   * Extract tenant ID from JWT token payload
   */
  extractTenantFromToken(token: string): string | null {
    try {
      // In a real implementation, this would decode and verify the JWT
      // For now, return null as placeholder
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Check if cross-tenant access is allowed for specific scenarios
   * (e.g., admin users, system services)
   */
  isCrossTenantAccessAllowed(user: any): boolean {
    // System users or admin users might have cross-tenant access
    if (user.roles?.includes('system_admin') || user.roles?.includes('insurer_admin')) {
      return true;
    }
    return false;
  }

  /**
   * Log cross-tenant access attempt
   */
  logCrossTenantAccessAttempt(
    userTenantId: string,
    targetTenantId: string,
    userId: string,
    resource: string,
  ): void {
    // In a real implementation, this would log to an audit service
    console.warn(
      `Cross-tenant access attempt: User ${userId} from tenant ${userTenantId} accessing ${resource} in tenant ${targetTenantId}`,
    );
  }
}
