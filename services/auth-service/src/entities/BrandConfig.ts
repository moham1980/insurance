import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('brand_configs')
@Index(['tenantId', 'brandKey'], { unique: true })
export class BrandConfig {
  @PrimaryGeneratedColumn('uuid', { name: 'brand_config_id' })
  brandConfigId!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'brand_key', type: 'text' })
  brandKey!: string;

  @Column({ name: 'display_name_fa', type: 'text' })
  displayNameFa!: string;

  @Column({ name: 'display_name_en', type: 'text' })
  displayNameEn!: string;

  @Column({ name: 'primary_color', type: 'text', default: '#0d47a1' })
  primaryColor!: string;

  @Column({ name: 'logo_url', type: 'text', nullable: true })
  logoUrl!: string | null;

  @Column({ name: 'favicon_url', type: 'text', nullable: true })
  faviconUrl!: string | null;

  @Column({ name: 'rtl', type: 'boolean', default: true })
  rtl!: boolean;

  @Column({ name: 'calendar_type', type: 'text', default: 'jalali' })
  calendarType!: 'jalali' | 'gregorian';

  @Column({ name: 'default_currency', type: 'text', default: 'IRR' })
  defaultCurrency!: string;

  @Column({ name: 'supported_locales', type: 'text', array: true, default: () => "ARRAY['fa','en']::text[]" })
  supportedLocales!: string[];

  @Column({ name: 'default_language', type: 'text', default: 'fa' })
  defaultLanguage!: string;

  @Column({ name: 'support_phone', type: 'text', nullable: true })
  supportPhone!: string | null;

  @Column({ name: 'support_email', type: 'text', nullable: true })
  supportEmail!: string | null;

  @Column({ name: 'smtp_credential_ref', type: 'text', nullable: true })
  smtpCredentialRef!: string | null;

  @Column({ name: 'sms_credential_ref', type: 'text', nullable: true })
  smsCredentialRef!: string | null;

  @Column({ name: 'domain_allow_list', type: 'text', array: true, default: () => "ARRAY[]::text[]" })
  domainAllowList!: string[];

  @Column({ name: 'custom_css', type: 'text', nullable: true })
  customCss!: string | null;

  @Column({ name: 'legal_text_fa', type: 'text', nullable: true })
  legalTextFa!: string | null;

  @Column({ name: 'legal_text_en', type: 'text', nullable: true })
  legalTextEn!: string | null;

  @Column({ name: 'welcome_message_fa', type: 'text', nullable: true })
  welcomeMessageFa!: string | null;

  @Column({ name: 'welcome_message_en', type: 'text', nullable: true })
  welcomeMessageEn!: string | null;

  @Column({ name: 'support_url', type: 'text', nullable: true })
  supportUrl!: string | null;

  @Column({ name: 'portal_login_background_url', type: 'text', nullable: true })
  portalLoginBackgroundUrl!: string | null;

  @Column({ name: 'header_logo_url', type: 'text', nullable: true })
  headerLogoUrl!: string | null;

  @Column({ name: 'primary_font', type: 'text', default: 'Vazirmatn' })
  primaryFont!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
