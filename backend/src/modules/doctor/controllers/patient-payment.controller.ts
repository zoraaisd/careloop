import { Request, Response } from 'express';
import { PatientPaymentService } from '../services/patient-payment.service';

const paymentService = new PatientPaymentService();

export class PatientPaymentController {
  static async createPayment(req: Request, res: Response): Promise<void> {
    const result = await paymentService.createPayment(req.body, (req as any).user?.userId);
    res.status(201).json(result);
  }

  static async getPatientPayments(req: Request, res: Response): Promise<void> {
    const result = await paymentService.getPatientPayments(req.params.patientId as string, (req as any).user?.userId);
    res.status(200).json(result);
  }
}
