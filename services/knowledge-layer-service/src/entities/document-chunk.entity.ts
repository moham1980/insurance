import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Document } from './document.entity';

@Entity('document_chunks')
export class DocumentChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  documentId: string;

  @ManyToOne(() => Document, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: Document;

  @Column({ type: 'int' })
  chunkIndex: number;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'jsonb', nullable: true })
  embeddings: number[];

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'int' })
  startPosition: number;

  @Column({ type: 'int' })
  endPosition: number;

  @CreateDateColumn()
  createdAt: Date;
}
