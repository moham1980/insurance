import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { ConnectorConfig, ConnectorType, ConnectorStatus } from './entities/ConnectorConfig';

export interface ConnectorContext {
  tenantId: string;
  userId: string;
  roles: string[];
  organizationId?: string;
  correlationId: string;
}

@Injectable()
export class ConnectorConfigService {
  constructor(
    @InjectRepository(ConnectorConfig)
    private readonly repo: Repository<ConnectorConfig>,
  ) {}

  private assertTenant(ctx: ConnectorContext, tenantId: string) {
    if (ctx.tenantId !== tenantId && !ctx.roles.includes('insurer_admin')) {
      throw new ForbiddenException('Cross-tenant access denied');
    }
  }

  private getEncryptionKey(): Buffer {
    const key = process.env.CONNECTOR_CREDENTIALS_KEY || process.env.JWT_SECRET || 'default-encryption-key-change-in-production';
    return crypto.createHash('sha256').update(key).digest();
  }

  private encryptCredentials(config: Record<string, any>): Record<string, any> {
    if (!config) return config;
    const result = { ...config };
    const credentialFields = ['credentials', 'apiKey', 'clientSecret', 'password', 'token', 'secret'];
    for (const field of credentialFields) {
      if (result[field] && typeof result[field] === 'string') {
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', this.getEncryptionKey(), iv);
        const encrypted = Buffer.concat([cipher.update(result[field], 'utf8'), cipher.final()]);
        const authTag = cipher.getAuthTag();
        result[field] = `enc:${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
      } else if (result[field] && typeof result[field] === 'object') {
        result[field] = this.encryptCredentials(result[field]);
      }
    }
    return result;
  }

  private decryptCredentials(config: Record<string, any>): Record<string, any> {
    if (!config) return config;
    const result = { ...config };
    const credentialFields = ['credentials', 'apiKey', 'clientSecret', 'password', 'token', 'secret'];
    for (const field of credentialFields) {
      if (result[field] && typeof result[field] === 'string' && result[field].startsWith('enc:')) {
        try {
          const parts = result[field].split(':');
          if (parts.length === 4) {
            const iv = Buffer.from(parts[1], 'base64');
            const authTag = Buffer.from(parts[2], 'base64');
            const encrypted = Buffer.from(parts[3], 'base64');
            const decipher = crypto.createDecipheriv('aes-256-gcm', this.getEncryptionKey(), iv);
            decipher.setAuthTag(authTag);
            const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
            result[field] = decrypted.toString('utf8');
          }
        } catch {
          // If decryption fails, leave as-is (might be legacy unencrypted)
        }
      } else if (result[field] && typeof result[field] === 'object') {
        result[field] = this.decryptCredentials(result[field]);
      }
    }
    return result;
  }

  async create(ctx: ConnectorContext, dto: any): Promise<ConnectorConfig> {
    this.assertTenant(ctx, dto.tenantId);
    const validTypes: ConnectorType[] = ['internal', 'rest', 'soap', 'kafka', 'manual'];
    if (!validTypes.includes(dto.connectorType)) {
      throw new BadRequestException('Invalid connector type');
    }
    const config = this.repo.create({
      connectorId: uuidv4(),
      tenantId: dto.tenantId,
      carrierOrganizationId: dto.carrierOrganizationId,
      name: dto.name,
      connectorType: dto.connectorType,
      config: this.encryptCredentials(dto.config || {}),
      status: dto.status || 'active',
      timeoutMs: dto.timeoutMs ?? 30000,
      retryPolicy: dto.retryPolicy || null,
      circuitBreakerConfig: dto.circuitBreakerConfig || null,
    });
    return this.repo.save(config);
  }

  async list(ctx: ConnectorContext, filters?: any): Promise<ConnectorConfig[]> {
    const where: any = { tenantId: ctx.tenantId };
    if (filters?.carrierOrganizationId) where.carrierOrganizationId = filters.carrierOrganizationId;
    if (filters?.connectorType) where.connectorType = filters.connectorType;
    if (filters?.status) where.status = filters.status;
    const configs = await this.repo.find({ where });
    return configs.map((c) => ({ ...c, config: this.decryptCredentials(c.config) }));
  }

  async get(ctx: ConnectorContext, connectorId: string): Promise<ConnectorConfig> {
    const config = await this.repo.findOne({ where: { connectorId } });
    if (!config) throw new NotFoundException('Connector config not found');
    this.assertTenant(ctx, config.tenantId);
    config.config = this.decryptCredentials(config.config);
    return config;
  }

  async update(ctx: ConnectorContext, connectorId: string, dto: any): Promise<ConnectorConfig> {
    const config = await this.get(ctx, connectorId);
    if (dto.name !== undefined) config.name = dto.name;
    if (dto.config !== undefined) config.config = this.encryptCredentials(dto.config);
    if (dto.status !== undefined) config.status = dto.status as ConnectorStatus;
    if (dto.timeoutMs !== undefined) config.timeoutMs = dto.timeoutMs;
    if (dto.retryPolicy !== undefined) config.retryPolicy = dto.retryPolicy;
    if (dto.circuitBreakerConfig !== undefined) config.circuitBreakerConfig = dto.circuitBreakerConfig;
    config.updatedAt = new Date();
    return this.repo.save(config);
  }

  async getActiveConnectorForCarrier(tenantId: string, carrierOrganizationId: string): Promise<ConnectorConfig | null> {
    return this.repo.findOne({
      where: { tenantId, carrierOrganizationId, status: 'active' },
      order: { createdAt: 'DESC' },
    });
  }
}
