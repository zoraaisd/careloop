import { Router } from 'express';

import { asyncHandler } from '../../../common/utils/async-handler';
import { adminDashboardController } from '../controllers/admin-dashboard.controller';

const dashboardRouter = Router();

dashboardRouter.get('/', asyncHandler(adminDashboardController.getDashboard.bind(adminDashboardController)));

export { dashboardRouter };
