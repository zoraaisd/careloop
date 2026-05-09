import 'reflect-metadata';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AppDataSource } from '../src/config/data-source';
import { DoctorDashboardState } from '../src/entities/doctor-dashboard-state.entity';
import { PasswordResetOtp } from '../src/entities/password-reset-otp.entity';
import { SignupOtp } from '../src/entities/signup-otp.entity';
import { UserRole } from '../src/entities/user.entity';

type JsonRecord = Record<string, unknown>;

type ImportSummary = {
  dashboardStatesImported: number;
  signupOtpsImported: number;
  passwordResetOtpsImported: number;
  skipped: string[];
};

const dataDirectory = path.resolve(process.cwd(), 'data');

function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
}

function directoryExists(dirPath: string): boolean {
  return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
}

function readJsonFile(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseDate(value: unknown, fallback: Date): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return fallback;
}

function asString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeRole(value: unknown): UserRole.DOCTOR | UserRole.PATIENT | null {
  const role = asString(value)?.toLowerCase();
  if (role === UserRole.DOCTOR || role === UserRole.PATIENT) {
    return role;
  }

  return null;
}

function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

function looksLikeDashboardState(value: unknown): value is JsonRecord {
  if (!isRecord(value)) {
    return false;
  }

  const dashboardKeys = [
    'patients',
    'appointments',
    'prescriptions',
    'messages',
    'chats',
    'pendingVerifications',
    'pendingActions',
    'doctors',
    'inventory',
    'expenses',
    'availableSlots',
    'healthTipsLogs',
    'subscriptionCheckouts',
    'activeSubscription',
    'patientDocuments',
  ];

  return dashboardKeys.some((key) => key in value);
}

async function importDoctorDashboardStates(summary: ImportSummary): Promise<void> {
  const repository = AppDataSource.getRepository(DoctorDashboardState);
  const dashboardDirectory = path.join(dataDirectory, 'doctor-dashboards');

  if (directoryExists(dashboardDirectory)) {
    const dashboardFiles = fs.readdirSync(dashboardDirectory).filter((name) => name.endsWith('.json'));

    for (const fileName of dashboardFiles) {
      const doctorId = path.basename(fileName, '.json');
      const filePath = path.join(dashboardDirectory, fileName);
      const parsed = readJsonFile(filePath);

      if (!looksLikeDashboardState(parsed)) {
        summary.skipped.push(`Skipped dashboard file ${fileName}: content did not match dashboard state shape.`);
        continue;
      }

      const existing = await repository.findOne({ where: { doctorId } });
      await repository.save(
        repository.create({
          id: existing?.id,
          doctorId,
          stateJson: parsed as Record<string, unknown>,
          migratedFromFile: true,
        }),
      );
      summary.dashboardStatesImported += 1;
    }
  }

  const legacyWhatsappStatePath = path.join(dataDirectory, 'whatsapp-healthcare.json');
  if (!fileExists(legacyWhatsappStatePath)) {
    return;
  }

  const parsed = readJsonFile(legacyWhatsappStatePath);

  if (isRecord(parsed) && looksLikeDashboardState(parsed) && asString(parsed.doctorId)) {
    const doctorId = asString(parsed.doctorId)!;
    const existing = await repository.findOne({ where: { doctorId } });
    await repository.save(
      repository.create({
        id: existing?.id,
        doctorId,
        stateJson: parsed as Record<string, unknown>,
        migratedFromFile: true,
      }),
    );
    summary.dashboardStatesImported += 1;
    return;
  }

  if (isRecord(parsed)) {
    let importedFromMap = 0;

    for (const [doctorId, state] of Object.entries(parsed)) {
      if (!looksLikeDashboardState(state)) {
        continue;
      }

      const existing = await repository.findOne({ where: { doctorId } });
      await repository.save(
        repository.create({
          id: existing?.id,
          doctorId,
          stateJson: state as Record<string, unknown>,
          migratedFromFile: true,
        }),
      );
      importedFromMap += 1;
      summary.dashboardStatesImported += 1;
    }

    if (importedFromMap > 0) {
      return;
    }
  }

  summary.skipped.push(
    'Skipped whatsapp-healthcare.json: could not infer a doctorId or doctorId-to-state map for import.',
  );
}

function extractSignupOtpRecords(source: unknown, summary: ImportSummary): Array<Omit<SignupOtp, 'id' | 'createdAt' | 'updatedAt'>> {
  const now = new Date();
  const rawRecords: unknown[] = Array.isArray(source)
    ? source
    : isRecord(source)
      ? Object.entries(source).map(([key, value]) =>
          isRecord(value) ? { key, ...value } : value,
        )
      : [];

  const result: Array<Omit<SignupOtp, 'id' | 'createdAt' | 'updatedAt'>> = [];

  for (const entry of rawRecords) {
    if (!isRecord(entry)) {
      continue;
    }

    const email = asString(entry.email)?.toLowerCase();
    const phone = asString(entry.phone);
    const role = normalizeRole(entry.role);
    const name = asString(entry.name) ?? 'Legacy User';

    if (!email || !phone || !role) {
      summary.skipped.push('Skipped a signup OTP record: missing email, phone, or valid role.');
      continue;
    }

    const key =
      asString(entry.key) ??
      `${role}:${email}:${phone}`;

    const otpHash =
      asString(entry.otpHash) ??
      asString(entry.otp_hash) ??
      (asString(entry.otp) ? hashOtp(asString(entry.otp)!) : null);

    if (!otpHash) {
      summary.skipped.push(`Skipped signup OTP for ${email}: missing otpHash/otp value.`);
      continue;
    }

    result.push({
      key,
      name,
      email,
      phone,
      role,
      otpHash,
      expiresAt: parseDate(entry.expiresAt ?? entry.expires_at, now),
      requestedAt: parseDate(entry.requestedAt ?? entry.requested_at ?? entry.createdAt, now),
      attempts: typeof entry.attempts === 'number' ? entry.attempts : 0,
    });
  }

  return result;
}

async function importSignupOtps(summary: ImportSummary): Promise<void> {
  const filePath = path.join(dataDirectory, 'signup-otp-store.json');
  if (!fileExists(filePath)) {
    return;
  }

  const repository = AppDataSource.getRepository(SignupOtp);
  const records = extractSignupOtpRecords(readJsonFile(filePath), summary);

  for (const record of records) {
    await repository.upsert(record, ['key']);
    summary.signupOtpsImported += 1;
  }
}

function extractPasswordResetOtpRecords(
  source: unknown,
  summary: ImportSummary,
): Array<Omit<PasswordResetOtp, 'id' | 'createdAt' | 'updatedAt'>> {
  const now = new Date();
  const rawRecords: unknown[] = Array.isArray(source)
    ? source
    : isRecord(source)
      ? Object.entries(source).map(([email, value]) =>
          isRecord(value) ? { email, ...value } : value,
        )
      : [];

  const result: Array<Omit<PasswordResetOtp, 'id' | 'createdAt' | 'updatedAt'>> = [];

  for (const entry of rawRecords) {
    if (!isRecord(entry)) {
      continue;
    }

    const email = asString(entry.email)?.toLowerCase();
    if (!email) {
      summary.skipped.push('Skipped a password reset OTP record: missing email.');
      continue;
    }

    const otpHash =
      asString(entry.otpHash) ??
      asString(entry.otp_hash) ??
      (asString(entry.otp) ? hashOtp(asString(entry.otp)!) : null);

    if (!otpHash) {
      summary.skipped.push(`Skipped password reset OTP for ${email}: missing otpHash/otp value.`);
      continue;
    }

    result.push({
      email,
      otpHash,
      expiresAt: parseDate(entry.expiresAt ?? entry.expires_at, now),
      requestedAt: parseDate(entry.requestedAt ?? entry.requested_at ?? entry.createdAt, now),
      attempts: typeof entry.attempts === 'number' ? entry.attempts : 0,
    });
  }

  return result;
}

async function importPasswordResetOtps(summary: ImportSummary): Promise<void> {
  const candidateFiles = [
    path.join(dataDirectory, 'password-reset-otp-store.json'),
    path.join(dataDirectory, 'password-reset-otps.json'),
  ];

  const existingFile = candidateFiles.find(fileExists);
  if (!existingFile) {
    return;
  }

  const repository = AppDataSource.getRepository(PasswordResetOtp);
  const records = extractPasswordResetOtpRecords(readJsonFile(existingFile), summary);

  for (const record of records) {
    await repository.upsert(record, ['email']);
    summary.passwordResetOtpsImported += 1;
  }
}

async function main(): Promise<void> {
  const summary: ImportSummary = {
    dashboardStatesImported: 0,
    signupOtpsImported: 0,
    passwordResetOtpsImported: 0,
    skipped: [],
  };

  await AppDataSource.initialize();
  await AppDataSource.runMigrations();

  try {
    await importDoctorDashboardStates(summary);
    await importSignupOtps(summary);
    await importPasswordResetOtps(summary);
  } finally {
    await AppDataSource.destroy();
  }

  console.log('Legacy JSON import complete.');
  console.log(`Dashboard states imported: ${summary.dashboardStatesImported}`);
  console.log(`Signup OTPs imported: ${summary.signupOtpsImported}`);
  console.log(`Password reset OTPs imported: ${summary.passwordResetOtpsImported}`);

  if (summary.skipped.length > 0) {
    console.log('Skipped items:');
    for (const message of summary.skipped) {
      console.log(`- ${message}`);
    }
  }
}

void main().catch((error) => {
  console.error('Legacy JSON import failed.');
  console.error(error);
  process.exit(1);
});
