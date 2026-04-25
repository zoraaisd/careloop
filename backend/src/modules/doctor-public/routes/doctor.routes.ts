import { Router } from 'express';

import { asyncHandler } from '../../../common/utils/async-handler';
import { DoctorController } from '../controllers/doctor.controller';

const publicDoctorRouter = Router();

publicDoctorRouter.get('/doctors', asyncHandler(DoctorController.getDoctors));
publicDoctorRouter.get('/doctors/:id', asyncHandler(DoctorController.getDoctorById));

export { publicDoctorRouter };
