import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('re_ticket_messages')
@Index(['ticketId', 'createdAt'])
export class ReTicketMessage {
  @PrimaryGeneratedColumn('uuid', { name: 'ticket_message_id' })
  ticketMessageId!: string;

  @Column({ name: 'ticket_id', type: 'uuid' })
  ticketId!: string;

  @Column({ name: 'message_type', type: 'text', default: 'internal' })
  messageType!: 'internal' | 'external';

  @Column({ name: 'body', type: 'text' })
  body!: string;

  @Column({ name: 'created_by', type: 'text', nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
