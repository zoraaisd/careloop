import type { NextFunction, Request, Response } from 'express';

import { logger } from '../logger';

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  (req as any).log = logger.child({
    requestId: crypto.randomUUID(),
    method: req.method,
    url: req.originalUrl,
  });

  (req as any).log.info('Incoming request');

  res.on('finish', () => {
    (req as any).log.info({ statusCode: res.statusCode }, 'Request completed');
  });

  next();
};
