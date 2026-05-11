import { Router } from 'express';

import { UserRole } from '../../entities/user.entity';
import { authenticateToken } from '../../common/middleware/authenticate-token';
import { authorizeRole } from '../../common/middleware/authorize-role';

const patientRouter = Router();

patientRouter.get(
  '/home',
  authenticateToken,
  authorizeRole(UserRole.PATIENT),
  (_req, res) => {
    res.status(200).json({
      message: 'Patient API is ready',
      client: 'patient',
    });
  },
);

export { patientRouter };
