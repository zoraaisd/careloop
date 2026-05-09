import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'admin_clinic_requests' })
export class AdminClinicRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'clinic_id', type: 'varchar', length: 100, nullable: true })
  clinicId!: string | null;

  @Column({ name: 'clinic_name', type: 'varchar', length: 150 })
  clinic!: string;

  @Column({ type: 'varchar', length: 120 })
  city!: string;

  @Column({ name: 'owner_name', type: 'varchar', length: 120 })
  owner!: string;

  @Column({ name: 'requested_on', type: 'date' })
  requestedOn!: string;

  @Column({ type: 'varchar', length: 30 })
  status!: 'Pending' | 'Under Review' | 'Approved' | 'Rejected';

  @Column({ type: 'varchar', length: 20, nullable: true })
  contact!: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  email!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
