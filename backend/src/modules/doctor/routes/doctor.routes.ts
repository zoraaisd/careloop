import { Router } from 'express';

import { UserRole } from '../../../entities/user.entity';
import { authenticateToken } from '../../auth/middleware/authenticate-token';
import { authorizeRole } from '../../auth/middleware/authorize-role';
import { appointmentRouter } from './appointment.routes';
import { calendarRouter } from './calendar.routes';
import { chatRouter } from './chat.routes';
import { dashboardRouter } from './dashboard.routes';
import { expenseRouter } from './expense.routes';
import { inventoryRouter } from './inventory.routes';
import { patientRouter } from './patient.routes';
import { prescriptionRouter } from './prescription.routes';
import { reportRouter } from './report.routes';

const doctorRouter = Router();

doctorRouter.use(authenticateToken, authorizeRole(UserRole.DOCTOR));
doctorRouter.use('/dashboard', dashboardRouter);
doctorRouter.use('/patients', patientRouter);
doctorRouter.use('/appointments', appointmentRouter);
doctorRouter.use('/calendar', calendarRouter);
doctorRouter.use('/prescriptions', prescriptionRouter);
doctorRouter.use('/chats', chatRouter);
doctorRouter.use('/inventory', inventoryRouter);
doctorRouter.use('/expenses', expenseRouter);
doctorRouter.use('/reports', reportRouter);

export { doctorRouter };
