import { Router } from 'express';

import { upload } from '../../../common/middleware/upload.middleware';
import { asyncHandler } from '../../../common/utils/async-handler';
import { adminSupportController } from '../controllers/admin-support.controller';

const supportRouter = Router();

supportRouter.get('/tickets', asyncHandler(adminSupportController.getTickets));
supportRouter.get('/tickets/:ticketId/responses', asyncHandler(adminSupportController.getTicketResponses));
supportRouter.patch('/tickets/:ticketId/open', asyncHandler(adminSupportController.markTicketOpened));
supportRouter.post(
  '/tickets/:ticketId/respond',
  upload.single('attachment'),
  asyncHandler(adminSupportController.respondToTicket),
);

export { supportRouter };
