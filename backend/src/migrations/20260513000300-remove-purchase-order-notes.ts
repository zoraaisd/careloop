import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemovePurchaseOrderNotes20260513000300 implements MigrationInterface {
  name = 'RemovePurchaseOrderNotes20260513000300';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "purchase_orders" DROP COLUMN IF EXISTS "internalNotes"`);
    await queryRunner.query(`ALTER TABLE "purchase_orders" DROP COLUMN IF EXISTS "supplierNotes"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "internalNotes" text`);
    await queryRunner.query(`ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "supplierNotes" text`);
  }
}
