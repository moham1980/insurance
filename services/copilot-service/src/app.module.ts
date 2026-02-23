import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClaimEntity } from './entities/ClaimEntity';
import { DocumentEntity } from './entities/DocumentEntity';
import { CopilotController } from './copilot.controller';
import { CopilotService } from './copilot.service';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'postgres',
      entities: [ClaimEntity, DocumentEntity],
      synchronize: process.env.DB_SYNC === 'true',
    }),
    TypeOrmModule.forFeature([ClaimEntity, DocumentEntity]),
  ],
  controllers: [CopilotController],
  providers: [CopilotService],
})
export class AppModule {}
