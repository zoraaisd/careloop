import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDoctorOnboardingFlow20260424000100 implements MigrationInterface {
  name = 'AddDoctorOnboardingFlow20260424000100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'doctor_approval_status_enum') THEN
          CREATE TYPE "doctor_approval_status_enum" AS ENUM ('pending', 'approved', 'rejected');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status_enum') THEN
          CREATE TYPE "subscription_status_enum" AS ENUM ('inactive', 'active');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "approval_status" "doctor_approval_status_enum" NOT NULL DEFAULT 'approved',
      ADD COLUMN IF NOT EXISTS "trial_started_at" timestamptz,
      ADD COLUMN IF NOT EXISTS "trial_ends_at" timestamptz,
      ADD COLUMN IF NOT EXISTS "subscription_status" "subscription_status_enum" NOT NULL DEFAULT 'inactive';
    `);

    await queryRunner.query(`
      UPDATE "users"
      SET
        "approval_status" = CASE WHEN "role" = 'doctor' THEN 'pending'::doctor_approval_status_enum ELSE 'approved'::doctor_approval_status_enum END,
        "subscription_status" = CASE WHEN "role" = 'doctor' THEN 'inactive'::subscription_status_enum ELSE 'active'::subscription_status_enum END,
        "trial_started_at" = CASE WHEN "role" = 'doctor' AND "trial_started_at" IS NULL THEN NOW() ELSE "trial_started_at" END,
        "trial_ends_at" = CASE WHEN "role" = 'doctor' AND "trial_ends_at" IS NULL THEN NOW() + INTERVAL '15 days' ELSE "trial_ends_at" END
      WHERE "role" IN ('doctor', 'patient', 'admin');
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "doctor_profiles" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "specialization" varchar(120) NOT NULL,
        "experience" integer NOT NULL,
        "qualification" varchar(180) NOT NULL,
        "medical_registration_number" varchar(120) NOT NULL,
        "clinic_name" varchar(160) NOT NULL,
        "clinic_address" varchar(255) NOT NULL,
        "city" varchar(120) NOT NULL,
        "consultation_fees" numeric(12,2) NOT NULL,
        "available_days" text[] NOT NULL DEFAULT '{}',
        "available_time_slots" text[] NOT NULL DEFAULT '{}',
        "about_doctor" text,
        "profile_image_url" varchar(255),
        "certificate_url" varchar(255),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_doctor_profiles_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_doctor_profiles_user_id" UNIQUE ("user_id"),
        CONSTRAINT "FK_doctor_profiles_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "doctor_profiles"`);
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "subscription_status",
      DROP COLUMN IF EXISTS "trial_ends_at",
      DROP COLUMN IF EXISTS "trial_started_at",
      DROP COLUMN IF EXISTS "approval_status";
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS "subscription_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "doctor_approval_status_enum"`);
  }
}
