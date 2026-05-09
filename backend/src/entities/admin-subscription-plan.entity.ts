import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'admin_subscription_plans' })
export class AdminSubscriptionPlan {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  id!: string;

  @Column({ type: 'varchar', length: 120, unique: true })
  name!: string;

  @Column({ type: 'varchar', length: 255 })
  description!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  price!: number;

  @Column({ type: 'varchar', length: 10, default: 'INR' })
  currency!: string;

  @Column({ name: 'billing_cycle', type: 'varchar', length: 16 })
  billingCycle!: 'month' | 'year';

  @Column({ name: 'doctors_limit', type: 'int' })
  doctorsLimit!: number;

  @Column({ name: 'patients_limit', type: 'int' })
  patientsLimit!: number;

  @Column({ name: 'whatsapp_limit', type: 'int' })
  whatsappLimit!: number;

  @Column({ type: 'varchar', length: 20, default: 'Active' })
  status!: 'Active' | 'Inactive' | 'Archived';

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
