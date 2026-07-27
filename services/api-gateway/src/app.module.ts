import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { AdminGuard } from './admin.guard';

@Module({
  controllers: [HealthController],
  providers: [AdminGuard],
})
export class AppModule {}
