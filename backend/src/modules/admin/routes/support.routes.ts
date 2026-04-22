import { Router } from 'express';

import { asyncHandler } from '../../../common/utils/async-handler';
import { adminSupportController } from '../controllers/admin-support.controller';

const supportRouter = Router();

supportRouter.get('/tickets', adminSupportController.getTickets);
supportRouter.get('/tickets/:ticketId/responses', adminSupportController.getTicketResponses);
supportRouter.post('/tickets/:ticketId/respond', asyncHandler(adminSupportController.respondToTicket));

export { supportRouter };
