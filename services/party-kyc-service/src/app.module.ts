import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Party } from './entities/Party';
import { KycReview } from './entities/KycReview';
import { DocumentTrustChainEntry } from './entities/DocumentTrustChainEntry';
import { IdentityProofingRecord } from './entities/IdentityProofingRecord';
import { ExternalVerificationRequestEntity } from './entities/ExternalVerificationRequestEntity';
import { KycExceptionEntity } from './entities/KycExceptionEntity';
import { ConsentRecord } from './entities/ConsentRecord';
import { OutboxEvent } from '@insurance/shared';
import { PartyController } from './party.controller';
import { PartyService } from './party.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';
import { HealthController } from './health.controller';
import { PiiMaskingInterceptor } from './pii-masking.interceptor';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || process.env.DB_NAME || 'postgres',
      schema: process.env.DB_SCHEMA || 'public',
      entities: [Party, KycReview, DocumentTrustChainEntry, IdentityProofingRecord, ExternalVerificationRequestEntity, KycExceptionEntity, ConsentRecord, OutboxEvent],
      synchronize: process.env.NODE_ENV !== 'production' && process.env.DB_SYNC === 'true',
    }),
    TypeOrmModule.forFeature([Party, KycReview, DocumentTrustChainEntry, IdentityProofingRecord, ExternalVerificationRequestEntity, KycExceptionEntity, ConsentRecord, OutboxEvent]),
  ],
  controllers: [PartyController, HealthController],
  providers: [
    PartyService,
    JwtAuthGuard,
    PermissionsGuard,
    AbacGuard,
    TenantGuard,
    {
      provide: APP_INTERCEPTOR,
      useClass: PiiMaskingInterceptor,
    },
  ],
})
export class AppModule {}
