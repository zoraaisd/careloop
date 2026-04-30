import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'doctors' })
export class Doctor {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 150 })
  email!: string;

  @Column({ type: 'varchar', length: 120 })
  specialization!: string;

  @Column({ type: 'int' })
  experience!: number;

  @Column({ type: 'varchar', length: 160, name: 'clinic_name' })
  clinicName!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  fees!: string;

  @Column({ type: 'text', nullable: true })
  about!: string | null;

  @Column({ type: 'uuid', nullable: true, unique: true, name: 'source_user_id' })
  sourceUserId!: string | null;

  @Column({ type: 'int', default: 0, name: 'patient_count' })
  patientCount!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
