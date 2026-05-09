import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateInventoryTable20260508000100 implements MigrationInterface {
    name = 'UpdateInventoryTable20260508000100'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Ensure the table exists
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "inventory_items" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "itemName" varchar(120) NOT NULL,
                "category" varchar(80) NOT NULL,
                "quantity" integer NOT NULL,
                "unit" varchar(32) NOT NULL,
                "createdAt" timestamptz NOT NULL DEFAULT now(),
                "updatedAt" timestamptz NOT NULL DEFAULT now(),
                CONSTRAINT "PK_inventory_items_id" PRIMARY KEY ("id")
            );
        `);

        // Add missing columns
        const columns = [
            { name: 'sku', type: 'varchar(50)', nullable: true },
            { name: 'medicineType', type: 'varchar(80)', nullable: true },
            { name: 'strengthComposition', type: 'varchar(120)', nullable: true },
            { name: 'barcodeQrCode', type: 'varchar(120)', nullable: true },
            { name: 'storageType', type: 'varchar(80)', nullable: true },
            { name: 'prescriptionRequired', type: 'boolean', default: 'false' },
            { name: 'gstTax', type: 'numeric(5,2)', default: '0' },
            { name: 'purchasePrice', type: 'numeric(12,2)', default: '0' },
            { name: 'sellingPrice', type: 'numeric(12,2)', default: '0' },
            { name: 'minimumStockLevel', type: 'integer', default: '0' },
            { name: 'reorderLevel', type: 'integer', default: '0' },
            { name: 'isActive', type: 'boolean', default: 'true' },
            { name: 'storageArea', type: 'varchar(100)', nullable: true },
            { name: 'rackShelf', type: 'varchar(100)', nullable: true },
            { name: 'row', type: 'varchar(50)', nullable: true },
            { name: 'column', type: 'varchar(50)', nullable: true },
            { name: 'boxBinNumber', type: 'varchar(100)', nullable: true },
            { name: 'slotPosition', type: 'varchar(100)', nullable: true },
            { name: 'notes', type: 'text', nullable: true },
            { name: 'vendor', type: 'varchar(120)', nullable: true },
            { name: 'clinicId', type: 'varchar(100)', nullable: true }
        ];

        for (const col of columns) {
            const hasColumn = await queryRunner.hasColumn('inventory_items', col.name);
            if (!hasColumn) {
                let query = `ALTER TABLE "inventory_items" ADD "${col.name}" ${col.type}`;
                if (col.default !== undefined) {
                    query += ` DEFAULT ${col.default}`;
                }
                await queryRunner.query(query);
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Not implemented for this recovery migration
    }
}
