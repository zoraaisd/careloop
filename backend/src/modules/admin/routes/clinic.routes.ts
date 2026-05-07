import { Router } from 'express';

import { asyncHandler } from '../../../common/utils/async-handler';
import { adminClinicController } from '../controllers/admin-clinic.controller';

const clinicRouter = Router();

clinicRouter.get('/', adminClinicController.getClinics);
clinicRouter.post('/', asyncHandler(adminClinicController.createClinic));
clinicRouter.post('/invite-doctor', asyncHandler(adminClinicController.inviteClinicDoctor));
clinicRouter.get('/requests', adminClinicController.getClinicRequests);
clinicRouter.patch('/requests/:requestId/status', asyncHandler(adminClinicController.updateClinicRequestStatus));
clinicRouter.get('/:clinicId', adminClinicController.getClinicById);
clinicRouter.delete('/:clinicId', asyncHandler(adminClinicController.deleteClinic));

export { clinicRouter };
