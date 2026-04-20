import { Router } from 'express';

import { asyncHandler } from '../../../common/utils/async-handler';
import { DoctorDashboardController } from '../controllers/doctor-dashboard.controller';

const dashboardRouter = Router();

dashboardRouter.get('/', asyncHandler(DoctorDashboardController.getDashboard));

export { dashboardRouter };
