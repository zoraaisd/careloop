import { Router } from 'express';

import { adminRouter } from '../modules/admin/admin.routes';
import { adminAuthRouter } from '../modules/admin/routes/admin-auth.routes';
import { doctorRouter } from '../modules/doctor/routes/doctor.routes';
import { doctorAuthRouter } from '../modules/doctor/routes/doctor-auth.routes';
import { fileRouter } from '../modules/files/routes/file.routes';
import { patientRouter } from '../modules/patient/patient.routes';
import { whatsappHealthcareRouter } from '../modules/whatsapp-healthcare/routes/whatsapp-healthcare.routes';
import { supportChatRouter } from '../modules/admin/routes/support-chat.routes';

const apiRouter = Router();

apiRouter.use('/files', fileRouter);
apiRouter.use('/support-chat', supportChatRouter);
apiRouter.use('/admin/auth', adminAuthRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/doctor/auth', doctorAuthRouter);
apiRouter.use('/doctor', doctorRouter);
apiRouter.use('/patient', patientRouter);
apiRouter.use('/whatsapp', whatsappHealthcareRouter);

export { apiRouter };
