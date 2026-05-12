import bcrypt from 'bcrypt';
import jwt, { type SignOptions } from 'jsonwebtoken';

import { AppError } from '../errors/app-error';
import { logger } from '../logger';
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
    logger.info({ email }, 'Login attempt received');
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

  async changeDoctorPassword(userId: string, newPassword: string): Promise<AuthResponse> {
    const trimmedPassword = newPassword.trim();
    const user = await this.userRepository.findOne({
      where: { id: userId, role: UserRole.DOCTOR },
      select: [
        'id',
        'name',
        'email',
        'phone',
        'password',
        'role',
        'approvalStatus',
        'subscriptionStatus',
        'trialStartedAt',
        'trialEndsAt',
        'subscribedPlanId',
        'sessionVersion',
        'mustChangePassword',
        'createdAt',
        'updatedAt',
      ],
    });

    if (!user) {
      throw new AppError('Doctor account not found', 404);
    }

    if (!user.mustChangePassword) {
      throw new AppError('Password reset is not required for this account', 400);
    }

    user.password = await bcrypt.hash(trimmedPassword, 12);
    user.mustChangePassword = false;
    user.sessionVersion = (user.sessionVersion ?? 0) + 1;

    const savedUser = await this.userRepository.save(user);
    return this.createAuthResponse(savedUser);
  }

  async completeDoctorFirstLogin(
    email: string,
    temporaryPassword: string,
    newPassword: string,
  ): Promise<AuthResponse> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email: normalizedEmail })
      .andWhere('user.role = :role', { role: UserRole.DOCTOR })
      .getOne();

    if (!user) {
      throw new AppError('Doctor account not found', 404);
    }

    if (!user.mustChangePassword) {
      throw new AppError('Password reset is not required for this account', 400);
    }

    const passwordMatches = await bcrypt.compare(temporaryPassword, user.password);
    const matchesDevelopmentDoctorPassword =
      !env.isProduction && temporaryPassword === env.devDoctorLoginPassword;

    if (!passwordMatches && !matchesDevelopmentDoctorPassword) {
      throw new AppError('Temporary password is invalid', 401);
    }

    user.password = await bcrypt.hash(newPassword.trim(), 12);
    user.mustChangePassword = false;
    user.sessionVersion = (user.sessionVersion ?? 0) + 1;

    const savedUser = await this.userRepository.save(user);
    return this.createAuthResponse(savedUser);
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
