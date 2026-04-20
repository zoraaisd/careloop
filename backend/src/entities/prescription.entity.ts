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

import { PrescriptionMedicine } from './prescription-medicine.entity';
import { Patient } from './patient.entity';
import { User } from './user.entity';

@Entity({ name: 'prescriptions' })
export class Prescription {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Patient, (patient) => patient.prescriptions, {
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

  @Column({ type: 'varchar', length: 160 })
  diagnosis!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'date', name: 'prescription_date' })
  prescriptionDate!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  pdfUrl!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  sentAt!: Date | null;

  @Column({ type: 'int', default: 0 })
  resendCount!: number;

  @OneToMany(() => PrescriptionMedicine, (medicine) => medicine.prescription, {
    cascade: true,
  })
  medicines!: PrescriptionMedicine[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
