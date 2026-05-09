import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'admin_clinic_records' })
export class AdminClinicRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'clinic_name', type: 'varchar', length: 150 })
  clinicName!: string;

  @Column({ name: 'owner_name', type: 'varchar', length: 120 })
  ownerName!: string;

  @Column({ type: 'varchar', length: 255 })
  address!: string;

  @Column({ type: 'varchar', length: 120 })
  city!: string;

  @Column({ type: 'varchar', length: 20 })
  contact!: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  email!: string | null;

  @Column({ name: 'subscription_plan', type: 'varchar', length: 80 })
  subscriptionPlan!: string;

  @Column({ type: 'int', default: 0 })
  doctors!: number;

  @Column({ type: 'int', default: 0 })
  patients!: number;

  @Column({ type: 'varchar', length: 30 })
  status!: 'Active' | 'Pending Approval' | 'Suspended';

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
