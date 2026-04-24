import type { Request, Response } from 'express';

import { publicDoctorService } from '../services/public-doctor.service';

export class PublicDoctorController {
  static async getApprovedDoctors(req: Request, res: Response): Promise<void> {
    const doctors = await publicDoctorService.getApprovedDoctors(
      typeof req.query.search === 'string' ? req.query.search : undefined,
    );

    res.status(200).json(doctors);
  }
}
