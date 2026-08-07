import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { InsurerController } from './insurer/insurer.controller';
import { InsurerBffService } from './insurer/insurer-bff.service';
import { HealthController } from './health.controller';
import { JwtAuthGuard } from './jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HttpModule.register({ timeout: parseInt(process.env.DOWNSTREAM_TIMEOUT_MS || '10000', 10) }),
  ],
  controllers: [InsurerController, HealthController],
  providers: [InsurerBffService, JwtAuthGuard],
})
export class AppModule {}
