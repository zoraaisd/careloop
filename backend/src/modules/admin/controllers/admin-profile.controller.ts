import type { Request, Response } from 'express';

import { validateRequest } from '../../../common/utils/validate-request';
import type { AuthenticatedUser } from '../../auth/types/auth.types';
import { UpdateAdminProfileDto } from '../dto/update-admin-profile.dto';
import { adminProfileService } from '../services/admin-profile.service';

class AdminProfileController {
  async getProfile(req: Request, res: Response): Promise<void> {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const profile = await adminProfileService.getProfile(user?.userId ?? '');
    res.status(200).json(profile);
  }

  async updateProfile(req: Request, res: Response): Promise<void> {
    const payload = await validateRequest(UpdateAdminProfileDto, req.body);
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const profile = await adminProfileService.updateProfile(
      user?.userId ?? '',
      payload,
      (req as any).file,
    );

    res.status(200).json({
      message: 'Admin profile updated successfully',
      profile,
    });
  }
}

export const adminProfileController = new AdminProfileController();
