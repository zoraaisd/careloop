import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { SupportChat } from './support-chat.entity';
import { UserRole } from './user.entity';

@Entity({ name: 'support_chat_messages' })
export class SupportChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => SupportChat, (chat) => chat.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chat_id' })
  chat!: SupportChat;

  @Column({ type: 'uuid', name: 'chat_id' })
  chatId!: string;

  @Column({ type: 'uuid', name: 'sender_id' })
  senderId!: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    name: 'sender_role',
  })
  senderRole!: UserRole;

  @Column({ type: 'text' })
  content!: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
