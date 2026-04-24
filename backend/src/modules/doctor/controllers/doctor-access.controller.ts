import type { Request, Response } from 'express';

import { DoctorAccessService } from '../services/doctor-access.service';

const doctorAccessService = new DoctorAccessService();

export class DoctorAccessController {
  static async getAccessState(req: Request, res: Response): Promise<void> {
    const result = await doctorAccessService.getAccessState((req as any).user?.userId);
    res.status(200).json(result);
  }
}
