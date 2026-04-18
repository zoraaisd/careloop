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

  @Column({ type: 'varchar', length: 80 })
  category!: string;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ type: 'varchar', length: 32 })
  unit!: string;

  @Column({ type: 'int', default: 0 })
  reorderLevel!: number;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  unitCost!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  vendor!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
