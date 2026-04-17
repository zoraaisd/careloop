import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({
  path: path.resolve(process.cwd(), '.env'),
});

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

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseNumber(process.env.PORT, 4000),
  apiPrefix: process.env.API_PREFIX ?? '/api',
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
  dbHost: process.env.DB_HOST ?? 'localhost',
  dbPort: parseNumber(process.env.DB_PORT, 5432),
  dbUsername: process.env.DB_USERNAME ?? 'postgres',
  dbPassword: process.env.DB_PASSWORD ?? 'postgres',
  dbName: process.env.DB_NAME ?? 'meditracker',
  dbLogging: parseBoolean(process.env.DB_LOGGING, false),
  dbAutoInitialize: parseBoolean(process.env.DB_AUTO_INITIALIZE, false),
  rateLimitWindowMs: parseNumber(
    process.env.RATE_LIMIT_WINDOW_MS,
    15 * 60 * 1000,
  ),
  rateLimitMaxRequests: parseNumber(process.env.RATE_LIMIT_MAX_REQUESTS, 100),
};

export type AppEnvironment = typeof env;
