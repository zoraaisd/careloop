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

  @Column({ type: 'varchar', length: 120, name: 'medical_registration_number', nullable: true })
  medicalRegistrationNumber!: string | null;

  @Column({ type: 'varchar', length: 160, name: 'medical_council_board', nullable: true })
  medicalCouncilBoard!: string | null;

  @Column({ type: 'varchar', length: 120, name: 'council_registered_name', nullable: true })
  councilRegisteredName!: string | null;

  @Column({ type: 'date', name: 'date_of_birth', nullable: true })
  dateOfBirth!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'clinic_id' })
  clinicId!: string | null;

  @Column({ type: 'varchar', length: 160, name: 'clinic_name' })
  clinicName!: string;

  @Column({ type: 'varchar', length: 255, name: 'clinic_address' })
  clinicAddress!: string;

  @Column({ type: 'varchar', length: 120 })
  city!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'consultation_fees', default: 0 })
  consultationFees!: string;

  @Column({ type: 'text', array: true, name: 'available_days', default: () => "'{}'" })
  availableDays!: string[];

  @Column({ type: 'text', array: true, name: 'available_time_slots', default: () => "'{}'" })
  availableTimeSlots!: string[];

  @Column({ type: 'text', name: 'about_doctor', nullable: true })
  aboutDoctor!: string | null;

  @Column({ type: 'text', name: 'profile_image_url', nullable: true })
  profileImageUrl!: string | null;

  @Column({ type: 'text', name: 'clinic_logo_url', nullable: true })
  clinicLogoUrl!: string | null;
  clinicImageUrl!: string | null;
  clinicImageUrls!: string[];
  clinicVideoUrls!: string[];

  @Column({ type: 'varchar', length: 255, name: 'certificate_url', nullable: true })
  certificateUrl!: string | null;

  @Column({ type: 'varchar', length: 20, name: 'clinic_phone', nullable: true })
  clinicPhone!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
