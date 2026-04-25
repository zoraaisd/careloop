import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDoctorsTable20260425000100 implements MigrationInterface {
  name = 'AddDoctorsTable20260425000100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "doctors" (
        "id" SERIAL NOT NULL,
        "name" varchar(120) NOT NULL,
        "email" varchar(150) NOT NULL,
        "specialization" varchar(120) NOT NULL,
        "experience" integer NOT NULL,
        "clinic_name" varchar(160) NOT NULL,
        "fees" numeric(12,2) NOT NULL,
        "about" text,
        "source_user_id" uuid,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_doctors_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_doctors_source_user_id" UNIQUE ("source_user_id")
      );
    `);

    await queryRunner.query(`
      INSERT INTO "doctors" (
        "name",
        "email",
        "specialization",
        "experience",
        "clinic_name",
        "fees",
        "about",
        "source_user_id"
      )
      SELECT
        "user"."name",
        "user"."email",
        "profile"."specialization",
        "profile"."experience",
        "profile"."clinic_name",
        "profile"."consultation_fees",
        "profile"."about_doctor",
        "user"."id"
      FROM "doctor_profiles" "profile"
      INNER JOIN "users" "user" ON "user"."id" = "profile"."user_id"
      WHERE "user"."role" = 'doctor'
        AND "user"."approval_status" = 'approved'
        AND NOT EXISTS (
          SELECT 1
          FROM "doctors" "doctor"
          WHERE "doctor"."source_user_id" = "user"."id"
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "doctors"`);
  }
}
