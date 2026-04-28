import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDoctorCouncilFields20260427000100 implements MigrationInterface {
  name = 'AddDoctorCouncilFields20260427000100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "doctor_profiles"
      ADD COLUMN IF NOT EXISTS "medical_council_board" varchar(160),
      ADD COLUMN IF NOT EXISTS "council_registered_name" varchar(120),
      ADD COLUMN IF NOT EXISTS "date_of_birth" date;
    `);

    await queryRunner.query(`
      UPDATE "doctor_profiles"
      SET
        "medical_council_board" = COALESCE("medical_council_board", ''),
        "council_registered_name" = COALESCE("council_registered_name", ''),
        "date_of_birth" = COALESCE("date_of_birth", DATE '2000-01-01');
    `);

    await queryRunner.query(`
      ALTER TABLE "doctor_profiles"
      ALTER COLUMN "medical_council_board" SET NOT NULL,
      ALTER COLUMN "council_registered_name" SET NOT NULL,
      ALTER COLUMN "date_of_birth" SET NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "doctor_profiles"
      DROP COLUMN IF EXISTS "date_of_birth",
      DROP COLUMN IF EXISTS "council_registered_name",
      DROP COLUMN IF EXISTS "medical_council_board";
    `);
  }
}
