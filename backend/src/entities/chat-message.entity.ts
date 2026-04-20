import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Chat } from './chat.entity';

export enum ChatSenderType {
  DOCTOR = 'doctor',
  PATIENT = 'patient',
  SYSTEM = 'system',
}

export enum ChatMessageType {
  TEXT = 'text',
  PRESCRIPTION = 'prescription',
  FILE = 'file',
  SLOT = 'slot',
  FOLLOW_UP = 'followup',
}

@Entity({ name: 'chat_messages' })
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Chat, (chat) => chat.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chat_id' })
  chat!: Chat;

  @Column({ type: 'uuid', name: 'chat_id' })
  chatId!: string;

  @Column({
    type: 'enum',
    enum: ChatSenderType,
  })
  senderType!: ChatSenderType;

  @Column({
    type: 'enum',
    enum: ChatMessageType,
  })
  messageType!: ChatMessageType;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  attachmentUrl!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
