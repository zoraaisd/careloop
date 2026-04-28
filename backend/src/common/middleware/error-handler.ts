import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../errors/app-error';
import { logger } from '../logger';
import { env } from '../../config/env';

export const globalErrorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  logger.error({ err: error, method: req.method, path: req.originalUrl }, 'Unhandled application error');

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      message: error.message,
      details: error.details,
    });
    return;
  }

  if (!env.isProduction) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const stack = error instanceof Error ? error.stack : undefined;
    res.status(500).json({
      message: 'Internal server error',
      debug: {
        message,
        stack,
      },
    });
    return;
  }

  res.status(500).json({
    message: 'Internal server error',
  });
};
