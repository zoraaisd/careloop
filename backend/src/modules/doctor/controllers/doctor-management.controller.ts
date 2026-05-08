import type { Request, Response } from 'express';

import type { CreateDoctorDto } from '../dto/create-doctor.dto';
import { DoctorManagementService } from '../services/doctor-management.service';

const doctorManagementService = new DoctorManagementService();
const readDoctorId = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? value[0] ?? '' : value ?? '';

export class DoctorManagementController {
  static async listDoctors(req: Request, res: Response): Promise<void> {
    const doctors = await doctorManagementService.listDoctors((req as any).user?.userId);
    res.status(200).json(doctors);
  }

  static async getDoctorDetails(req: Request, res: Response): Promise<void> {
    const doctor = await doctorManagementService.getDoctorDetails(readDoctorId(req.params.doctorId), (req as any).user?.userId);
    res.status(200).json(doctor);
  }

  static async updateDoctor(req: Request, res: Response): Promise<void> {
    const result = await doctorManagementService.updateDoctor(
      readDoctorId(req.params.doctorId),
      req.body,
      (req as any).user?.userId,
    );
    res.status(200).json(result);
  }

  static async createDoctor(req: Request, res: Response): Promise<void> {
    const payload = req.body as CreateDoctorDto;
    const result = await doctorManagementService.createDoctor(payload, (req as any).user?.userId);
    res.status(201).json(result);
  }
}

