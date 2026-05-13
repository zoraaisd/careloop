import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExpenseScopeColumns20260513000100 implements MigrationInterface {
  name = 'AddExpenseScopeColumns20260513000100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "expense_activities"
      ADD COLUMN IF NOT EXISTS "clinicId" varchar(100)
    `);

    await queryRunner.query(`
      ALTER TABLE "expense_activities"
      ADD COLUMN IF NOT EXISTS "created_by_doctor_id" uuid
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_expense_activities_clinic_id"
      ON "expense_activities" ("clinicId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_expense_activities_created_by_doctor_id"
      ON "expense_activities" ("created_by_doctor_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_expense_activities_created_by_doctor_id"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_expense_activities_clinic_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "expense_activities"
      DROP COLUMN IF EXISTS "created_by_doctor_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "expense_activities"
      DROP COLUMN IF EXISTS "clinicId"
    `);
  }
}
