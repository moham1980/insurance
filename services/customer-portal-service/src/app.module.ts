import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';
import { CustomerPortalService } from './customer-portal.service';
import { CustomerPortalController } from './customer-portal.controller';
import { PolicyNotificationConsumer } from './policy-notification.consumer';
import { CustomerSession } from './entities/CustomerSession';
import { HealthController } from './health.controller';

import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';
import { PermissionsGuard } from './permissions.guard';
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
      schema: process.env.DB_SCHEMA || 'customer_portal',
      synchronize: process.env.NODE_ENV !== 'production' && process.env.DB_SYNC === 'true',
      entities: [CustomerSession],
    }),
    TypeOrmModule.forFeature([CustomerSession]),
    JwtModule.register({
      secret: ((): string => { if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required'); return process.env.JWT_SECRET; })(),
      signOptions: { expiresIn: '30m' },
    }),
    HttpModule,
  ],
  controllers: [CustomerPortalController, HealthController],
  providers: [TenantGuard, AbacGuard, PermissionsGuard, CustomerPortalService, PolicyNotificationConsumer],
})
export class AppModule {}
