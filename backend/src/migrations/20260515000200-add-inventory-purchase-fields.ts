import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInventoryPurchaseFields20260515000200 implements MigrationInterface {
  name = 'AddInventoryPurchaseFields20260515000200';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "invoiceNumber" varchar(40)`);
    await queryRunner.query(`ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "paymentStatus" varchar(24) NOT NULL DEFAULT 'Pending'`);
    await queryRunner.query(`ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "gstNumber" varchar(40)`);
    await queryRunner.query(`ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "subtotal" numeric(12,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "taxAmount" numeric(12,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "totalAmount" numeric(12,2) NOT NULL DEFAULT 0`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "inventory_items" DROP COLUMN IF EXISTS "totalAmount"`);
    await queryRunner.query(`ALTER TABLE "inventory_items" DROP COLUMN IF EXISTS "taxAmount"`);
    await queryRunner.query(`ALTER TABLE "inventory_items" DROP COLUMN IF EXISTS "subtotal"`);
    await queryRunner.query(`ALTER TABLE "inventory_items" DROP COLUMN IF EXISTS "gstNumber"`);
    await queryRunner.query(`ALTER TABLE "inventory_items" DROP COLUMN IF EXISTS "paymentStatus"`);
    await queryRunner.query(`ALTER TABLE "inventory_items" DROP COLUMN IF EXISTS "invoiceNumber"`);
  }
}
