import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SanhabEvent } from './entities/SanhabEvent';
import { RegulatoryController } from './regulatory.controller';
import { RegulatoryService } from './regulatory.service';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'postgres',
      entities: [SanhabEvent],
      synchronize: process.env.NODE_ENV === 'development',
    }),
    TypeOrmModule.forFeature([SanhabEvent]),
  ],
  controllers: [RegulatoryController],
  providers: [RegulatoryService],
})
export class AppModule {}
