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

import { ChatMessage } from './chat-message.entity';
import { Patient } from './patient.entity';
import { User } from './user.entity';

export enum FollowUpStatus {
  NONE = 'none',
  PENDING = 'pending',
  COMPLETED = 'completed',
}

@Entity({ name: 'chats' })
export class Chat {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Patient, (patient) => patient.chats, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient!: Patient;

  @Column({ type: 'uuid', name: 'patient_id' })
  patientId!: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'doctor_id' })
  doctor!: User | null;

  @Column({ type: 'uuid', nullable: true, name: 'doctor_id' })
  doctorId!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  lastMessage!: string | null;

  @Column({ type: 'varchar', length: 24, nullable: true })
  lastMessageType!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastMessageAt!: Date | null;

  @Column({ type: 'int', default: 0 })
  unreadCount!: number;

  @Column({
    type: 'enum',
    enum: FollowUpStatus,
    default: FollowUpStatus.NONE,
  })
  followUpStatus!: FollowUpStatus;

  @OneToMany(() => ChatMessage, (message) => message.chat, { cascade: true })
  messages!: ChatMessage[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
