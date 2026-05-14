import { Router } from 'express';
import { asyncHandler } from '../../../common/utils/async-handler';
import { PatientPaymentController } from '../controllers/patient-payment.controller';

const patientPaymentRouter = Router();

patientPaymentRouter.post('/', asyncHandler(PatientPaymentController.createPayment));
patientPaymentRouter.get('/:patientId', asyncHandler(PatientPaymentController.getPatientPayments));

export { patientPaymentRouter };
