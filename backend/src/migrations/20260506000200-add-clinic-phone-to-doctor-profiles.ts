import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClinicPhoneToDoctorProfiles20260506000200 implements MigrationInterface {
  name = 'AddClinicPhoneToDoctorProfiles20260506000200';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "doctor_profiles"
      ADD COLUMN IF NOT EXISTS "clinic_phone" varchar(20);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "doctor_profiles"
      DROP COLUMN IF EXISTS "clinic_phone";
    `);
  }
}
