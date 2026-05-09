import type { Request, Response } from 'express';
import { adminBillingService } from '../services/admin-billing.service';

class AdminBillingController {
  async getOverview(_req: Request, res: Response): Promise<void> {
    const data = await adminBillingService.getOverview();
    res.status(200).json(data);
  }

  async getBillingData(_req: Request, res: Response): Promise<void> {
    const data = await adminBillingService.getBillingData();
    res.status(200).json(data);
  }

  async getPlans(_req: Request, res: Response): Promise<void> {
    res.status(200).json(await adminBillingService.getPlans());
  }

  async getClinicSubscriptions(_req: Request, res: Response): Promise<void> {
    const data = await adminBillingService.getClinicSubscriptions();
    res.status(200).json(data);
  }

  async getPayments(_req: Request, res: Response): Promise<void> {
    const data = await adminBillingService.getPayments();
    res.status(200).json(data);
  }

  async createPlan(req: Request, res: Response): Promise<void> {
    const plan = await adminBillingService.createPlan(req.body);
    res.status(201).json({ plan });
  }
}

export const adminBillingController = new AdminBillingController();
