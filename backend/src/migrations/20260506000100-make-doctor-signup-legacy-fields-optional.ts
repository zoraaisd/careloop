import type { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeDoctorSignupLegacyFieldsOptional20260506000100 implements MigrationInterface {
  name = 'MakeDoctorSignupLegacyFieldsOptional20260506000100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "doctor_profiles"
      ALTER COLUMN "medical_registration_number" DROP NOT NULL,
      ALTER COLUMN "medical_council_board" DROP NOT NULL,
      ALTER COLUMN "council_registered_name" DROP NOT NULL,
      ALTER COLUMN "date_of_birth" DROP NOT NULL,
      ALTER COLUMN "consultation_fees" SET DEFAULT 0;
    `);

    await queryRunner.query(`
      UPDATE "doctor_profiles"
      SET "consultation_fees" = 0
      WHERE "consultation_fees" IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "doctor_profiles"
      ALTER COLUMN "medical_registration_number" SET NOT NULL,
      ALTER COLUMN "medical_council_board" SET NOT NULL,
      ALTER COLUMN "council_registered_name" SET NOT NULL,
      ALTER COLUMN "date_of_birth" SET NOT NULL,
      ALTER COLUMN "consultation_fees" DROP DEFAULT;
    `);
  }
}
