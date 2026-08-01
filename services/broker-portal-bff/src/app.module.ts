import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { BrokerController } from './broker/broker.controller';
import { BrokerBffService } from './broker/broker-bff.service';
import { HealthController } from './health.controller';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RateLimitGuard } from './rate-limit.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HttpModule.register({ timeout: parseInt(process.env.DOWNSTREAM_TIMEOUT_MS || '30000', 10) }),
  ],
  controllers: [BrokerController, HealthController],
  providers: [
    BrokerBffService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RateLimitGuard },
  ],
})
export class AppModule {}
