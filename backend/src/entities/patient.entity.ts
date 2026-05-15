import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Appointment } from './appointment.entity';
import { Chat } from './chat.entity';
import { FollowUp } from './follow-up.entity';
import { Prescription } from './prescription.entity';
import { User } from './user.entity';

export enum PatientVerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
}

@Entity({ name: 'patients' })
@Index(['phone', 'clinicId'], { unique: true })
export class Patient {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 20 })
  phone!: string;

  @Column({ type: 'uuid', nullable: true, name: 'clinic_id' })
  clinicId!: string | null;

  @Column({ type: 'int' })
  age!: number;

  @Column({ type: 'varchar', length: 150, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  gender!: string | null;

  @Column({ type: 'varchar', length: 8, nullable: true })
  bloodGroup!: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  condition!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  weight!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  height!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  bp!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  sugar!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  temp!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  cholesterol!: string | null;

  @Column({ type: 'text', nullable: true })
  healthProblem!: string | null;

  @Column({ type: 'text', nullable: true })
  allergies!: string | null;

  @Column({ type: 'text', nullable: true })
  chronicDiseases!: string | null;

  @Column({ type: 'text', nullable: true })
  pastSurgeries!: string | null;

  @Column({ type: 'text', nullable: true })
  previousTreatments!: string | null;

  @Column({
    type: 'enum',
    enum: PatientVerificationStatus,
    default: PatientVerificationStatus.PENDING,
  })
  verificationStatus!: PatientVerificationStatus;

  @Column({ type: 'boolean', default: false })
  whatsappVerified!: boolean;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'boolean', default: false })
  hasPaidConsultation!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  lastVisitAt!: Date | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'primary_doctor_id' })
  primaryDoctor!: User | null;

  @Column({ type: 'uuid', nullable: true, name: 'primary_doctor_id' })
  primaryDoctorId!: string | null;

  @OneToMany(() => Appointment, (appointment) => appointment.patient)
  appointments!: Appointment[];

  @OneToMany(() => Prescription, (prescription) => prescription.patient)
  prescriptions!: Prescription[];

  @OneToMany(() => Chat, (chat) => chat.patient)
  chats!: Chat[];

  @OneToMany(() => FollowUp, (followUp) => followUp.patient)
  followUps!: FollowUp[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
