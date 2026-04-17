import type { NextFunction, Request, Response } from 'express';

import { logger } from '../utils/logger';

export const globalErrorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  logger.error({ err: error }, 'Unhandled application error');

  res.status(500).json({
    message: 'Internal server error',
  });
};
