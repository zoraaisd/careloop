import type { MigrationInterface, QueryRunner } from 'typeorm';

export class StoreUploadedFilesInPostgres20260509000600
  implements MigrationInterface
{
  name = 'StoreUploadedFilesInPostgres20260509000600';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "uploaded_files" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "file_name" varchar(255) NOT NULL,
        "mime_type" varchar(150) NOT NULL,
        "file_size" bigint NOT NULL,
        "file_data" bytea NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_uploaded_files_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "patient_documents" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "patient_id" uuid NOT NULL,
        "doctor_id" uuid NOT NULL,
        "file_name" varchar(255) NOT NULL,
        "file_url" varchar(255) NOT NULL,
        "file_id" uuid NULL,
        "file_type" varchar(150) NOT NULL,
        "file_size" bigint NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_patient_documents_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "patient_documents" ADD COLUMN IF NOT EXISTS "file_name" varchar(255) NOT NULL DEFAULT ''
    `);
    await queryRunner.query(`
      ALTER TABLE "patient_documents" ADD COLUMN IF NOT EXISTS "file_url" varchar(255) NOT NULL DEFAULT ''
    `);
    await queryRunner.query(`
      ALTER TABLE "patient_documents" ADD COLUMN IF NOT EXISTS "file_id" uuid NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "patient_documents" ADD COLUMN IF NOT EXISTS "file_type" varchar(150) NOT NULL DEFAULT 'application/octet-stream'
    `);
    await queryRunner.query(`
      ALTER TABLE "patient_documents" ADD COLUMN IF NOT EXISTS "file_size" bigint NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_patient_documents_file_id'
            AND table_name = 'patient_documents'
        ) THEN
          ALTER TABLE "patient_documents"
          ADD CONSTRAINT "FK_patient_documents_file_id"
          FOREIGN KEY ("file_id") REFERENCES "uploaded_files"("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_patient_documents_patient_id"
      ON "patient_documents" ("patient_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_patient_documents_doctor_id"
      ON "patient_documents" ("doctor_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "attachment_file_id" uuid NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "attachment_type" varchar(150) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "attachment_size" bigint NULL
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_support_tickets_attachment_file_id'
            AND table_name = 'support_tickets'
        ) THEN
          ALTER TABLE "support_tickets"
          ADD CONSTRAINT "FK_support_tickets_attachment_file_id"
          FOREIGN KEY ("attachment_file_id") REFERENCES "uploaded_files"("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "support_tickets" DROP CONSTRAINT IF EXISTS "FK_support_tickets_attachment_file_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "support_tickets" DROP COLUMN IF EXISTS "attachment_size"
    `);
    await queryRunner.query(`
      ALTER TABLE "support_tickets" DROP COLUMN IF EXISTS "attachment_type"
    `);
    await queryRunner.query(`
      ALTER TABLE "support_tickets" DROP COLUMN IF EXISTS "attachment_file_id"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_patient_documents_doctor_id"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_patient_documents_patient_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "patient_documents" DROP CONSTRAINT IF EXISTS "FK_patient_documents_file_id"
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS "patient_documents"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "uploaded_files"`);
  }
}
