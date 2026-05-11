import emailjs from '@emailjs/nodejs';

import { AppError } from '../errors/app-error';
import { logger } from '../logger';
import { env } from '../../config/env';

type PortalEmailRole = 'admin' | 'doctor' | 'patient';

export class PortalEmailService {
  async sendSignupOtpEmail(payload: {
    name: string;
    email: string;
    phone: string;
    role: PortalEmailRole;
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
          from_name: env.emailSenderName,
          user_name: payload.name,
          email: payload.email,
          to_email: payload.email,
          from_email: env.emailSenderAddress,
          user_email: payload.email,
          reply_to: env.emailSenderAddress,
          phone: payload.phone,
          role: payload.role,
          app_name: 'Care Loop',
          expiry_minutes: String(Math.max(1, Math.floor(payload.expiresInSeconds / 60))),
          message: `To authenticate, please use this One Time Password (OTP): ${payload.otp}. This OTP is valid for 15 minutes. Do not share this OTP with anyone.`,
          subject: 'OTP for your Careloop authentication',
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

  async sendDoctorInviteEmail(payload: {
    name: string;
    email: string;
    rawPassword?: string;
    clinicName: string;
  }): Promise<void> {
    const inviteTemplateId =
      env.emailjsDoctorInviteTemplateId ||
      env.emailjsTemplateId ||
      env.emailjsWelcomeTemplateId;

    if (!inviteTemplateId) {
      return;
    }

    if (!env.emailjsServiceId || !env.emailjsPublicKey || !env.emailjsPrivateKey) {
      logger.warn(
        { email: payload.email },
        'Doctor invite email skipped because email delivery config is missing',
      );
      return;
    }

    try {
      await emailjs.send(
        env.emailjsServiceId,
        inviteTemplateId,
        {
          otp: payload.rawPassword ?? '',
          passcode: payload.rawPassword ?? '',
          code: payload.rawPassword ?? '',
          verification_code: payload.rawPassword ?? '',
          name: payload.name,
          to_name: payload.name,
          user_name: payload.name,
          email: payload.email,
          to_email: payload.email,
          user_email: payload.email,
          from_name: env.emailSenderName,
          from_email: env.emailSenderAddress,
          reply_to: env.emailSenderAddress,
          role: 'doctor',
          app_name: 'Care Loop',
          clinic_name: payload.clinicName,
          login_email: payload.email,
          temporary_password: payload.rawPassword ?? '',
          temp_password: payload.rawPassword ?? '',
          password: payload.rawPassword ?? '',
          raw_password: payload.rawPassword ?? '',
          login_url: 'http://localhost:5175/login',
          expiry_minutes: 'Use this as your temporary login password',
          subject: `You have been invited to join ${payload.clinicName} on Care Loop`,
          message: payload.rawPassword
            ? `You have been invited to join ${payload.clinicName} as a doctor.

Login email: ${payload.email}
Temporary password: ${payload.rawPassword}

Please use this temporary password to log in, then change your password immediately after signing in.`
            : `You have been invited to join ${payload.clinicName} as a doctor. Please log in to access your dashboard.`,
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
    if (!env.emailjsServiceId || !env.emailjsPublicKey || !env.emailjsPrivateKey) {
      throw new AppError('Email delivery is not configured on the server.', 500);
    }

    if (!env.emailjsTemplateId) {
      throw new AppError('OTP email template is not configured on the server.', 500);
    }
  }
}

export const portalEmailService = new PortalEmailService();
