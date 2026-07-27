import { Body, Controller, ForbiddenException, Get, Headers, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { Permissions } from './permissions.decorator';
import { auditLogger } from './audit.logger';
import { OrgUnitsService } from './org-units.service';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ServiceTokenDto } from './dto/service-token.dto';
import { SetRolesDto } from './dto/set-roles.dto';
import { AssignOrgUnitDto } from './dto/assign-org-unit.dto';
import { Resource, ResourceAction } from './resource.decorator';

const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService, private readonly orgUnitsService: OrgUnitsService) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return uuidv4();
  }

  @Post('/service-token')
  async serviceToken(@Headers() headers: Record<string, any>, @Body() body: ServiceTokenDto) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = (headers['x-tenant-id'] || headers['X-Tenant-Id']) as string | undefined;
    const issuerKey = (headers['x-service-issuer-key'] || headers['X-Service-Issuer-Key']) as string | undefined;

    auditLogger.info('auth.service_token.request', { correlationId, tenantId, action: 'auth:service_token' });

    const expected = process.env.SERVICE_TOKEN_ISSUER_KEY;
    if (!expected || typeof issuerKey !== 'string' || issuerKey !== expected) {
      auditLogger.warn('auth.service_token.unauthorized', { correlationId, tenantId, action: 'auth:service_token' });
      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' }, correlationId };
    }

    try {
      const res = this.authService.issueServiceToken({
        serviceId: body.serviceId,
        permissions: body.permissions,
        tenantId: body.tenantId,
      });
      return { success: true, data: res, correlationId };
    } catch (e: any) {
      if (e?.code === 'VALIDATION_ERROR') {
        return { success: false, error: { code: 'VALIDATION_ERROR', message: e.message }, correlationId };
      }
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('auth.service_token.failed', err, { correlationId, tenantId, action: 'auth:service_token' });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to issue service token' }, correlationId };
    }
  }

  @Post('/register')
  async register(@Headers() headers: Record<string, any>, @Body() body: RegisterDto) {
    const correlationId = this.getCorrelationId(headers);

    try {
      const { user } = await this.authService.register({
        email: body.email,
        username: body.username,
        password: body.password,
        firstName: body.firstName,
        lastName: body.lastName,
        department: body.department,
      });

      return {
        success: true,
        data: {
          userId: user.userId,
          email: user.email,
          username: user.username,
          roles: user.roles,
          orgUnitId: user.orgUnitId,
        },
        correlationId,
      };
    } catch (e: any) {
      if (e?.code === 'DUPLICATE_USER') {
        return {
          success: false,
          error: { code: 'DUPLICATE_USER', message: 'User with this email or username already exists' },
          correlationId,
        };
      }
      if (e?.code === 'VALIDATION_ERROR') {
        return {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: e.message },
          correlationId,
        };
      }

      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to register user' }, correlationId };
    }
  }

  @Post('/login')
  async login(@Headers() headers: Record<string, any>, @Body() body: LoginDto) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = (headers['x-tenant-id'] || headers['X-Tenant-Id']) as string | undefined;
    auditLogger.info('auth.login.request', { correlationId, tenantId, action: 'auth:login', username: body?.username });

    const ip = headers['x-forwarded-for'] || headers['x-real-ip'] || 'unknown';
    const rateKey = `${ip}:${body.username}`;
    const now = Date.now();
    const attempts = loginAttempts.get(rateKey);
    if (attempts && now - attempts.lastAttempt < LOGIN_WINDOW_MS && attempts.count >= MAX_LOGIN_ATTEMPTS) {
      auditLogger.warn('auth.login.rate_limited', { correlationId, tenantId, action: 'auth:login', username: body?.username });
      return {
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Too many login attempts. Please try again later.' },
        correlationId,
      };
    }

    try {
      const { token, refreshToken, user } = await this.authService.login({
        username: body.username,
        password: body.password,
        deviceFingerprint: body.deviceFingerprint,
        ipAddress: typeof ip === 'string' ? ip : undefined,
        userAgent: headers['user-agent'] || undefined,
      });

      auditLogger.info('auth.login.success', {
        correlationId,
        tenantId,
        action: 'auth:login',
        userId: user.userId,
        roles: user.roles,
      });

      loginAttempts.delete(rateKey);
      return {
        success: true,
        data: {
          token,
          refreshToken,
          user: {
            userId: user.userId,
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            roles: user.roles,
            department: user.department,
            orgUnitId: user.orgUnitId,
            positionTitle: user.positionTitle,
          },
        },
        correlationId,
      };
    } catch (e: any) {
      if (e?.code === 'INVALID_CREDENTIALS') {
        const current = loginAttempts.get(rateKey) || { count: 0, lastAttempt: 0 };
        if (now - current.lastAttempt > LOGIN_WINDOW_MS) {
          current.count = 0;
        }
        current.count += 1;
        current.lastAttempt = now;
        loginAttempts.set(rateKey, current);

        auditLogger.warn('auth.login.invalid_credentials', { correlationId, tenantId, action: 'auth:login', username: body?.username, attempts: current.count });
        return {
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password' },
          correlationId,
        };
      }
      const err = e instanceof Error ? e : new Error(String(e));
      auditLogger.error('auth.login.failed', err, { correlationId, tenantId, action: 'auth:login', username: body?.username });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to login' }, correlationId };
    }
  }

  @Get('/me')
  @UseGuards(JwtAuthGuard)
  async me(@Headers() headers: Record<string, any>) {
    const correlationId = this.getCorrelationId(headers);

    try {
      const user = await this.authService.me(headers.authorization);
      return {
        success: true,
        data: {
          userId: user.userId,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          roles: user.roles,
          department: user.department,
          orgUnitId: user.orgUnitId,
          positionTitle: user.positionTitle,
        },
        correlationId,
      };
    } catch (e: any) {
      if (e?.code === 'UNAUTHORIZED') {
        return { success: false, error: { code: 'UNAUTHORIZED', message: e.message }, correlationId };
      }

      return { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' }, correlationId };
    }
  }

  @Get('/users')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Permissions('users:list')
  async list(
    @Req() req: any,
    @Headers() headers: Record<string, any>,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0'
  ) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;
    auditLogger.info('iam.users.list.request', {
      correlationId,
      tenantId,
      action: 'users:list',
      actorUserId: actor?.userId,
    });

    const lim = Math.min(parseInt(limit, 10) || 50, 200);
    const off = parseInt(offset, 10);

    try {
      const user = req?.user as any;
      const roles: string[] = Array.isArray(user?.roles) ? user.roles : [];
      const isUnscoped = roles.includes('insurer_admin') || roles.includes('head_office_ops');

      let allowedOrgUnitIds: string[] | undefined;
      if (!isUnscoped) {
        if (typeof user?.orgUnitId === 'string' && user.orgUnitId.length > 0) {
          allowedOrgUnitIds = await this.orgUnitsService.getSubtreeOrgUnitIds(user.orgUnitId, tenantId);
        } else {
          allowedOrgUnitIds = [];
        }
      }

      const { users, total } = await this.authService.listUsers({
        limit: Number.isFinite(lim) ? lim : 50,
        offset: Number.isFinite(off) ? off : 0,
        allowedOrgUnitIds,
        tenantId,
      });

      return {
        success: true,
        data: users.map((u) => ({
          userId: u.userId,
          email: u.email,
          username: u.username,
          firstName: u.firstName,
          lastName: u.lastName,
          roles: u.roles,
          department: u.department,
          orgUnitId: u.orgUnitId,
          positionTitle: u.positionTitle,
          lastLoginAt: u.lastLoginAt,
        })),
        pagination: {
          total,
          limit: Number.isFinite(lim) ? lim : 50,
          offset: Number.isFinite(off) ? off : 0,
        },
        correlationId,
      };
    } catch (_e) {
      auditLogger.error('iam.users.list.failed', new Error('Failed to list users'), {
        correlationId,
        tenantId,
        action: 'users:list',
      });
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list users' }, correlationId };
    }
  }

  @Get('/roles/catalog')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Permissions('roles:catalog')
  roleCatalog(@Req() req: any, @Headers() headers: Record<string, any>) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    auditLogger.info('iam.roles.catalog.request', { correlationId, tenantId, action: 'roles:catalog' });
    const roles = this.authService.getRoleCatalog();
    return { success: true, data: roles, correlationId };
  }

  @Put('/users/:userId/roles')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Resource('user')
  @ResourceAction('write')
  @Permissions('users:set_roles')
  async setRoles(@Req() req: any, @Headers() headers: Record<string, any>, @Param('userId') userId: string, @Body() body: SetRolesDto) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;
    auditLogger.info('iam.users.set_roles.request', {
      correlationId,
      tenantId,
      action: 'users:set_roles',
      actorUserId: actor?.userId,
      targetUserId: userId,
    });

    try {
      body.roles = body.roles.map((r) => String(r).trim()).filter(Boolean);
    } catch {
      auditLogger.warn('iam.users.set_roles.validation_failed', { correlationId, tenantId, action: 'users:set_roles', targetUserId: userId });
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'roles is required (string[])' }, correlationId };
    }

    const actorRoles: string[] = Array.isArray(actor?.roles) ? actor.roles : [];
    const isUnscoped = actorRoles.includes('insurer_admin') || actorRoles.includes('head_office_ops');

    if (!isUnscoped) {
      const target = await this.authService.getUserById(userId);
      if (!target) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'User not found' }, correlationId };
      }

      if (typeof actor?.orgUnitId !== 'string' || actor.orgUnitId.length === 0) {
        throw new ForbiddenException({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Forbidden' },
          correlationId,
        });
      }

      const allowed = await this.orgUnitsService.getSubtreeOrgUnitIds(actor.orgUnitId, tenantId);
      if (!target.orgUnitId || !allowed.includes(target.orgUnitId)) {
        throw new ForbiddenException({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Forbidden' },
          correlationId,
        });
      }
    }

    const user = await this.authService.setUserRoles({ userId, roles: body.roles, actorTenantId: tenantId });
    if (!user) {
      auditLogger.warn('iam.users.set_roles.not_found', { correlationId, tenantId, action: 'users:set_roles', targetUserId: userId });
      return { success: false, error: { code: 'NOT_FOUND', message: 'User not found' }, correlationId };
    }

    auditLogger.info('iam.users.set_roles.success', {
      correlationId,
      tenantId,
      action: 'users:set_roles',
      actorUserId: actor?.userId,
      targetUserId: userId,
      roles: user.roles,
    });

    return {
      success: true,
      data: { userId: user.userId, roles: user.roles, orgUnitId: user.orgUnitId },
      correlationId,
    };
  }

  @Put('/users/:userId/org-unit')
  @UseGuards(JwtAuthGuard, PermissionsGuard, AbacGuard, TenantGuard)
  @Resource('user')
  @ResourceAction('write')
  @Permissions('users:assign_org_unit')
  async assignOrgUnit(@Req() req: any, @Headers() headers: Record<string, any>, @Param('userId') userId: string, @Body() body: AssignOrgUnitDto) {
    const correlationId = this.getCorrelationId(headers);
    const tenantId = req?.user?.tenantId as string | undefined;
    const actor = req?.user as any;
    auditLogger.info('iam.users.assign_org_unit.request', {
      correlationId,
      tenantId,
      action: 'users:assign_org_unit',
      actorUserId: actor?.userId,
      targetUserId: userId,
      orgUnitId: body?.orgUnitId,
    });

    if (body?.orgUnitId !== null && typeof body?.orgUnitId !== 'string') {
      auditLogger.warn('iam.users.assign_org_unit.validation_failed', { correlationId, tenantId, action: 'users:assign_org_unit', targetUserId: userId });
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'orgUnitId must be string or null' }, correlationId };
    }

    const actorRoles: string[] = Array.isArray(actor?.roles) ? actor.roles : [];
    const isUnscoped = actorRoles.includes('insurer_admin') || actorRoles.includes('head_office_ops');

    if (!isUnscoped) {
      const target = await this.authService.getUserById(userId);
      if (!target) {
        return { success: false, error: { code: 'NOT_FOUND', message: 'User not found' }, correlationId };
      }

      if (typeof actor?.orgUnitId !== 'string' || actor.orgUnitId.length === 0) {
        throw new ForbiddenException({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Forbidden' },
          correlationId,
        });
      }

      const allowed = await this.orgUnitsService.getSubtreeOrgUnitIds(actor.orgUnitId, tenantId);

      if (!target.orgUnitId || !allowed.includes(target.orgUnitId)) {
        throw new ForbiddenException({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Forbidden' },
          correlationId,
        });
      }

      const newOrgUnitId = body.orgUnitId ?? null;
      if (newOrgUnitId && !allowed.includes(newOrgUnitId)) {
        throw new ForbiddenException({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Forbidden' },
          correlationId,
        });
      }
    }

    const user = await this.authService.assignOrgUnit({ userId, orgUnitId: body.orgUnitId ?? null, actorTenantId: tenantId });
    if (!user) {
      auditLogger.warn('iam.users.assign_org_unit.not_found', { correlationId, tenantId, action: 'users:assign_org_unit', targetUserId: userId });
      return { success: false, error: { code: 'NOT_FOUND', message: 'User not found' }, correlationId };
    }

    auditLogger.info('iam.users.assign_org_unit.success', {
      correlationId,
      tenantId,
      action: 'users:assign_org_unit',
      actorUserId: actor?.userId,
      targetUserId: userId,
      orgUnitId: user.orgUnitId,
    });

    return {
      success: true,
      data: { userId: user.userId, orgUnitId: user.orgUnitId },
      correlationId,
    };
  }
}
