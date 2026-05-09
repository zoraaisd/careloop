import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'support_ticket_responses' })
export class SupportTicketResponse {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'ticket_id', type: 'uuid' })
  ticketId!: string;

  @Column({ type: 'varchar', length: 20 })
  method!: 'email' | 'whatsapp';

  @Column({ type: 'text' })
  message!: string;

  @Column({ name: 'attachment_name', type: 'varchar', length: 255, nullable: true })
  attachmentName!: string | null;

  @Column({ name: 'attachment_url', type: 'varchar', length: 500, nullable: true })
  attachmentUrl!: string | null;

  @Column({ name: 'attachment_file_id', type: 'uuid', nullable: true })
  attachmentFileId!: string | null;

  @Column({ name: 'attachment_type', type: 'varchar', length: 150, nullable: true })
  attachmentType!: string | null;

  @Column({ name: 'attachment_size', type: 'bigint', nullable: true })
  attachmentSize!: number | null;

  @Column({ name: 'responded_by', type: 'varchar', length: 150 })
  respondedBy!: string;

  @CreateDateColumn({ name: 'responded_at', type: 'timestamptz' })
  respondedAt!: Date;
}
