import { Router } from 'express';

import { asyncHandler } from '../../../common/utils/async-handler';
import { validateRequest } from '../../../common/utils/validate-request';
import { ChatController } from '../controllers/chat.controller';
import { CreateFollowUpDto } from '../dto/create-follow-up.dto';

const chatRouter = Router();

chatRouter.get('/', asyncHandler(ChatController.listChats));
chatRouter.get('/:chatId', asyncHandler(ChatController.getChat));
chatRouter.post('/:chatId/send-slots', asyncHandler(ChatController.sendSlots));
chatRouter.post(
  '/:chatId/follow-up',
  asyncHandler(async (req, _res, next) => {
    await validateRequest(CreateFollowUpDto, req.body);
    next();
  }),
  asyncHandler(ChatController.createFollowUp),
);

export { chatRouter };
