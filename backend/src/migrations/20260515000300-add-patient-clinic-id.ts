import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPatientClinicId20260515000300 implements MigrationInterface {
  name = 'AddPatientClinicId20260515000300';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "patients"
      ADD COLUMN IF NOT EXISTS "clinic_id" varchar(100)
    `);

    await queryRunner.query(`
      UPDATE "patients" AS patient
      SET "clinic_id" = profile."clinic_id"
      FROM "doctor_profiles" AS profile
      WHERE profile."user_id" = patient."primary_doctor_id"
        AND patient."clinic_id" IS NULL
        AND profile."clinic_id" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_patients_phone_clinic_id"
      ON "patients" ("phone", "clinic_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_patients_phone_clinic_id"`);
    await queryRunner.query(`ALTER TABLE "patients" DROP COLUMN IF EXISTS "clinic_id"`);
  }
}
