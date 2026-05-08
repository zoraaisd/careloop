import { Router } from 'express';

import { asyncHandler } from '../../../common/utils/async-handler';
import { validateRequest } from '../../../common/utils/validate-request';
import { PatientController } from '../controllers/patient.controller';
import { CreatePatientDto } from '../dto/create-patient.dto';
import { UpdatePatientDto } from '../dto/update-patient.dto';

const patientRouter = Router();

patientRouter.get('/', asyncHandler(PatientController.listPatients));
patientRouter.post(
  '/',
  asyncHandler(async (req, _res, next) => {
    await validateRequest(CreatePatientDto, req.body);
    next();
  }),
  asyncHandler(PatientController.createPatient),
);
patientRouter.post('/:patientId/send-otp', asyncHandler(PatientController.sendOtp));
patientRouter.patch(
  '/:patientId',
  asyncHandler(async (req, _res, next) => {
    await validateRequest(UpdatePatientDto, req.body);
    next();
  }),
  asyncHandler(PatientController.updatePatient),
);
patientRouter.post(
  '/:patientId/send-slots',
  asyncHandler(PatientController.sendSlots),
);
patientRouter.delete(
  '/:patientId',
  asyncHandler(PatientController.deletePatient),
);

export { patientRouter };
