import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdminPersistenceTables20260509000200
  implements MigrationInterface
{
  name = 'AddAdminPersistenceTables20260509000200';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "admin_profiles" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "organization_name" varchar(150) NOT NULL,
        "location" varchar(255) NOT NULL,
        "profile_image_url" varchar(500),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_admin_profiles_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_admin_profiles_user_id" UNIQUE ("user_id"),
        CONSTRAINT "FK_admin_profiles_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "admin_subscription_plans" (
        "id" varchar(100) NOT NULL,
        "name" varchar(120) NOT NULL,
        "description" varchar(255) NOT NULL,
        "price" numeric(12,2) NOT NULL,
        "currency" varchar(10) NOT NULL DEFAULT 'INR',
        "billing_cycle" varchar(16) NOT NULL,
        "doctors_limit" integer NOT NULL,
        "patients_limit" integer NOT NULL,
        "whatsapp_limit" integer NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'Active',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_admin_subscription_plans_id" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_admin_subscription_plans_name"
      ON "admin_subscription_plans" ("name");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "admin_clinic_records" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "clinic_name" varchar(150) NOT NULL,
        "owner_name" varchar(120) NOT NULL,
        "address" varchar(255) NOT NULL,
        "city" varchar(120) NOT NULL,
        "contact" varchar(20) NOT NULL,
        "email" varchar(150),
        "subscription_plan" varchar(80) NOT NULL,
        "doctors" integer NOT NULL DEFAULT 0,
        "patients" integer NOT NULL DEFAULT 0,
        "status" varchar(30) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_admin_clinic_records_id" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "admin_clinic_requests" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "clinic_id" varchar(100),
        "clinic_name" varchar(150) NOT NULL,
        "city" varchar(120) NOT NULL,
        "owner_name" varchar(120) NOT NULL,
        "requested_on" date NOT NULL,
        "status" varchar(30) NOT NULL,
        "contact" varchar(20),
        "email" varchar(150),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_admin_clinic_requests_id" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "admin_subscription_records" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "clinic_id" varchar(100) NOT NULL,
        "clinic_name" varchar(150) NOT NULL,
        "plan_id" varchar(100) NOT NULL,
        "plan_name" varchar(120) NOT NULL,
        "status" varchar(20) NOT NULL,
        "start_date" date NOT NULL,
        "end_date" date NOT NULL,
        "amount" numeric(12,2) NOT NULL DEFAULT 0,
        "currency" varchar(10) NOT NULL DEFAULT 'INR',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_admin_subscription_records_id" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_admin_subscription_records_clinic_id"
      ON "admin_subscription_records" ("clinic_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "admin_payment_records" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "clinic_id" varchar(100) NOT NULL,
        "clinic_name" varchar(150) NOT NULL,
        "plan_id" varchar(100) NOT NULL,
        "plan_name" varchar(120) NOT NULL,
        "amount" numeric(12,2) NOT NULL DEFAULT 0,
        "currency" varchar(10) NOT NULL DEFAULT 'INR',
        "paid_on" date NOT NULL,
        "status" varchar(20) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_admin_payment_records_id" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_admin_payment_records_clinic_id"
      ON "admin_payment_records" ("clinic_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "support_ticket_responses" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "ticket_id" uuid NOT NULL,
        "method" varchar(20) NOT NULL,
        "message" text NOT NULL,
        "attachment_name" varchar(255),
        "responded_by" varchar(150) NOT NULL,
        "responded_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_support_ticket_responses_id" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_support_ticket_responses_ticket_id"
      ON "support_ticket_responses" ("ticket_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_support_ticket_responses_ticket_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "support_ticket_responses"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_admin_payment_records_clinic_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "admin_payment_records"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_admin_subscription_records_clinic_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "admin_subscription_records"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "admin_clinic_requests"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "admin_clinic_records"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_admin_subscription_plans_name"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "admin_subscription_plans"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "admin_profiles"`);
  }
}
