import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPurchaseOrderItemProductFields20260514000300 implements MigrationInterface {
  name = 'AddPurchaseOrderItemProductFields20260514000300';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "purchase_order_items" ADD COLUMN IF NOT EXISTS "inventoryItemId" uuid`);
    await queryRunner.query(`ALTER TABLE "purchase_order_items" ADD COLUMN IF NOT EXISTS "sku" varchar(50)`);
    await queryRunner.query(`ALTER TABLE "purchase_order_items" ADD COLUMN IF NOT EXISTS "unit" varchar(32)`);
    await queryRunner.query(`ALTER TABLE "purchase_order_items" ADD COLUMN IF NOT EXISTS "sellingPrice" numeric(12,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "purchase_order_items" ADD COLUMN IF NOT EXISTS "batchNumber" varchar(100)`);
    await queryRunner.query(`ALTER TABLE "purchase_order_items" ADD COLUMN IF NOT EXISTS "expiryDate" date`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "purchase_order_items" DROP COLUMN IF EXISTS "expiryDate"`);
    await queryRunner.query(`ALTER TABLE "purchase_order_items" DROP COLUMN IF EXISTS "batchNumber"`);
    await queryRunner.query(`ALTER TABLE "purchase_order_items" DROP COLUMN IF EXISTS "sellingPrice"`);
    await queryRunner.query(`ALTER TABLE "purchase_order_items" DROP COLUMN IF EXISTS "unit"`);
    await queryRunner.query(`ALTER TABLE "purchase_order_items" DROP COLUMN IF EXISTS "sku"`);
    await queryRunner.query(`ALTER TABLE "purchase_order_items" DROP COLUMN IF EXISTS "inventoryItemId"`);
  }
}
