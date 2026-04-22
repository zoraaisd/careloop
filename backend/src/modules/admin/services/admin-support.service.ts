import { adminStoreService } from './admin-store.service';
import type { RespondSupportTicketDto } from '../dto/respond-support-ticket.dto';
import type { SupportTicket, SupportTicketResponseLog } from '../types/admin.types';

class AdminSupportService {
  getTickets(): SupportTicket[] {
    return adminStoreService.getSupportTickets();
  }

  getResponses(ticketId?: string): SupportTicketResponseLog[] {
    return adminStoreService.getSupportResponses(ticketId);
  }

  respondToTicket(ticketId: string, payload: RespondSupportTicketDto, responderEmail: string): SupportTicketResponseLog {
    adminStoreService.getSupportTicketById(ticketId);

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
