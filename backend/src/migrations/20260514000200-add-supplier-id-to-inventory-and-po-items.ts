import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSupplierIdToInventoryAndPoItems1715664000000 implements MigrationInterface {
    name = 'AddSupplierIdToInventoryAndPoItems1715664000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "inventory_items" ADD "supplier_id" uuid`);
        await queryRunner.query(`ALTER TABLE "purchase_order_items" ADD "supplier_id" uuid`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "purchase_order_items" DROP COLUMN "supplier_id"`);
        await queryRunner.query(`ALTER TABLE "inventory_items" DROP COLUMN "supplier_id"`);
    }
}
