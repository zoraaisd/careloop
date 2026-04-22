import { Router } from 'express';

import { adminRevenueController } from '../controllers/admin-revenue.controller';

const revenueRouter = Router();

revenueRouter.get('/', adminRevenueController.getRevenueStatistics);

export { revenueRouter };
