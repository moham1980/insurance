import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OtelService } from './otel.service';
import { OtelController } from './otel.controller';

@Module({
  imports: [ConfigModule],
  controllers: [OtelController],
  providers: [OtelService],
  exports: [OtelService],
})
export class OtelModule {}
