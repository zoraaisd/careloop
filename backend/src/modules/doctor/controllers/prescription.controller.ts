import type { Request, Response } from 'express';

import { PrescriptionService } from '../services/prescription.service';

const prescriptionService = new PrescriptionService();

export class PrescriptionController {
  static async listPrescriptions(req: Request, res: Response): Promise<void> {
    const result = await prescriptionService.listPrescriptions((req as any).user?.userId);
    res.status(200).json(result);
  }

  static async createPrescription(req: Request, res: Response): Promise<void> {
    const result = await prescriptionService.createPrescription(
      req.body,
      (req as any).user?.userId,
    );
    res.status(201).json(result);
  }

  static async resendPrescription(req: Request, res: Response): Promise<void> {
    const prescriptionId = String(req.params.prescriptionId);
    const result = await prescriptionService.resendPrescription(
      prescriptionId,
      (req as any).user?.userId,
    );
    res.status(200).json(result);
  }

  static async getPatientPrescriptions(req: Request, res: Response): Promise<void> {
    const patientId = String(req.params.patientId);
    const result = await prescriptionService.getPatientPrescriptions(
      patientId,
      (req as any).user?.userId,
    );
    res.status(200).json(result);
  }
}
