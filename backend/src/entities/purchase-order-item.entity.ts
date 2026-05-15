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

  @Column({ type: 'uuid', nullable: true, name: 'supplier_id' })
  supplierId!: string | null;
}
