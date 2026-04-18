import { Router } from 'express';

import { adminRouter } from '../modules/admin/admin.routes';
import { authRouter } from '../modules/auth/routes/auth.routes';
import { doctorRouter } from '../modules/doctor/routes/doctor.routes';
import { patientRouter } from '../modules/patient/patient.routes';

const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/doctor', doctorRouter);
apiRouter.use('/patient', patientRouter);

export { apiRouter };
