import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'inventory_items' })
export class InventoryItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  itemName!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  sku!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  medicineType!: string | null;

  @Column({ type: 'varchar', length: 80 })
  category!: string;

  @Column({ type: 'varchar', length: 32 })
  unit!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  strengthComposition!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  barcodeQrCode!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  storageType!: string | null;

  @Column({ type: 'boolean', default: false })
  prescriptionRequired!: boolean;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  gstTax!: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  purchasePrice!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  unitCost!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  sellingPrice!: string;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ type: 'int', default: 0 })
  minimumStockLevel!: number;

  @Column({ type: 'int', default: 0 })
  reorderLevel!: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  // Location fields
  @Column({ type: 'varchar', length: 100, nullable: true })
  storageArea!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  rackShelf!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  row!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  column!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  boxBinNumber!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  slotPosition!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  vendor!: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'supplier_id' })
  supplierId!: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  invoiceNumber!: string | null;

  @Column({ type: 'varchar', length: 24, default: 'Pending' })
  paymentStatus!: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  gstNumber!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  batchNumber!: string | null;

  @Column({ type: 'date', nullable: true })
  expiryDate!: Date | string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  subtotal!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  taxAmount!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  totalAmount!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  clinicId!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
