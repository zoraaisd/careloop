import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'purchase_order_items' })
export class PurchaseOrderItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  poId!: string;

  @Column({ type: 'varchar', length: 160 })
  productName!: string;

  @Column({ type: 'varchar', length: 80 })
  category!: string;

  @Column({ type: 'int', default: 1 })
  quantity!: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  unitPrice!: string;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  tax!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  total!: string;
}
