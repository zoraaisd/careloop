import type { Request, Response } from 'express';

import { AppointmentService } from '../services/appointment.service';

const appointmentService = new AppointmentService();

export class AppointmentController {
  static async listAppointments(req: Request, res: Response): Promise<void> {
    const result = await appointmentService.listAppointments((req as any).user?.userId);
    res.status(200).json(result);
  }

  static async createAppointment(req: Request, res: Response): Promise<void> {
    const result = await appointmentService.createAppointment(
      req.body,
      (req as any).user?.userId,
    );
    res.status(201).json(result);
  }

  static async cancelAppointment(req: Request, res: Response): Promise<void> {
    const appointmentId = String(req.params.appointmentId);
    const result = await appointmentService.cancelAppointment(
      appointmentId,
      (req as any).user?.userId,
    );
    res.status(200).json(result);
  }
}
