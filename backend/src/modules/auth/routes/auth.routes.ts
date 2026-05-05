import { Router } from 'express';

import { asyncHandler } from '../../../common/utils/async-handler';
import { AuthController } from '../controllers/auth.controller';
import { PublicDoctorController } from '../controllers/public-doctor.controller';

const authRouter = Router();

authRouter.get('/public/doctors', asyncHandler(PublicDoctorController.getApprovedDoctors));
authRouter.get('/public/doctors/:doctorId', asyncHandler(PublicDoctorController.getApprovedDoctorById));
authRouter.get('/public/doctors/:doctorId/availability', asyncHandler(PublicDoctorController.getApprovedDoctorAvailability));
authRouter.get('/public/doctors/:doctorId/reviews', asyncHandler(PublicDoctorController.getDoctorReviews));
authRouter.post('/public/doctors/:doctorId/appointments', asyncHandler(PublicDoctorController.createPublicAppointment));
authRouter.post('/public/doctors/:doctorId/reviews', asyncHandler(PublicDoctorController.createDoctorReview));
authRouter.post('/signup/request-otp-email', asyncHandler(AuthController.requestSignupOtpEmail));
authRouter.post('/signup/request-otp', asyncHandler(AuthController.requestSignupOtp));
authRouter.post('/signup/verify-otp', asyncHandler(AuthController.verifySignupOtp));
authRouter.post('/signup', asyncHandler(AuthController.signup));
authRouter.post('/login', asyncHandler(AuthController.login));
authRouter.post('/password/request-otp', asyncHandler(AuthController.requestPasswordResetOtp));
authRouter.post('/password/reset', asyncHandler(AuthController.resetPasswordWithOtp));

export { authRouter };
