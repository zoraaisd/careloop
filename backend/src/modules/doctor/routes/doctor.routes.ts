import { Router } from 'express';

import { UserRole } from '../../../entities/user.entity';
import { asyncHandler } from '../../../common/utils/async-handler';
import { authenticateToken } from '../../auth/middleware/authenticate-token';
import { authorizeRole } from '../../auth/middleware/authorize-role';
import { DoctorAccessController } from '../controllers/doctor-access.controller';
import { enforceDoctorPortalAccess } from '../middleware/enforce-doctor-portal-access';
import { appointmentRouter } from './appointment.routes';
import { calendarRouter } from './calendar.routes';
import { chatRouter } from './chat.routes';
import { dashboardRouter } from './dashboard.routes';
import { doctorManagementRouter } from './doctor-management.routes';
import { expenseRouter } from './expense.routes';
import { inventoryRouter } from './inventory.routes';
import { patientRouter } from './patient.routes';
import { prescriptionRouter } from './prescription.routes';
import { reportRouter } from './report.routes';

const doctorRouter = Router();

doctorRouter.use(authenticateToken, authorizeRole(UserRole.DOCTOR));
doctorRouter.get('/access-state', DoctorAccessController.getAccessState);
doctorRouter.post('/invite', DoctorAccessController.inviteDoctor);
doctorRouter.post('/subscribe', asyncHandler(DoctorAccessController.subscribeToPlan));
doctorRouter.get('/subscription/plans', asyncHandler(DoctorAccessController.getSubscriptionPlans));
doctorRouter.post('/create-payment-order', asyncHandler(DoctorAccessController.createPaymentOrder));
doctorRouter.post('/verify-payment', asyncHandler(DoctorAccessController.verifyPayment));
doctorRouter.use(enforceDoctorPortalAccess);
doctorRouter.use('/dashboard', dashboardRouter);
doctorRouter.use('/doctors', doctorManagementRouter);
doctorRouter.use('/patients', patientRouter);
doctorRouter.use('/appointments', appointmentRouter);
doctorRouter.use('/calendar', calendarRouter);
doctorRouter.use('/prescriptions', prescriptionRouter);
doctorRouter.use('/chats', chatRouter);
doctorRouter.use('/inventory', inventoryRouter);
doctorRouter.use('/expenses', expenseRouter);
doctorRouter.use('/reports', reportRouter);

export { doctorRouter };
