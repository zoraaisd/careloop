import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveClinicImageVideoColumns20260511000100 implements MigrationInterface {
  name = 'RemoveClinicImageVideoColumns20260511000100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "doctor_profiles"
      DROP COLUMN IF EXISTS "clinic_image_url",
      DROP COLUMN IF EXISTS "clinic_image_urls",
      DROP COLUMN IF EXISTS "clinic_video_urls";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "doctor_profiles"
      ADD COLUMN IF NOT EXISTS "clinic_image_url" text,
      ADD COLUMN IF NOT EXISTS "clinic_image_urls" text[] NOT NULL DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS "clinic_video_urls" text[] NOT NULL DEFAULT '{}';
    `);
  }
}

