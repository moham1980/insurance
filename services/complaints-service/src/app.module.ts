import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsumedEvent, DeadLetterEvent, OutboxEvent } from '@insurance/shared';
import { Complaint } from './entities/Complaint';
import { ComplaintAttachment } from './entities/ComplaintAttachment';
import { ComplaintAudit } from './entities/ComplaintAudit';
import { ComplaintSlaBreach } from './entities/ComplaintSlaBreach';
import { ComplaintMobileOtpChallenge } from './entities/ComplaintMobileOtpChallenge';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { ComplaintsController } from './complaints.controller';
import { ComplaintsService } from './complaints.service';
import { ComplaintSlaBreachWorker } from './complaint-sla-breach.worker';
import { HealthController } from './health.controller';
import { PiiMaskingMiddleware } from './pii-masking.middleware';

import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';
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
      entities: [Complaint, ComplaintAttachment, ComplaintAudit, ComplaintSlaBreach, ComplaintMobileOtpChallenge, OutboxEvent, ConsumedEvent, DeadLetterEvent],
      synchronize: process.env.NODE_ENV !== 'production' && process.env.DB_SYNC === 'true',
    }),
    TypeOrmModule.forFeature([Complaint, ComplaintAttachment, ComplaintAudit, ComplaintSlaBreach, ComplaintMobileOtpChallenge, OutboxEvent, ConsumedEvent, DeadLetterEvent]),
  ],
  controllers: [ComplaintsController, HealthController],
  providers: [TenantGuard, AbacGuard, ComplaintsService, ComplaintSlaBreachWorker, JwtAuthGuard, PermissionsGuard],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(PiiMaskingMiddleware).forRoutes('*');
  }
}
