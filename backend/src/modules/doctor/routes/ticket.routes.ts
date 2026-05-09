import { Router } from 'express';
import { DoctorTicketController } from '../controllers/doctor-ticket.controller';
import { asyncHandler } from '../../../common/utils/async-handler';

import { upload } from '../../../common/middleware/upload.middleware';

const router = Router();

router.post('/', upload.single('file'), asyncHandler(DoctorTicketController.createTicket));
router.get('/', asyncHandler(DoctorTicketController.getMyTickets));

export default router;
