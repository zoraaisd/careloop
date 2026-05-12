import type { Request, Response } from 'express';
import { supportChatService } from '../services/support-chat.service';
import { UserRole } from '../../../entities/user.entity';

export class SupportChatController {
  static async getMyChat(req: Request, res: Response): Promise<void> {
    const user = (req as any).user;
    const chat = await supportChatService.getChatByDoctor(user.userId);
    res.status(200).json(chat);
  }

  static async getAdminChats(req: Request, res: Response): Promise<void> {
    const chats = await supportChatService.getAdminChats();
    res.status(200).json(chats);
  }

  static async sendMessage(req: Request, res: Response): Promise<void> {
    const user = (req as any).user;
    const { chatId, content } = req.body;
    const message = await supportChatService.sendMessage({
      chatId: String(chatId),
      senderId: user.userId,
      senderRole: user.role,
      content: String(content),
    });
    res.status(201).json(message);
  }

  static async markRead(req: Request, res: Response): Promise<void> {
    const user = (req as any).user;
    const { chatId } = req.params;
    await supportChatService.markAsRead(String(chatId), user.role);
    res.status(204).send();
  }
}
