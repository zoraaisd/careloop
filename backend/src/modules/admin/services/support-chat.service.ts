import { AppDataSource } from '../../../config/data-source';
import { SupportChat } from '../../../entities/support-chat.entity';
import { SupportChatMessage } from '../../../entities/support-chat-message.entity';
import { User, UserRole } from '../../../entities/user.entity';
import { socketService } from '../../../common/services/socket.service';

export class SupportChatService {
  private get chatRepository() {
    return AppDataSource.getRepository(SupportChat);
  }

  private get messageRepository() {
    return AppDataSource.getRepository(SupportChatMessage);
  }

  async getChatByDoctor(doctorId: string): Promise<SupportChat> {
    let chat = await this.chatRepository
      .createQueryBuilder('chat')
      .leftJoinAndSelect('chat.messages', 'messages')
      .where('chat.doctor_id = :doctorId', { doctorId })
      .orderBy('messages.created_at', 'ASC')
      .getOne();

    if (!chat) {
      chat = this.chatRepository.create({
        doctorId,
        messages: [],
      });
      await this.chatRepository.save(chat);
    }

    return chat;
  }

  async getAdminChats(): Promise<SupportChat[]> {
    return this.chatRepository
      .createQueryBuilder('chat')
      .leftJoinAndSelect('chat.doctor', 'doctor')
      .leftJoinAndSelect('chat.messages', 'messages')
      .orderBy('chat.lastMessageAt', 'DESC')
      .addOrderBy('messages.created_at', 'ASC')
      .getMany();
  }

  async sendMessage(payload: {
    chatId: string;
    senderId: string;
    senderRole: UserRole;
    content: string;
  }): Promise<SupportChatMessage> {
    const chat = await this.chatRepository.findOneOrFail({
      where: { id: payload.chatId },
    });

    const message = this.messageRepository.create({
      chatId: payload.chatId,
      senderId: payload.senderId,
      senderRole: payload.senderRole,
      content: payload.content,
    });

    const savedMessage = await this.messageRepository.save(message);

    // Update chat last message
    chat.lastMessage = payload.content;
    chat.lastMessageAt = new Date();
    
    if (payload.senderRole === UserRole.DOCTOR) {
      chat.unreadCountAdmin += 1;
    } else {
      chat.unreadCountDoctor += 1;
    }

    await this.chatRepository.save(chat);

    // Emit via Socket.io
    socketService.emitToRoom(`chat_${chat.doctorId}`, 'new_message', {
      chatId: chat.id,
      message: savedMessage,
    });

    return savedMessage;
  }

  async markAsRead(chatId: string, role: UserRole): Promise<void> {
    const chat = await this.chatRepository.findOneOrFail({ where: { id: chatId } });
    
    if (role === UserRole.ADMIN) {
      chat.unreadCountAdmin = 0;
    } else {
      chat.unreadCountDoctor = 0;
    }

    await this.chatRepository.save(chat);
  }
}

export const supportChatService = new SupportChatService();
