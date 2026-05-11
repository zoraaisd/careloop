import type { Request, Response } from 'express';

import { validateRequest } from '../../../common/utils/validate-request';
import { LoginDto } from '../../../common/dto/login.dto';
import { portalAuthService } from '../../../common/services/portal-auth.service';
import { UserRole } from '../../../entities/user.entity';
import { AppError } from '../../../common/errors/app-error';

export class DoctorAuthController {
  static async login(req: Request, res: Response): Promise<void> {
    const payload = await validateRequest(LoginDto, req.body);
    const result = await portalAuthService.login(payload);

    if (result.role !== UserRole.DOCTOR) {
      throw new AppError('Access denied. This portal is for doctors only.', 403);
    }

    res.status(200).json(result);
  }
}
