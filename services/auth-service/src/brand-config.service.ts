import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { BrandConfig } from './entities/BrandConfig';

@Injectable()
export class BrandConfigService {
  constructor(
    @InjectRepository(BrandConfig)
    private brandRepo: Repository<BrandConfig>,
  ) {}

  async create(tenantId: string, params: Partial<BrandConfig> & { brandKey: string }): Promise<BrandConfig> {
    const brand = this.brandRepo.create({
      brandConfigId: uuidv4(),
      tenantId,
      brandKey: params.brandKey,
      displayNameFa: params.displayNameFa || params.brandKey,
      displayNameEn: params.displayNameEn || params.brandKey,
      primaryColor: params.primaryColor || '#0d47a1',
      logoUrl: params.logoUrl || null,
      faviconUrl: params.faviconUrl || null,
      rtl: params.rtl !== undefined ? params.rtl : true,
      calendarType: params.calendarType || 'jalali',
      defaultCurrency: params.defaultCurrency || 'IRR',
      supportedLocales: Array.isArray(params.supportedLocales) ? params.supportedLocales : ['fa', 'en'],
      defaultLanguage: params.defaultLanguage || 'fa',
      supportPhone: params.supportPhone || null,
      supportEmail: params.supportEmail || null,
      smtpCredentialRef: params.smtpCredentialRef || null,
      smsCredentialRef: params.smsCredentialRef || null,
      domainAllowList: Array.isArray(params.domainAllowList) ? params.domainAllowList : [],
      customCss: params.customCss || null,
      legalTextFa: params.legalTextFa || null,
      legalTextEn: params.legalTextEn || null,
      welcomeMessageFa: params.welcomeMessageFa || null,
      welcomeMessageEn: params.welcomeMessageEn || null,
      supportUrl: params.supportUrl || null,
      portalLoginBackgroundUrl: params.portalLoginBackgroundUrl || null,
      headerLogoUrl: params.headerLogoUrl || null,
      primaryFont: params.primaryFont || 'Vazirmatn',
    });
    return this.brandRepo.save(brand);
  }

  async getByKey(tenantId: string, brandKey: string): Promise<BrandConfig> {
    const brand = await this.brandRepo.findOne({ where: { tenantId, brandKey } });
    if (!brand) throw new NotFoundException('Brand config not found');
    return brand;
  }

  async list(tenantId: string, params: { limit?: number; offset?: number }) {
    const limit = Math.min(params.limit || 50, 200);
    const offset = params.offset || 0;
    const [rows, total] = await this.brandRepo
      .createQueryBuilder('b')
      .where('b.tenantId = :tenantId', { tenantId })
      .orderBy('b.createdAt', 'DESC')
      .take(limit)
      .skip(offset)
      .getManyAndCount();
    return { rows, total };
  }

  async update(tenantId: string, brandKey: string, updates: Partial<BrandConfig>): Promise<BrandConfig> {
    const brand = await this.getByKey(tenantId, brandKey);
    Object.assign(brand, updates);
    brand.updatedAt = new Date();
    return this.brandRepo.save(brand);
  }
}
