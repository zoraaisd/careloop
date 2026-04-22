import { Router } from 'express';

import { adminDashboardController } from '../controllers/admin-dashboard.controller';

const dashboardRouter = Router();

dashboardRouter.get('/', adminDashboardController.getDashboard);

export { dashboardRouter };
