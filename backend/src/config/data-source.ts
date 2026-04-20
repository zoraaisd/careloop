import path from 'node:path';

import { DataSource } from 'typeorm';

import { env } from './env';

const rootDirectory = path.resolve(__dirname, '..');
const extension = env.nodeEnv === 'production' ? 'js' : 'ts';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: env.dbHost,
  port: env.dbPort,
  username: env.dbUsername,
  password: env.dbPassword,
  database: env.dbName,
  synchronize: env.nodeEnv === 'development',
  logging: env.dbLogging,
  entities: [path.join(rootDirectory, `entities/**/*.${extension}`)],
  migrations: [path.join(rootDirectory, `migrations/**/*.${extension}`)],
  migrationsTableName: 'typeorm_migrations',
});
