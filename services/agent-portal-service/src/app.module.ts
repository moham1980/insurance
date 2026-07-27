import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { AgentPortalService } from './agent-portal.service';
import { AgentPortalController } from './agent-portal.controller';
import { AgentSession } from './entities/AgentSession';
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
      username: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || process.env.DB_NAME || 'postgres',
      schema: process.env.DB_SCHEMA || 'agent_portal',
      synchronize: process.env.NODE_ENV !== 'production' && process.env.DB_SYNC === 'true',
      entities: [AgentSession],
    }),
    TypeOrmModule.forFeature([AgentSession]),
    HttpModule,
  ],
  controllers: [AgentPortalController, HealthController],
  providers: [TenantGuard, AbacGuard, AgentPortalService],
})
export class AppModule {}
