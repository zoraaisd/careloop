import { Router } from 'express';

import { UserRole } from '../../entities/user.entity';
import { authenticateToken } from '../auth/middleware/authenticate-token';
import { authorizeRole } from '../auth/middleware/authorize-role';
import { billingRouter } from './routes/billing.routes';
import { clinicRouter } from './routes/clinic.routes';
import { dashboardRouter } from './routes/dashboard.routes';
import { profileRouter } from './routes/profile.routes';
import { revenueRouter } from './routes/revenue.routes';
import { supportRouter } from './routes/support.routes';

const adminRouter = Router();

adminRouter.use(authenticateToken, authorizeRole(UserRole.ADMIN));
adminRouter.get('/', (_req, res) => {
  res.status(200).json({
    message: 'Admin API ready',
    sections: ['dashboard', 'profile', 'billing', 'clinics', 'revenue', 'support'],
  });
});
adminRouter.use('/dashboard', dashboardRouter);
adminRouter.use('/profile', profileRouter);
adminRouter.use('/billing', billingRouter);
adminRouter.use('/clinics', clinicRouter);
adminRouter.use('/revenue', revenueRouter);
adminRouter.use('/support', supportRouter);

export { adminRouter };
