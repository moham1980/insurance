import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsumedEvent } from '@insurance/shared';
import { RmClaimCase } from './entities/RmClaimCase';
import { ReadModelController } from './readmodel.controller';
import { ReadModelService } from './readmodel.service';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'postgres',
      entities: [RmClaimCase, ConsumedEvent],
      synchronize: process.env.DB_SYNC === 'true',
    }),
    TypeOrmModule.forFeature([RmClaimCase, ConsumedEvent]),
  ],
  controllers: [ReadModelController],
  providers: [ReadModelService],
})
export class AppModule {}
