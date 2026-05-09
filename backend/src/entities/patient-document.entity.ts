import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('patient_documents')
export class PatientDocument {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'patient_id' })
  patientId!: string;

  @Column({ name: 'doctor_id' })
  doctorId!: string;

  @Column({ name: 'file_name' })
  fileName!: string;

  @Column({ name: 'file_url' })
  fileUrl!: string;

  @Column({ name: 'file_type' })
  fileType!: string;

  @Column({ name: 'file_size', type: 'bigint' })
  fileSize!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
