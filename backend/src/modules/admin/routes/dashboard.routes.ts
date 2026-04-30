import { Router } from 'express';

import { asyncHandler } from '../../../common/utils/async-handler';
import { adminDashboardController } from '../controllers/admin-dashboard.controller';

const dashboardRouter = Router();

dashboardRouter.get('/', asyncHandler(adminDashboardController.getDashboard.bind(adminDashboardController)));
dashboardRouter.get('/users/trial', asyncHandler(adminDashboardController.getTrialUsers.bind(adminDashboardController)));
dashboardRouter.get('/users/subscribed', asyncHandler(adminDashboardController.getSubscribedUsers.bind(adminDashboardController)));
dashboardRouter.get('/users/all', asyncHandler(adminDashboardController.getAllDoctors.bind(adminDashboardController)));

export { dashboardRouter };
