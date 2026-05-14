import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'purchase_order_items' })
export class PurchaseOrderItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  poId!: string;

  @Column({ type: 'uuid', nullable: true })
  inventoryItemId!: string | null;

  @Column({ type: 'varchar', length: 160 })
  productName!: string;

  @Column({ type: 'varchar', length: 80 })
  category!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  sku!: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  unit!: string | null;

  @Column({ type: 'int', default: 1 })
  quantity!: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  unitPrice!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  sellingPrice!: string;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  tax!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  batchNumber!: string | null;

  @Column({ type: 'date', nullable: true })
  expiryDate!: Date | string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  total!: string;
}
