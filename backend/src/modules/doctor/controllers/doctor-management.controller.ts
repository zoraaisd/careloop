import type { Request, Response } from 'express';

import type { CreateDoctorDto } from '../dto/create-doctor.dto';
import { DoctorManagementService } from '../services/doctor-management.service';

const doctorManagementService = new DoctorManagementService();

export class DoctorManagementController {
  static async listDoctors(req: Request, res: Response): Promise<void> {
    const doctors = await doctorManagementService.listDoctors((req as any).user?.userId);
    res.status(200).json(doctors);
  }

  static async createDoctor(req: Request, res: Response): Promise<void> {
    const payload = req.body as CreateDoctorDto;
    const result = await doctorManagementService.createDoctor(payload, (req as any).user?.userId);
    res.status(201).json(result);
  }
}

