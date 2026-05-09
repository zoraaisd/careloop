import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSupportTicketsTable20260509000300
  implements MigrationInterface
{
  name = 'AddSupportTicketsTable20260509000300';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'support_ticket_status_enum') THEN
          CREATE TYPE "support_ticket_status_enum" AS ENUM ('Open', 'In Progress', 'Resolved', 'Closed');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'support_ticket_priority_enum') THEN
          CREATE TYPE "support_ticket_priority_enum" AS ENUM ('Low', 'Medium', 'High', 'Critical');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "support_tickets" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "doctor_id" uuid NOT NULL,
        "clinic_name" varchar NOT NULL,
        "issue_title" varchar NOT NULL,
        "description" text NOT NULL,
        "status" "support_ticket_status_enum" NOT NULL DEFAULT 'Open',
        "priority" "support_ticket_priority_enum" NOT NULL DEFAULT 'Medium',
        "clinic_email" varchar,
        "clinic_phone" varchar,
        "attachment_url" varchar,
        "attachment_name" varchar,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_support_tickets_id" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_support_tickets_doctor_id"
      ON "support_tickets" ("doctor_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_support_tickets_doctor_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "support_tickets"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "support_ticket_priority_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "support_ticket_status_enum"`);
  }
}
