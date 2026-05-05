import { AppDataSource } from '../../../config/data-source';
import { SupportTicket, SupportTicketStatus } from '../../../entities/support-ticket.entity';
import { adminStoreService } from './admin-store.service';
import type { RespondSupportTicketDto } from '../dto/respond-support-ticket.dto';
import type { SupportTicket as AdminSupportTicket, SupportTicketResponseLog } from '../types/admin.types';

class AdminSupportService {
  private readonly ticketRepository = AppDataSource.getRepository(SupportTicket);

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
      clinicEmail: ticket.clinicEmail,
      clinicPhone: ticket.clinicPhone,
    }));

    // Combine with mock tickets (KJ Clinic) if any
    const mockTickets = adminStoreService.getSupportTickets().filter(t => 
      !['Green Valley Clinic', 'Healthy Path Care', 'Prime Ortho Center'].includes(t.clinicName)
    );

    return [...mappedTickets, ...mockTickets];
  }

  getResponses(ticketId?: string): SupportTicketResponseLog[] {
    return adminStoreService.getSupportResponses(ticketId);
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
      clinicEmail: ticket.clinicEmail,
      clinicPhone: ticket.clinicPhone,
    };
  }

  async respondToTicket(ticketId: string, payload: RespondSupportTicketDto, responderEmail: string): Promise<SupportTicketResponseLog> {
    const ticket = await this.ticketRepository.findOne({ where: { id: ticketId } });

    if (ticket) {
      ticket.status = SupportTicketStatus.RESOLVED;
      await this.ticketRepository.save(ticket);
    }

    const response: SupportTicketResponseLog = {
      id: `support-response-${Date.now()}`,
      ticketId,
      method: payload.method,
      message: payload.message,
      attachmentName: payload.attachmentName,
      respondedAt: new Date().toISOString(),
      respondedBy: responderEmail,
    };

    return adminStoreService.addSupportResponse(response);
  }
}

export const adminSupportService = new AdminSupportService();
