import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { CustomerController } from './customer/customer.controller';
import { CustomerBffService } from './customer/customer-bff.service';
import { CacheService } from './cache.service';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HttpModule.register({ timeout: parseInt(process.env.DOWNSTREAM_TIMEOUT_MS || '10000', 10) }),
  ],
  controllers: [CustomerController, HealthController],
  providers: [CustomerBffService, CacheService],
})
export class AppModule {}
