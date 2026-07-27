import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule, HttpService } from '@nestjs/axios';
import { AxiosRequestConfig } from 'axios';
import { Customer360Controller } from './customer-360.controller';
import { Customer360Service } from './customer-360.service';
import { HealthController } from './health.controller';
import { JwtAuthGuard } from './jwt-auth.guard';

import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';
import { OutboxEvent } from '@insurance/shared';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HttpModule.register({
      timeout: parseInt(process.env.DOWNSTREAM_TIMEOUT_MS || '5000', 10),
    } as AxiosRequestConfig),
  ],
  controllers: [Customer360Controller, HealthController],
  providers: [AbacGuard, TenantGuard, Customer360Service, JwtAuthGuard],
  exports: [Customer360Service],
})
export class AppModule {}
