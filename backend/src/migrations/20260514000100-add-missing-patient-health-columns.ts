import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingPatientHealthColumns20260514000100
  implements MigrationInterface
{
  name = 'AddMissingPatientHealthColumns20260514000100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "weight" varchar(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "height" varchar(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "bp" varchar(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "sugar" varchar(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "healthProblem" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "allergies" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "chronicDiseases" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "pastSurgeries" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "previousTreatments" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "patients" DROP COLUMN IF EXISTS "previousTreatments"`,
    );
    await queryRunner.query(
      `ALTER TABLE "patients" DROP COLUMN IF EXISTS "pastSurgeries"`,
    );
    await queryRunner.query(
      `ALTER TABLE "patients" DROP COLUMN IF EXISTS "chronicDiseases"`,
    );
    await queryRunner.query(
      `ALTER TABLE "patients" DROP COLUMN IF EXISTS "allergies"`,
    );
    await queryRunner.query(
      `ALTER TABLE "patients" DROP COLUMN IF EXISTS "healthProblem"`,
    );
    await queryRunner.query(
      `ALTER TABLE "patients" DROP COLUMN IF EXISTS "sugar"`,
    );
    await queryRunner.query(
      `ALTER TABLE "patients" DROP COLUMN IF EXISTS "bp"`,
    );
    await queryRunner.query(
      `ALTER TABLE "patients" DROP COLUMN IF EXISTS "height"`,
    );
    await queryRunner.query(
      `ALTER TABLE "patients" DROP COLUMN IF EXISTS "weight"`,
    );
  }
}
