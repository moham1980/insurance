import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OtelService } from './otel.service';
import { OtelController } from './otel.controller';
import { JwtAuthGuard } from './jwt-auth.guard';

@Module({
  imports: [ConfigModule],
  controllers: [OtelController],
  providers: [OtelService, JwtAuthGuard],
  exports: [OtelService],
})
export class OtelModule {}
