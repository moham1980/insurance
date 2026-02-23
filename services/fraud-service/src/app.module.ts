import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FraudCase } from './entities/FraudCase';
import { OutboxEvent } from '@insurance/shared';
import { FraudController } from './fraud.controller';
import { FraudService } from './fraud.service';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'postgres',
      entities: [FraudCase, OutboxEvent],
      synchronize: process.env.NODE_ENV === 'development',
    }),
    TypeOrmModule.forFeature([FraudCase, OutboxEvent]),
  ],
  controllers: [FraudController],
  providers: [FraudService],
})
export class AppModule {}
