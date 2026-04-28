import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClinicIdToDoctorProfiles20260428000100 implements MigrationInterface {
  name = 'AddClinicIdToDoctorProfiles20260428000100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "doctor_profiles"
      ADD COLUMN IF NOT EXISTS "clinic_id" varchar(20);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "doctor_profiles"
      DROP COLUMN IF EXISTS "clinic_id";
    `);
  }
}

