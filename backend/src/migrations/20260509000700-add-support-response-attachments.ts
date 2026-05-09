import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSupportResponseAttachments20260509000700
  implements MigrationInterface
{
  name = 'AddSupportResponseAttachments20260509000700';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "support_ticket_responses"
      ADD COLUMN IF NOT EXISTS "attachment_url" varchar(500) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "support_ticket_responses"
      ADD COLUMN IF NOT EXISTS "attachment_file_id" uuid NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "support_ticket_responses"
      ADD COLUMN IF NOT EXISTS "attachment_type" varchar(150) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "support_ticket_responses"
      ADD COLUMN IF NOT EXISTS "attachment_size" bigint NULL
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_support_ticket_responses_attachment_file_id'
            AND table_name = 'support_ticket_responses'
        ) THEN
          ALTER TABLE "support_ticket_responses"
          ADD CONSTRAINT "FK_support_ticket_responses_attachment_file_id"
          FOREIGN KEY ("attachment_file_id") REFERENCES "uploaded_files"("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "support_ticket_responses"
      DROP CONSTRAINT IF EXISTS "FK_support_ticket_responses_attachment_file_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "support_ticket_responses" DROP COLUMN IF EXISTS "attachment_size"
    `);
    await queryRunner.query(`
      ALTER TABLE "support_ticket_responses" DROP COLUMN IF EXISTS "attachment_type"
    `);
    await queryRunner.query(`
      ALTER TABLE "support_ticket_responses" DROP COLUMN IF EXISTS "attachment_file_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "support_ticket_responses" DROP COLUMN IF EXISTS "attachment_url"
    `);
  }
}
