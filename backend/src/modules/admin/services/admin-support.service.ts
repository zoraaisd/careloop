import { AppDataSource } from '../../../config/data-source';
import { SupportTicket, SupportTicketStatus } from '../../../entities/support-ticket.entity';
import { SupportTicketResponse } from '../../../entities/support-ticket-response.entity';
import type { UploadedFile } from '../../../types/uploaded-file';
import { FileStorageService } from '../../files/services/file-storage.service';
import type { RespondSupportTicketDto } from '../dto/respond-support-ticket.dto';
import type { SupportTicket as AdminSupportTicket, SupportTicketResponseLog } from '../types/admin.types';

class AdminSupportService {
  private readonly ticketRepository = AppDataSource.getRepository(SupportTicket);
  private readonly responseRepository = AppDataSource.getRepository(
    SupportTicketResponse,
  );
  private readonly fileStorageService = new FileStorageService();

  async getTickets(): Promise<AdminSupportTicket[]> {
    const dbTickets = await this.ticketRepository
      .createQueryBuilder('ticket')
      .select([
        'ticket.id AS id',
        'ticket.doctorId AS "doctorId"',
        'ticket.clinicName AS "clinicName"',
        'ticket.issueTitle AS "issueTitle"',
        'ticket.description AS description',
        'ticket.status AS status',
        'ticket.priority AS priority',
        'ticket.clinicEmail AS "clinicEmail"',
        'ticket.clinicPhone AS "clinicPhone"',
        'ticket.attachmentUrl AS "attachmentUrl"',
        'ticket.attachmentName AS "attachmentName"',
        'ticket.createdAt AS "createdAt"',
      ])
      .orderBy('ticket.createdAt', 'DESC')
      .getRawMany();

    const mappedTickets: AdminSupportTicket[] = dbTickets.map((ticket: any) => ({
      id: ticket.id,
      clinicId: ticket.doctorId,
      clinicName: ticket.clinicName,
      issueTitle: ticket.issueTitle,
      description: ticket.description,
      status: ticket.status as any,
      priority: ticket.priority as any,
      createdDate: String(ticket.createdAt || '').split('T')[0],
      clinicEmail: ticket.clinicEmail ?? undefined,
      clinicPhone: ticket.clinicPhone ?? undefined,
      attachmentUrl: ticket.attachmentUrl ?? undefined,
      attachmentName: ticket.attachmentName ?? undefined,
    }));

    return mappedTickets;
  }

  async getResponses(ticketId?: string): Promise<SupportTicketResponseLog[]> {
    const where = ticketId ? { ticketId } : {};
    const responses = await this.responseRepository.find({
      where,
      order: { respondedAt: 'DESC' },
    });

    return responses.map((response) => ({
      id: response.id,
      ticketId: response.ticketId,
      method: response.method,
      message: response.message,
      attachmentName: response.attachmentName ?? undefined,
      attachmentUrl: response.attachmentUrl ?? undefined,
      respondedAt: response.respondedAt.toISOString(),
      respondedBy: response.respondedBy,
    }));
  }

  async markTicketOpened(ticketId: string): Promise<AdminSupportTicket | null> {
    const ticket = await this.ticketRepository.findOne({ where: { id: ticketId } });

    if (!ticket) {
      return null;
    }

    if (ticket.status === SupportTicketStatus.OPEN) {
      ticket.status = SupportTicketStatus.IN_PROGRESS;
      await this.ticketRepository.save(ticket);
    }

    return {
      id: ticket.id,
      clinicId: ticket.doctorId,
      clinicName: ticket.clinicName,
      issueTitle: ticket.issueTitle,
      description: ticket.description,
      status: ticket.status as any,
      priority: ticket.priority as any,
      createdDate: ticket.createdAt.toISOString().split('T')[0],
      clinicEmail: ticket.clinicEmail ?? undefined,
      clinicPhone: ticket.clinicPhone ?? undefined,
      attachmentUrl: ticket.attachmentUrl ?? undefined,
      attachmentName: ticket.attachmentName ?? undefined,
    };
  }

  async respondToTicket(
    ticketId: string,
    payload: RespondSupportTicketDto,
    responderEmail: string,
    attachmentFile?: UploadedFile,
  ): Promise<SupportTicketResponseLog> {
    const ticket = await this.ticketRepository.findOne({ where: { id: ticketId } });

    if (!ticket) {
      throw new Error('Support ticket not found');
    }

    ticket.status = SupportTicketStatus.RESOLVED;

    if (attachmentFile && !attachmentFile.buffer) {
      throw new Error('Attachment upload is invalid');
    }

    const attachmentBuffer = attachmentFile?.buffer;

    const storedFile = attachmentFile && attachmentBuffer
      ? await this.fileStorageService.saveBuffer({
          fileName: attachmentFile.originalname,
          mimeType: attachmentFile.mimetype,
          fileSize: attachmentFile.size,
          buffer: attachmentBuffer,
        })
      : null;

    const response = this.responseRepository.create({
      ticketId,
      method: payload.method,
      message: payload.message,
      attachmentName: storedFile?.fileName ?? payload.attachmentName ?? null,
      attachmentUrl: storedFile
        ? this.fileStorageService.buildFileUrl(storedFile.id)
        : null,
      attachmentFileId: storedFile?.id ?? null,
      attachmentType: storedFile?.mimeType ?? null,
      attachmentSize: storedFile?.fileSize ?? null,
      respondedBy: responderEmail,
    });

    const savedResponse = await AppDataSource.transaction(async (manager) => {
      await manager.save(ticket);
      return manager.save(response);
    });

    return {
      id: savedResponse.id,
      ticketId,
      method: savedResponse.method,
      message: savedResponse.message,
      attachmentName: savedResponse.attachmentName ?? undefined,
      attachmentUrl: savedResponse.attachmentUrl ?? undefined,
      respondedAt: savedResponse.respondedAt.toISOString(),
      respondedBy: savedResponse.respondedBy,
    };
  }
}

export const adminSupportService = new AdminSupportService();
