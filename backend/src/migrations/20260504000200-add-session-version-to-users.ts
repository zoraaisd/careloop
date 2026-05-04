import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSessionVersionToUsers20260504000200 implements MigrationInterface {
  name = 'AddSessionVersionToUsers20260504000200';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "session_version" integer NOT NULL DEFAULT 0;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "session_version";
    `);
  }
}
