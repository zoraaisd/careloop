import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClinicMediaToDoctorProfiles20260504000200 implements MigrationInterface {
  name = 'AddClinicMediaToDoctorProfiles20260504000200';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "doctor_profiles"
      ADD COLUMN IF NOT EXISTS "clinic_image_urls" text[] NOT NULL DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS "clinic_video_urls" text[] NOT NULL DEFAULT '{}';
    `);

    await queryRunner.query(`
      UPDATE "doctor_profiles"
      SET "clinic_image_urls" = ARRAY["clinic_image_url"]
      WHERE "clinic_image_url" IS NOT NULL
        AND "clinic_image_url" <> ''
        AND COALESCE(array_length("clinic_image_urls", 1), 0) = 0;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "doctor_profiles"
      DROP COLUMN IF EXISTS "clinic_video_urls",
      DROP COLUMN IF EXISTS "clinic_image_urls";
    `);
  }
}
