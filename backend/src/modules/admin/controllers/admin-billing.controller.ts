import type { Request, Response } from 'express';

import { adminBillingService } from '../services/admin-billing.service';

class AdminBillingController {
  getOverview(_req: Request, res: Response): void {
    res.status(200).json(adminBillingService.getOverview());
  }

  getBillingData(_req: Request, res: Response): void {
    res.status(200).json(adminBillingService.getBillingData());
  }

  getPlans(_req: Request, res: Response): void {
    res.status(200).json(adminBillingService.getPlans());
  }

  getClinicSubscriptions(_req: Request, res: Response): void {
    res.status(200).json(adminBillingService.getClinicSubscriptions());
  }

  getPayments(_req: Request, res: Response): void {
    res.status(200).json(adminBillingService.getPayments());
  }
}

export const adminBillingController = new AdminBillingController();
