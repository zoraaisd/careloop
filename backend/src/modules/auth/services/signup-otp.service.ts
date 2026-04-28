import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import jwt, { type SignOptions } from 'jsonwebtoken';

import { AppError } from '../../../common/errors/app-error';
import { logger } from '../../../common/logger';
import { AppDataSource } from '../../../config/data-source';
import { env } from '../../../config/env';
import { User, UserRole } from '../../../entities/user.entity';
import type { RequestSignupOtpDto, VerifySignupOtpDto } from '../dto/signup-otp.dto';
import { authEmailService } from './auth-email.service';

type SignupOtpRecord = {
  name: string;
  email: string;
  phone: string;
  role: UserRole.DOCTOR | UserRole.PATIENT;
  otpHash: string;
  expiresAt: number;
  requestedAt: number;
  attempts: number;
};

type SignupVerificationTokenPayload = {
  email: string;
  phone: string;
  role: UserRole.DOCTOR | UserRole.PATIENT;
  purpose: 'signup_verification';
};

const OTP_TTL_MS = env.signupOtpExpiresMinutes * 60 * 1000;
const RESEND_INTERVAL_MS = env.signupOtpResendSeconds * 1000;
const VERIFIED_TOKEN_EXPIRES_IN = env.signupOtpVerifiedTokenExpiresIn as SignOptions['expiresIn'];

export class SignupOtpService {
  private readonly userRepository = AppDataSource.getRepository(User);
  private readonly otpStore = new Map<string, SignupOtpRecord>();
  private readonly storagePath = path.resolve(process.cwd(), 'data', 'signup-otp-store.json');

  constructor() {
    this.loadStore();
  }

  async requestOtp(payload: RequestSignupOtpDto): Promise<{ message: string; expiresInSeconds: number; otp: string }> {
    const email = payload.email.trim().toLowerCase();
    const phone = payload.phone.trim();
    const role = payload.role;
    const key = this.buildKey(email, phone, role);
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new AppError('Email is already registered', 409);
    }

    const now = Date.now();
    const existingRecord = this.otpStore.get(key);

    if (existingRecord && now - existingRecord.requestedAt < RESEND_INTERVAL_MS) {
      const retryAfterSeconds = Math.ceil((RESEND_INTERVAL_MS - (now - existingRecord.requestedAt)) / 1000);
      throw new AppError(`Please wait ${retryAfterSeconds} seconds before requesting another OTP`, 429);
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    this.otpStore.set(key, {
      name: payload.name.trim(),
      email,
      phone,
      role,
      otpHash: this.hashOtp(otp),
      expiresAt: now + OTP_TTL_MS,
      requestedAt: now,
      attempts: 0,
    });
    this.saveStore();

    return {
      message: `OTP generated for ${email}`,
      expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
      otp,
    };
  }

  async requestOtpAndSendEmail(payload: RequestSignupOtpDto): Promise<{
    message: string;
    expiresInSeconds: number;
    otp?: string;
    emailDelivered?: boolean;
    emailDeliveryError?: string;
  }> {
    const requested = await this.requestOtp(payload);
    try {
      await this.sendOtpEmail(payload, requested.otp);
    } catch (error) {
      const emailDeliveryError = (() => {
        if (error && typeof error === 'object' && 'text' in error) {
          return String((error as any).text || '');
        }
        if (error instanceof Error) {
          return error.message;
        }
        return 'Unknown email delivery error';
      })();
      logger.warn(
        { err: error, email: payload.email, emailDeliveryError },
        'OTP email delivery failed; returning OTP fallback response',
      );
      return {
        message:
          'Email delivery is temporarily unavailable. Use the OTP shown below to continue verification.',
        expiresInSeconds: requested.expiresInSeconds,
        otp: requested.otp,
        emailDelivered: false,
        emailDeliveryError,
      };
    }

    return {
      message: `OTP sent to ${payload.email.trim().toLowerCase()}`,
      expiresInSeconds: requested.expiresInSeconds,
      emailDelivered: true,
    };
  }

  private async sendOtpEmail(payload: RequestSignupOtpDto, otp: string): Promise<void> {
    await authEmailService.sendSignupOtpEmail({
      name: payload.name.trim(),
      email: payload.email.trim().toLowerCase(),
      phone: payload.phone.trim(),
      role: payload.role,
      otp,
      expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
    });
  }

  verifyOtp(payload: VerifySignupOtpDto): { message: string; signupVerificationToken: string } {
    const email = payload.email.trim().toLowerCase();
    const phone = payload.phone.trim();
    const role = payload.role;
    const key = this.buildKey(email, phone, role);
    const record = this.otpStore.get(key);

    if (!record) {
      throw new AppError('OTP was not requested or has expired', 400);
    }

    if (record.expiresAt < Date.now()) {
      this.otpStore.delete(key);
      this.saveStore();
      throw new AppError('OTP has expired. Please request a new OTP.', 400);
    }

    record.attempts += 1;
    if (record.attempts > env.signupOtpMaxAttempts) {
      this.otpStore.delete(key);
      this.saveStore();
      throw new AppError('Too many invalid OTP attempts. Please request a new OTP.', 429);
    }

    if (this.hashOtp(payload.otp.trim()) !== record.otpHash) {
      this.saveStore();
      throw new AppError('Invalid OTP. Please try again.', 400);
    }

    this.otpStore.delete(key);
    this.saveStore();

    const signupVerificationToken = jwt.sign(
      {
        email,
        phone,
        role,
        purpose: 'signup_verification',
      } satisfies SignupVerificationTokenPayload,
      env.jwtSecret,
      { expiresIn: VERIFIED_TOKEN_EXPIRES_IN },
    );

    return {
      message: 'OTP verified successfully',
      signupVerificationToken,
    };
  }

  assertVerificationToken(
    token: string,
    payload: { email: string; phone: string; role: UserRole.DOCTOR | UserRole.PATIENT },
  ): void {
    let decoded: SignupVerificationTokenPayload;

    try {
      decoded = jwt.verify(token, env.jwtSecret) as SignupVerificationTokenPayload;
    } catch {
      throw new AppError('Signup verification expired. Please verify OTP again.', 401);
    }

    if (decoded.purpose !== 'signup_verification') {
      throw new AppError('Invalid signup verification token', 401);
    }

    if (
      decoded.email !== payload.email.trim().toLowerCase() ||
      decoded.phone !== payload.phone.trim() ||
      decoded.role !== payload.role
    ) {
      throw new AppError('Signup verification does not match the submitted account details', 401);
    }
  }

  assertVerificationTokenForEmail(
    token: string,
    payload: { email: string; role: UserRole.DOCTOR | UserRole.PATIENT },
  ): void {
    let decoded: SignupVerificationTokenPayload;

    try {
      decoded = jwt.verify(token, env.jwtSecret) as SignupVerificationTokenPayload;
    } catch {
      throw new AppError('Signup verification expired. Please verify OTP again.', 401);
    }

    if (decoded.purpose !== 'signup_verification') {
      throw new AppError('Invalid signup verification token', 401);
    }

    if (decoded.email !== payload.email.trim().toLowerCase() || decoded.role !== payload.role) {
      throw new AppError('Signup verification does not match the submitted account details', 401);
    }
  }

  private buildKey(email: string, phone: string, role: UserRole.DOCTOR | UserRole.PATIENT): string {
    return `${role}:${email}:${phone}`;
  }

  clearOtp(payload: {
    email: string;
    phone: string;
    role: UserRole.DOCTOR | UserRole.PATIENT;
  }): void {
    const key = this.buildKey(payload.email.trim().toLowerCase(), payload.phone.trim(), payload.role);
    this.otpStore.delete(key);
    this.saveStore();
  }

  private hashOtp(otp: string): string {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }

  private loadStore(): void {
    if (!fs.existsSync(this.storagePath)) {
      return;
    }

    try {
      const raw = fs.readFileSync(this.storagePath, 'utf8');
      const parsed = JSON.parse(raw) as Record<string, SignupOtpRecord>;
      const now = Date.now();

      Object.entries(parsed).forEach(([key, value]) => {
        if (value && typeof value === 'object' && Number(value.expiresAt) > now) {
          this.otpStore.set(key, value);
        }
      });

      this.saveStore();
    } catch {
      this.otpStore.clear();
    }
  }

  private saveStore(): void {
    const now = Date.now();
    const serialized = Object.fromEntries(
      Array.from(this.otpStore.entries()).filter(([, value]) => Number(value.expiresAt) > now),
    );
    const storageDirectory = path.dirname(this.storagePath);

    if (!fs.existsSync(storageDirectory)) {
      fs.mkdirSync(storageDirectory, { recursive: true });
    }

    fs.writeFileSync(this.storagePath, JSON.stringify(serialized, null, 2), 'utf8');
  }
}

export const signupOtpService = new SignupOtpService();
