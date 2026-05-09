import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddJsonStoragePostgresTables20260509000100 implements MigrationInterface {
  name = 'AddJsonStoragePostgresTables20260509000100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "signup_otps" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "key" varchar(320) NOT NULL,
        "name" varchar(120) NOT NULL,
        "email" varchar(320) NOT NULL,
        "phone" varchar(32) NOT NULL,
        "role" "public"."users_role_enum" NOT NULL,
        "otp_hash" varchar(128) NOT NULL,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "requested_at" TIMESTAMPTZ NOT NULL,
        "attempts" integer NOT NULL DEFAULT '0',
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_signup_otps_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_signup_otps_key" UNIQUE ("key")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "password_reset_otps" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" varchar(320) NOT NULL,
        "otp_hash" varchar(128) NOT NULL,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "requested_at" TIMESTAMPTZ NOT NULL,
        "attempts" integer NOT NULL DEFAULT '0',
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_password_reset_otps_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_password_reset_otps_email" UNIQUE ("email")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "doctor_dashboard_states" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "doctor_id" varchar(100) NOT NULL,
        "state_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "migrated_from_file" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_doctor_dashboard_states_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_doctor_dashboard_states_doctor_id" UNIQUE ("doctor_id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "doctor_dashboard_states"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "password_reset_otps"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "signup_otps"`);
  }
}
