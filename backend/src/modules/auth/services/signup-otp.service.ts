import crypto from 'node:crypto';

import jwt, { type SignOptions } from 'jsonwebtoken';

import { AppError } from '../../../common/errors/app-error';
import { AppDataSource } from '../../../config/data-source';
import { env } from '../../../config/env';
import { User, UserRole } from '../../../entities/user.entity';
import type { RequestSignupOtpDto, VerifySignupOtpDto } from '../dto/signup-otp.dto';

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

    return {
      message: `OTP generated for ${email}`,
      expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
      otp,
    };
  }

  async requestOtpAndSendEmail(payload: RequestSignupOtpDto): Promise<{ message: string; expiresInSeconds: number }> {
    const requested = await this.requestOtp(payload);
    await this.sendOtpEmail(payload, requested.otp);

    return {
      message: `OTP sent to ${payload.email.trim().toLowerCase()}`,
      expiresInSeconds: requested.expiresInSeconds,
    };
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
      throw new AppError('OTP has expired. Please request a new OTP.', 400);
    }

    record.attempts += 1;
    if (record.attempts > env.signupOtpMaxAttempts) {
      this.otpStore.delete(key);
      throw new AppError('Too many invalid OTP attempts. Please request a new OTP.', 429);
    }

    if (this.hashOtp(payload.otp.trim()) !== record.otpHash) {
      throw new AppError('Invalid OTP. Please try again.', 400);
    }

    this.otpStore.delete(key);

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

  private buildKey(email: string, phone: string, role: UserRole.DOCTOR | UserRole.PATIENT): string {
    return `${role}:${email}:${phone}`;
  }

  private hashOtp(otp: string): string {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }

  private async sendOtpEmail(payload: RequestSignupOtpDto, otp: string): Promise<void> {
    if (!env.emailjsServiceId || !env.emailjsTemplateId || !env.emailjsPublicKey || !env.emailjsPrivateKey) {
      throw new AppError('OTP email service is not configured on the server', 500);
    }

    const emailResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service_id: env.emailjsServiceId,
        template_id: env.emailjsTemplateId,
        user_id: env.emailjsPublicKey,
        accessToken: env.emailjsPrivateKey,
        template_params: {
          otp,
          passcode: otp,
          code: otp,
          verification_code: otp,
          name: payload.name.trim(),
          to_name: payload.name.trim(),
          user_name: payload.name.trim(),
          email: payload.email.trim().toLowerCase(),
          to_email: payload.email.trim().toLowerCase(),
          user_email: payload.email.trim().toLowerCase(),
          phone: payload.phone.trim(),
          role: payload.role,
          message: `Your Care Loop OTP is ${otp}.`,
          subject: `Your Care Loop OTP is ${otp}`,
        },
      }),
    });

    if (!emailResponse.ok) {
      const details = await emailResponse.text().catch(() => '');
      throw new AppError(
        `Failed to send OTP email${details ? `: ${details}` : ''}`,
        502,
      );
    }
  }
}

export const signupOtpService = new SignupOtpService();
