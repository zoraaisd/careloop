import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInventoryRestockHistory20260515000400 implements MigrationInterface {
  name = 'AddInventoryRestockHistory20260515000400';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "restockHistory" jsonb NOT NULL DEFAULT '[]'::jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "inventory_items" DROP COLUMN IF EXISTS "restockHistory"`,
    );
  }
}
