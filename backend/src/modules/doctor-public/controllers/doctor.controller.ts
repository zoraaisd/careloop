import type { Request, Response } from 'express';

import { doctorService } from '../services/doctor.service';

export class DoctorController {
  static async getDoctors(_req: Request, res: Response): Promise<void> {
    const doctors = await doctorService.getDoctors();
    res.status(200).json(doctors);
  }

  static async getDoctorById(req: Request, res: Response): Promise<void> {
    const doctor = await doctorService.getDoctorById(Number(req.params.id));
    res.status(200).json(doctor);
  }
}
