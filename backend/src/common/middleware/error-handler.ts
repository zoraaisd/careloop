import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../errors/app-error';
import { logger } from '../logger';

export const globalErrorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  logger.error({ err: error }, 'Unhandled application error');

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      message: error.message,
      details: error.details,
    });
    return;
  }

  res.status(500).json({
    message: 'Internal server error',
  });
};
