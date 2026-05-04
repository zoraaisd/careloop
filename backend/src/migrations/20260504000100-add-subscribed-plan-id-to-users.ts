import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubscribedPlanIdToUsers20260504000100 implements MigrationInterface {
  name = 'AddSubscribedPlanIdToUsers20260504000100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "subscribed_plan_id" varchar;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "subscribed_plan_id";
    `);
  }
}
