import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'admin_payment_records' })
export class AdminPaymentRecord {
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

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  amount!: number;

  @Column({ type: 'varchar', length: 10, default: 'INR' })
  currency!: string;

  @Column({ name: 'paid_on', type: 'date' })
  paidOn!: string;

  @Column({ type: 'varchar', length: 20 })
  status!: 'Paid' | 'Failed' | 'Pending' | 'Refunded';

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
