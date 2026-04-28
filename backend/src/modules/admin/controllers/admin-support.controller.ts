import type { Request, Response } from 'express';

import { validateRequest } from '../../../common/utils/validate-request';
import type { AuthenticatedUser } from '../../auth/types/auth.types';
import { RespondSupportTicketDto } from '../dto/respond-support-ticket.dto';
import { adminSupportService } from '../services/admin-support.service';

const getParam = (value: string | string[] | undefined): string => (Array.isArray(value) ? value[0] : value ?? '');

class AdminSupportController {
  async getTickets(_req: Request, res: Response): Promise<void> {
    res.status(200).json(await adminSupportService.getTickets());
  }

  getTicketResponses(req: Request, res: Response): void {
    res.status(200).json(adminSupportService.getResponses(getParam(req.params.ticketId)));
  }

  async respondToTicket(req: Request, res: Response): Promise<void> {
    const payload = await validateRequest(RespondSupportTicketDto, req.body);
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const responseLog = adminSupportService.respondToTicket(
      getParam(req.params.ticketId),
      payload,
      user?.email ?? 'admin@careloop.com',
    );

    res.status(201).json({
      message: 'Support response recorded successfully',
      response: responseLog,
    });
  }
}

export const adminSupportController = new AdminSupportController();
