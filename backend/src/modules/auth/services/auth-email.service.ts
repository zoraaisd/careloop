import emailjs from '@emailjs/nodejs';

import { AppError } from '../../../common/errors/app-error';
import { logger } from '../../../common/logger';
import { env } from '../../../config/env';

type SignupRole = 'doctor' | 'patient';

export class AuthEmailService {
  async sendSignupOtpEmail(payload: {
    name: string;
    email: string;
    phone: string;
    role: SignupRole;
    otp: string;
    expiresInSeconds: number;
  }): Promise<void> {
    this.assertOtpConfig();

    try {
      await emailjs.send(
        env.emailjsServiceId,
        env.emailjsTemplateId,
        {
          otp: payload.otp,
          passcode: payload.otp,
          code: payload.otp,
          verification_code: payload.otp,
          name: payload.name,
          to_name: payload.name,
          from_name: 'Care Loop',
          user_name: payload.name,
          email: payload.email,
          to_email: payload.email,
          from_email: payload.email,
          user_email: payload.email,
          reply_to: payload.email,
          phone: payload.phone,
          role: payload.role,
          app_name: 'Care Loop',
          expiry_minutes: String(Math.max(1, Math.floor(payload.expiresInSeconds / 60))),
          message: `Your Care Loop OTP is ${payload.otp}. It expires soon.`,
          subject: `Your Care Loop OTP is ${payload.otp}`,
        },
        {
          publicKey: env.emailjsPublicKey,
          privateKey: env.emailjsPrivateKey,
        },
      );
    } catch (error) {
      logger.error({ err: error, email: payload.email }, 'Failed to send signup OTP email');
      throw new AppError('Unable to send OTP email right now. Please try again.', 502);
    }
  }

  async sendSignupWelcomeEmail(payload: {
    name: string;
    email: string;
    role: SignupRole;
  }): Promise<void> {
    if (!env.emailjsWelcomeTemplateId) {
      return;
    }

    this.assertBaseConfig();

    try {
      await emailjs.send(
        env.emailjsServiceId,
        env.emailjsWelcomeTemplateId,
        {
          name: payload.name,
          to_name: payload.name,
          user_name: payload.name,
          email: payload.email,
          to_email: payload.email,
          user_email: payload.email,
          role: payload.role,
          app_name: 'Care Loop',
          subject: 'Welcome to Care Loop',
          message:
            payload.role === 'doctor'
              ? 'Your OTP is verified. Welcome to Care Loop. You can now complete your doctor onboarding.'
              : 'Your OTP is verified. Welcome to Care Loop. Your account is now ready.',
        },
        {
          publicKey: env.emailjsPublicKey,
          privateKey: env.emailjsPrivateKey,
        },
      );
    } catch (error) {
      logger.error({ err: error, email: payload.email }, 'Failed to send signup welcome email');
    }
  }

  async sendDoctorInviteEmail(payload: {
    name: string;
    email: string;
    rawPassword?: string;
    clinicName: string;
  }): Promise<void> {
    if (!env.emailjsWelcomeTemplateId) {
      return;
    }

    this.assertBaseConfig();

    try {
      await emailjs.send(
        env.emailjsServiceId,
        env.emailjsWelcomeTemplateId,
        {
          name: payload.name,
          to_name: payload.name,
          user_name: payload.name,
          email: payload.email,
          to_email: payload.email,
          user_email: payload.email,
          role: 'doctor',
          app_name: 'Care Loop',
          subject: `You have been invited to join ${payload.clinicName} on Care Loop`,
          message: `You have been invited to join ${payload.clinicName} as a doctor. ${
            payload.rawPassword 
              ? `Your temporary password is: ${payload.rawPassword}. Please log in and change it.`
              : `Please log in to access your dashboard.`
          }`,
        },
        {
          publicKey: env.emailjsPublicKey,
          privateKey: env.emailjsPrivateKey,
        },
      );
    } catch (error) {
      logger.error({ err: error, email: payload.email }, 'Failed to send doctor invite email');
    }
  }

  private assertOtpConfig(): void {
    this.assertBaseConfig();

    if (!env.emailjsTemplateId) {
      throw new AppError('OTP email template is not configured on the server.', 500);
    }
  }

  private assertBaseConfig(): void {
    if (!env.emailjsServiceId || !env.emailjsPublicKey || !env.emailjsPrivateKey) {
      throw new AppError('Email delivery is not configured on the server.', 500);
    }
  }
}

export const authEmailService = new AuthEmailService();
