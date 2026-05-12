import 'reflect-metadata';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import { app } from './app';
import { logger } from './common/logger';
import { BootstrapAdminService } from './common/services/bootstrap-admin.service';
import { AppDataSource } from './config/data-source';
import { env } from './config/env';
import { setupWhatsappCron } from './modules/whatsapp-healthcare/services/whatsapp-cron.service';
import { socketService } from './common/services/socket.service';

const bootstrapAdminService = new BootstrapAdminService();

const startServer = async (): Promise<void> => {
  if (env.dbAutoInitialize) {
    try {
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }
      if (env.dbRunMigrations) {
        await AppDataSource.runMigrations();
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

  // Setup multi-tenant WhatsApp cron jobs
  setupWhatsappCron();

  const server = createServer(app);

  // Initialize Socket.io
  socketService.init(server);

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      logger.error(
        { port: env.port },
        `Port ${env.port} is already in use. Stop the existing process or change PORT in backend/.env.`,
      );
      process.exit(1);
    }

    logger.error({ err: error }, 'HTTP server failed to start');
    process.exit(1);
  });

  server.listen(env.port, () => {
    const address = server.address() as AddressInfo | null;
    logger.info(`Backend server listening on port ${address?.port ?? env.port}`);
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
