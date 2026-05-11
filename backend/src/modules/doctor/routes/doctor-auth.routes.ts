import { Router } from 'express';

import { asyncHandler } from '../../../common/utils/async-handler';
import { DoctorAuthController } from '../controllers/doctor-auth.controller';

const doctorAuthRouter = Router();

doctorAuthRouter.post('/login', asyncHandler(DoctorAuthController.login));

export { doctorAuthRouter };
