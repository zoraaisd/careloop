import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import bcrypt from 'bcrypt';

import { AppError } from '../../../common/errors/app-error';
import { logger } from '../../../common/logger';
import { AppDataSource } from '../../../config/data-source';
import { env } from '../../../config/env';
import { User } from '../../../entities/user.entity';
import type { RequestPasswordResetOtpDto, ResetPasswordWithOtpDto, VerifyPasswordResetOtpDto } from '../dto/password-reset.dto';
import { authEmailService } from './auth-email.service';

type PasswordResetOtpRecord = {
  email: string;
  otpHash: string;
  expiresAt: number;
  requestedAt: number;
  attempts: number;
};

const OTP_TTL_MS = env.signupOtpExpiresMinutes * 60 * 1000;
const RESEND_INTERVAL_MS = env.signupOtpResendSeconds * 1000;
const SALT_ROUNDS = 12;

export class PasswordResetService {
  private readonly userRepository = AppDataSource.getRepository(User);
  private readonly otpStore = new Map<string, PasswordResetOtpRecord>();
  private readonly storagePath = path.resolve(process.cwd(), 'data', 'password-reset-otp-store.json');

  constructor() {
    this.loadStore();
  }

  async requestOtp(payload: RequestPasswordResetOtpDto): Promise<{
    message: string;
    expiresInSeconds: number;
    otp?: string;
    emailDelivered?: boolean;
    emailDeliveryError?: string;
  }> {
    const email = payload.email.trim().toLowerCase();
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new AppError('No account found with this email address', 404);
    }

    const now = Date.now();
    const existingRecord = this.otpStore.get(email);

    if (existingRecord && now - existingRecord.requestedAt < RESEND_INTERVAL_MS) {
      const retryAfterSeconds = Math.ceil((RESEND_INTERVAL_MS - (now - existingRecord.requestedAt)) / 1000);
      throw new AppError(`Please wait ${retryAfterSeconds} seconds before requesting another OTP`, 429);
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    this.otpStore.set(email, {
      email,
      otpHash: this.hashOtp(otp),
      expiresAt: now + OTP_TTL_MS,
      requestedAt: now,
      attempts: 0,
    });
    this.saveStore();

    try {
      await authEmailService.sendPasswordResetOtpEmail({
        name: user.name,
        email,
        role: user.role,
        otp,
        expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
      });
    } catch (error) {
      const emailDeliveryError = error instanceof Error ? error.message : 'Unknown email delivery error';
      logger.warn({ err: error, email }, 'Password reset OTP email delivery failed; returning OTP fallback response');
      return {
        message: 'Email delivery is temporarily unavailable. Use the OTP shown below to reset your password.',
        expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
        otp,
        emailDelivered: false,
        emailDeliveryError,
      };
    }

    return {
      message: `OTP sent to ${email}`,
      expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
      emailDelivered: true,
    };
  }

  async verifyOtp(payload: VerifyPasswordResetOtpDto): Promise<{ message: string }> {
    const email = payload.email.trim().toLowerCase();
    const record = this.otpStore.get(email);

    if (!record) {
      throw new AppError('OTP was not requested or has expired', 400);
    }

    if (record.expiresAt < Date.now()) {
      this.otpStore.delete(email);
      this.saveStore();
      throw new AppError('OTP has expired. Please request a new OTP.', 400);
    }

    record.attempts += 1;
    if (record.attempts > env.signupOtpMaxAttempts) {
      this.otpStore.delete(email);
      this.saveStore();
      throw new AppError('Too many invalid OTP attempts. Please request a new OTP.', 429);
    }

    if (this.hashOtp(payload.otp.trim()) !== record.otpHash) {
      this.saveStore();
      throw new AppError('Invalid OTP. Please try again.', 400);
    }

    return { message: 'OTP verified successfully' };
  }

  async resetPassword(payload: ResetPasswordWithOtpDto): Promise<{ message: string }> {
    if (payload.newPassword !== payload.confirmPassword) {
      throw new AppError('Passwords do not match', 400);
    }

    const email = payload.email.trim().toLowerCase();
    const record = this.otpStore.get(email);

    if (!record) {
      throw new AppError('OTP was not requested or has expired', 400);
    }

    if (record.expiresAt < Date.now()) {
      this.otpStore.delete(email);
      this.saveStore();
      throw new AppError('OTP has expired. Please request a new OTP.', 400);
    }

    record.attempts += 1;
    if (record.attempts > env.signupOtpMaxAttempts) {
      this.otpStore.delete(email);
      this.saveStore();
      throw new AppError('Too many invalid OTP attempts. Please request a new OTP.', 429);
    }

    if (this.hashOtp(payload.otp.trim()) !== record.otpHash) {
      this.saveStore();
      throw new AppError('Invalid OTP. Please try again.', 400);
    }

    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();

    if (!user) {
      this.otpStore.delete(email);
      this.saveStore();
      throw new AppError('No account found with this email address', 404);
    }

    user.password = await bcrypt.hash(payload.newPassword, SALT_ROUNDS);
    user.sessionVersion = (user.sessionVersion ?? 0) + 1;
    await this.userRepository.save(user);

    this.otpStore.delete(email);
    this.saveStore();

    return { message: 'Password reset successfully. Please log in with your new password.' };
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
      const parsed = JSON.parse(raw) as Record<string, PasswordResetOtpRecord>;
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

export const passwordResetService = new PasswordResetService();
