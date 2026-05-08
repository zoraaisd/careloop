import type { Request, Response } from 'express';

import { PatientService } from '../services/patient.service';

const patientService = new PatientService();

export class PatientController {
  static async listPatients(req: Request, res: Response): Promise<void> {
    const result = await patientService.listPatients((req as any).user?.userId);
    res.status(200).json(result);
  }

  static async createPatient(req: Request, res: Response): Promise<void> {
    const result = await patientService.createPatient(req.body, (req as any).user?.userId);
    res.status(201).json(result);
  }

  static async sendOtp(req: Request, res: Response): Promise<void> {
    const patientId = String(req.params.patientId);
    const result = await patientService.sendOtp(
      patientId,
      (req as any).user?.userId,
    );
    res.status(200).json(result);
  }

  static async updatePatient(req: Request, res: Response): Promise<void> {
    const patientId = String(req.params.patientId);
    const result = await patientService.updatePatient(
      patientId,
      req.body,
      (req as any).user?.userId,
    );
    res.status(200).json(result);
  }

  static async sendSlots(req: Request, res: Response): Promise<void> {
    const patientId = String(req.params.patientId);
    const result = await patientService.sendSlots(
      patientId,
      (req as any).user?.userId,
    );
    res.status(200).json(result);
  }

  static async deletePatient(req: Request, res: Response): Promise<void> {
    const patientId = String(req.params.patientId);
    const result = await patientService.deletePatient(
      patientId,
      (req as any).user?.userId,
    );
    res.status(200).json(result);
  }
}
