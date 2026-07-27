import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgeLayerService } from './knowledge-layer.service';
import { KnowledgeLayerController } from './knowledge-layer.controller';
import { Document } from './entities/document.entity';
import { DocumentChunk } from './entities/document-chunk.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Document,
      DocumentChunk,
    ]),
  ],
  controllers: [KnowledgeLayerController],
  providers: [KnowledgeLayerService],
  exports: [KnowledgeLayerService],
})
export class KnowledgeLayerModule {}
