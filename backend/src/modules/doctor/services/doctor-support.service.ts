import { AppDataSource } from '../../../config/data-source';
import { ActivityDirection, ActivityLog } from '../../../entities/activity-log.entity';
import {
  Chat,
  FollowUpStatus,
} from '../../../entities/chat.entity';
import {
  ChatMessage,
  ChatMessageType,
  ChatSenderType,
} from '../../../entities/chat-message.entity';
import { Patient } from '../../../entities/patient.entity';
import { AppError } from '../../../common/errors/app-error';

export class DoctorSupportService {
  private readonly patientRepository = AppDataSource.getRepository(Patient);
  private readonly chatRepository = AppDataSource.getRepository(Chat);
  private readonly chatMessageRepository = AppDataSource.getRepository(ChatMessage);
  private readonly activityRepository = AppDataSource.getRepository(ActivityLog);

  async ensurePatient(patientId: string): Promise<Patient> {
    const patient = await this.patientRepository.findOne({
      where: { id: patientId, isActive: true },
    });

    if (!patient) {
      throw new AppError('Patient not found', 404);
    }

    return patient;
  }

  async ensureChatForPatient(
    patientId: string,
    doctorId: string | null,
  ): Promise<Chat> {
    const existingChat = await this.chatRepository.findOne({
      where: { patientId },
    });

    if (existingChat) {
      if (!existingChat.doctorId && doctorId) {
        existingChat.doctorId = doctorId;
        return this.chatRepository.save(existingChat);
      }

      return existingChat;
    }

    const chat = this.chatRepository.create({
      patientId,
      doctorId,
      followUpStatus: FollowUpStatus.NONE,
      unreadCount: 0,
    });

    return this.chatRepository.save(chat);
  }

  async appendChatMessage(params: {
    chatId: string;
    senderType: ChatSenderType;
    messageType: ChatMessageType;
    content: string;
    attachmentUrl?: string | null;
    direction: 'inbound' | 'outbound';
  }): Promise<ChatMessage> {
    const message = this.chatMessageRepository.create({
      chatId: params.chatId,
      senderType: params.senderType,
      messageType: params.messageType,
      content: params.content,
      attachmentUrl: params.attachmentUrl ?? null,
    });

    const savedMessage = await this.chatMessageRepository.save(message);
    const chat = await this.chatRepository.findOne({ where: { id: params.chatId } });

    if (chat) {
      chat.lastMessage = params.content;
      chat.lastMessageType = params.messageType;
      chat.lastMessageAt = savedMessage.createdAt;
      chat.unreadCount = params.direction === 'inbound' ? chat.unreadCount + 1 : 0;
      await this.chatRepository.save(chat);
    }

    return savedMessage;
  }

  async logActivity(params: {
    doctorId?: string | null;
    patientId?: string | null;
    type: string;
    message: string;
    direction?: ActivityDirection;
  }): Promise<ActivityLog> {
    const activity = this.activityRepository.create({
      doctorId: params.doctorId ?? null,
      patientId: params.patientId ?? null,
      type: params.type,
      message: params.message,
      direction: params.direction ?? ActivityDirection.OUTBOUND,
    });

    return this.activityRepository.save(activity);
  }
}
