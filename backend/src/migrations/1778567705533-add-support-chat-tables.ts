import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddSupportChatTables1778567705533 implements MigrationInterface {
    name = 'AddSupportChatTables1778567705533'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "support_chats" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "doctor_id" uuid NOT NULL,
                "last_message" text,
                "last_message_at" timestamptz,
                "unread_count_admin" integer NOT NULL DEFAULT 0,
                "unread_count_doctor" integer NOT NULL DEFAULT 0,
                "created_at" timestamptz NOT NULL DEFAULT now(),
                "updated_at" timestamptz NOT NULL DEFAULT now(),
                CONSTRAINT "PK_support_chats_id" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "support_chat_messages" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "chat_id" uuid NOT NULL,
                "sender_id" uuid NOT NULL,
                "sender_role" "users_role_enum" NOT NULL,
                "content" text NOT NULL,
                "created_at" timestamptz NOT NULL DEFAULT now(),
                CONSTRAINT "PK_support_chat_messages_id" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            ALTER TABLE "support_chats" 
            ADD CONSTRAINT "FK_support_chats_doctor_id" 
            FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE CASCADE
        `);

        await queryRunner.query(`
            ALTER TABLE "support_chat_messages" 
            ADD CONSTRAINT "FK_support_chat_messages_chat_id" 
            FOREIGN KEY ("chat_id") REFERENCES "support_chats"("id") ON DELETE CASCADE
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "support_chat_messages" DROP CONSTRAINT "FK_support_chat_messages_chat_id"`);
        await queryRunner.query(`ALTER TABLE "support_chats" DROP CONSTRAINT "FK_support_chats_doctor_id"`);
        await queryRunner.query(`DROP TABLE "support_chat_messages"`);
        await queryRunner.query(`DROP TABLE "support_chats"`);
    }
}
