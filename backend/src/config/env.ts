import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

const cwdEnvPath = path.resolve(process.cwd(), '.env');
const backendEnvPath = path.resolve(process.cwd(), 'backend', '.env');

dotenv.config({
  path: fs.existsSync(cwdEnvPath) ? cwdEnvPath : backendEnvPath,
});

const DEFAULT_JWT_SECRET = 'change-me-in-production';

const parseNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseBoolean = (
  value: string | undefined,
  fallback: boolean,
): boolean => {
  if (value === undefined) {
    return fallback;
  }

  return value.toLowerCase() === 'true';
};

const parseList = (value: string | undefined, fallback: string[]): string[] => {
  if (!value) {
    return fallback;
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const clean = (value: string | undefined, fallback: string): string =>
  (value ?? fallback).trim();

export const env = {
  nodeEnv: clean(process.env.NODE_ENV, 'development'),
  isProduction: clean(process.env.NODE_ENV, 'development') === 'production',
  port: parseNumber(process.env.PORT, 4000),
  apiPrefix: clean(process.env.API_PREFIX, '/api'),
  backendPublicUrl: clean(
    process.env.BACKEND_PUBLIC_URL,
    `http://localhost:${parseNumber(process.env.PORT, 4000)}`,
  ),
  frontendOrigin: clean(process.env.FRONTEND_ORIGIN, 'http://localhost:5173'),
  frontendOrigins: parseList(process.env.FRONTEND_ORIGINS, [
    process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
  ]),
  jwtSecret: clean(process.env.JWT_SECRET, DEFAULT_JWT_SECRET),
  jwtExpiresIn: clean(process.env.JWT_EXPIRES_IN, '7d'),
  dbHost: clean(process.env.DB_HOST, 'localhost'),
  dbPort: parseNumber(process.env.DB_PORT, 5432),
  dbUsername: clean(process.env.DB_USERNAME, 'postgres'),
  dbPassword: clean(process.env.DB_PASSWORD, 'postgres'),
  dbName: clean(process.env.DB_NAME, 'meditracker'),
  dbLogging: parseBoolean(process.env.DB_LOGGING, false),
  dbAutoInitialize: parseBoolean(process.env.DB_AUTO_INITIALIZE, false),
  dbRunMigrations: parseBoolean(process.env.DB_RUN_MIGRATIONS, false),
  dbSynchronize: parseBoolean(process.env.DB_SYNCHRONIZE, false),
  bootstrapAdminOnStart: parseBoolean(
    process.env.BOOTSTRAP_ADMIN_ON_START,
    true,
  ),
  bootstrapAdminName: process.env.BOOTSTRAP_ADMIN_NAME ?? 'Admin User',
  bootstrapAdminEmail:
    process.env.BOOTSTRAP_ADMIN_EMAIL ?? 'admin123@gmail.com',
  bootstrapAdminPhone: process.env.BOOTSTRAP_ADMIN_PHONE ?? '+910000000000',
  bootstrapAdminPassword:
    process.env.BOOTSTRAP_ADMIN_PASSWORD ?? 'admin123',
  rateLimitWindowMs: parseNumber(
    process.env.RATE_LIMIT_WINDOW_MS,
    15 * 60 * 1000,
  ),
  rateLimitMaxRequests: parseNumber(process.env.RATE_LIMIT_MAX_REQUESTS, 100),
  trustProxy: parseBoolean(process.env.TRUST_PROXY, false),
  razorpayKeyId: process.env.RAZORPAY_KEY_ID ?? '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET ?? '',
  razorpayCompanyName: process.env.RAZORPAY_COMPANY_NAME ?? 'Meditracker',
  subscriptionAdminUpiId: process.env.SUBSCRIPTION_ADMIN_UPI_ID ?? '',
  subscriptionAdminName:
    process.env.SUBSCRIPTION_ADMIN_NAME ?? 'Meditracker Admin',
  subscriptionSupportPhone:
    process.env.SUBSCRIPTION_SUPPORT_PHONE ?? process.env.BOOTSTRAP_ADMIN_PHONE ?? '',
  emailjsServiceId: process.env.EMAILJS_SERVICE_ID ?? '',
  emailjsTemplateId: process.env.EMAILJS_TEMPLATE_ID ?? '',
  emailjsPublicKey: process.env.EMAILJS_PUBLIC_KEY ?? '',
  emailjsPrivateKey: process.env.EMAILJS_PRIVATE_KEY ?? '',
  emailjsWelcomeTemplateId: process.env.EMAILJS_WELCOME_TEMPLATE_ID ?? '',
  emailjsDoctorInviteTemplateId: process.env.EMAILJS_DOCTOR_INVITE_TEMPLATE_ID ?? '',
  emailjsSupportTemplateId: process.env.EMAILJS_SUPPORT_TEMPLATE_ID ?? '',
  emailjsTicketServiceId: process.env.EMAIL_JS_TICKET_SERVICE_ID ?? '',
  emailjsTicketPrivateKey: process.env.EMAIL_JS_TICKET_PRIVATE_KEY ?? '',
  emailjsTicketPublicKey: process.env.EMAIL_JS_TICKET_PUBLIC_KEY ?? '',
  emailjsTicketTemplateId: process.env.EMAIL_JS_TICKET_TEMPLATE ?? '',
  emailSenderName: process.env.EMAIL_SENDER_NAME ?? 'Careloop',
  emailSenderAddress: process.env.EMAIL_SENDER_ADDRESS ?? 'mmuni6467@gmail.com',
  signupOtpExpiresMinutes: parseNumber(process.env.SIGNUP_OTP_EXPIRES_MINUTES, 5),
  signupOtpResendSeconds: parseNumber(process.env.SIGNUP_OTP_RESEND_SECONDS, 30),
  signupOtpMaxAttempts: parseNumber(process.env.SIGNUP_OTP_MAX_ATTEMPTS, 5),
  signupOtpVerifiedTokenExpiresIn:
    process.env.SIGNUP_OTP_VERIFIED_TOKEN_EXPIRES_IN ?? '30m',
  devDoctorLoginPassword:
    process.env.DEV_DOCTOR_LOGIN_PASSWORD ?? 'doctor123',
};

if (env.isProduction && env.jwtSecret === DEFAULT_JWT_SECRET) {
  throw new Error('JWT_SECRET must be set to a strong value in production');
}

export type AppEnvironment = typeof env;
