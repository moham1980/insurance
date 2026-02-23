import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsumedEvent, OutboxEvent } from '@insurance/shared';
import { DocumentEntity } from './entities/DocumentEntity';
import { HealthController } from './health.controller';
import { DocumentAiConsumer } from './document-ai.consumer';
import { GeminiModule } from './gemini/gemini.module';
import { DeepSeekModule } from './deepseek/deepseek.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'postgres',
      entities: [DocumentEntity, ConsumedEvent, OutboxEvent],
      synchronize: process.env.DB_SYNC === 'true',
    }),
    TypeOrmModule.forFeature([DocumentEntity, ConsumedEvent, OutboxEvent]),
    GeminiModule,
    DeepSeekModule,
  ],
  controllers: [HealthController],
  providers: [DocumentAiConsumer],
})
export class AppModule {}
