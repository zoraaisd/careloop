import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdatePurchaseEntryGstTax20260513000500 implements MigrationInterface {
  name = 'UpdatePurchaseEntryGstTax20260513000500';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "purchase_orders" DROP COLUMN IF EXISTS "deliveryDate"`);
    await queryRunner.query(`ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "gstNumber" varchar(40)`);
    await queryRunner.query(`ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "tax" numeric(12,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "purchase_order_items" ADD COLUMN IF NOT EXISTS "tax" numeric(5,2) NOT NULL DEFAULT 0`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "purchase_order_items" DROP COLUMN IF EXISTS "tax"`);
    await queryRunner.query(`ALTER TABLE "purchase_orders" DROP COLUMN IF EXISTS "tax"`);
    await queryRunner.query(`ALTER TABLE "purchase_orders" DROP COLUMN IF EXISTS "gstNumber"`);
    await queryRunner.query(`ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "deliveryDate" date`);
  }
}
