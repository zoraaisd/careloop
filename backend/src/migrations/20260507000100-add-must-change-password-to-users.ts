import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMustChangePasswordToUsers20260507000100 implements MigrationInterface {
  name = 'AddMustChangePasswordToUsers20260507000100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "must_change_password" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "must_change_password"
    `);
  }
}
