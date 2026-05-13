import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSupplierManagement20260513000100 implements MigrationInterface {
  name = 'AddSupplierManagement20260513000100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "suppliers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "supplierCode" varchar(40) NOT NULL,
        "supplierName" varchar(160) NOT NULL,
        "companyName" varchar(160),
        "category" varchar(80) NOT NULL,
        "licenseNumber" varchar(80),
        "contactPerson" varchar(120),
        "phone" varchar(32),
        "email" varchar(160),
        "alternatePhone" varchar(32),
        "addressLine1" varchar(200),
        "city" varchar(80),
        "state" varchar(80),
        "country" varchar(80),
        "pincode" varchar(20),
        "status" varchar(24) NOT NULL DEFAULT 'Active',
        "rating" numeric(3,1) NOT NULL DEFAULT 4.5,
        "clinicId" varchar(100),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_suppliers_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "purchase_orders" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "poNumber" varchar(40) NOT NULL,
        "supplierId" uuid NOT NULL,
        "supplierName" varchar(160) NOT NULL,
        "orderDate" date NOT NULL,
        "invoiceNumber" varchar(40),
        "paymentStatus" varchar(24) NOT NULL DEFAULT 'Pending',
        "gstNumber" varchar(40),
        "subtotal" numeric(12,2) NOT NULL DEFAULT 0,
        "tax" numeric(12,2) NOT NULL DEFAULT 0,
        "total" numeric(12,2) NOT NULL DEFAULT 0,
        "status" varchar(24) NOT NULL DEFAULT 'Draft',
        "notes" text,
        "clinicId" varchar(100),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_purchase_orders_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_purchase_orders_poNumber" UNIQUE ("poNumber")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "purchase_order_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "poId" uuid NOT NULL,
        "productName" varchar(160) NOT NULL,
        "category" varchar(80) NOT NULL,
        "quantity" int NOT NULL DEFAULT 1,
        "unitPrice" numeric(12,2) NOT NULL DEFAULT 0,
        "tax" numeric(5,2) NOT NULL DEFAULT 0,
        "total" numeric(12,2) NOT NULL DEFAULT 0,
        CONSTRAINT "PK_purchase_order_items_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "invoices" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "invoiceNumber" varchar(40) NOT NULL,
        "supplierId" uuid NOT NULL,
        "supplierName" varchar(160) NOT NULL,
        "poId" uuid,
        "poNumber" varchar(40),
        "invoiceDate" date NOT NULL,
        "dueDate" date NOT NULL,
        "amount" numeric(12,2) NOT NULL DEFAULT 0,
        "paidAmount" numeric(12,2) NOT NULL DEFAULT 0,
        "balance" numeric(12,2) NOT NULL DEFAULT 0,
        "status" varchar(24) NOT NULL DEFAULT 'Pending',
        "clinicId" varchar(100),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_invoices_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_invoices_invoiceNumber" UNIQUE ("invoiceNumber")
      )
    `);

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "invoices"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "purchase_order_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "purchase_orders"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "suppliers"`);
  }
}
