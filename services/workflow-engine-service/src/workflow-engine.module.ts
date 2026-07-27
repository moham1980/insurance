import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { WorkflowEngineService } from './workflow-engine.service';
import { WorkflowEngineController } from './workflow-engine.controller';
import { ProcessDefinition } from './entities/process-definition.entity';
import { ProcessInstance } from './entities/process-instance.entity';
import { ProcessToken } from './entities/process-token.entity';
import { ProcessVariable } from './entities/process-variable.entity';
import { ProcessHistory } from './entities/process-history.entity';
import { ProcessTimer } from './entities/process-timer.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProcessDefinition,
      ProcessInstance,
      ProcessToken,
      ProcessVariable,
      ProcessHistory,
      ProcessTimer,
    ]),
    HttpModule,
  ],
  controllers: [WorkflowEngineController],
  providers: [WorkflowEngineService],
  exports: [WorkflowEngineService],
})
export class WorkflowEngineModule {}
