import { Router } from 'express';

import { asyncHandler } from '../../../common/utils/async-handler';
import { AuthController } from '../controllers/auth.controller';
import { PublicDoctorController } from '../controllers/public-doctor.controller';

const authRouter = Router();

authRouter.get('/public/doctors', asyncHandler(PublicDoctorController.getApprovedDoctors));
authRouter.get('/public/doctors/:doctorId', asyncHandler(PublicDoctorController.getApprovedDoctorById));
authRouter.get('/public/doctors/:doctorId/availability', asyncHandler(PublicDoctorController.getApprovedDoctorAvailability));
authRouter.post('/public/doctors/:doctorId/appointments', asyncHandler(PublicDoctorController.createPublicAppointment));
authRouter.post('/signup', asyncHandler(AuthController.signup));
authRouter.post('/login', asyncHandler(AuthController.login));

export { authRouter };
