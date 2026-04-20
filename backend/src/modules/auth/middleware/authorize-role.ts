import type { NextFunction, Request, Response } from 'express';

import type { UserRole } from '../../../entities/user.entity';
import { AppError } from '../../../common/errors/app-error';

export const authorizeRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!(req as any).user) {
      next(new AppError('Unauthenticated request', 401));
      return;
    }

    if (!allowedRoles.includes((req as any).user.role)) {
      next(new AppError('Forbidden: insufficient permissions', 403));
      return;
    }

    next();
  };
};
