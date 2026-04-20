import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { DoctorAvailabilitySlot } from './doctor-availability-slot.entity';
import { Patient } from './patient.entity';
import { User } from './user.entity';

export enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  WAITING = 'waiting',
  ENGAGED = 'engaged',
  DONE = 'done',
  CANCELLED = 'cancelled',
}

@Entity({ name: 'appointments' })
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Patient, (patient) => patient.appointments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'patient_id' })
  patient!: Patient;

  @Column({ type: 'uuid', name: 'patient_id' })
  patientId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctor_id' })
  doctor!: User;

  @Column({ type: 'uuid', name: 'doctor_id' })
  doctorId!: string;

  @Column({ type: 'date', name: 'appointment_date' })
  appointmentDate!: string;

  @Column({ type: 'varchar', length: 32, name: 'appointment_time' })
  appointmentTime!: string;

  @Column({ type: 'varchar', length: 32 })
  day!: string;

  @Column({ type: 'varchar', length: 40, default: 'consultation' })
  appointmentType!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({
    type: 'enum',
    enum: AppointmentStatus,
    default: AppointmentStatus.SCHEDULED,
  })
  status!: AppointmentStatus;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  billingAmount!: string;

  @Column({ type: 'timestamptz', nullable: true })
  cancelledAt!: Date | null;

  @OneToOne(() => DoctorAvailabilitySlot, (slot) => slot.appointment, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  slot!: DoctorAvailabilitySlot | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
