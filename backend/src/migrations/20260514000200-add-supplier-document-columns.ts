import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSupplierDocumentColumns20260514000200
  implements MigrationInterface
{
  name = 'AddSupplierDocumentColumns20260514000200';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "license_document_name" varchar(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "license_document_file_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "license_document_url" varchar(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "id_proof_document_name" varchar(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "id_proof_document_file_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "id_proof_document_url" varchar(255)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "suppliers" DROP COLUMN IF EXISTS "id_proof_document_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" DROP COLUMN IF EXISTS "id_proof_document_file_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" DROP COLUMN IF EXISTS "id_proof_document_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" DROP COLUMN IF EXISTS "license_document_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" DROP COLUMN IF EXISTS "license_document_file_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "suppliers" DROP COLUMN IF EXISTS "license_document_name"`,
    );
  }
}
