import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema20260418000100 implements MigrationInterface {
  name = 'InitialSchema20260418000100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TYPE "user_role_enum" AS ENUM ('admin', 'doctor', 'patient');
      CREATE TYPE "patient_verification_status_enum" AS ENUM ('pending', 'verified');
      CREATE TYPE "appointment_status_enum" AS ENUM ('scheduled', 'waiting', 'engaged', 'done', 'cancelled');
      CREATE TYPE "chat_follow_up_status_enum" AS ENUM ('none', 'pending', 'completed');
      CREATE TYPE "chat_sender_type_enum" AS ENUM ('doctor', 'patient', 'system');
      CREATE TYPE "chat_message_type_enum" AS ENUM ('text', 'prescription', 'file', 'slot', 'followup');
      CREATE TYPE "follow_up_entry_status_enum" AS ENUM ('pending', 'completed');
      CREATE TYPE "expense_activity_type_enum" AS ENUM ('activity', 'expense');
      CREATE TYPE "activity_direction_enum" AS ENUM ('inbound', 'outbound');
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(120) NOT NULL,
        "email" varchar(150) NOT NULL,
        "phone" varchar(20) NOT NULL,
        "password" varchar(255) NOT NULL,
        "role" "user_role_enum" NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      );
      CREATE UNIQUE INDEX "IDX_users_email" ON "users" ("email");
    `);

    await queryRunner.query(`
      CREATE TABLE "patients" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(120) NOT NULL,
        "phone" varchar(20) NOT NULL,
        "age" integer NOT NULL,
        "email" varchar(150),
        "gender" varchar(16),
        "bloodGroup" varchar(8),
        "condition" varchar(200),
        "notes" text,
        "verificationStatus" "patient_verification_status_enum" NOT NULL DEFAULT 'pending',
        "whatsappVerified" boolean NOT NULL DEFAULT false,
        "isActive" boolean NOT NULL DEFAULT true,
        "lastVisitAt" timestamptz,
        "primary_doctor_id" uuid,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_patients_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_patients_primary_doctor" FOREIGN KEY ("primary_doctor_id") REFERENCES "users"("id") ON DELETE SET NULL
      );
      CREATE UNIQUE INDEX "IDX_patients_phone" ON "patients" ("phone");
      CREATE INDEX "IDX_patients_primary_doctor_id" ON "patients" ("primary_doctor_id");
    `);

    await queryRunner.query(`
      CREATE TABLE "appointments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "patient_id" uuid NOT NULL,
        "doctor_id" uuid NOT NULL,
        "appointment_date" date NOT NULL,
        "appointment_time" varchar(32) NOT NULL,
        "day" varchar(32) NOT NULL,
        "appointmentType" varchar(40) NOT NULL DEFAULT 'consultation',
        "notes" text,
        "status" "appointment_status_enum" NOT NULL DEFAULT 'scheduled',
        "billingAmount" numeric(12,2) NOT NULL DEFAULT 0,
        "cancelledAt" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_appointments_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_appointments_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_appointments_doctor" FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
      CREATE INDEX "IDX_appointments_doctor_date" ON "appointments" ("doctor_id", "appointment_date");
      CREATE INDEX "IDX_appointments_patient_id" ON "appointments" ("patient_id");
    `);

    await queryRunner.query(`
      CREATE TABLE "prescriptions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "patient_id" uuid NOT NULL,
        "doctor_id" uuid NOT NULL,
        "diagnosis" varchar(160) NOT NULL,
        "notes" text,
        "prescription_date" date NOT NULL,
        "pdfUrl" varchar(255),
        "sentAt" timestamptz,
        "resendCount" integer NOT NULL DEFAULT 0,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_prescriptions_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_prescriptions_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_prescriptions_doctor" FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
      CREATE INDEX "IDX_prescriptions_doctor_date" ON "prescriptions" ("doctor_id", "prescription_date");
    `);

    await queryRunner.query(`
      CREATE TABLE "doctor_availability_slots" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "doctor_id" uuid NOT NULL,
        "date" date NOT NULL,
        "day" varchar(32) NOT NULL,
        "start_time" varchar(32) NOT NULL,
        "end_time" varchar(32),
        "isBooked" boolean NOT NULL DEFAULT false,
        "appointment_id" uuid,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_doctor_slots_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_doctor_slots_appointment_id" UNIQUE ("appointment_id"),
        CONSTRAINT "FK_doctor_slots_doctor" FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_doctor_slots_appointment" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL
      );
      CREATE INDEX "IDX_doctor_slots_doctor_date" ON "doctor_availability_slots" ("doctor_id", "date");
    `);

    await queryRunner.query(`
      CREATE TABLE "prescription_medicines" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "prescription_id" uuid NOT NULL,
        "medicineName" varchar(120) NOT NULL,
        "dosage" varchar(80) NOT NULL,
        "instruction" varchar(200) NOT NULL,
        CONSTRAINT "PK_prescription_medicines_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_prescription_medicines_prescription" FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "chats" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "patient_id" uuid NOT NULL,
        "doctor_id" uuid,
        "lastMessage" varchar(255),
        "lastMessageType" varchar(24),
        "lastMessageAt" timestamptz,
        "unreadCount" integer NOT NULL DEFAULT 0,
        "followUpStatus" "chat_follow_up_status_enum" NOT NULL DEFAULT 'none',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_chats_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_chats_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_chats_doctor" FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE SET NULL
      );
      CREATE INDEX "IDX_chats_doctor_id" ON "chats" ("doctor_id");
      CREATE INDEX "IDX_chats_patient_id" ON "chats" ("patient_id");
    `);

    await queryRunner.query(`
      CREATE TABLE "chat_messages" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "chat_id" uuid NOT NULL,
        "senderType" "chat_sender_type_enum" NOT NULL,
        "messageType" "chat_message_type_enum" NOT NULL,
        "content" text NOT NULL,
        "attachmentUrl" varchar(255),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_chat_messages_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_chat_messages_chat" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE
      );
      CREATE INDEX "IDX_chat_messages_chat_id" ON "chat_messages" ("chat_id");
    `);

    await queryRunner.query(`
      CREATE TABLE "follow_ups" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "patient_id" uuid NOT NULL,
        "doctor_id" uuid,
        "message" varchar(255) NOT NULL,
        "scheduledAt" timestamptz NOT NULL,
        "status" "follow_up_entry_status_enum" NOT NULL DEFAULT 'pending',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_follow_ups_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_follow_ups_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_follow_ups_doctor" FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE SET NULL
      );
      CREATE INDEX "IDX_follow_ups_doctor_id" ON "follow_ups" ("doctor_id");
    `);

    await queryRunner.query(`
      CREATE TABLE "inventory_items" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "itemName" varchar(120) NOT NULL,
        "category" varchar(80) NOT NULL,
        "quantity" integer NOT NULL,
        "unit" varchar(32) NOT NULL,
        "reorderLevel" integer NOT NULL DEFAULT 0,
        "unitCost" numeric(12,2) NOT NULL,
        "vendor" varchar(120),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_inventory_items_id" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "expense_activities" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "title" varchar(120) NOT NULL,
        "category" varchar(80) NOT NULL,
        "amount" numeric(12,2) NOT NULL,
        "date" date NOT NULL,
        "notes" text,
        "type" "expense_activity_type_enum" NOT NULL DEFAULT 'expense',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_expense_activities_id" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "activity_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "patient_id" uuid,
        "doctor_id" uuid,
        "direction" "activity_direction_enum" NOT NULL DEFAULT 'outbound',
        "type" varchar(60) NOT NULL,
        "message" text NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_activity_logs_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_activity_logs_patient" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_activity_logs_doctor" FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE SET NULL
      );
      CREATE INDEX "IDX_activity_logs_doctor_id" ON "activity_logs" ("doctor_id");
      CREATE INDEX "IDX_activity_logs_patient_id" ON "activity_logs" ("patient_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "activity_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "expense_activities"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inventory_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "follow_ups"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_messages"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chats"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "prescription_medicines"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "doctor_availability_slots"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "prescriptions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "appointments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "patients"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);

    await queryRunner.query(`DROP TYPE IF EXISTS "activity_direction_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "expense_activity_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "follow_up_entry_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "chat_message_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "chat_sender_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "chat_follow_up_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "appointment_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "patient_verification_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "user_role_enum"`);
  }
}
