import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SagaInstance } from './entities/SagaInstance';
import { WorkItem } from './entities/WorkItem';
import { OrchestrationsController } from './orchestrations.controller';
import { WorkItemsController } from './work-items.controller';
import { OrchestratorService } from './orchestrator.service';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'postgres',
      entities: [SagaInstance, WorkItem],
      synchronize: process.env.NODE_ENV === 'development',
    }),
    TypeOrmModule.forFeature([SagaInstance, WorkItem]),
  ],
  controllers: [OrchestrationsController, WorkItemsController],
  providers: [OrchestratorService],
})
export class AppModule {}
