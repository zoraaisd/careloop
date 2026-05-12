import type { MigrationInterface, QueryRunner } from "typeorm";

export class FixSupportTicketsColumns1778566294928 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "support_tickets" 
            ADD COLUMN IF NOT EXISTS "attachment_url" varchar(500),
            ADD COLUMN IF NOT EXISTS "attachment_name" varchar(255)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "support_tickets" 
            DROP COLUMN IF EXISTS "attachment_name",
            DROP COLUMN IF EXISTS "attachment_url"
        `);
    }

}
