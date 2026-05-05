import bcrypt from 'bcrypt';
import jwt, { type SignOptions } from 'jsonwebtoken';

import { AppError } from '../../../common/errors/app-error';
import { env } from '../../../config/env';
import { AppDataSource } from '../../../config/data-source';
import { DoctorProfile } from '../../../entities/doctor-profile.entity';
import { User } from '../../../entities/user.entity';
import {
  DoctorApprovalStatus,
  SubscriptionStatus,
  UserRole,
} from '../../../entities/user.entity';
import type { LoginDto } from '../dto/login.dto';
import type { SignupDto } from '../dto/signup.dto';
import type { AuthResponse } from '../types/auth.types';
import { DoctorPortalAccessService } from '../../doctor/services/doctor-portal-access.service';
import { authEmailService } from './auth-email.service';
import { signupOtpService } from './signup-otp.service';

const SALT_ROUNDS = 12;
const JWT_EXPIRES_IN = env.jwtExpiresIn as SignOptions['expiresIn'];
const DOCTOR_TRIAL_DAYS = 0;

export class AuthService {
  private readonly userRepository = AppDataSource.getRepository(User);
  private readonly doctorProfileRepository = AppDataSource.getRepository(DoctorProfile);
  private readonly portalAccessService = new DoctorPortalAccessService();

  async signup(payload: SignupDto): Promise<AuthResponse> {
    const email = payload.email.trim().toLowerCase();
    signupOtpService.assertVerificationToken(payload.signupVerificationToken, {
      email,
      phone: payload.phone.trim(),
      role: payload.role,
    });

    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new AppError('Email is already registered', 409);
    }

    if (payload.password !== payload.confirmPassword) {
      throw new AppError('Passwords do not match', 400);
    }

    const password = await bcrypt.hash(payload.password, SALT_ROUNDS);

    if (payload.role === UserRole.DOCTOR && !payload.doctorProfile) {
      throw new AppError('Doctor profile details are required', 400);
    }

    const savedUser = await AppDataSource.transaction(async (manager) => {
      const users = manager.getRepository(User);
      const doctorProfiles = manager.getRepository(DoctorProfile);
      const now = new Date();
      const trialEndsAt = new Date(now.getTime() + DOCTOR_TRIAL_DAYS * 24 * 60 * 60 * 1000);

      const user = users.create({
        name: payload.name.trim(),
        email,
        phone: payload.phone.trim(),
        password,
        role: payload.role,
        approvalStatus:
          payload.role === UserRole.DOCTOR
            ? DoctorApprovalStatus.PENDING
            : DoctorApprovalStatus.APPROVED,
        trialStartedAt: payload.role === UserRole.DOCTOR ? now : null,
        trialEndsAt: payload.role === UserRole.DOCTOR ? trialEndsAt : null,
        subscriptionStatus:
          payload.role === UserRole.DOCTOR
            ? SubscriptionStatus.INACTIVE
            : SubscriptionStatus.ACTIVE,
      });

      const createdUser = await users.save(user);

      if (payload.role === UserRole.DOCTOR && payload.doctorProfile) {
        const medicalRegistrationNumber = payload.doctorProfile.medicalRegistrationNumber?.trim();
        if (!medicalRegistrationNumber) {
          throw new AppError('Medical registration number is required', 400);
        }
        const clinicImageUrls = [
          payload.doctorProfile.clinicImageUrl,
          ...(payload.doctorProfile.clinicImageUrls ?? []),
        ]
          .map((url) => url?.trim())
          .filter((url): url is string => Boolean(url));
        const uniqueClinicImageUrls = Array.from(new Set(clinicImageUrls));
        const clinicVideoUrls = Array.from(
          new Set(
            (payload.doctorProfile.clinicVideoUrls ?? [])
              .map((url) => url?.trim())
              .filter((url): url is string => Boolean(url)),
          ),
        );

        const profile = doctorProfiles.create({
          userId: createdUser.id,
          specialization: payload.doctorProfile.specialization.trim(),
          experience: payload.doctorProfile.experience,
          qualification: payload.doctorProfile.qualification.trim(),
          medicalRegistrationNumber: payload.doctorProfile.medicalRegistrationNumber.trim(),
          medicalCouncilBoard: payload.doctorProfile.medicalCouncilBoard.trim(),
          councilRegisteredName: payload.doctorProfile.councilRegisteredName.trim(),
          dateOfBirth: payload.doctorProfile.dateOfBirth,
          clinicName: payload.doctorProfile.clinicName.trim(),
          clinicAddress: payload.doctorProfile.clinicAddress.trim(),
          city: payload.doctorProfile.city.trim(),
          clinicId: payload.doctorProfile.clinicId?.trim() || null,
          consultationFees: payload.doctorProfile.consultationFees.toFixed(2),
          availableDays: payload.doctorProfile.availableDays.map((day) => day.trim()),
          availableTimeSlots: payload.doctorProfile.availableTimeSlots.map((slot) => slot.trim()),
          aboutDoctor: payload.doctorProfile.aboutDoctor?.trim() || null,
          profileImageUrl: payload.doctorProfile.profileImageUrl?.trim() || null,
          clinicImageUrl: uniqueClinicImageUrls[0] ?? null,
          clinicImageUrls: uniqueClinicImageUrls,
          clinicVideoUrls,
          certificateUrl: payload.doctorProfile.certificateUrl?.trim() || null,
        });

        await doctorProfiles.save(profile);
      }

      return users.findOneOrFail({
        where: { id: createdUser.id },
      });
    });

    void authEmailService.sendSignupWelcomeEmail({
      name: payload.name.trim(),
      email,
      role: payload.role,
    });

    return this.createAuthResponse(savedUser);
  }

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

    if (!passwordMatches) {
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
