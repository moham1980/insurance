import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsumedEvent, DeadLetterEvent } from '@insurance/shared';
import { RmClaimCase } from './entities/RmClaimCase';
import { RmFraudCase } from './entities/RmFraudCase';
import { RmComplaintOps } from './entities/RmComplaintOps';
import { ReadModelController } from './readmodel.controller';
import { ReadModelService } from './readmodel.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { HealthController } from './health.controller';
import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';

const ENTITIES = [RmClaimCase, RmFraudCase, RmComplaintOps, ConsumedEvent, DeadLetterEvent];

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || process.env.DB_NAME || 'postgres',
      schema: process.env.DB_SCHEMA || 'claims_rm',
      entities: ENTITIES,
      synchronize: process.env.NODE_ENV !== 'production' && process.env.DB_SYNC === 'true',
    }),
    TypeOrmModule.forFeature(ENTITIES),
  ],
  controllers: [ReadModelController, HealthController],
  providers: [AbacGuard, TenantGuard, ReadModelService, JwtAuthGuard, PermissionsGuard],
})
export class AppModule {}
