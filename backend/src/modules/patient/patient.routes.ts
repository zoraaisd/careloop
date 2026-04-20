import { Router } from 'express';

import { UserRole } from '../../entities/user.entity';
import { authenticateToken } from '../auth/middleware/authenticate-token';
import { authorizeRole } from '../auth/middleware/authorize-role';

const patientRouter = Router();

patientRouter.get(
  '/home',
  authenticateToken,
  authorizeRole(UserRole.PATIENT),
  (_req, res) => {
    res.status(200).json({
      message: 'Patient API is ready for auth-frontend home integration',
      client: 'auth-frontend',
    });
  },
);

export { patientRouter };
