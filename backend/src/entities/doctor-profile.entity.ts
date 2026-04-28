import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { User } from './user.entity';

@Entity({ name: 'doctor_profiles' })
export class DoctorProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => User, (user) => user.doctorProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'uuid', unique: true, name: 'user_id' })
  userId!: string;

  @Column({ type: 'varchar', length: 120 })
  specialization!: string;

  @Column({ type: 'int' })
  experience!: number;

  @Column({ type: 'varchar', length: 180 })
  qualification!: string;

  @Column({ type: 'varchar', length: 120, name: 'medical_registration_number' })
  medicalRegistrationNumber!: string;

  @Column({ type: 'varchar', length: 160, name: 'medical_council_board' })
  medicalCouncilBoard!: string;

  @Column({ type: 'varchar', length: 120, name: 'council_registered_name' })
  councilRegisteredName!: string;

  @Column({ type: 'date', name: 'date_of_birth' })
  dateOfBirth!: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'clinic_id' })
  clinicId!: string | null;

  @Column({ type: 'varchar', length: 160, name: 'clinic_name' })
  clinicName!: string;

  @Column({ type: 'varchar', length: 255, name: 'clinic_address' })
  clinicAddress!: string;

  @Column({ type: 'varchar', length: 120 })
  city!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'consultation_fees' })
  consultationFees!: string;

  @Column({ type: 'text', array: true, default: '{}', name: 'available_days' })
  availableDays!: string[];

  @Column({ type: 'text', array: true, default: '{}', name: 'available_time_slots' })
  availableTimeSlots!: string[];

  @Column({ type: 'text', nullable: true, name: 'about_doctor' })
  aboutDoctor!: string | null;

  @Column({ type: 'text', nullable: true, name: 'profile_image_url' })
  profileImageUrl!: string | null;

  @Column({ type: 'text', nullable: true, name: 'clinic_image_url' })
  clinicImageUrl!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'certificate_url' })
  certificateUrl!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
