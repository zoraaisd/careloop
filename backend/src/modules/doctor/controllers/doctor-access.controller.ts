import type { Request, Response } from 'express';

import { logger } from '../../../common/logger';
import { DoctorAccessService } from '../services/doctor-access.service';

const doctorAccessService = new DoctorAccessService();

export class DoctorAccessController {
  static async getAccessState(req: Request, res: Response): Promise<void> {
    try {
      const result = await doctorAccessService.getAccessState((req as any).user?.userId);
      res.status(200).json(result);
    } catch (error) {
      logger.error({ err: error, user: (req as any).user }, 'Failed to resolve doctor access state');
      res.status(200).json({
        approvalStatus: 'pending',
        subscriptionStatus: 'inactive',
        trialStartedAt: null,
        trialEndsAt: null,
        accessState: 'pending_review',
        canAccessPortal: true,
        canAppearPublicly: false,
        hasActiveTrial: false,
        message: 'Unable to load full access state right now. Limited mode enabled.',
      });
    }
  }

  static async inviteDoctor(req: Request, res: Response): Promise<void> {
    const result = await doctorAccessService.inviteDoctor((req as any).user?.userId, req.body);
    res.status(201).json(result);
  }

  static async subscribeToPlan(req: Request, res: Response): Promise<void> {
    const { planId } = req.body as { planId?: string };
    if (!planId || typeof planId !== 'string') {
      res.status(400).json({ message: 'planId is required' });
      return;
    }
    const newAccessState = await doctorAccessService.subscribeToPlan((req as any).user?.userId, planId);
    res.status(200).json(newAccessState);
  }

  static async getSubscriptionPlans(req: Request, res: Response): Promise<void> {
    const result = await doctorAccessService.getSubscriptionPlans((req as any).user?.userId);
    res.status(200).json(result);
  }

  static async createPaymentOrder(req: Request, res: Response): Promise<void> {
    const { planId } = req.body as { planId?: string };
    if (!planId) {
      res.status(400).json({ message: 'planId is required' });
      return;
    }
    const result = await doctorAccessService.createPaymentOrder((req as any).user?.userId, planId);
    res.status(200).json(result);
  }

  static async verifyPayment(req: Request, res: Response): Promise<void> {
    const { orderId, paymentId, signature, planId } = req.body;
    if (!orderId || !paymentId || !signature || !planId) {
      res.status(400).json({ message: 'Missing payment verification details' });
      return;
    }
    const result = await doctorAccessService.verifyPayment((req as any).user?.userId, {
      orderId,
      paymentId,
      signature,
      planId,
    });
    res.status(200).json(result);
  }
}
