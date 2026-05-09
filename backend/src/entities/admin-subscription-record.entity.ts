import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'admin_subscription_records' })
export class AdminSubscriptionRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'clinic_id', type: 'varchar', length: 100 })
  clinicId!: string;

  @Column({ name: 'clinic_name', type: 'varchar', length: 150 })
  clinicName!: string;

  @Column({ name: 'plan_id', type: 'varchar', length: 100 })
  planId!: string;

  @Column({ name: 'plan_name', type: 'varchar', length: 120 })
  planName!: string;

  @Column({ type: 'varchar', length: 20 })
  status!: 'Active' | 'Expired' | 'Suspended' | 'Trial' | 'Pending';

  @Column({ name: 'start_date', type: 'date' })
  startDate!: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  amount!: number;

  @Column({ type: 'varchar', length: 10, default: 'INR' })
  currency!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
