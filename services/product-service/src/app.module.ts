import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { BrokerageProductController } from './brokerage-product.controller';
import { BrokerageProductService } from './brokerage-product.service';
import { Product } from './entities/Product';
import { ProductVersion } from './entities/ProductVersion';
import { Coverage } from './entities/Coverage';
import { Deductible } from './entities/Deductible';
import { PricingRule } from './entities/PricingRule';
import { CoverageDefinition } from './entities/CoverageDefinition';
import { RateTableVersion } from './entities/RateTableVersion';
import { ProductVisibility } from './entities/ProductVisibility';
import { BrokerProductOffering } from './entities/BrokerProductOffering';
import { BundleRule } from './entities/BundleRule';
import { RecommendationRule } from './entities/RecommendationRule';
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
      schema: process.env.DB_SCHEMA || 'public',
      entities: [Product, ProductVersion, Coverage, Deductible, PricingRule, CoverageDefinition, RateTableVersion, ProductVisibility, BrokerProductOffering, BundleRule, RecommendationRule, OutboxEvent],
      synchronize: process.env.NODE_ENV !== 'production' && process.env.DB_SYNC === 'true',
    }),
    TypeOrmModule.forFeature([Product, ProductVersion, Coverage, Deductible, PricingRule, CoverageDefinition, RateTableVersion, ProductVisibility, BrokerProductOffering, BundleRule, RecommendationRule, OutboxEvent]),
  ],
  controllers: [ProductController, BrokerageProductController, HealthController],
  providers: [TenantGuard, AbacGuard, ProductService, BrokerageProductService, JwtAuthGuard, PermissionsGuard],
})
export class AppModule {}
