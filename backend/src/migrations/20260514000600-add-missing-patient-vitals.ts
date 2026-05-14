import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingPatientVitals20260514000600
  implements MigrationInterface
{
  name = 'AddMissingPatientVitals20260514000600';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "temp" varchar(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "cholesterol" varchar(20)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "patients" DROP COLUMN IF EXISTS "cholesterol"`,
    );
    await queryRunner.query(
      `ALTER TABLE "patients" DROP COLUMN IF EXISTS "temp"`,
    );
  }
}
