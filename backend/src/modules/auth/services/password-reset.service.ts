import crypto from 'node:crypto';

import bcrypt from 'bcrypt';

import { AppError } from '../../../common/errors/app-error';
import { logger } from '../../../common/logger';
import { AppDataSource } from '../../../config/data-source';
import { env } from '../../../config/env';
import { PasswordResetOtp } from '../../../entities/password-reset-otp.entity';
import { User } from '../../../entities/user.entity';
import type { RequestPasswordResetOtpDto, ResetPasswordWithOtpDto, VerifyPasswordResetOtpDto } from '../dto/password-reset.dto';
import { authEmailService } from './auth-email.service';

const OTP_TTL_MS = env.signupOtpExpiresMinutes * 60 * 1000;
const RESEND_INTERVAL_MS = env.signupOtpResendSeconds * 1000;
const SALT_ROUNDS = 12;

export class PasswordResetService {
  private readonly userRepository = AppDataSource.getRepository(User);
  private readonly otpRepository = AppDataSource.getRepository(PasswordResetOtp);

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

    const now = new Date();
    const existingRecord = await this.otpRepository.findOne({ where: { email } });

    if (existingRecord && now.getTime() - existingRecord.requestedAt.getTime() < RESEND_INTERVAL_MS) {
      const retryAfterSeconds = Math.ceil((RESEND_INTERVAL_MS - (now.getTime() - existingRecord.requestedAt.getTime())) / 1000);
      throw new AppError(`Please wait ${retryAfterSeconds} seconds before requesting another OTP`, 429);
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    await this.otpRepository.upsert({
      email,
      otpHash: this.hashOtp(otp),
      expiresAt: new Date(now.getTime() + OTP_TTL_MS),
      requestedAt: now,
      attempts: 0,
    }, ['email']);

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
    const record = await this.otpRepository.findOne({ where: { email } });

    if (!record) {
      throw new AppError('OTP was not requested or has expired', 400);
    }

    if (record.expiresAt.getTime() < Date.now()) {
      await this.otpRepository.delete({ email });
      throw new AppError('OTP has expired. Please request a new OTP.', 400);
    }

    record.attempts += 1;
    if (record.attempts > env.signupOtpMaxAttempts) {
      await this.otpRepository.delete({ email });
      throw new AppError('Too many invalid OTP attempts. Please request a new OTP.', 429);
    }

    if (this.hashOtp(payload.otp.trim()) !== record.otpHash) {
      await this.otpRepository.save(record);
      throw new AppError('Invalid OTP. Please try again.', 400);
    }

    return { message: 'OTP verified successfully' };
  }

  async resetPassword(payload: ResetPasswordWithOtpDto): Promise<{ message: string }> {
    if (payload.newPassword !== payload.confirmPassword) {
      throw new AppError('Passwords do not match', 400);
    }

    const email = payload.email.trim().toLowerCase();
    const record = await this.otpRepository.findOne({ where: { email } });

    if (!record) {
      throw new AppError('OTP was not requested or has expired', 400);
    }

    if (record.expiresAt.getTime() < Date.now()) {
      await this.otpRepository.delete({ email });
      throw new AppError('OTP has expired. Please request a new OTP.', 400);
    }

    record.attempts += 1;
    if (record.attempts > env.signupOtpMaxAttempts) {
      await this.otpRepository.delete({ email });
      throw new AppError('Too many invalid OTP attempts. Please request a new OTP.', 429);
    }

    if (this.hashOtp(payload.otp.trim()) !== record.otpHash) {
      await this.otpRepository.save(record);
      throw new AppError('Invalid OTP. Please try again.', 400);
    }

    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();

    if (!user) {
      await this.otpRepository.delete({ email });
      throw new AppError('No account found with this email address', 404);
    }

    user.password = await bcrypt.hash(payload.newPassword, SALT_ROUNDS);
    user.sessionVersion = (user.sessionVersion ?? 0) + 1;
    await this.userRepository.save(user);

    await this.otpRepository.delete({ email });

    return { message: 'Password reset successfully. Please log in with your new password.' };
  }

  private hashOtp(otp: string): string {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }

  private async deleteExpiredRecords(): Promise<void> {
    await this.otpRepository
      .createQueryBuilder()
      .delete()
      .from(PasswordResetOtp)
      .where('expires_at <= :now', { now: new Date().toISOString() })
      .execute();
  }
}

export const passwordResetService = new PasswordResetService();
