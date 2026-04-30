import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDoctorReviewsAndPatientCount20260430000100 implements MigrationInterface {
  name = 'AddDoctorReviewsAndPatientCount20260430000100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "doctors"
      ADD COLUMN IF NOT EXISTS "patient_count" integer NOT NULL DEFAULT 0;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "doctor_reviews" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "doctor_id" uuid NOT NULL,
        "recommend_doctor" boolean NOT NULL,
        "health_problem" varchar(200) NOT NULL,
        "wait_time" varchar(40) NOT NULL,
        "improvements" text[] NOT NULL DEFAULT '{}',
        "experience_story" text NOT NULL,
        "reviewer_name" varchar(120) NOT NULL,
        "reviewer_phone" varchar(20) NOT NULL,
        "is_anonymous" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_doctor_reviews_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_doctor_reviews_doctor_id" FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_doctor_reviews_doctor_id_created_at"
      ON "doctor_reviews" ("doctor_id", "created_at" DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_doctor_reviews_doctor_id_created_at";
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "doctor_reviews";
    `);

    await queryRunner.query(`
      ALTER TABLE "doctors"
      DROP COLUMN IF EXISTS "patient_count";
    `);
  }
}
