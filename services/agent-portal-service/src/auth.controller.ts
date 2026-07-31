import { Controller, Post, Body, Headers, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';

@Controller('agent-portal')
export class AuthController {
  private readonly authServiceUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
  }

  @Post('login')
  async login(@Headers() headers: Record<string, any>, @Body() body: { username: string; password: string }) {
    if (!body?.username || !body?.password) {
      throw new HttpException(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Username and password are required' } },
        HttpStatus.BAD_REQUEST,
      );
    }

    const tenantId = (headers['x-tenant-id'] || headers['X-Tenant-Id']) as string | undefined;
    const correlationId = headers['x-correlation-id'] || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      const { data } = await firstValueFrom(
        this.http.post(`${this.authServiceUrl}/auth/login`, {
          username: body.username,
          password: body.password,
        }, {
          headers: {
            'Content-Type': 'application/json',
            ...(tenantId ? { 'x-tenant-id': tenantId } : {}),
            'x-correlation-id': correlationId,
          },
        }),
      );

      if (!data?.success || !data?.data?.token) {
        throw new HttpException(
          { success: false, error: { code: 'AUTH_FAILED', message: 'Authentication failed' } },
          HttpStatus.UNAUTHORIZED,
        );
      }

      const { token, user } = data.data;

      return {
        success: true,
        data: {
          token,
          agentId: user.userId,
          partnerId: user.orgUnitId || user.userId,
          tenantId: tenantId || 'default-tenant',
          user: {
            userId: user.userId,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            roles: user.roles,
          },
        },
        correlationId,
      };
    } catch (err: any) {
      if (err instanceof HttpException) throw err;
      const status = err?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
      const message = err?.response?.data?.error?.message || 'Authentication service unavailable';
      throw new HttpException(
        { success: false, error: { code: 'AUTH_ERROR', message } },
        status,
      );
    }
  }
}
