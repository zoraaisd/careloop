import { Router } from 'express';

import { adminBillingController } from '../controllers/admin-billing.controller';

const billingRouter = Router();

billingRouter.get('/', adminBillingController.getBillingData);
billingRouter.get('/overview', adminBillingController.getOverview);
billingRouter.get('/subscription-plans', adminBillingController.getPlans);
billingRouter.get('/clinic-subscriptions', adminBillingController.getClinicSubscriptions);
billingRouter.get('/payments', adminBillingController.getPayments);

export { billingRouter };
