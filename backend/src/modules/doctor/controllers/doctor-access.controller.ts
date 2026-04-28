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
}
