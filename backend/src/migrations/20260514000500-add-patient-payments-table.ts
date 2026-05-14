import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPatientPaymentsTable20260514000500
  implements MigrationInterface
{
  name = 'AddPatientPaymentsTable20260514000500';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type
          WHERE typname = 'patient_payments_paymentmethod_enum'
        ) THEN
          CREATE TYPE "patient_payments_paymentmethod_enum" AS ENUM ('card', 'upi', 'cash');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "patient_payments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "patient_id" uuid NOT NULL,
        "doctor_id" uuid NOT NULL,
        "amount" numeric(12,2) NOT NULL DEFAULT 0,
        "consultationFee" numeric(12,2) NOT NULL DEFAULT 0,
        "patientFee" numeric(12,2) NOT NULL DEFAULT 0,
        "paymentMethod" "patient_payments_paymentmethod_enum" NOT NULL DEFAULT 'cash',
        "notes" text,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_patient_payments_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_patient_payments_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_patient_payments_doctor" FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_patient_payments_patient_id"
      ON "patient_payments" ("patient_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_patient_payments_doctor_id"
      ON "patient_payments" ("doctor_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_patient_payments_doctor_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_patient_payments_patient_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "patient_payments"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "patient_payments_paymentmethod_enum"`,
    );
  }
}
