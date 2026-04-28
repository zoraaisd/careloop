import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClinicImageToDoctorProfiles20260427000100 implements MigrationInterface {
  name = 'AddClinicImageToDoctorProfiles20260427000100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "doctor_profiles"
      ALTER COLUMN "profile_image_url" TYPE text;
    `);

    await queryRunner.query(`
      ALTER TABLE "doctor_profiles"
      ADD COLUMN IF NOT EXISTS "clinic_image_url" text;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "doctor_profiles"
      DROP COLUMN IF EXISTS "clinic_image_url";
    `);

    await queryRunner.query(`
      ALTER TABLE "doctor_profiles"
      ALTER COLUMN "profile_image_url" TYPE varchar(255);
    `);
  }
}
