import { Router } from 'express';

import { asyncHandler } from '../../../common/utils/async-handler';
import { adminDoctorController } from '../controllers/admin-doctor.controller';

const doctorAdminRouter = Router();

doctorAdminRouter.get('/requests', asyncHandler(adminDoctorController.getDoctorRequests.bind(adminDoctorController)));
doctorAdminRouter.get('/deletion-logs', asyncHandler(adminDoctorController.getDoctorDeletionLogs.bind(adminDoctorController)));
doctorAdminRouter.get('/:doctorId', asyncHandler(adminDoctorController.getDoctorById.bind(adminDoctorController)));
doctorAdminRouter.patch('/:doctorId/approve', asyncHandler(adminDoctorController.approveDoctor.bind(adminDoctorController)));
doctorAdminRouter.patch('/:doctorId/reject', asyncHandler(adminDoctorController.rejectDoctor.bind(adminDoctorController)));
doctorAdminRouter.patch('/:doctorId', asyncHandler(adminDoctorController.updateDoctor.bind(adminDoctorController)));
doctorAdminRouter.delete('/:doctorId', asyncHandler(adminDoctorController.deleteDoctor.bind(adminDoctorController)));

export { doctorAdminRouter };
