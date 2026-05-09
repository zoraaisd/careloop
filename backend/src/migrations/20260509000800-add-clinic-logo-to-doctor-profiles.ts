import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClinicLogoToDoctorProfiles20260509000800
  implements MigrationInterface
{
  name = 'AddClinicLogoToDoctorProfiles20260509000800';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "doctor_profiles"
      ADD COLUMN IF NOT EXISTS "clinic_logo_url" text NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "doctor_profiles"
      DROP COLUMN IF EXISTS "clinic_logo_url"
    `);
  }
}
