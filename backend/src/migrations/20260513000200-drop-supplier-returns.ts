import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropSupplierReturns20260513000200 implements MigrationInterface {
  name = 'DropSupplierReturns20260513000200';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "returns"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "returns" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "returnNumber" varchar(40) NOT NULL,
        "supplierId" uuid NOT NULL,
        "supplierName" varchar(160) NOT NULL,
        "poId" uuid,
        "reference" varchar(80),
        "returnDate" date NOT NULL,
        "productName" varchar(160) NOT NULL,
        "quantity" int NOT NULL DEFAULT 1,
        "reason" varchar(120) NOT NULL,
        "status" varchar(24) NOT NULL DEFAULT 'Requested',
        "type" varchar(24) NOT NULL DEFAULT 'Returns',
        "clinicId" varchar(100),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_returns_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_returns_returnNumber" UNIQUE ("returnNumber")
      )
    `);
  }
}
