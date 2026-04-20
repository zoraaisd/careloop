import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Patient } from './patient.entity';
import { User } from './user.entity';

export enum FollowUpEntryStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
}

@Entity({ name: 'follow_ups' })
export class FollowUp {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Patient, (patient) => patient.followUps, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'patient_id' })
  patient!: Patient;

  @Column({ type: 'uuid', name: 'patient_id' })
  patientId!: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'doctor_id' })
  doctor!: User | null;

  @Column({ type: 'uuid', nullable: true, name: 'doctor_id' })
  doctorId!: string | null;

  @Column({ type: 'varchar', length: 255 })
  message!: string;

  @Column({ type: 'timestamptz' })
  scheduledAt!: Date;

  @Column({
    type: 'enum',
    enum: FollowUpEntryStatus,
    default: FollowUpEntryStatus.PENDING,
  })
  status!: FollowUpEntryStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
