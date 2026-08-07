import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeatureFlag } from './entities/FeatureFlag';
import { AiToggle } from './entities/AiToggle';
import { AuditLog } from './entities/AuditLog'; // P1 #10
import { EntityVersion } from './entities/EntityVersion'; // P1 #10
import { AiTogglesController } from './ai-toggles.controller';
import { FeatureFlagsController } from './feature-flags.controller';
import { FeatureFlagsService } from './feature-flags.service';
import { PermissionsGuard } from './permissions.guard';
import { HealthController } from './health.controller';

import { AbacGuard } from './abac.guard';
import { TenantGuard } from './tenant.guard';
import { OutboxEvent } from '@insurance/shared';
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'postgres',
      schema: process.env.DB_SCHEMA || 'feature_flags',
      entities: [FeatureFlag, AiToggle, AuditLog, EntityVersion, OutboxEvent],
      synchronize: process.env.NODE_ENV !== 'production' && process.env.DB_SYNC === 'true',
    }),
    TypeOrmModule.forFeature([FeatureFlag, AiToggle, AuditLog, EntityVersion, OutboxEvent]),
  ],
  controllers: [FeatureFlagsController, AiTogglesController, HealthController],
  providers: [TenantGuard, AbacGuard, FeatureFlagsService, PermissionsGuard],
})
export class AppModule {}
