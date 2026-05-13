import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'invoices' })
export class SupplierInvoice {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 40, unique: true })
  invoiceNumber!: string;

  @Column({ type: 'uuid' })
  supplierId!: string;

  @Column({ type: 'varchar', length: 160 })
  supplierName!: string;

  @Column({ type: 'uuid', nullable: true })
  poId!: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  poNumber!: string | null;

  @Column({ type: 'date' })
  invoiceDate!: Date | string;

  @Column({ type: 'date' })
  dueDate!: Date | string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  amount!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  paidAmount!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  balance!: string;

  @Column({ type: 'varchar', length: 24, default: 'Pending' })
  status!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  clinicId!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
