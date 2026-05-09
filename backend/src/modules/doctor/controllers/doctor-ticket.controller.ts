import { Request, Response } from 'express';
import { DoctorTicketService } from '../services/doctor-ticket.service';

const ticketService = new DoctorTicketService();

export class DoctorTicketController {
  static async createTicket(req: Request, res: Response): Promise<void> {
    const currentDoctorId = (req as any).user?.userId;
    const result = await ticketService.createTicket(req.body, currentDoctorId, (req as any).file);
    res.status(201).json(result);
  }

  static async getMyTickets(req: Request, res: Response): Promise<void> {
    const currentDoctorId = (req as any).user?.userId;
    const result = await ticketService.getMyTickets(currentDoctorId);
    res.status(200).json(result);
  }
}
