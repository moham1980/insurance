import { Body, Controller, Get, Headers, Post, Query } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private getCorrelationId(headers: Record<string, any>): string {
    const cid = headers['x-correlation-id'] || headers['X-Correlation-Id'];
    if (typeof cid === 'string' && cid.length > 0) return cid;
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  @Get('/health')
  health() {
    return { status: 'ok', service: 'auth-service' };
  }

  @Post('/auth/register')
  async register(@Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);

    if (!body?.email || !body?.username || !body?.password || !body?.firstName || !body?.lastName) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'email, username, password, firstName, lastName are required' },
        correlationId,
      };
    }

    try {
      const { user } = await this.authService.register({
        email: body.email,
        username: body.username,
        password: body.password,
        firstName: body.firstName,
        lastName: body.lastName,
        department: body.department,
        roles: body.roles,
      });

      return {
        success: true,
        data: {
          userId: user.userId,
          email: user.email,
          username: user.username,
          roles: user.roles,
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

      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to register user' }, correlationId };
    }
  }

  @Post('/auth/login')
  async login(@Headers() headers: Record<string, any>, @Body() body: any) {
    const correlationId = this.getCorrelationId(headers);

    if (!body?.username || !body?.password) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'username and password are required' },
        correlationId,
      };
    }

    try {
      const { token, user } = await this.authService.login({ username: body.username, password: body.password });

      return {
        success: true,
        data: {
          token,
          user: {
            userId: user.userId,
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            roles: user.roles,
            department: user.department,
          },
        },
        correlationId,
      };
    } catch (e: any) {
      if (e?.code === 'INVALID_CREDENTIALS') {
        return {
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password' },
          correlationId,
        };
      }

      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to login' }, correlationId };
    }
  }

  @Get('/auth/me')
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

  @Get('/auth/users')
  async list(@Headers() headers: Record<string, any>, @Query('limit') limit: string = '50', @Query('offset') offset: string = '0') {
    const correlationId = this.getCorrelationId(headers);

    const lim = parseInt(limit, 10);
    const off = parseInt(offset, 10);

    try {
      const { users, total } = await this.authService.listUsers({
        limit: Number.isFinite(lim) ? lim : 50,
        offset: Number.isFinite(off) ? off : 0,
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
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list users' }, correlationId };
    }
  }
}
