import { Router } from 'express';

import { asyncHandler } from '../../../common/utils/async-handler';
import { authenticateToken } from '../../../common/middleware/authenticate-token';
import { authorizeRole } from '../../../common/middleware/authorize-role';
import { UserRole } from '../../../entities/user.entity';
import { DoctorAuthController } from '../controllers/doctor-auth.controller';

const doctorAuthRouter = Router();

doctorAuthRouter.post('/login', asyncHandler(DoctorAuthController.login));
doctorAuthRouter.post('/complete-first-login', asyncHandler(DoctorAuthController.completeFirstLogin));
doctorAuthRouter.post('/forgot-password', asyncHandler(DoctorAuthController.forgotPassword));
doctorAuthRouter.post('/reset-password', asyncHandler(DoctorAuthController.resetPassword));
doctorAuthRouter.post(
  '/change-password',
  authenticateToken,
  authorizeRole(UserRole.DOCTOR),
  asyncHandler(DoctorAuthController.changePassword),
);

export { doctorAuthRouter };
