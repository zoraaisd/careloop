import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStarRatingToDoctorReviews20260504000300 implements MigrationInterface {
  name = 'AddStarRatingToDoctorReviews20260504000300';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "doctor_reviews"
      ADD COLUMN IF NOT EXISTS "star_rating" integer NOT NULL DEFAULT 5;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "doctor_reviews"
      DROP COLUMN IF EXISTS "star_rating";
    `);
  }
}
