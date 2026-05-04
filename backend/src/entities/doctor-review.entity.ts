import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { User } from './user.entity';

@Entity({ name: 'doctor_reviews' })
export class DoctorReview {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctor_id' })
  doctor!: User;

  @Column({ type: 'uuid', name: 'doctor_id' })
  doctorId!: string;

  @Column({ type: 'boolean', name: 'recommend_doctor' })
  recommendDoctor!: boolean;

  @Column({ type: 'varchar', length: 200, name: 'health_problem' })
  healthProblem!: string;

  @Column({ type: 'varchar', length: 40, name: 'wait_time' })
  waitTime!: string;

  @Column({ type: 'text', array: true, name: 'improvements', default: '{}' })
  improvements!: string[];

  @Column({ type: 'text', name: 'experience_story' })
  experienceStory!: string;

  @Column({ type: 'varchar', length: 120, name: 'reviewer_name' })
  reviewerName!: string;

  @Column({ type: 'varchar', length: 20, name: 'reviewer_phone' })
  reviewerPhone!: string;

  @Column({ type: 'int', name: 'star_rating', default: 5 })
  starRating!: number;

  @Column({ type: 'boolean', name: 'is_anonymous', default: false })
  isAnonymous!: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
