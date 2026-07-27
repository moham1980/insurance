import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { HealthController } from './health.controller';
import { NotificationLog } from './entities/NotificationLog';
import { EmailTemplate } from './entities/EmailTemplate';
import { SmsTemplate } from './entities/SmsTemplate';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { TenantGuard } from './tenant.guard';
import { RedisService } from './redis.service';
import { CallbackAuthGuard } from './callback-auth.guard';
import { OutboxEvent } from '@insurance/shared';
import { KavenegarProvider } from './sms-providers/kavenegar.provider';
import { TwilioProvider } from './sms-providers/twilio.provider';
import { MelliPayamakProvider } from './sms-providers/melli-payamak.provider';
import { SendGridProvider } from './email-providers/sendgrid.provider';
import { AwsSesProvider } from './email-providers/aws-ses.provider';

function createSmsProvider(): any {
  const provider = process.env.SMS_PROVIDER || 'kavenegar';
  if (provider === 'kavenegar') {
    return new KavenegarProvider(process.env.KAVENEGAR_API_KEY || '');
  }
  if (provider === 'twilio') {
    return new TwilioProvider(
      process.env.TWILIO_ACCOUNT_SID || '',
      process.env.TWILIO_AUTH_TOKEN || '',
    );
  }
  if (provider === 'melli-payamak' || provider === 'mellipayamak') {
    return new MelliPayamakProvider(
      process.env.MELLIPAYAMAK_USERNAME || '',
      process.env.MELLIPAYAMAK_PASSWORD || '',
    );
  }
  throw new Error(`Unsupported SMS provider: ${provider}`);
}

function createFallbackSmsProvider(): any | undefined {
  const fallbackProvider = process.env.SMS_FALLBACK_PROVIDER;
  if (!fallbackProvider) return undefined;
  if (fallbackProvider === 'kavenegar') {
    const key = process.env.KAVENEGAR_FALLBACK_API_KEY || process.env.KAVENEGAR_API_KEY || '';
    return new KavenegarProvider(key);
  }
  if (fallbackProvider === 'twilio') {
    return new TwilioProvider(
      process.env.TWILIO_FALLBACK_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID || '',
      process.env.TWILIO_FALLBACK_AUTH_TOKEN || process.env.TWILIO_AUTH_TOKEN || '',
    );
  }
  if (fallbackProvider === 'melli-payamak' || fallbackProvider === 'mellipayamak') {
    return new MelliPayamakProvider(
      process.env.MELLIPAYAMAK_FALLBACK_USERNAME || process.env.MELLIPAYAMAK_USERNAME || '',
      process.env.MELLIPAYAMAK_FALLBACK_PASSWORD || process.env.MELLIPAYAMAK_PASSWORD || '',
    );
  }
  return undefined;
}

function createEmailProvider(): any {
  const provider = process.env.EMAIL_PROVIDER || 'sendgrid';
  if (provider === 'sendgrid') {
    return new SendGridProvider(process.env.SENDGRID_API_KEY || '');
  }
  if (provider === 'aws-ses') {
    return new AwsSesProvider(
      process.env.AWS_ACCESS_KEY_ID || '',
      process.env.AWS_SECRET_ACCESS_KEY || '',
      process.env.AWS_REGION || 'us-east-1',
    );
  }
  throw new Error(`Unsupported email provider: ${provider}`);
}

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || process.env.DB_NAME || 'postgres',
      schema: process.env.DB_SCHEMA || 'notification',
      synchronize: process.env.NODE_ENV !== 'production' && process.env.DB_SYNC === 'true',
      entities: [NotificationLog, EmailTemplate, SmsTemplate, OutboxEvent],
    }),
    TypeOrmModule.forFeature([NotificationLog, EmailTemplate, SmsTemplate, OutboxEvent]),
  ],
  controllers: [NotificationController, HealthController],
  providers: [
    TenantGuard,
    NotificationService,
    JwtAuthGuard,
    PermissionsGuard,
    RedisService,
    CallbackAuthGuard,
    { provide: 'SMS_PROVIDER', useFactory: createSmsProvider },
    { provide: 'SMS_FALLBACK_PROVIDER', useFactory: createFallbackSmsProvider },
    { provide: 'EMAIL_PROVIDER', useFactory: createEmailProvider },
  ],
})
export class AppModule {}
