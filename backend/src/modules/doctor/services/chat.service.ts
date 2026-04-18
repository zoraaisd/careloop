import { AppDataSource } from '../../../config/data-source';
import { Chat, FollowUpStatus } from '../../../entities/chat.entity';
import {
  ChatMessage,
  ChatMessageType,
  ChatSenderType,
} from '../../../entities/chat-message.entity';
import {
  FollowUp,
  FollowUpEntryStatus,
} from '../../../entities/follow-up.entity';
import type { ChatConversationItem, ChatThreadResponse } from '../types/doctor.types';
import { DoctorAccessService } from './doctor-access.service';
import { DoctorSupportService } from './doctor-support.service';

export class ChatService {
  private readonly chatRepository = AppDataSource.getRepository(Chat);
  private readonly messageRepository = AppDataSource.getRepository(ChatMessage);
  private readonly followUpRepository = AppDataSource.getRepository(FollowUp);
  private readonly supportService = new DoctorSupportService();
  private readonly accessService = new DoctorAccessService();

  async listChats(currentDoctorId?: string): Promise<ChatConversationItem[]> {
    const doctorId = this.accessService.ensureAuthenticatedDoctorId(currentDoctorId);
    const chats = await this.chatRepository.find({
      where: { doctorId },
      relations: { patient: true },
      order: { lastMessageAt: 'DESC', updatedAt: 'DESC' },
    });

    return chats.map((chat) => ({
      chatId: chat.id,
      patientId: chat.patientId,
      doctorId: chat.doctorId,
      patientName: chat.patient.name,
      patientPhone: chat.patient.phone,
      lastMessage: chat.lastMessage ?? '',
      messageType: chat.lastMessageType,
      messageTime: chat.lastMessageAt?.toISOString() ?? null,
      unreadCount: chat.unreadCount,
      followUpStatus: chat.followUpStatus,
    }));
  }

  async getChat(chatId: string, currentDoctorId?: string): Promise<ChatThreadResponse> {
    const chat = await this.accessService.ensureOwnedChat(chatId, currentDoctorId);

    const messages = await this.messageRepository.find({
      where: { chatId },
      order: { createdAt: 'ASC' },
    });

    if (chat.unreadCount !== 0) {
      chat.unreadCount = 0;
      await this.chatRepository.save(chat);
    }

    return {
      conversation: {
        chatId: chat.id,
        patientId: chat.patientId,
        doctorId: chat.doctorId,
        patientName: chat.patient.name,
        patientPhone: chat.patient.phone,
        lastMessage: chat.lastMessage ?? '',
        messageType: chat.lastMessageType,
        messageTime: chat.lastMessageAt?.toISOString() ?? null,
        unreadCount: 0,
        followUpStatus: chat.followUpStatus,
      },
      messages: messages.map((message) => ({
        messageId: message.id,
        direction:
          message.senderType === ChatSenderType.PATIENT ? 'inbound' : 'outbound',
        senderType: message.senderType,
        messageType: message.messageType,
        messageBody: message.content,
        attachmentUrl: message.attachmentUrl,
        messageTime: message.createdAt.toISOString(),
      })),
    };
  }

  async sendSlots(chatId: string, doctorId?: string): Promise<{ message: string }> {
    const chat = await this.accessService.ensureOwnedChat(chatId, doctorId);

    await this.supportService.appendChatMessage({
      chatId,
      senderType: ChatSenderType.DOCTOR,
      messageType: ChatMessageType.SLOT,
      content: 'Available slots shared in chat.',
      direction: 'outbound',
    });

    await this.supportService.logActivity({
      doctorId: this.accessService.ensureAuthenticatedDoctorId(doctorId),
      patientId: chat.patientId,
      type: 'whatsapp-message',
      message: 'Available slots shared from patient chat.',
    });

    return { message: 'Slots sent successfully' };
  }

  async createFollowUp(params: {
    chatId: string;
    doctorId?: string;
    message: string;
    scheduledAt: string;
  }): Promise<{ message: string }> {
    const chat = await this.accessService.ensureOwnedChat(
      params.chatId,
      params.doctorId,
    );
    const doctorId = this.accessService.ensureAuthenticatedDoctorId(params.doctorId);

    const followUp = this.followUpRepository.create({
      patientId: chat.patientId,
      doctorId,
      message: params.message.trim(),
      scheduledAt: new Date(params.scheduledAt),
      status: FollowUpEntryStatus.PENDING,
    });
    await this.followUpRepository.save(followUp);

    chat.followUpStatus = FollowUpStatus.PENDING;
    await this.chatRepository.save(chat);

    await this.supportService.appendChatMessage({
      chatId: chat.id,
      senderType: ChatSenderType.DOCTOR,
      messageType: ChatMessageType.FOLLOW_UP,
      content: params.message.trim(),
      direction: 'outbound',
    });
    await this.supportService.logActivity({
      doctorId,
      patientId: chat.patientId,
      type: 'follow-up',
      message: `Follow-up scheduled for ${params.scheduledAt}.`,
    });

    return { message: 'Follow-up scheduled successfully' };
  }
}
