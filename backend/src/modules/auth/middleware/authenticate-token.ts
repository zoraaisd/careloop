import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { AppError } from '../../../common/errors/app-error';
import { logger } from '../../../common/logger';
import { AppDataSource } from '../../../config/data-source';
import { env } from '../../../config/env';
import { User } from '../../../entities/user.entity';
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
    logger.warn(
      { method: req.method, path: req.originalUrl },
      'Authentication failed: missing bearer token',
    );
    next(new AppError('Authentication token is required', 401));
    return;
  }

  void (async () => {
    try {
      const decoded = jwt.verify(token, env.jwtSecret) as AuthenticatedUser;
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { id: decoded.userId },
        select: ['id', 'sessionVersion'],
      });

      if (!user) {
        logger.warn(
          { method: req.method, path: req.originalUrl, userId: decoded.userId },
          'Authentication failed: token user not found',
        );
        next(new AppError('Invalid or expired token', 401));
        return;
      }

      if ((decoded.sessionVersion ?? -1) !== (user.sessionVersion ?? 0)) {
        logger.warn(
          {
            method: req.method,
            path: req.originalUrl,
            userId: decoded.userId,
            tokenSessionVersion: decoded.sessionVersion ?? null,
            dbSessionVersion: user.sessionVersion ?? 0,
          },
          'Authentication failed: session version mismatch',
        );
        next(new AppError('Session expired. Please login again.', 401));
        return;
      }

      (req as any).user = decoded;
      next();
    } catch (error) {
      logger.warn(
        { method: req.method, path: req.originalUrl, err: error },
        'Authentication failed: invalid or expired JWT',
      );
      next(new AppError('Invalid or expired token', 401));
    }
  })();
};
