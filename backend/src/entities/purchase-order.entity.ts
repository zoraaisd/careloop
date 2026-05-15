import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'purchase_orders' })
export class PurchaseOrder {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 40, unique: true })
  poNumber!: string;

  @Column({ type: 'uuid' })
  supplierId!: string;

  @Column({ type: 'varchar', length: 160 })
  supplierName!: string;

  @Column({ type: 'date' })
  orderDate!: Date | string;

  @Column({ type: 'varchar', length: 24, default: 'Draft' })
  status!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  clinicId!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
