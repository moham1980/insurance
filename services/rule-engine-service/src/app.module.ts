import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RuleEngineService } from './rule-engine.service';
import { RuleEngineController } from './rule-engine.controller';
import { HealthController } from './health.controller';
import { Rule } from './entities/Rule';
import { RuleExecution } from './entities/RuleExecution';
import { RuleTemplate } from './entities/RuleTemplate';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
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
      schema: process.env.DB_SCHEMA || 'rule_engine',
      synchronize: process.env.NODE_ENV !== 'production' && process.env.DB_SYNC === 'true',
      entities: [Rule, RuleExecution, RuleTemplate, OutboxEvent],
    }),
    TypeOrmModule.forFeature([Rule, RuleExecution, RuleTemplate, OutboxEvent]),
  ],
  controllers: [RuleEngineController, HealthController],
  providers: [TenantGuard, RuleEngineService, JwtAuthGuard, PermissionsGuard],
})
export class AppModule {}
