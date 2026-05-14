import { Router } from 'express';

import { asyncHandler } from '../../../common/utils/async-handler';
import { validateRequest } from '../../../common/utils/validate-request';
import { PrescriptionController } from '../controllers/prescription.controller';
import { CreatePrescriptionDto } from '../dto/create-prescription.dto';

const prescriptionRouter = Router();

prescriptionRouter.get('/', asyncHandler(PrescriptionController.listPrescriptions));
prescriptionRouter.post(
  '/',
  asyncHandler(async (req, _res, next) => {
    req.body = await validateRequest(CreatePrescriptionDto, req.body);
    next();
  }),
  asyncHandler(PrescriptionController.createPrescription),
);
prescriptionRouter.post(
  '/:prescriptionId/resend',
  asyncHandler(PrescriptionController.resendPrescription),
);
prescriptionRouter.get(
  '/patient/:patientId',
  asyncHandler(PrescriptionController.getPatientPrescriptions),
);
prescriptionRouter.post(
  '/:prescriptionId/send-pdf',
  asyncHandler(PrescriptionController.sendPrescriptionPdf),
);

export { prescriptionRouter };
