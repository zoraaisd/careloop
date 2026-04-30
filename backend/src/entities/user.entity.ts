import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { DoctorProfile } from './doctor-profile.entity';

export enum UserRole {
  ADMIN = 'admin',
  DOCTOR = 'doctor',
  PATIENT = 'patient',
}

export enum DoctorApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum SubscriptionStatus {
  INACTIVE = 'inactive',
  ACTIVE = 'active',
}

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 150 })
  email!: string;

  @Column({ type: 'varchar', length: 20 })
  phone!: string;

  @Column({ type: 'varchar', length: 255, select: false })
  password!: string;

  @Column({
    type: 'enum',
    enum: UserRole,
  })
  role!: UserRole;

  @Column({
    type: 'enum',
    enum: DoctorApprovalStatus,
    default: DoctorApprovalStatus.APPROVED,
    name: 'approval_status',
  })
  approvalStatus!: DoctorApprovalStatus;

  @Column({ type: 'timestamptz', nullable: true, name: 'trial_started_at' })
  trialStartedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'trial_ends_at' })
  trialEndsAt!: Date | null;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.INACTIVE,
    name: 'subscription_status',
  })
  subscriptionStatus!: SubscriptionStatus;

  @Column({ type: 'varchar', nullable: true, name: 'subscribed_plan_id' })
  subscribedPlanId!: string | null;

  @OneToOne(() => DoctorProfile, (doctorProfile) => doctorProfile.user, {
    cascade: true,
    nullable: true,
  })
  doctorProfile!: DoctorProfile | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @BeforeInsert()
  @BeforeUpdate()
  normalizeEmail(): void {
    this.email = this.email.trim().toLowerCase();
  }
}
