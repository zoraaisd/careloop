import { Router } from 'express';

import { asyncHandler } from '../../../common/utils/async-handler';
import { adminClinicController } from '../controllers/admin-clinic.controller';

const clinicRouter = Router();

clinicRouter.get('/', asyncHandler(adminClinicController.getClinics));
clinicRouter.post('/', asyncHandler(adminClinicController.createClinic));
clinicRouter.post('/invite-doctor', asyncHandler(adminClinicController.inviteClinicDoctor));
clinicRouter.get('/requests', asyncHandler(adminClinicController.getClinicRequests));
clinicRouter.patch('/requests/:requestId/status', asyncHandler(adminClinicController.updateClinicRequestStatus));
clinicRouter.get('/:clinicId', asyncHandler(adminClinicController.getClinicById));
clinicRouter.delete('/:clinicId', asyncHandler(adminClinicController.deleteClinic));

export { clinicRouter };
