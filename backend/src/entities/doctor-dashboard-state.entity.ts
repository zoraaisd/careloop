import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'doctor_dashboard_states' })
export class DoctorDashboardState {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100, name: 'doctor_id' })
  doctorId!: string;

  @Column({ type: 'jsonb', default: () => "'{}'", name: 'state_json' })
  stateJson!: Record<string, unknown>;

  @Column({ type: 'boolean', default: false, name: 'migrated_from_file' })
  migratedFromFile!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
