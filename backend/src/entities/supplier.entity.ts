import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'suppliers' })
export class Supplier {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 40 })
  supplierCode!: string;

  @Column({ type: 'varchar', length: 160 })
  supplierName!: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  companyName!: string | null;

  @Column({ type: 'varchar', length: 80 })
  category!: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  licenseNumber!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  contactPerson!: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  alternatePhone!: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  addressLine1!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  city!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  state!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  country!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  pincode!: string | null;

  @Column({ type: 'varchar', length: 24, default: 'Active' })
  status!: string;

  @Column({ type: 'numeric', precision: 3, scale: 1, default: 4.5 })
  rating!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  clinicId!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
