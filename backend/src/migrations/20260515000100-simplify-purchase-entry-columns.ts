import type { MigrationInterface, QueryRunner } from 'typeorm';

export class SimplifyPurchaseEntryColumns20260515000100 implements MigrationInterface {
  name = 'SimplifyPurchaseEntryColumns20260515000100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "purchase_orders" DROP COLUMN IF EXISTS "invoiceNumber"`);
    await queryRunner.query(`ALTER TABLE "purchase_orders" DROP COLUMN IF EXISTS "paymentStatus"`);
    await queryRunner.query(`ALTER TABLE "purchase_orders" DROP COLUMN IF EXISTS "gstNumber"`);
    await queryRunner.query(`ALTER TABLE "purchase_orders" DROP COLUMN IF EXISTS "subtotal"`);
    await queryRunner.query(`ALTER TABLE "purchase_orders" DROP COLUMN IF EXISTS "tax"`);
    await queryRunner.query(`ALTER TABLE "purchase_orders" DROP COLUMN IF EXISTS "total"`);

    await queryRunner.query(`ALTER TABLE "purchase_order_items" DROP COLUMN IF EXISTS "quantity"`);
    await queryRunner.query(`ALTER TABLE "purchase_order_items" DROP COLUMN IF EXISTS "unitPrice"`);
    await queryRunner.query(`ALTER TABLE "purchase_order_items" DROP COLUMN IF EXISTS "sellingPrice"`);
    await queryRunner.query(`ALTER TABLE "purchase_order_items" DROP COLUMN IF EXISTS "tax"`);
    await queryRunner.query(`ALTER TABLE "purchase_order_items" DROP COLUMN IF EXISTS "batchNumber"`);
    await queryRunner.query(`ALTER TABLE "purchase_order_items" DROP COLUMN IF EXISTS "expiryDate"`);
    await queryRunner.query(`ALTER TABLE "purchase_order_items" DROP COLUMN IF EXISTS "total"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "invoiceNumber" varchar(40)`);
    await queryRunner.query(`ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "paymentStatus" varchar(24) NOT NULL DEFAULT 'Pending'`);
    await queryRunner.query(`ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "gstNumber" varchar(40)`);
    await queryRunner.query(`ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "subtotal" numeric(12,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "tax" numeric(12,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "total" numeric(12,2) NOT NULL DEFAULT 0`);

    await queryRunner.query(`ALTER TABLE "purchase_order_items" ADD COLUMN IF NOT EXISTS "quantity" int NOT NULL DEFAULT 1`);
    await queryRunner.query(`ALTER TABLE "purchase_order_items" ADD COLUMN IF NOT EXISTS "unitPrice" numeric(12,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "purchase_order_items" ADD COLUMN IF NOT EXISTS "sellingPrice" numeric(12,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "purchase_order_items" ADD COLUMN IF NOT EXISTS "tax" numeric(5,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "purchase_order_items" ADD COLUMN IF NOT EXISTS "batchNumber" varchar(100)`);
    await queryRunner.query(`ALTER TABLE "purchase_order_items" ADD COLUMN IF NOT EXISTS "expiryDate" date`);
    await queryRunner.query(`ALTER TABLE "purchase_order_items" ADD COLUMN IF NOT EXISTS "total" numeric(12,2) NOT NULL DEFAULT 0`);
  }
}
