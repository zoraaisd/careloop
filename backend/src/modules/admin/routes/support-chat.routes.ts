import { Router } from 'express';
import { SupportChatController } from '../controllers/support-chat.controller';
import { asyncHandler } from '../../../common/utils/async-handler';
import { authenticateToken } from '../../../common/middleware/authenticate-token';

const supportChatRouter = Router();

supportChatRouter.use(authenticateToken);

supportChatRouter.get('/my-chat', asyncHandler(SupportChatController.getMyChat));
supportChatRouter.get('/admin/chats', asyncHandler(SupportChatController.getAdminChats));
supportChatRouter.post('/send', asyncHandler(SupportChatController.sendMessage));
supportChatRouter.post('/:chatId/read', asyncHandler(SupportChatController.markRead));

export { supportChatRouter };
