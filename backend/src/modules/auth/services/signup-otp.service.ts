import crypto from 'node:crypto';

import jwt, { type SignOptions } from 'jsonwebtoken';

import { AppError } from '../../../common/errors/app-error';
import { logger } from '../../../common/logger';
import { AppDataSource } from '../../../config/data-source';
import { SignupOtp } from '../../../entities/signup-otp.entity';
import { env } from '../../../config/env';
import { User, UserRole } from '../../../entities/user.entity';
import type { RequestSignupOtpDto, VerifySignupOtpDto } from '../dto/signup-otp.dto';
import { authEmailService } from './auth-email.service';

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
  private readonly otpRepository = AppDataSource.getRepository(SignupOtp);

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

    const now = new Date();
    const existingRecord = await this.otpRepository.findOne({ where: { key } });

    if (existingRecord && now.getTime() - existingRecord.requestedAt.getTime() < RESEND_INTERVAL_MS) {
      const retryAfterSeconds = Math.ceil((RESEND_INTERVAL_MS - (now.getTime() - existingRecord.requestedAt.getTime())) / 1000);
      throw new AppError(`Please wait ${retryAfterSeconds} seconds before requesting another OTP`, 429);
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    await this.otpRepository.upsert({
      key,
      name: payload.name.trim(),
      email,
      phone,
      role,
      otpHash: this.hashOtp(otp),
      expiresAt: new Date(now.getTime() + OTP_TTL_MS),
      requestedAt: now,
      attempts: 0,
    }, ['key']);

    return {
      message: `OTP generated for ${email}`,
      expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
      otp,
    };
  }

  async requestOtpAndSendEmail(payload: RequestSignupOtpDto, customTargetEmail?: string): Promise<{
    message: string;
    expiresInSeconds: number;
    otp?: string;
    emailDelivered?: boolean;
    emailDeliveryError?: string;
  }> {
    const requested = await this.requestOtp(payload);
    try {
      await this.sendOtpEmail(payload, requested.otp, customTargetEmail);
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
        { err: error, email: customTargetEmail || payload.email, emailDeliveryError },
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
      message: `OTP sent to ${customTargetEmail || payload.email.trim().toLowerCase()}`,
      expiresInSeconds: requested.expiresInSeconds,
      emailDelivered: true,
    };
  }

  private async sendOtpEmail(payload: RequestSignupOtpDto, otp: string, customTargetEmail?: string): Promise<void> {
    await authEmailService.sendSignupOtpEmail({
      name: payload.name.trim(),
      email: (customTargetEmail || payload.email).trim().toLowerCase(),
      phone: payload.phone.trim(),
      role: payload.role,
      otp,
      expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
    });
  }

  verifyOtp(payload: VerifySignupOtpDto): { message: string; signupVerificationToken: string } {
    throw new AppError('Use verifyOtpAsync instead', 500);
  }

  async verifyOtpAsync(payload: VerifySignupOtpDto): Promise<{ message: string; signupVerificationToken: string }> {
    const email = payload.email.trim().toLowerCase();
    const phone = payload.phone.trim();
    const role = payload.role;
    const key = this.buildKey(email, phone, role);
    const recordPromise = this.otpRepository.findOne({ where: { key } });
    const now = new Date();

    return recordPromise.then(async (record) => {
      if (!record) {
        throw new AppError('OTP was not requested or has expired', 400);
      }

      if (record.expiresAt.getTime() < now.getTime()) {
        await this.otpRepository.delete({ key });
        throw new AppError('OTP has expired. Please request a new OTP.', 400);
      }

      record.attempts += 1;
      if (record.attempts > env.signupOtpMaxAttempts) {
        await this.otpRepository.delete({ key });
        throw new AppError('Too many invalid OTP attempts. Please request a new OTP.', 429);
      }

      if (this.hashOtp(payload.otp.trim()) !== record.otpHash) {
        await this.otpRepository.save(record);
        throw new AppError('Invalid OTP. Please try again.', 400);
      }

      await this.otpRepository.delete({ key });

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
    });
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

  async clearOtp(payload: {
    email: string;
    phone: string;
    role: UserRole.DOCTOR | UserRole.PATIENT;
  }): Promise<void> {
    const key = this.buildKey(payload.email.trim().toLowerCase(), payload.phone.trim(), payload.role);
    await this.otpRepository.delete({ key });
  }

  private hashOtp(otp: string): string {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }

  private async deleteExpiredRecords(): Promise<void> {
    await this.otpRepository
      .createQueryBuilder()
      .delete()
      .from(SignupOtp)
      .where('expires_at <= :now', { now: new Date().toISOString() })
      .execute();
  }
}

export const signupOtpService = new SignupOtpService();
