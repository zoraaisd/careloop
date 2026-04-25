import type { Request, Response } from 'express';

import { adminDashboardService } from '../services/admin-dashboard.service';

class AdminDashboardController {
  async getDashboard(_req: Request, res: Response): Promise<void> {
    const dashboard = await adminDashboardService.getDashboard();
    res.status(200).json(dashboard);
  }
}

export const adminDashboardController = new AdminDashboardController();
