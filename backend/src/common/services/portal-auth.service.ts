import bcrypt from 'bcrypt';
import jwt, { type SignOptions } from 'jsonwebtoken';

import { AppError } from '../errors/app-error';
import { env } from '../../config/env';
import { AppDataSource } from '../../config/data-source';
import { User, UserRole, DoctorApprovalStatus } from '../../entities/user.entity';
import type { LoginDto } from '../dto/login.dto';
import type { AuthResponse } from '../types/auth.types';
import { DoctorPortalAccessService } from '../../modules/doctor/services/doctor-portal-access.service';

const JWT_EXPIRES_IN = env.jwtExpiresIn as SignOptions['expiresIn'];

export class PortalAuthService {
  private readonly userRepository = AppDataSource.getRepository(User);
  private readonly portalAccessService = new DoctorPortalAccessService();

  async login(payload: LoginDto): Promise<AuthResponse> {
    const email = payload.email.trim().toLowerCase();
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();

    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const passwordMatches = await bcrypt.compare(payload.password, user.password);
    const matchesDevelopmentDoctorPassword =
      !env.isProduction &&
      user.role === UserRole.DOCTOR &&
      payload.password === env.devDoctorLoginPassword;

    if (!passwordMatches && !matchesDevelopmentDoctorPassword) {
      throw new AppError('Invalid email or password', 401);
    }

    if (user.role === UserRole.DOCTOR && user.approvalStatus === DoctorApprovalStatus.REJECTED) {
      throw new AppError('Your doctor account has been rejected by admin', 403);
    }

    await this.userRepository.increment({ id: user.id }, 'sessionVersion', 1);
    const refreshedUser = await this.userRepository.findOneOrFail({
      where: { id: user.id },
    });

    return this.createAuthResponse(refreshedUser);
  }

  private createAuthResponse(user: User): AuthResponse {
    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        email: user.email,
        sessionVersion: user.sessionVersion ?? 0,
      },
      env.jwtSecret,
      { expiresIn: JWT_EXPIRES_IN },
    );

    const portalAccess = this.portalAccessService.buildAccessSnapshot(user);

    return {
      token,
      role: user.role,
      userId: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      mustChangePassword: Boolean(user.mustChangePassword),
      approvalStatus: portalAccess.approvalStatus,
      subscriptionStatus: portalAccess.subscriptionStatus,
      trialStartedAt: portalAccess.trialStartedAt,
      trialEndsAt: portalAccess.trialEndsAt,
      accessState: portalAccess.accessState,
      canAccessPortal: portalAccess.canAccessPortal,
      canAppearPublicly: portalAccess.canAppearPublicly,
      message: portalAccess.message,
    };
  }
}

export const portalAuthService = new PortalAuthService();
