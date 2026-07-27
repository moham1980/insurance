import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { Session } from './entities/Session';
import { OutboxEvent } from '@insurance/shared';

export interface SessionContext {
  userId: string;
  tenantId?: string | null;
  deviceFingerprint: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private redis: Redis | null = null;
  private readonly useRedis: boolean;
  private readonly maxConcurrentSessions: number;
  private readonly accessTokenTtlSec: number;
  private readonly refreshTokenTtlSec: number;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,
    @InjectRepository(OutboxEvent)
    private readonly outboxRepo: Repository<OutboxEvent>,
  ) {
    this.useRedis = this.configService.get<string>('SESSION_STORE', 'db') === 'redis';
    this.maxConcurrentSessions = parseInt(this.configService.get<string>('MAX_CONCURRENT_SESSIONS', '5'), 10);
    this.accessTokenTtlSec = parseInt(this.configService.get<string>('ACCESS_TOKEN_TTL_SEC', '900'), 10);
    this.refreshTokenTtlSec = parseInt(this.configService.get<string>('REFRESH_TOKEN_TTL_SEC', '604800'), 10);

    if (this.useRedis) {
      const redisUrl = this.configService.get<string>('REDIS_URL') ||
        `redis://${this.configService.get<string>('REDIS_HOST', 'localhost')}:${this.configService.get<string>('REDIS_PORT', '6379')}`;
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
      });
      this.redis.on('error', (err) => {
        this.logger.error('Redis session store error', err);
      });
    }
  }

  private async publishSessionEvent(eventType: string, subject: Record<string, any>, payload: Record<string, any>): Promise<void> {
    try {
      const event = this.outboxRepo.create({
        topic: 'auth.events',
        eventType,
        eventVersion: 1,
        correlationId: uuidv4(),
        subjectJson: subject,
        payloadJson: payload,
        status: 'pending',
      });
      await this.outboxRepo.save(event);
    } catch (err) {
      this.logger.error('Failed to publish session event to outbox', err);
    }
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private generateRefreshToken(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  async createSession(ctx: SessionContext, existingAccessToken?: string): Promise<TokenPair & { sessionId: string }> {
    // Enforce concurrent session limit
    const activeSessions = await this.listActiveSessions(ctx.userId);
    if (activeSessions.length >= this.maxConcurrentSessions) {
      // Revoke oldest session(s)
      const toRevoke = activeSessions
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .slice(0, activeSessions.length - this.maxConcurrentSessions + 1);
      for (const s of toRevoke) {
        await this.revokeSession(s.id, ctx.userId);
      }
    }

    const sessionId = uuidv4();
    const refreshToken = this.generateRefreshToken();
    const refreshTokenHash = this.hashToken(refreshToken);
    const now = new Date();
    const accessTokenExpiresAt = new Date(now.getTime() + this.accessTokenTtlSec * 1000);
    const refreshTokenExpiresAt = new Date(now.getTime() + this.refreshTokenTtlSec * 1000);

    const session = this.sessionRepo.create({
      id: sessionId,
      userId: ctx.userId,
      tenantId: ctx.tenantId || null,
      deviceFingerprint: ctx.deviceFingerprint,
      ipAddress: ctx.ipAddress || null,
      userAgent: ctx.userAgent || null,
      refreshTokenHash,
      refreshTokenExpiresAt,
      lastActivityAt: now,
      status: 'active',
    });

    await this.sessionRepo.save(session);

    if (this.redis) {
      await this.redis.setex(
        `session:${sessionId}`,
        this.refreshTokenTtlSec,
        JSON.stringify({
          userId: ctx.userId,
          tenantId: ctx.tenantId || null,
          deviceFingerprint: ctx.deviceFingerprint,
          refreshTokenHash,
          status: 'active',
          createdAt: now.toISOString(),
        }),
      );
      await this.redis.sadd(`user_sessions:${ctx.userId}`, sessionId);
      await this.redis.expire(`user_sessions:${ctx.userId}`, this.refreshTokenTtlSec);
    }

    this.logger.log('Session created', { sessionId, userId: ctx.userId });

    return {
      sessionId,
      accessToken: existingAccessToken || '', // Access token generation is handled by AuthService
      refreshToken,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
    };
  }

  async rotateRefreshToken(sessionId: string, presentedRefreshToken: string): Promise<TokenPair> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session || session.isRevoked || session.status !== 'active') {
      throw new UnauthorizedException('Session is invalid or revoked');
    }

    if (session.refreshTokenExpiresAt && new Date() > session.refreshTokenExpiresAt) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    if (session.refreshTokenHash !== this.hashToken(presentedRefreshToken)) {
      // Potential token reuse detected — revoke session immediately
      await this.revokeSession(sessionId, session.userId);
      this.logger.warn('Refresh token reuse detected, session revoked', { sessionId, userId: session.userId });
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    const newRefreshToken = this.generateRefreshToken();
    const newRefreshTokenHash = this.hashToken(newRefreshToken);
    const now = new Date();
    const newRefreshTokenExpiresAt = new Date(now.getTime() + this.refreshTokenTtlSec * 1000);
    const newAccessTokenExpiresAt = new Date(now.getTime() + this.accessTokenTtlSec * 1000);

    const oldRefreshTokenHash = session.refreshTokenHash;
    const updateResult = await this.sessionRepo.update(
      {
        id: sessionId,
        status: 'active',
        isRevoked: false,
        refreshTokenHash: oldRefreshTokenHash,
      },
      {
        refreshTokenHash: newRefreshTokenHash,
        refreshTokenExpiresAt: newRefreshTokenExpiresAt,
        lastActivityAt: now,
      },
    );

    if (updateResult.affected === 0) {
      this.logger.warn('Concurrent refresh token rotation detected', { sessionId, userId: session.userId });
      throw new UnauthorizedException('Session was concurrently updated');
    }

    if (this.redis) {
      await this.redis.setex(
        `session:${sessionId}`,
        this.refreshTokenTtlSec,
        JSON.stringify({
          userId: session.userId,
          tenantId: session.tenantId || null,
          deviceFingerprint: session.deviceFingerprint,
          refreshTokenHash: newRefreshTokenHash,
          status: 'active',
          createdAt: session.createdAt.toISOString(),
        }),
      );
    }

    this.logger.log('Refresh token rotated', { sessionId, userId: session.userId });
    await this.publishSessionEvent('session.rotated', { sessionId, userId: session.userId, tenantId: session.tenantId }, {});

    return {
      accessToken: '', // To be populated by caller (AuthService)
      refreshToken: newRefreshToken,
      accessTokenExpiresAt: newAccessTokenExpiresAt,
      refreshTokenExpiresAt: newRefreshTokenExpiresAt,
    };
  }

  async revokeSession(sessionId: string, userId: string): Promise<void> {
    await this.sessionRepo.update({ id: sessionId, userId }, { status: 'revoked', isRevoked: true });
    if (this.redis) {
      await this.redis.del(`session:${sessionId}`);
      // Also remove from user's active session list
      await this.redis.srem(`user_sessions:${userId}`, sessionId);
    }
    this.logger.log('Session revoked', { sessionId, userId });
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    await this.publishSessionEvent('session.revoked', { sessionId, userId, tenantId: session?.tenantId }, { reason: 'explicit_revoke' });
  }

  async revokeAllUserSessions(userId: string, exceptSessionId?: string): Promise<void> {
    const sessions = await this.sessionRepo.find({ where: { userId, status: 'active' } });
    for (const s of sessions) {
      if (exceptSessionId && s.id === exceptSessionId) continue;
      await this.revokeSession(s.id, userId);
    }
  }

  async validateSession(sessionId: string): Promise<Session | null> {
    if (this.redis) {
      const cached = await this.redis.get(`session:${sessionId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.status === 'active') {
          // Hydrate partial session from DB for full entity
          return this.sessionRepo.findOne({ where: { id: sessionId } });
        }
      }
    }
    const session = await this.sessionRepo.findOne({ where: { id: sessionId, status: 'active' } });
    if (session && session.refreshTokenExpiresAt && new Date() > session.refreshTokenExpiresAt) {
      session.status = 'expired';
      await this.sessionRepo.save(session);
      return null;
    }
    return session;
  }

  async listActiveSessions(userId: string): Promise<Session[]> {
    return this.sessionRepo.find({
      where: { userId, status: 'active' },
      order: { createdAt: 'DESC' },
    });
  }

  async getSessionStats(userId: string): Promise<{ total: number; active: number; revoked: number }> {
    const [active, revoked] = await Promise.all([
      this.sessionRepo.count({ where: { userId, status: 'active' } }),
      this.sessionRepo.count({ where: { userId, status: 'revoked' } }),
    ]);
    return { total: active + revoked, active, revoked };
  }
}
