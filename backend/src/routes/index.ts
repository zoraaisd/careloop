import { Router } from 'express';

import { adminRouter } from '../modules/admin/admin.routes';
import { authRouter } from '../modules/auth/routes/auth.routes';
import { doctorRouter } from '../modules/doctor/routes/doctor.routes';
import { patientRouter } from '../modules/patient/patient.routes';
import { whatsappHealthcareRouter } from '../modules/whatsapp-healthcare/routes/whatsapp-healthcare.routes';

const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/doctor', doctorRouter);
apiRouter.use('/patient', patientRouter);
apiRouter.use('/', whatsappHealthcareRouter);

export { apiRouter };
