import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Patient } from './patient.entity';
import { User } from './user.entity';

export enum ActivityDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

@Entity({ name: 'activity_logs' })
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Patient, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'patient_id' })
  patient!: Patient | null;

  @Column({ type: 'uuid', nullable: true, name: 'patient_id' })
  patientId!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'doctor_id' })
  doctor!: User | null;

  @Column({ type: 'uuid', nullable: true, name: 'doctor_id' })
  doctorId!: string | null;

  @Column({
    type: 'enum',
    enum: ActivityDirection,
    default: ActivityDirection.OUTBOUND,
  })
  direction!: ActivityDirection;

  @Column({ type: 'varchar', length: 60 })
  type!: string;

  @Column({ type: 'text' })
  message!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
