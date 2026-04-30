import type { Request, Response } from 'express';

import { adminDashboardService } from '../services/admin-dashboard.service';

class AdminDashboardController {
  async getDashboard(_req: Request, res: Response): Promise<void> {
    const dashboard = await adminDashboardService.getDashboard();
    res.status(200).json(dashboard);
  }

  async getTrialUsers(_req: Request, res: Response): Promise<void> {
    const users = await adminDashboardService.getTrialUsers();
    res.status(200).json(users);
  }

  async getSubscribedUsers(_req: Request, res: Response): Promise<void> {
    const users = await adminDashboardService.getSubscribedUsers();
    res.status(200).json(users);
  }

  async getAllDoctors(_req: Request, res: Response): Promise<void> {
    const doctors = await adminDashboardService.getAllDoctors();
    res.status(200).json(doctors);
  }
}

export const adminDashboardController = new AdminDashboardController();
