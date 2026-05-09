import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingInventoryColumns20260509000300 implements MigrationInterface {
  name = 'AddMissingInventoryColumns20260509000300';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const missingColumns = [
      { name: 'batchNumber', type: 'varchar(100)' },
      { name: 'expiryDate', type: 'date' },
    ];

    for (const column of missingColumns) {
      const hasColumn = await queryRunner.hasColumn('inventory_items', column.name);
      if (!hasColumn) {
        await queryRunner.query(
          `ALTER TABLE "inventory_items" ADD "${column.name}" ${column.type}`,
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const removableColumns = ['expiryDate', 'batchNumber'];

    for (const column of removableColumns) {
      const hasColumn = await queryRunner.hasColumn('inventory_items', column);
      if (hasColumn) {
        await queryRunner.query(
          `ALTER TABLE "inventory_items" DROP COLUMN "${column}"`,
        );
      }
    }
  }
}
