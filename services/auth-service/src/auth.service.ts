import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { User } from './entities/User';
import { FederatedIdentity } from './entities/FederatedIdentity';
import { checkSodViolations } from './sod.rules';
import { SessionService } from './session.service';
import { OutboxEvent } from '@insurance/shared';

interface TokenPayload {
  userId: string;
  email: string;
  username: string;
  roles: string[];
  orgUnitId?: string | null;
  tenantId?: string | null;
}

interface ServiceTokenPayload {
  tokenType: 'service';
  serviceId: string;
  permissions: string[];
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: string;
  private readonly serviceJwtExpiresIn: string;

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(FederatedIdentity) private readonly federatedIdentityRepo: Repository<FederatedIdentity>,
    @InjectRepository(OutboxEvent) private readonly outboxRepo: Repository<OutboxEvent>,
    private readonly sessionService: SessionService
  ) {
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required');
    this.jwtSecret = process.env.JWT_SECRET;
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
    this.serviceJwtExpiresIn = process.env.SERVICE_JWT_EXPIRES_IN || '15m';
  }

  private async publishAuthEvent(eventType: string, subject: Record<string, any>, payload: Record<string, any>, correlationId?: string): Promise<void> {
    try {
      const event = this.outboxRepo.create({
        topic: 'auth.events',
        eventType,
        eventVersion: 1,
        correlationId: correlationId || uuidv4(),
        subjectJson: subject,
        payloadJson: payload,
        status: 'pending',
      });
      await this.outboxRepo.save(event);
    } catch (err) {
      this.logger.error('Failed to publish auth event to outbox', err);
    }
  }

  private generateToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn as jwt.SignOptions['expiresIn'],
      issuer: process.env.JWT_ISSUER || 'auth-service',
      audience: process.env.JWT_AUDIENCE || 'insurance-platform',
    });
  }

  private generateServiceToken(payload: ServiceTokenPayload & { tenantId?: string | null }): string {
    return jwt.sign(
      {
        tokenType: payload.tokenType,
        serviceId: payload.serviceId,
        permissions: payload.permissions,
        tenantId: payload.tenantId,
      },
      this.jwtSecret,
      {
        expiresIn: this.serviceJwtExpiresIn as jwt.SignOptions['expiresIn'],
        issuer: process.env.JWT_ISSUER || 'auth-service',
        audience: process.env.JWT_AUDIENCE || 'insurance-platform',
        jwtid: uuidv4(),
      },
    );
  }

  private verifyToken(token: string): TokenPayload {
    return jwt.verify(token, this.jwtSecret) as TokenPayload;
  }

  issueServiceToken(params: { serviceId: string; permissions: string[]; tenantId?: string | null }): { token: string } {
    const permissions = Array.isArray(params.permissions)
      ? params.permissions.map((x) => String(x || '').trim()).filter(Boolean)
      : [];
    if (permissions.length === 0) {
      const err: any = new Error('permissions is required');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
    if (!params.serviceId || String(params.serviceId).trim().length === 0) {
      const err: any = new Error('serviceId is required');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const serviceId = String(params.serviceId).trim();

    const allowedServicesRaw = process.env.SERVICE_TOKEN_ALLOWED_SERVICES;
    if (allowedServicesRaw) {
      const allowedServices = allowedServicesRaw.split(',').map((s) => s.trim()).filter(Boolean);
      if (!allowedServices.includes(serviceId)) {
        const err: any = new Error('Service is not in the service token allow-list');
        err.code = 'VALIDATION_ERROR';
        throw err;
      }
    }

    const allowedPermissionsRaw = process.env.SERVICE_TOKEN_ALLOWED_PERMISSIONS;
    if (allowedPermissionsRaw) {
      const allowedPermissions = allowedPermissionsRaw.split(',').map((p) => p.trim()).filter(Boolean);
      for (const p of permissions) {
        if (!allowedPermissions.includes(p)) {
          const err: any = new Error(`Permission ${p} is not in the service token allow-list`);
          err.code = 'VALIDATION_ERROR';
          throw err;
        }
      }
    }

    const token = this.generateServiceToken({
      tokenType: 'service',
      serviceId,
      permissions,
      tenantId: params.tenantId,
    });
    return { token };
  }

  async register(params: {
    email: string;
    username: string;
    password: string;
    firstName: string;
    lastName: string;
    department?: string;
  }): Promise<{ user: User }> {
    const existingUser = await this.userRepo.findOne({
      where: [{ email: params.email }, { username: params.username }],
    });

    if (existingUser) {
      const err: any = new Error('User with this email or username already exists');
      err.code = 'DUPLICATE_USER';
      throw err;
    }

    if (!params.password || params.password.length < 8) {
      const err: any = new Error('Password must be at least 8 characters long');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
    if (!/[A-Z]/.test(params.password) || !/[a-z]/.test(params.password) || !/\d/.test(params.password)) {
      const err: any = new Error('Password must contain at least one uppercase letter, one lowercase letter, and one digit');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const passwordHash = await bcrypt.hash(params.password, 10);
    const defaultTenantId = process.env.DEFAULT_TENANT_ID || process.env.TENANT_ID || null;

    const user = this.userRepo.create({
      userId: uuidv4(),
      email: params.email,
      username: params.username,
      passwordHash,
      firstName: params.firstName,
      lastName: params.lastName,
      department: params.department || null,
      orgUnitId: null,
      positionTitle: null,
      nationalId: null,
      tenantId: defaultTenantId,
      roles: ['user'],
      isActive: true,
      lastLoginAt: null,
    });

    await this.userRepo.save(user);
    await this.publishAuthEvent('user.registered', { userId: user.userId, tenantId: user.tenantId }, { email: user.email, roles: user.roles });
    return { user };
  }

  async login(params: { username: string; password: string; deviceFingerprint?: string; ipAddress?: string; userAgent?: string }): Promise<{ token: string; refreshToken?: string; user: User }> {
    const user = await this.userRepo.findOne({ where: { username: params.username } });

    if (!user || !user.isActive) {
      const err: any = new Error('Invalid username or password');
      err.code = 'INVALID_CREDENTIALS';
      throw err;
    }

    const ok = await bcrypt.compare(params.password, user.passwordHash);
    if (!ok) {
      const err: any = new Error('Invalid username or password');
      err.code = 'INVALID_CREDENTIALS';
      throw err;
    }

    user.lastLoginAt = new Date();
    await this.userRepo.save(user);

    const token = this.generateToken({
      userId: user.userId,
      email: user.email,
      username: user.username,
      roles: user.roles,
      orgUnitId: user.orgUnitId,
      tenantId: user.tenantId,
    });

    const session = await this.sessionService.createSession({
      userId: user.userId,
      tenantId: user.tenantId,
      deviceFingerprint: params.deviceFingerprint || 'unknown',
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    }, token);
    const refreshToken = session.refreshToken;

    await this.publishAuthEvent('user.logged_in', { userId: user.userId, tenantId: user.tenantId }, { ipAddress: params.ipAddress, userAgent: params.userAgent });

    return { token, refreshToken, user };
  }

  async me(authHeader: string | undefined): Promise<User> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const err: any = new Error('Authorization token required');
      err.code = 'UNAUTHORIZED';
      throw err;
    }

    const token = authHeader.substring(7);
    const payload = this.verifyToken(token);

    const user = await this.userRepo.findOne({ where: { userId: payload.userId } });
    if (!user || !user.isActive) {
      const err: any = new Error('User not found or inactive');
      err.code = 'UNAUTHORIZED';
      throw err;
    }

    return user;
  }

  async listUsers(params: { limit: number; offset: number; allowedOrgUnitIds?: string[]; tenantId?: string | null }): Promise<{ users: User[]; total: number }> {
    const qb = this.userRepo.createQueryBuilder('u');
    qb.where('u.is_active = true');

    if (params.tenantId) {
      qb.andWhere('u.tenant_id = :tenantId', { tenantId: params.tenantId });
    }

    if (Array.isArray(params.allowedOrgUnitIds)) {
      if (params.allowedOrgUnitIds.length === 0) {
        return { users: [], total: 0 };
      }
      qb.andWhere('u.org_unit_id IN (:...allowedOrgUnitIds)', { allowedOrgUnitIds: params.allowedOrgUnitIds });
    }

    qb.orderBy('u.created_at', 'DESC').limit(params.limit).offset(params.offset);
    const [users, total] = await qb.getManyAndCount();
    return { users, total };
  }

  getRoleCatalog(): Array<{ key: string; titleFa: string; descriptionFa: string }> {
    return [
      { key: 'insurer_admin', titleFa: 'ادمین شرکت بیمه', descriptionFa: 'مدیریت کامل سامانه برای شرکت بیمه' },
      { key: 'head_office_ops', titleFa: 'عملیات ستاد', descriptionFa: 'کاربران ستاد/مدیریت عملیات' },
      { key: 'risk_manager', titleFa: 'مدیریت ریسک', descriptionFa: 'مدیریت ریسک، کنترل‌های عملیاتی و سیاست‌های پذیرش/خسارت' },
      { key: 'compliance_aml', titleFa: 'انطباق/AML', descriptionFa: 'کنترل‌های AML/CFT، KYC و گزارش‌گیری موارد مشکوک' },
      { key: 'legal_ops', titleFa: 'حقوقی', descriptionFa: 'رسیدگی حقوقی پرونده‌ها، دعاوی و مکاتبات رسمی' },
      { key: 'complaints_handler', titleFa: 'رسیدگی به شکایات', descriptionFa: 'ثبت/پیگیری/پاسخگویی شکایات داخل شرکت و آماده‌سازی برای بیمه مرکزی' },
      { key: 'branch_manager', titleFa: 'مدیر شعبه', descriptionFa: 'مدیریت عملیات شعبه و تیم‌ها' },
      { key: 'branch_staff', titleFa: 'کارشناس/کارمند شعبه', descriptionFa: 'عملیات روزمره شعبه (پذیرش، پیگیری، خدمات پس از فروش)' },
      { key: 'claims_handler', titleFa: 'کارشناس خسارت', descriptionFa: 'ثبت و رسیدگی و تصمیم‌گیری پرونده خسارت' },
      { key: 'loss_adjuster', titleFa: 'ارزیاب/کارشناس ارزیابی خسارت', descriptionFa: 'ارزیابی و تعدیل خسارت (داخلی/برون‌سپاری)' },
      { key: 'fraud_analyst', titleFa: 'کارشناس تقلب', descriptionFa: 'بررسی پرونده‌های تقلب و سیگنال‌ها' },
      { key: 'underwriter', titleFa: 'کارشناس ارزیابی ریسک', descriptionFa: 'بررسی و تایید ریسک/صدور (در فاز policy/uw)' },
      { key: 'finance_ops', titleFa: 'مالی', descriptionFa: 'پرداخت/تسویه (در فاز payments)' },
      { key: 'collections_ops', titleFa: 'وصول مطالبات/اقساط', descriptionFa: 'پیگیری اقساط و مطالبات و وضعیت بدهی بیمه‌گذار' },
      { key: 'reinsurance_ops', titleFa: 'اتکایی', descriptionFa: 'مدیریت واگذاری اتکایی، صورتحساب‌ها، مغایرت و تیکت‌های اتکایی' },
      { key: 'agency_owner', titleFa: 'مدیر/مالک نمایندگی', descriptionFa: 'مدیریت نمایندگی و کاربرانش' },
      { key: 'agency_staff', titleFa: 'کاربر نمایندگی', descriptionFa: 'کاربر عملیاتی نمایندگی' },
      { key: 'broker_owner', titleFa: 'مدیر/مالک کارگزاری', descriptionFa: 'مدیریت کارگزاری و کاربرانش' },
      { key: 'broker_staff', titleFa: 'کاربر کارگزاری', descriptionFa: 'کاربر عملیاتی کارگزاری' },
      { key: 'call_center', titleFa: 'مرکز تماس', descriptionFa: 'ثبت تماس/پیگیری و ایجاد ارجاع' },
      { key: 'auditor', titleFa: 'حسابرسی', descriptionFa: 'دسترسی خواندنی و گزارش‌گیری/ممیزی' },
      { key: 'regulatory_view', titleFa: 'ناظر/رگولاتور (فقط مشاهده)', descriptionFa: 'دسترسی مشاهده‌ای برای گزارش‌های رگولاتوری' },
    ];
  }

  async assignOrgUnit(params: { userId: string; orgUnitId: string | null; actorTenantId?: string | null }): Promise<User | null> {
    const user = await this.userRepo.findOne({ where: { userId: params.userId } });
    if (!user) return null;
    if (params.actorTenantId && user.tenantId && user.tenantId !== params.actorTenantId) {
      const err: any = new Error('Target user belongs to a different tenant');
      err.code = 'TENANT_MISMATCH';
      throw err;
    }
    user.orgUnitId = params.orgUnitId;
    await this.userRepo.save(user);
    await this.publishAuthEvent('user.org_unit_assigned', { userId: user.userId, tenantId: user.tenantId }, { orgUnitId: user.orgUnitId, actorTenantId: params.actorTenantId });
    return user;
  }

  async setUserRoles(params: { userId: string; roles: string[]; actorTenantId?: string | null }): Promise<User | null> {
    const user = await this.userRepo.findOne({ where: { userId: params.userId } });
    if (!user) return null;
    if (params.actorTenantId && user.tenantId && user.tenantId !== params.actorTenantId) {
      const err: any = new Error('Target user belongs to a different tenant');
      err.code = 'TENANT_MISMATCH';
      throw err;
    }

    const { violations, warnings } = checkSodViolations(params.roles);
    if (violations.length > 0) {
      const err: any = new Error(`SoD violation: ${violations.map(v => v.name).join(', ')}`);
      err.code = 'SOD_VIOLATION';
      throw err;
    }
    for (const w of warnings) {
      this.logger.warn(`SoD warning for user ${params.userId}: ${w.name} - ${w.description}`);
    }

    user.roles = params.roles;
    await this.userRepo.save(user);
    await this.publishAuthEvent('user.roles_set', { userId: user.userId, tenantId: user.tenantId }, { roles: user.roles, actorTenantId: params.actorTenantId });
    return user;
  }

  async getUserById(userId: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { userId } });
  }

  async federateLogin(params: {
    providerId: string;
    providerUserId: string;
    email: string;
    name?: string;
    attributes?: Record<string, any>;
    deviceFingerprint?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ token: string; refreshToken: string; user: User }> {
    if (!params.providerUserId) {
      const err: any = new Error('providerUserId is required');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const defaultTenantId = process.env.DEFAULT_TENANT_ID || process.env.TENANT_ID || null;

    let existingIdentity = await this.federatedIdentityRepo.findOne({
      where: { providerId: params.providerId, providerUserId: params.providerUserId },
    });

    let user: User | null = null;

    if (existingIdentity) {
      user = await this.userRepo.findOne({ where: { userId: existingIdentity.userId } });
    }

    if (!user && params.email) {
      user = await this.userRepo.findOne({ where: { email: params.email } });
    }

    if (!user) {
      user = this.userRepo.create({
        userId: uuidv4(),
        email: params.email || `${params.providerUserId}@${params.providerId}.federated`,
        username: params.providerUserId,
        passwordHash: await bcrypt.hash(uuidv4(), 10),
        firstName: params.name || params.providerUserId,
        lastName: '',
        tenantId: defaultTenantId,
        roles: ['user'],
        isActive: true,
        lastLoginAt: new Date(),
        globalUserId: params.providerUserId,
      });
      await this.userRepo.save(user);
    }

    if (!existingIdentity) {
      existingIdentity = this.federatedIdentityRepo.create({
        userId: user.userId,
        providerId: params.providerId,
        providerUserId: params.providerUserId,
        attributes: params.attributes || {},
        linkedAt: new Date(),
        lastUsedAt: new Date(),
      });
    } else {
      existingIdentity.attributes = params.attributes || {};
      existingIdentity.lastUsedAt = new Date();
    }
    await this.federatedIdentityRepo.save(existingIdentity);

    if (params.providerId === 'iam-ecosystem' && params.providerUserId && !user.globalUserId) {
      user.globalUserId = params.providerUserId;
      await this.userRepo.save(user);
    }

    const token = this.generateToken({
      userId: user.userId,
      email: user.email,
      username: user.username,
      roles: user.roles,
      orgUnitId: user.orgUnitId,
      tenantId: user.tenantId,
    });

    const session = await this.sessionService.createSession({
      userId: user.userId,
      tenantId: user.tenantId,
      deviceFingerprint: params.deviceFingerprint || 'unknown',
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    }, token);

    await this.publishAuthEvent('user.federated_login', { userId: user.userId, tenantId: user.tenantId }, { providerId: params.providerId, providerUserId: params.providerUserId });

    return { token, refreshToken: session.refreshToken, user };
  }
}
