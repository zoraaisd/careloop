import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { User } from './user.entity';
import { SupportChatMessage } from './support-chat-message.entity';

@Entity({ name: 'support_chats' })
export class SupportChat {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctor_id' })
  doctor!: User;

  @Column({ type: 'uuid', name: 'doctor_id' })
  doctorId!: string;

  @Column({ type: 'text', nullable: true, name: 'last_message' })
  lastMessage!: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'last_message_at' })
  lastMessageAt!: Date | null;

  @Column({ type: 'int', default: 0, name: 'unread_count_admin' })
  unreadCountAdmin!: number;

  @Column({ type: 'int', default: 0, name: 'unread_count_doctor' })
  unreadCountDoctor!: number;

  @OneToMany(() => SupportChatMessage, (message) => message.chat, { cascade: true })
  messages!: SupportChatMessage[];

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
