import { Router } from 'express';

import { asyncHandler } from '../../../common/utils/async-handler';
import { adminRevenueController } from '../controllers/admin-revenue.controller';

const revenueRouter = Router();

revenueRouter.get('/', asyncHandler(adminRevenueController.getRevenueStatistics));

export { revenueRouter };
