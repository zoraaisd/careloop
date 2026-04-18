import { Router } from 'express';

import { UserRole } from '../../entities/user.entity';
import { authenticateToken } from '../auth/middleware/authenticate-token';
import { authorizeRole } from '../auth/middleware/authorize-role';

const adminRouter = Router();

adminRouter.get(
  '/dashboard',
  authenticateToken,
  authorizeRole(UserRole.ADMIN),
  (_req, res) => {
    res.status(200).json({
      message: 'Admin API is ready for admin-frontend integration',
      client: 'admin-frontend',
    });
  },
);

export { adminRouter };
