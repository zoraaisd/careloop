import type { NextFunction, Request, Response } from 'express';

import { logger } from '../utils/logger';

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  req.log = logger.child({
    requestId: crypto.randomUUID(),
    method: req.method,
    url: req.originalUrl,
  });

  req.log.info('Incoming request');

  res.on('finish', () => {
    req.log.info({ statusCode: res.statusCode }, 'Request completed');
  });

  next();
};
