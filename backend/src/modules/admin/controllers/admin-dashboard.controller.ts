import type { Request, Response } from 'express';

import { adminDashboardService } from '../services/admin-dashboard.service';

class AdminDashboardController {
  getDashboard(_req: Request, res: Response): void {
    res.status(200).json(adminDashboardService.getDashboard());
  }
}

export const adminDashboardController = new AdminDashboardController();
