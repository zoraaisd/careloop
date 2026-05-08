import { Router } from 'express';

import { asyncHandler } from '../../../common/utils/async-handler';
import { validateRequest } from '../../../common/utils/validate-request';
import { DoctorManagementController } from '../controllers/doctor-management.controller';
import { CreateDoctorDto } from '../dto/create-doctor.dto';

const doctorManagementRouter = Router();

doctorManagementRouter.get('/', asyncHandler(DoctorManagementController.listDoctors));
doctorManagementRouter.patch('/clinic-overview', asyncHandler(DoctorManagementController.updateClinicOverview));
doctorManagementRouter.patch('/clinic-assets', asyncHandler(DoctorManagementController.updateClinicAssets));
doctorManagementRouter.delete('/clinic-assets/:assetType', asyncHandler(DoctorManagementController.deleteClinicAsset));
doctorManagementRouter.get('/:doctorId', asyncHandler(DoctorManagementController.getDoctorDetails));
doctorManagementRouter.patch('/:doctorId', asyncHandler(DoctorManagementController.updateDoctor));
doctorManagementRouter.post(
  '/',
  asyncHandler(async (req, _res, next) => {
    await validateRequest(CreateDoctorDto, req.body);
    next();
  }),
  asyncHandler(DoctorManagementController.createDoctor),
);

export { doctorManagementRouter };

