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

import { Appointment } from './appointment.entity';
import { User } from './user.entity';

@Entity({ name: 'doctor_availability_slots' })
export class DoctorAvailabilitySlot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctor_id' })
  doctor!: User;

  @Column({ type: 'uuid', name: 'doctor_id' })
  doctorId!: string;

  @Column({ type: 'date' })
  date!: string;

  @Column({ type: 'varchar', length: 32 })
  day!: string;

  @Column({ type: 'varchar', length: 32, name: 'start_time' })
  startTime!: string;

  @Column({ type: 'varchar', length: 32, nullable: true, name: 'end_time' })
  endTime!: string | null;

  @Column({ type: 'boolean', default: false })
  isBooked!: boolean;

  @OneToOne(() => Appointment, (appointment) => appointment.slot, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'appointment_id' })
  appointment!: Appointment | null;

  @Column({ type: 'uuid', nullable: true, name: 'appointment_id' })
  appointmentId!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
