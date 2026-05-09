import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum SupportTicketStatus {
  OPEN = 'Open',
  IN_PROGRESS = 'In Progress',
  RESOLVED = 'Resolved',
  CLOSED = 'Closed',
}

export enum SupportTicketPriority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical',
}

@Entity('support_tickets')
export class SupportTicket {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'doctor_id' })
  doctorId!: string;

  @Column({ name: 'clinic_name' })
  clinicName!: string;

  @Column({ name: 'issue_title' })
  issueTitle!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({
    type: 'enum',
    enum: SupportTicketStatus,
    default: SupportTicketStatus.OPEN,
  })
  status!: SupportTicketStatus;

  @Column({
    type: 'enum',
    enum: SupportTicketPriority,
    default: SupportTicketPriority.MEDIUM,
  })
  priority!: SupportTicketPriority;

  @Column({ name: 'clinic_email', type: 'varchar', nullable: true })
  clinicEmail!: string | null;

  @Column({ name: 'clinic_phone', type: 'varchar', nullable: true })
  clinicPhone!: string | null;

  @Column({ name: 'attachment_url', type: 'varchar', nullable: true })
  attachmentUrl!: string | null;

  @Column({ name: 'attachment_name', type: 'varchar', nullable: true })
  attachmentName!: string | null;

  @Column({ name: 'attachment_file_id', type: 'uuid', nullable: true })
  attachmentFileId!: string | null;

  @Column({ name: 'attachment_type', type: 'varchar', nullable: true })
  attachmentType!: string | null;

  @Column({ name: 'attachment_size', type: 'bigint', nullable: true })
  attachmentSize!: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
