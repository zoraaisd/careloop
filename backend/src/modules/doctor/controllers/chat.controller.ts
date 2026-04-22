import type { Request, Response } from 'express';

import { ChatService } from '../services/chat.service';

const chatService = new ChatService();

export class ChatController {
  static async listChats(req: Request, res: Response): Promise<void> {
    const result = await chatService.listChats((req as any).user?.userId);
    res.status(200).json(result);
  }

  static async getChat(req: Request, res: Response): Promise<void> {
    const chatId = String(req.params.chatId);
    const result = await chatService.getChat(chatId, (req as any).user?.userId);
    res.status(200).json(result);
  }

  static async sendSlots(req: Request, res: Response): Promise<void> {
    const chatId = String(req.params.chatId);
    const result = await chatService.sendSlots(chatId, (req as any).user?.userId);
    res.status(200).json(result);
  }

  static async createFollowUp(req: Request, res: Response): Promise<void> {
    const chatId = String(req.params.chatId);
    const result = await chatService.createFollowUp({
      chatId,
      doctorId: (req as any).user?.userId,
      message: req.body.message,
      scheduledAt: req.body.scheduledAt,
    });
    res.status(201).json(result);
  }
}
