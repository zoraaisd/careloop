import { AppDataSource } from '../../../config/data-source';
import { SupportTicket, SupportTicketStatus } from '../../../entities/support-ticket.entity';
import { SupportTicketResponse } from '../../../entities/support-ticket-response.entity';
import type { RespondSupportTicketDto } from '../dto/respond-support-ticket.dto';
import type { SupportTicket as AdminSupportTicket, SupportTicketResponseLog } from '../types/admin.types';

class AdminSupportService {
  private readonly ticketRepository = AppDataSource.getRepository(SupportTicket);
  private readonly responseRepository = AppDataSource.getRepository(
    SupportTicketResponse,
  );

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

  async respondToTicket(ticketId: string, payload: RespondSupportTicketDto, responderEmail: string): Promise<SupportTicketResponseLog> {
    const ticket = await this.ticketRepository.findOne({ where: { id: ticketId } });

    if (!ticket) {
      throw new Error('Support ticket not found');
    }

    ticket.status = SupportTicketStatus.RESOLVED;

    const response = this.responseRepository.create({
      ticketId,
      method: payload.method,
      message: payload.message,
      attachmentName: payload.attachmentName ?? null,
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
      respondedAt: savedResponse.respondedAt.toISOString(),
      respondedBy: savedResponse.respondedBy,
    };
  }
}

export const adminSupportService = new AdminSupportService();
