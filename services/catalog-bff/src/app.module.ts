import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { DistributedCacheService } from './distributed-cache.service'; // P2 #11: distributed cache

@Module({
  imports: [],
  controllers: [CatalogController],
  providers: [CatalogService, JwtAuthGuard, DistributedCacheService],
})
export class AppModule {}
