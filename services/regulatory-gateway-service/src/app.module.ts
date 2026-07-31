import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SanhabEvent } from './entities/SanhabEvent';
import { RegulatoryFailureLog } from './entities/RegulatoryFailureLog';
import { SanhabSmsInquiry } from './entities/SanhabSmsInquiry';
import { WarehouseFireInquiryRecord } from './entities/WarehouseFireInquiryRecord';
import { BrokerLicenseStatusChange } from './entities/BrokerLicenseStatusChange';
import { RegulatoryController } from './regulatory.controller';
import { RegulatoryService } from './regulatory.service';
import { LicenseValidationService } from './license-validation.service';
import { WarehouseFireInquiryService } from './warehouse-fire/warehouse-fire-inquiry.service';
import { SanhabSmsInquiryService } from './sanhab-sms/sanhab-sms-inquiry.service';
import { SanhabController } from './sanhab/sanhab.controller';
import { SanhabIssuanceService } from './sanhab/sanhab-issuance.service';
import { HealthController } from './health.controller';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';

import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';
import { OutboxEvent } from '@insurance/shared';
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || process.env.DB_NAME || 'postgres',
      schema: process.env.DB_SCHEMA || 'regulatory',
      extra: {
        options: `-c search_path=${process.env.DB_SCHEMA || 'regulatory'},public`,
      },
      entities: [SanhabEvent, RegulatoryFailureLog, SanhabSmsInquiry, WarehouseFireInquiryRecord, BrokerLicenseStatusChange, OutboxEvent],
      synchronize: process.env.NODE_ENV !== 'production' && process.env.DB_SYNC === 'true',
    }),
    TypeOrmModule.forFeature([SanhabEvent, RegulatoryFailureLog, SanhabSmsInquiry, WarehouseFireInquiryRecord, BrokerLicenseStatusChange, OutboxEvent]),
  ],
  controllers: [RegulatoryController, SanhabController, HealthController],
  providers: [AbacGuard, TenantGuard, RegulatoryService, SanhabIssuanceService, LicenseValidationService, WarehouseFireInquiryService, SanhabSmsInquiryService, JwtAuthGuard, PermissionsGuard],
})
export class AppModule {}
