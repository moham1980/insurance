import { Injectable, NestMiddleware, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

// Extend Request type to include custom properties
declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      user?: any;
      resourceTenantId?: string;
    }
  }
}

/**
 * Tenant Isolation Middleware
 * Ensures that requests are scoped to the correct tenant and prevents cross-tenant access
 */
@Injectable()
export class TenantIsolationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Extract tenant ID from header
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      throw new UnauthorizedException({
        success: false,
        error: { code: 'MISSING_TENANT_ID', message: 'x-tenant-id header is required' },
      });
    }

    // Attach tenant ID to request for downstream use
    req.tenantId = tenantId;

    // Validate tenant ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tenantId)) {
      throw new ForbiddenException({
        success: false,
        error: { code: 'INVALID_TENANT_ID', message: 'Invalid tenant ID format' },
      });
    }

    // If user is authenticated, verify user belongs to the tenant
    if (req.user && req.user.tenantId) {
      if (req.user.tenantId !== tenantId) {
        throw new ForbiddenException({
          success: false,
          error: { code: 'TENANT_MISMATCH', message: 'User does not belong to the specified tenant' },
        });
      }
    }

    next();
  }
}

/**
 * Tenant Context Decorator
 * Extracts tenant ID from request for use in controllers/services
 */
export const TenantId = () => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
  const originalMethod = descriptor.value;

  descriptor.value = function (...args: any[]) {
    const request = args[args.length - 1]; // Last argument is typically the request object
    const tenantId = (request as Request)?.tenantId || (request as Request)?.headers?.['x-tenant-id'] as string;
    
    // Inject tenantId as first argument
    return originalMethod.apply(this, [tenantId, ...args.slice(0, -1)]);
  };

  return descriptor;
};
