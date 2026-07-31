import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Module({
  imports: [],
  controllers: [CatalogController],
  providers: [CatalogService, JwtAuthGuard],
})
export class AppModule {}
