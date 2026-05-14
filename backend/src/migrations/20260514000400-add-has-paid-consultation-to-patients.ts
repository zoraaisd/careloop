import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHasPaidConsultationToPatients20260514000400
  implements MigrationInterface
{
  name = 'AddHasPaidConsultationToPatients20260514000400';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "hasPaidConsultation" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "patients" DROP COLUMN IF EXISTS "hasPaidConsultation"`,
    );
  }
}
