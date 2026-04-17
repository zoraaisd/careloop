import 'reflect-metadata';

import { app } from './app';
import { AppDataSource } from './config/data-source';
import { env } from './config/env';
import { logger } from './utils/logger';

const startServer = async (): Promise<void> => {
  if (env.dbAutoInitialize) {
    try {
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }
      logger.info('Database connection initialized');
    } catch (error) {
      logger.error({ err: error }, 'Database initialization failed');
      process.exit(1);
    }
  } else {
    logger.warn(
      'Database auto initialization is disabled; skipping TypeORM connection',
    );
  }

  app.listen(env.port, () => {
    logger.info(`Backend server listening on port ${env.port}`);
  });
};

void startServer();
