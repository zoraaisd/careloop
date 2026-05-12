import type { Request, Response } from 'express';

import { validateRequest } from '../../../common/utils/validate-request';
import { LoginDto } from '../../../common/dto/login.dto';
import { portalAuthService } from '../../../common/services/portal-auth.service';
import { UserRole } from '../../../entities/user.entity';
import { AppError } from '../../../common/errors/app-error';
import { ChangeDoctorPasswordDto } from '../dto/change-doctor-password.dto';
import { CompleteDoctorFirstLoginDto } from '../dto/complete-doctor-first-login.dto';

export class DoctorAuthController {
  static async login(req: Request, res: Response): Promise<void> {
    const payload = await validateRequest(LoginDto, req.body);
    const result = await portalAuthService.login(payload);

    if (result.role !== UserRole.DOCTOR) {
      throw new AppError('Access denied. This portal is for doctors only.', 403);
    }

    res.status(200).json(result);
  }

  static async changePassword(req: Request, res: Response): Promise<void> {
    const payload = await validateRequest(ChangeDoctorPasswordDto, req.body);

    if (payload.newPassword !== payload.confirmPassword) {
      throw new AppError('New password and confirm password must match', 400);
    }

    const result = await portalAuthService.changeDoctorPassword(
      (req as any).user.userId,
      payload.newPassword,
    );

    res.status(200).json(result);
  }

  static async completeFirstLogin(req: Request, res: Response): Promise<void> {
    const payload = await validateRequest(CompleteDoctorFirstLoginDto, req.body);

    if (payload.newPassword !== payload.confirmPassword) {
      throw new AppError('New password and confirm password must match', 400);
    }

    const result = await portalAuthService.completeDoctorFirstLogin(
      payload.email,
      payload.temporaryPassword,
      payload.newPassword,
    );

    res.status(200).json(result);
  }
}
