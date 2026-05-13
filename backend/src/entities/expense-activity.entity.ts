import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ExpenseActivityType {
  ACTIVITY = 'activity',
  EXPENSE = 'expense',
}

@Entity({ name: 'expense_activities' })
export class ExpenseActivity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  title!: string;

  @Column({ type: 'varchar', length: 80 })
  category!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount!: string;

  @Column({ type: 'date' })
  date!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({
    type: 'enum',
    enum: ExpenseActivityType,
    default: ExpenseActivityType.EXPENSE,
  })
  type!: ExpenseActivityType;

  @Column({ type: 'varchar', length: 100, nullable: true })
  clinicId!: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'created_by_doctor_id' })
  createdByDoctorId!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
