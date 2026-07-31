import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule, HttpService } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AxiosRequestConfig } from 'axios';
import { Customer360Controller } from './customer-360.controller';
import { Customer360Service } from './customer-360.service';
import { HealthController } from './health.controller';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ConsentDbStore } from './consent/consent-db.store';
import { ConsentCheckService } from './consent/consent-check.service';
import { PortfolioAggregatorService } from './consent/portfolio-aggregator.service';
import { ConsentRecordEntity } from './entities/ConsentRecordEntity';
import { OutboxEvent } from '@insurance/shared';

import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HttpModule.register({
      timeout: parseInt(process.env.DOWNSTREAM_TIMEOUT_MS || '5000', 10),
    } as AxiosRequestConfig),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || process.env.DB_NAME || 'postgres',
      schema: process.env.DB_SCHEMA || 'customer360',
      entities: [ConsentRecordEntity, OutboxEvent],
      synchronize: process.env.NODE_ENV !== 'production' && process.env.DB_SYNC === 'true',
    }),
    TypeOrmModule.forFeature([ConsentRecordEntity]),
  ],
  controllers: [Customer360Controller, HealthController],
  providers: [AbacGuard, TenantGuard, Customer360Service, ConsentDbStore, ConsentCheckService, PortfolioAggregatorService, JwtAuthGuard],
  exports: [Customer360Service, ConsentCheckService, PortfolioAggregatorService],
})
export class AppModule {}
