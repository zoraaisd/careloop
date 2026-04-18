import 'reflect-metadata';
import { createServer } from 'node:http';

import { app } from './app';
import { logger } from './common/logger';
import { AppDataSource } from './config/data-source';
import { env } from './config/env';
import { BootstrapAdminService } from './modules/auth/services/bootstrap-admin.service';

const bootstrapAdminService = new BootstrapAdminService();

const startServer = async (): Promise<void> => {
  if (env.dbAutoInitialize) {
    try {
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }
      if (env.dbRunMigrations) {
        await AppDataSource.runMigrations();
        logger.info('Database migrations executed');
      }
      await bootstrapAdminService.ensureDefaultAdmin();
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

  const server = createServer(app);

  server.listen(env.port, () => {
    logger.info(`Backend server listening on port ${env.port}`);
  });

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    logger.info({ signal }, 'Shutdown signal received');

    server.close(async () => {
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
        logger.info('Database connection closed');
      }

      logger.info('HTTP server closed');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
};

void startServer();
