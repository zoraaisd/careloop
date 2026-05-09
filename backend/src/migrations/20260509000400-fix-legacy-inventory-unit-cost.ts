import type { MigrationInterface, QueryRunner } from 'typeorm';

export class FixLegacyInventoryUnitCost20260509000400 implements MigrationInterface {
  name = 'FixLegacyInventoryUnitCost20260509000400';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasUnitCost = await queryRunner.hasColumn('inventory_items', 'unitCost');

    if (!hasUnitCost) {
      await queryRunner.query(
        `ALTER TABLE "inventory_items" ADD "unitCost" numeric(12,2) NOT NULL DEFAULT 0`,
      );
      return;
    }

    await queryRunner.query(
      `ALTER TABLE "inventory_items" ALTER COLUMN "unitCost" SET DEFAULT 0`,
    );
    await queryRunner.query(
      `UPDATE "inventory_items" SET "unitCost" = COALESCE("unitCost", "purchasePrice", 0)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasUnitCost = await queryRunner.hasColumn('inventory_items', 'unitCost');

    if (hasUnitCost) {
      await queryRunner.query(
        `ALTER TABLE "inventory_items" ALTER COLUMN "unitCost" DROP DEFAULT`,
      );
    }
  }
}
