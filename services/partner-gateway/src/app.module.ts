import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PartnerRegistration } from './entities/PartnerRegistration';
import { FederationNonce } from './entities/FederationNonce';
import { PartnerCertificate } from './entities/PartnerCertificate';
import { PartnerGatewayController } from './partner-gateway.controller';
import { PartnerGatewayService } from './partner-gateway.service';
import { CertificateService } from './certificate.service';
import { ReplayProtectionService } from './replay-protection.service';
import { TokenExchangeProxyService } from './token-exchange-proxy.service';
import { HealthController } from './health.controller';
import { CertRotationService } from './tls/cert-rotation.service';
import { MtlsConfigService } from './tls/mtls-config';
import { PartnerHealthCheckService } from './monitoring/partner-health-check.service';
import { PartnerAuthService } from './partner-auth.service';
import { RateLimitService } from './rate-limit.service';
import { PartnerRateLimitGuard } from './partner-rate-limit.guard';
import { FederationSignatureGuard } from './federation-signature.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AdminGuard } from './admin.guard';
import { OutboxEvent, TracingInterceptor } from '@insurance/shared';
import { APP_INTERCEPTOR } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || process.env.DB_NAME || 'postgres',
      schema: process.env.DB_SCHEMA || 'public',
      entities: [PartnerRegistration, FederationNonce, PartnerCertificate, OutboxEvent],
      synchronize: process.env.NODE_ENV !== 'production' && process.env.DB_SYNC === 'true',
    }),
    TypeOrmModule.forFeature([PartnerRegistration, FederationNonce, PartnerCertificate, OutboxEvent]),
  ],
  controllers: [PartnerGatewayController, HealthController],
  providers: [
    PartnerGatewayService,
    CertificateService,
    ReplayProtectionService,
    TokenExchangeProxyService,
    CertRotationService,
    MtlsConfigService,
    PartnerHealthCheckService,
    PartnerAuthService,
    RateLimitService,
    PartnerRateLimitGuard,
    FederationSignatureGuard,
    JwtAuthGuard,
    AdminGuard,
    { provide: APP_INTERCEPTOR, useClass: TracingInterceptor },
  ],
  exports: [PartnerGatewayService, CertificateService, ReplayProtectionService, TokenExchangeProxyService, MtlsConfigService, PartnerHealthCheckService, PartnerAuthService, RateLimitService],
})
export class AppModule {}
