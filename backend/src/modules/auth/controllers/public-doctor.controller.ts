import type { Request, Response } from 'express';

import { validateRequest } from '../../../common/utils/validate-request';
import { CreatePublicAppointmentDto } from '../dto/create-public-appointment.dto';
import { publicDoctorService } from '../services/public-doctor.service';

export class PublicDoctorController {
  static async getApprovedDoctors(req: Request, res: Response): Promise<void> {
    const doctors = await publicDoctorService.getApprovedDoctors(
      typeof req.query.search === 'string' ? req.query.search : undefined,
    );

    res.status(200).json(doctors);
  }

  static async getApprovedDoctorById(req: Request, res: Response): Promise<void> {
    const doctor = await publicDoctorService.getApprovedDoctorById(String(req.params.doctorId));
    res.status(200).json(doctor);
  }

  static async getApprovedDoctorAvailability(req: Request, res: Response): Promise<void> {
    const slots = await publicDoctorService.getApprovedDoctorAvailability(String(req.params.doctorId), {
      dateFrom: typeof req.query.dateFrom === 'string' ? req.query.dateFrom : undefined,
      dateTo: typeof req.query.dateTo === 'string' ? req.query.dateTo : undefined,
    });

    res.status(200).json(slots);
  }

  static async createPublicAppointment(req: Request, res: Response): Promise<void> {
    const payload = await validateRequest(CreatePublicAppointmentDto, req.body);
    const result = await publicDoctorService.createPublicAppointment(String(req.params.doctorId), payload);
    res.status(201).json(result);
  }
}
