import type { Request, Response } from 'express';

import { validateRequest } from '../../../common/utils/validate-request';
import { UpdateAdminProfileDto } from '../dto/update-admin-profile.dto';
import { adminProfileService } from '../services/admin-profile.service';

class AdminProfileController {
  getProfile(_req: Request, res: Response): void {
    res.status(200).json(adminProfileService.getProfile());
  }

  async updateProfile(req: Request, res: Response): Promise<void> {
    const payload = await validateRequest(UpdateAdminProfileDto, req.body);
    const profile = adminProfileService.updateProfile(payload);

    res.status(200).json({
      message: 'Admin profile updated successfully',
      profile,
    });
  }
}

export const adminProfileController = new AdminProfileController();
