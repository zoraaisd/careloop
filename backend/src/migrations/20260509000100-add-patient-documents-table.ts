import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPatientDocumentsTable20260509000100
  implements MigrationInterface
{
  name = 'AddPatientDocumentsTable20260509000100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "patient_documents" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "patient_id" uuid NOT NULL,
        "doctor_id" uuid NOT NULL,
        "file_name" varchar NOT NULL,
        "file_url" varchar NOT NULL,
        "file_type" varchar NOT NULL,
        "file_size" bigint NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_patient_documents_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_patient_documents_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_patient_documents_doctor" FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_patient_documents_patient_id"
      ON "patient_documents" ("patient_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_patient_documents_doctor_id"
      ON "patient_documents" ("doctor_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_patient_documents_doctor_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_patient_documents_patient_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "patient_documents"`);
  }
}
