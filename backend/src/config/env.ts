import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({
  path: path.resolve(process.cwd(), '.env'),
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

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: (process.env.NODE_ENV ?? 'development') === 'production',
  port: parseNumber(process.env.PORT, 4000),
  apiPrefix: process.env.API_PREFIX ?? '/api',
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
  frontendOrigins: parseList(process.env.FRONTEND_ORIGINS, [
    process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
  ]),
  jwtSecret: process.env.JWT_SECRET ?? DEFAULT_JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  dbHost: process.env.DB_HOST ?? 'localhost',
  dbPort: parseNumber(process.env.DB_PORT, 5432),
  dbUsername: process.env.DB_USERNAME ?? 'postgres',
  dbPassword: process.env.DB_PASSWORD ?? 'postgres',
  dbName: process.env.DB_NAME ?? 'meditracker',
  dbLogging: parseBoolean(process.env.DB_LOGGING, false),
  dbAutoInitialize: parseBoolean(process.env.DB_AUTO_INITIALIZE, false),
  dbRunMigrations: parseBoolean(process.env.DB_RUN_MIGRATIONS, false),
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
};

if (env.isProduction && env.jwtSecret === DEFAULT_JWT_SECRET) {
  throw new Error('JWT_SECRET must be set to a strong value in production');
}

export type AppEnvironment = typeof env;
