import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPurchaseEntryFields20260513000600 implements MigrationInterface {
  name = 'AddPurchaseEntryFields20260513000600';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "invoiceNumber" varchar(40)`);
    await queryRunner.query(`ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "paymentStatus" varchar(24) NOT NULL DEFAULT 'Pending'`);
    await queryRunner.query(`ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "notes" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "purchase_orders" DROP COLUMN IF EXISTS "notes"`);
    await queryRunner.query(`ALTER TABLE "purchase_orders" DROP COLUMN IF EXISTS "paymentStatus"`);
    await queryRunner.query(`ALTER TABLE "purchase_orders" DROP COLUMN IF EXISTS "invoiceNumber"`);
  }
}
