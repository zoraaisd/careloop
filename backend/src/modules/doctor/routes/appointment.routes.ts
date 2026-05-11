import { Router } from 'express';

import { asyncHandler } from '../../../common/utils/async-handler';
import { validateRequest } from '../../../common/utils/validate-request';
import { CreateAppointmentDto } from '../dto/create-appointment.dto';
import { AppointmentController } from '../controllers/appointment.controller';

const appointmentRouter = Router();

appointmentRouter.get('/', asyncHandler(AppointmentController.listAppointments));
appointmentRouter.post(
  '/',
  asyncHandler(async (req, _res, next) => {
    await validateRequest(CreateAppointmentDto, req.body);
    next();
  }),
  asyncHandler(AppointmentController.createAppointment),
);
appointmentRouter.patch(
  '/:appointmentId',
  asyncHandler(async (req, _res, next) => {
    await validateRequest(CreateAppointmentDto, req.body);
    next();
  }),
  asyncHandler(AppointmentController.updateAppointment),
);
appointmentRouter.patch(
  '/:appointmentId/cancel',
  asyncHandler(AppointmentController.cancelAppointment),
);

export { appointmentRouter };
