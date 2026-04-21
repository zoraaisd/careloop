import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { AppError } from '../../../common/errors/app-error';
import { env } from '../../../config/env';
import type { AuthenticatedUser } from '../types/auth.types';

export const authenticateToken = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : undefined;

  if (!token) {
    next(new AppError('Authentication token is required', 401));
    return;
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret) as AuthenticatedUser;
    (req as any).user = decoded;
    next();
  } catch (_error) {
    next(new AppError('Invalid or expired token', 401));
  }
};
