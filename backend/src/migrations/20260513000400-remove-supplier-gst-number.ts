import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveSupplierGstNumber20260513000400 implements MigrationInterface {
  name = 'RemoveSupplierGstNumber20260513000400';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "suppliers" DROP COLUMN IF EXISTS "gstNumber"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "gstNumber" varchar(40)`);
  }
}
