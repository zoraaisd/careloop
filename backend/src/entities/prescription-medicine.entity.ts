import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Prescription } from './prescription.entity';

@Entity({ name: 'prescription_medicines' })
export class PrescriptionMedicine {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Prescription, (prescription) => prescription.medicines, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'prescription_id' })
  prescription!: Prescription;

  @Column({ type: 'uuid', name: 'prescription_id' })
  prescriptionId!: string;

  @Column({ type: 'varchar', length: 120 })
  medicineName!: string;

  @Column({ type: 'varchar', length: 80 })
  dosage!: string;

  @Column({ type: 'varchar', length: 200 })
  instruction!: string;
}
