import { Router } from 'express';

import { asyncHandler } from '../../../common/utils/async-handler';
import { adminBillingController } from '../controllers/admin-billing.controller';

const billingRouter = Router();

billingRouter.get('/', asyncHandler(adminBillingController.getBillingData));
billingRouter.get('/overview', asyncHandler(adminBillingController.getOverview));
billingRouter.get('/subscription-plans', asyncHandler(adminBillingController.getPlans));
billingRouter.post('/subscription-plans', asyncHandler(adminBillingController.createPlan));
billingRouter.patch('/subscription-plans/:id', asyncHandler(adminBillingController.updatePlan));
billingRouter.delete('/subscription-plans/:id', asyncHandler(adminBillingController.deletePlan));
billingRouter.get('/clinic-subscriptions', asyncHandler(adminBillingController.getClinicSubscriptions));
billingRouter.get('/payments', asyncHandler(adminBillingController.getPayments));

export { billingRouter };
