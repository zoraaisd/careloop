import type { Request, Response } from 'express';

import { DoctorDashboardService } from '../services/doctor-dashboard.service';

const dashboardService = new DoctorDashboardService();

export class DoctorDashboardController {
  static async getDashboard(req: Request, res: Response): Promise<void> {
    const result = await dashboardService.getDashboard(req.user?.userId);
    res.status(200).json(result);
  }
}
