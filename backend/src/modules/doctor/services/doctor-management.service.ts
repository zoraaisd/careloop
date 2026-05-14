import { randomBytes } from 'crypto';
import { In } from 'typeorm';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import bcrypt from 'bcrypt';

import { AppError } from '../../../common/errors/app-error';
import { portalEmailService } from '../../../common/services/portal-email.service';
import { AppDataSource } from '../../../config/data-source';
import { ActivityLog } from '../../../entities/activity-log.entity';
import { DoctorProfile } from '../../../entities/doctor-profile.entity';
import { Patient } from '../../../entities/patient.entity';
import { DoctorApprovalStatus, SubscriptionStatus, User, UserRole } from '../../../entities/user.entity';
import { DoctorAccessService } from './doctor-access.service';
import { signupOtpService } from '../../../common/services/signup-otp.service';
import type { CreateDoctorDto } from '../dto/create-doctor.dto';
import { adminDoctorService } from '../../admin/services/admin-doctor.service';
import { adminBillingService } from '../../admin/services/admin-billing.service';

const SALT_ROUNDS = 12;
const DOCTOR_TRIAL_DAYS = 0;

type DoctorDirectoryItem = {
  userId: string;
  name: string;
  mobile: string;
  email: string;
  clinicName: string | null;
  specialty: string | null;
  clinicPhone: string | null;
  clinicAddress: string | null;
  city: string | null;
  clinicLogoUrl: string | null;
  clinicImageUrl: string | null;
  clinicImageUrls: string[];
  clinicVideoUrls: string[];
  patientCount: number;
  status: DoctorApprovalStatus;
  isMainDoctor: boolean;
};

type DoctorDirectoryDetails = {
  userId: string;
  name: string;
  email: string;
  mobile: string;
  status: DoctorApprovalStatus;
  patientCount: number;
  clinicName: string | null;
  clinicPhone: string | null;
  clinicAddress: string | null;
  city: string | null;
  specialty: string | null;
  experience: number | null;
  qualification: string | null;
  aboutDoctor: string | null;
  consultationFees: string | null;
  availableDays: string[];
  availableTimeSlots: string[];
  createdAt: Date;
};

type ClinicOverviewUpdatePayload = {
  clinicName: string;
  clinicPhone: string;
  clinicAddress: string;
  city?: string;
};

export class DoctorManagementService {
  private readonly userRepository = AppDataSource.getRepository(User);
  private readonly patientRepository = AppDataSource.getRepository(Patient);
  private readonly doctorProfileRepository = AppDataSource.getRepository(DoctorProfile);
  private readonly activityRepository = AppDataSource.getRepository(ActivityLog);
  private readonly accessService = new DoctorAccessService();

  private normalizeStoredMediaAsset(value: string | null): string | null {
    if (!value) {
      return null;
    }

    if (/^data:/i.test(value) || /^https?:\/\//i.test(value)) {
      return value;
    }

    if (!value.startsWith('/uploads/')) {
      return null;
    }

    const filePath = path.join(process.cwd(), value.replace(/^\//, '').replace(/\//g, path.sep));
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const extension = path.extname(filePath).toLowerCase();
    const mimeType =
      extension === '.png'
        ? 'image/png'
        : extension === '.jpg' || extension === '.jpeg'
          ? 'image/jpeg'
          : extension === '.webp'
            ? 'image/webp'
            : extension === '.gif'
              ? 'image/gif'
              : extension === '.mp4'
                ? 'video/mp4'
                : extension === '.webm'
                  ? 'video/webm'
                  : extension === '.mov'
                    ? 'video/quicktime'
                    : null;

    if (!mimeType) {
      return null;
    }

    const fileBuffer = fs.readFileSync(filePath);
    return `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
  }

  private normalizeStoredMediaAssets(values: string[] | null | undefined): string[] {
    return (values ?? [])
      .map((value) => this.normalizeStoredMediaAsset(value))
      .filter((value): value is string => Boolean(value));
  }

  private extractLegacyUploadPaths(values: Array<string | null | undefined>): string[] {
    return Array.from(
      new Set(
        values
          .filter((value): value is string => typeof value === 'string' && value.startsWith('/uploads/')),
      ),
    );
  }

  private async removeLegacyUploadFiles(values: Array<string | null | undefined>): Promise<void> {
    const uploadPaths = this.extractLegacyUploadPaths(values);

    await Promise.all(
      uploadPaths.map(async (value) => {
        const filePath = path.join(process.cwd(), value.replace(/^\//, '').replace(/\//g, path.sep));

        try {
          await fsPromises.unlink(filePath);
        } catch {
          // Ignore cleanup failures; DB value is already the source of truth.
        }
      }),
    );
  }

  private async migrateProfileMediaAssets(profile: DoctorProfile): Promise<DoctorProfile> {
    const originalImageUrl = profile.clinicImageUrl;
    const originalLogoUrl = profile.clinicLogoUrl;
    const originalImageUrls = [...(profile.clinicImageUrls ?? [])];
    const originalVideoUrls = [...(profile.clinicVideoUrls ?? [])];

    const normalizedImageUrls = this.normalizeStoredMediaAssets(profile.clinicImageUrls);
    const normalizedFallbackImage = this.normalizeStoredMediaAsset(profile.clinicImageUrl);
    const normalizedLogoUrl = this.normalizeStoredMediaAsset(profile.clinicLogoUrl);
    const normalizedVideoUrls = this.normalizeStoredMediaAssets(profile.clinicVideoUrls);

    const finalImageUrls =
      normalizedImageUrls.length > 0
        ? normalizedImageUrls
        : normalizedFallbackImage
          ? [normalizedFallbackImage]
          : [];
    const finalImageUrl = finalImageUrls[0] ?? null;

    const hasChanged =
      normalizedLogoUrl !== originalLogoUrl ||
      finalImageUrl !== originalImageUrl ||
      JSON.stringify(finalImageUrls) !== JSON.stringify(originalImageUrls) ||
      JSON.stringify(normalizedVideoUrls) !== JSON.stringify(originalVideoUrls);

    if (!hasChanged) {
      return profile;
    }

    profile.clinicLogoUrl = normalizedLogoUrl;
    profile.clinicImageUrl = finalImageUrl;
    profile.clinicImageUrls = finalImageUrls;
    profile.clinicVideoUrls = normalizedVideoUrls;

    await this.doctorProfileRepository.save(profile);
    await this.removeLegacyUploadFiles([originalLogoUrl, originalImageUrl, ...originalImageUrls, ...originalVideoUrls]);

    return profile;
  }

  private async getClinicScopedProfiles(currentDoctorId?: string) {
    const doctorId = this.accessService.ensureAuthenticatedDoctorId(currentDoctorId);
    const currentProfile = await this.doctorProfileRepository.findOne({
      where: { userId: doctorId },
    });

    if (!currentProfile) {
      throw new AppError('Clinic profile not found', 404);
    }

    const query = this.doctorProfileRepository.createQueryBuilder('profile');

    if (currentProfile.clinicId) {
      query.where('profile.clinic_id = :clinicId', { clinicId: currentProfile.clinicId });
    } else {
      query
        .where('profile.clinic_name = :clinicName', { clinicName: currentProfile.clinicName })
        .andWhere('profile.clinic_address = :clinicAddress', { clinicAddress: currentProfile.clinicAddress })
        .andWhere('profile.city = :city', { city: currentProfile.city });
    }

    const profiles = await query.getMany();
    return { currentProfile, profiles };
  }

  private async ensureDoctorLimitNotExceeded(currentDoctorId: string): Promise<void> {
    const currentDoctor = await this.userRepository.findOne({
      where: { id: currentDoctorId, role: UserRole.DOCTOR },
    });

    if (!currentDoctor) {
      throw new AppError('Doctor account not found', 404);
    }

    const clinicScopedProfiles = await this.getClinicScopedProfiles(currentDoctorId);
    const clinicDoctorCount = clinicScopedProfiles.profiles.length;
    const plans = await adminBillingService.getPlans();
    const subscribedPlan = plans.find((plan) => plan.id === currentDoctor.subscribedPlanId);
    const trialPlan = plans.find((plan) => plan.id === 'plan-free-trial');
    const doctorLimit = subscribedPlan?.doctorsLimit ?? trialPlan?.doctorsLimit ?? 1;

    if (clinicDoctorCount >= doctorLimit) {
      throw new AppError(
        `Doctor limit reached (${clinicDoctorCount}/${doctorLimit}) for this clinic. Please upgrade the subscription plan to add more doctors.`,
        403,
      );
    }
  }

  async listDoctors(currentDoctorId?: string): Promise<DoctorDirectoryItem[]> {
    const doctorId = this.accessService.ensureAuthenticatedDoctorId(currentDoctorId);
    const currentProfile = await this.doctorProfileRepository.findOne({
      where: { userId: doctorId },
      select: ['clinicId', 'clinicName', 'clinicAddress', 'city'],
    });

    const query = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.doctorProfile', 'profile')
      .where('user.role = :role', { role: UserRole.DOCTOR })
      .andWhere('user.approval_status IN (:...statuses)', { statuses: [DoctorApprovalStatus.APPROVED, DoctorApprovalStatus.PENDING] });

    if (currentProfile?.clinicId) {
      query.andWhere('profile.clinic_id = :clinicId', { clinicId: currentProfile.clinicId });
    } else {
      const clinicName = currentProfile?.clinicName?.trim();
      const clinicAddress = currentProfile?.clinicAddress?.trim();
      const city = currentProfile?.city?.trim();

      if (clinicName && clinicAddress && city) {
        query.andWhere('profile.clinic_name = :clinicName', { clinicName });
        query.andWhere('profile.clinic_address = :clinicAddress', { clinicAddress });
        query.andWhere('profile.city = :city', { city });
      } else {
        query.andWhere('user.id = :currentDoctorId', { currentDoctorId: doctorId });
      }
    }

    const doctors = await query
      .orderBy('profile.clinic_id', 'ASC')
      .addOrderBy('user.createdAt', 'DESC')
      .getMany();

    await Promise.all(
      doctors.map(async (doctor) => {
        if (doctor.doctorProfile) {
          doctor.doctorProfile = await this.migrateProfileMediaAssets(doctor.doctorProfile);
        }
      }),
    );

    const patientCounts = await this.patientRepository
      .createQueryBuilder('patient')
      .select('patient.primaryDoctorId', 'doctorId')
      .addSelect('COUNT(*)', 'count')
      .where('patient.isActive = true')
      .andWhere('patient.primaryDoctorId IS NOT NULL')
      .groupBy('patient.primaryDoctorId')
      .getRawMany<{ doctorId: string; count: string }>();

    const patientCountMap = new Map(
      patientCounts.map((item) => [item.doctorId, Number(item.count || 0)]),
    );

    const sortedDoctorsByCreation = [...doctors].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const mainDoctorCandidate = doctors.find(d => d.email.trim().toLowerCase() === 'vinisha.codes@gmail.com') || sortedDoctorsByCreation[0];
    const mainDoctorId = mainDoctorCandidate?.id;

    return doctors.map((doctor) => {
      const clinicImageUrls = this.normalizeStoredMediaAssets(doctor.doctorProfile?.clinicImageUrls);
      const fallbackImageUrl = this.normalizeStoredMediaAsset(doctor.doctorProfile?.clinicImageUrl || null);
      const clinicVideoUrls = this.normalizeStoredMediaAssets(doctor.doctorProfile?.clinicVideoUrls);

      return {
        userId: doctor.id,
        name: doctor.name,
        mobile: doctor.phone,
        email: doctor.email,
        clinicName: doctor.doctorProfile?.clinicName || null,
        specialty: doctor.doctorProfile?.specialization || null,
        clinicPhone: doctor.doctorProfile?.clinicPhone || null,
        clinicAddress: doctor.doctorProfile?.clinicAddress || null,
        city: doctor.doctorProfile?.city || null,
        clinicLogoUrl: this.normalizeStoredMediaAsset(doctor.doctorProfile?.clinicLogoUrl || null),
        clinicImageUrl: clinicImageUrls[0] ?? fallbackImageUrl,
        clinicImageUrls: clinicImageUrls.length > 0 ? clinicImageUrls : fallbackImageUrl ? [fallbackImageUrl] : [],
        clinicVideoUrls,
        patientCount: patientCountMap.get(doctor.id) ?? 0,
        status: doctor.approvalStatus,
        isMainDoctor: doctor.id === mainDoctorId,
      };
    });
  }

  async createDoctor(
    payload: CreateDoctorDto,
    currentDoctorId?: string,
  ): Promise<{ message: string; userId: string; temporaryPassword?: string }> {
    const doctorId = this.accessService.ensureAuthenticatedDoctorId(currentDoctorId);
    const currentProfile = await this.doctorProfileRepository.findOne({
      where: { userId: doctorId },
    });
    if (!currentProfile?.clinicName?.trim() || !currentProfile?.clinicAddress?.trim() || !currentProfile?.city?.trim()) {
      throw new AppError('Clinic details are missing in your dashboard profile. Please complete your clinic details first.', 400);
    }

    await this.ensureDoctorLimitNotExceeded(doctorId);

    const email = payload.email.trim().toLowerCase();
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new AppError('Email is already registered', 409);
    }

    // Verify OTP
    signupOtpService.assertVerificationToken(payload.signupVerificationToken, {
      email,
      phone: payload.phone.trim(),
      role: UserRole.DOCTOR,
    });

    const generatedPassword = randomBytes(12).toString('hex');
    const password = await bcrypt.hash(generatedPassword, SALT_ROUNDS);
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + DOCTOR_TRIAL_DAYS * 24 * 60 * 60 * 1000);

    const savedUser = await AppDataSource.transaction(async (manager) => {
      const users = manager.getRepository(User);
      const doctorProfiles = manager.getRepository(DoctorProfile);

      const createdUser = await users.save(
        users.create({
          name: payload.name.trim(),
          email,
          phone: payload.phone.trim(),
          password,
          role: UserRole.DOCTOR,
          approvalStatus: DoctorApprovalStatus.PENDING,
          trialStartedAt: now,
          trialEndsAt,
          subscriptionStatus: SubscriptionStatus.INACTIVE,
          mustChangePassword: true,
        }),
      );

      await doctorProfiles.save(
        doctorProfiles.create({
          user: createdUser,
          specialization: payload.specialization.trim(),
          experience: payload.experience,
          qualification: payload.qualification.trim(),
          clinicId: currentProfile?.clinicId || null,
          clinicName: currentProfile.clinicName.trim(),
          clinicAddress: currentProfile.clinicAddress.trim(),
          city: currentProfile.city.trim(),
          clinicPhone: currentProfile.clinicPhone?.trim() || null,
        }),
      );

      return createdUser;
    });

    void portalEmailService.sendDoctorInviteEmail({
      name: payload.name.trim(),
      email,
      rawPassword: generatedPassword,
      clinicName: currentProfile.clinicName.trim(),
    });

    return {
      message: 'Doctor created successfully',
      userId: savedUser.id,
      temporaryPassword:
        process.env.NODE_ENV !== 'production' ? generatedPassword : undefined,
    };
  }

  async getDoctorDetails(targetDoctorId: string, currentDoctorId?: string): Promise<DoctorDirectoryDetails> {
    const doctorId = this.accessService.ensureAuthenticatedDoctorId(currentDoctorId);
    const currentProfile = await this.doctorProfileRepository.findOne({
      where: { userId: doctorId },
      select: ['clinicId', 'clinicName', 'clinicAddress', 'city'],
    });

    const query = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.doctorProfile', 'profile')
      .where('user.id = :targetDoctorId', { targetDoctorId })
      .andWhere('user.role = :role', { role: UserRole.DOCTOR });

    if (currentProfile?.clinicId) {
      query.andWhere('profile.clinic_id = :clinicId', { clinicId: currentProfile.clinicId });
    } else {
      const clinicName = currentProfile?.clinicName?.trim();
      const clinicAddress = currentProfile?.clinicAddress?.trim();
      const city = currentProfile?.city?.trim();

      if (clinicName && clinicAddress && city) {
        query.andWhere('profile.clinic_name = :clinicName', { clinicName });
        query.andWhere('profile.clinic_address = :clinicAddress', { clinicAddress });
        query.andWhere('profile.city = :city', { city });
      } else {
        query.andWhere('user.id = :currentDoctorId', { currentDoctorId: doctorId });
      }
    }

    const doctor = await query.getOne();

    if (!doctor) {
      throw new AppError('Doctor not found', 404);
    }

    if (doctor.doctorProfile) {
      doctor.doctorProfile = await this.migrateProfileMediaAssets(doctor.doctorProfile);
    }

    const patientCount = await this.patientRepository.count({
      where: {
        isActive: true,
        primaryDoctorId: doctor.id,
      },
    });

    return {
      userId: doctor.id,
      name: doctor.name,
      email: doctor.email,
      mobile: doctor.phone,
      status: doctor.approvalStatus,
      patientCount,
      clinicName: doctor.doctorProfile?.clinicName || null,
      clinicPhone: doctor.doctorProfile?.clinicPhone || null,
      clinicAddress: doctor.doctorProfile?.clinicAddress || null,
      city: doctor.doctorProfile?.city || null,
      specialty: doctor.doctorProfile?.specialization || null,
      experience: doctor.doctorProfile?.experience ?? null,
      qualification: doctor.doctorProfile?.qualification || null,
      aboutDoctor: doctor.doctorProfile?.aboutDoctor || null,
      consultationFees: doctor.doctorProfile?.consultationFees || null,
      availableDays: doctor.doctorProfile?.availableDays ?? [],
      availableTimeSlots: doctor.doctorProfile?.availableTimeSlots ?? [],
      createdAt: doctor.createdAt,
    };
  }

  async updateDoctor(
    targetDoctorId: string,
    updates: Partial<{
      name: string;
      email: string;
      phone: string;
      specialization: string;
      experience: number;
      qualification: string;
      clinicName: string;
      clinicPhone: string;
      clinicAddress: string;
      city: string;
      aboutDoctor: string;
    }>,
    currentDoctorId?: string,
  ): Promise<{ message: string }> {
    const doctor = await this.getDoctorDetails(targetDoctorId, currentDoctorId);

    const profile = await this.doctorProfileRepository.findOne({
      where: { userId: doctor.userId },
      relations: ['user'],
    });

    if (!profile) {
      throw new AppError('Doctor not found', 404);
    }

    if (typeof updates.name === 'string' && updates.name.trim()) {
      profile.user.name = updates.name.trim();
    }
    if (typeof updates.email === 'string' && updates.email.trim()) {
      profile.user.email = updates.email.trim().toLowerCase();
    }
    if (typeof updates.phone === 'string' && updates.phone.trim()) {
      profile.user.phone = updates.phone.trim();
    }
    if (typeof updates.specialization === 'string' && updates.specialization.trim()) {
      profile.specialization = updates.specialization.trim();
    }
    if (typeof updates.experience === 'number' && !Number.isNaN(updates.experience)) {
      profile.experience = updates.experience;
    }
    if (typeof updates.qualification === 'string' && updates.qualification.trim()) {
      profile.qualification = updates.qualification.trim();
    }
    if (typeof updates.clinicName === 'string' && updates.clinicName.trim()) {
      profile.clinicName = updates.clinicName.trim();
    }
    if (typeof updates.clinicPhone === 'string') {
      profile.clinicPhone = updates.clinicPhone.trim() || null;
    }
    if (typeof updates.clinicAddress === 'string' && updates.clinicAddress.trim()) {
      profile.clinicAddress = updates.clinicAddress.trim();
    }
    if (typeof updates.city === 'string' && updates.city.trim()) {
      profile.city = updates.city.trim();
    }
    if (typeof updates.aboutDoctor === 'string') {
      profile.aboutDoctor = updates.aboutDoctor.trim() || null;
    }

    await AppDataSource.transaction(async (manager) => {
      await manager.save(profile.user);
      await manager.save(profile);
    });

    return { message: 'Doctor updated successfully' };
  }

  async updateClinicAssets(
    payload: {
      assetType: 'image' | 'video' | 'logo';
      dataUrl: string;
      fileName: string;
    },
    currentDoctorId?: string,
  ): Promise<{
    message: string;
    clinicLogoUrl: string | null;
    clinicImageUrls: string[];
    clinicVideoUrls: string[];
    clinicImageUrl: string | null;
  }> {
    const { currentProfile, profiles } = await this.getClinicScopedProfiles(currentDoctorId);
    const legacyUploadPaths = this.extractLegacyUploadPaths([
      currentProfile.clinicLogoUrl,
      currentProfile.clinicImageUrl,
      ...(currentProfile.clinicImageUrls ?? []),
      ...(currentProfile.clinicVideoUrls ?? []),
    ]);
    const assetValue = this.normalizeClinicAssetValue(payload);
    const logoUrl = payload.assetType === 'logo' ? assetValue : currentProfile.clinicLogoUrl ?? null;

    const imageUrls = Array.from(
      new Set(
        payload.assetType === 'image'
          ? [assetValue]
          : currentProfile.clinicImageUrls ?? [],
      ),
    );
    const videoUrls = Array.from(
      new Set(
        payload.assetType === 'video'
          ? [assetValue]
          : currentProfile.clinicVideoUrls ?? [],
      ),
    );

    await AppDataSource.transaction(async (manager) => {
      for (const profile of profiles) {
        profile.clinicLogoUrl = logoUrl;
        profile.clinicImageUrls = imageUrls;
        profile.clinicImageUrl = imageUrls[0] ?? null;
        profile.clinicVideoUrls = videoUrls;
        await manager.save(profile);
      }
    });

    await this.removeLegacyUploadFiles(legacyUploadPaths);

    return {
      message:
        payload.assetType === 'logo'
          ? 'Logo uploaded successfully'
          : `${payload.assetType === 'image' ? 'Image' : 'Video'} uploaded successfully`,
      clinicLogoUrl: logoUrl,
      clinicImageUrls: imageUrls,
      clinicVideoUrls: videoUrls,
      clinicImageUrl: imageUrls[0] ?? null,
    };
  }

  async updateClinicOverview(
    payload: ClinicOverviewUpdatePayload,
    currentDoctorId?: string,
  ): Promise<{
    message: string;
    clinicName: string;
    clinicPhone: string;
    clinicAddress: string;
    city: string;
    clinicLogoUrl: string | null;
    clinicImageUrls: string[];
    clinicVideoUrls: string[];
  }> {
    const { currentProfile, profiles } = await this.getClinicScopedProfiles(currentDoctorId);
    const clinicName = payload.clinicName.trim();
    const clinicPhone = payload.clinicPhone.trim();
    const clinicAddress = payload.clinicAddress.trim();
    const city = (payload.city ?? '').trim();

    if (!clinicName) {
      throw new AppError('Clinic name is required', 400);
    }

    if (!clinicPhone) {
      throw new AppError('Clinic mobile number is required', 400);
    }

    if (!clinicAddress) {
      throw new AppError('Clinic address is required', 400);
    }

    if (!city) {
      throw new AppError('Clinic city is required', 400);
    }

    await AppDataSource.transaction(async (manager) => {
      for (const profile of profiles) {
        profile.clinicName = clinicName;
        profile.clinicPhone = clinicPhone;
        profile.clinicAddress = clinicAddress;
        profile.city = city;
        await manager.save(profile);
      }
    });

    return {
      message: 'Clinic details updated successfully',
      clinicName,
      clinicPhone,
      clinicAddress,
      city,
      clinicLogoUrl: currentProfile.clinicLogoUrl ?? null,
      clinicImageUrls: currentProfile.clinicImageUrls ?? [],
      clinicVideoUrls: currentProfile.clinicVideoUrls ?? [],
    };
  }

  async deleteClinicAsset(
    assetType: 'image' | 'video' | 'logo',
    currentDoctorId?: string,
  ): Promise<{
    message: string;
    clinicLogoUrl: string | null;
    clinicImageUrls: string[];
    clinicVideoUrls: string[];
    clinicImageUrl: string | null;
  }> {
    const { currentProfile, profiles } = await this.getClinicScopedProfiles(currentDoctorId);
    const legacyUploadPaths = this.extractLegacyUploadPaths([
      currentProfile.clinicLogoUrl,
      currentProfile.clinicImageUrl,
      ...(currentProfile.clinicImageUrls ?? []),
      ...(currentProfile.clinicVideoUrls ?? []),
    ]);

    const logoUrl = assetType === 'logo' ? null : currentProfile.clinicLogoUrl ?? null;
    const imageUrls = assetType === 'image' ? [] : currentProfile.clinicImageUrls ?? [];
    const videoUrls = assetType === 'video' ? [] : currentProfile.clinicVideoUrls ?? [];

    await AppDataSource.transaction(async (manager) => {
      for (const profile of profiles) {
        profile.clinicLogoUrl = logoUrl;
        profile.clinicImageUrls = imageUrls;
        profile.clinicImageUrl = imageUrls[0] ?? null;
        profile.clinicVideoUrls = videoUrls;
        await manager.save(profile);
      }
    });

    await this.removeLegacyUploadFiles(legacyUploadPaths);

    return {
      message:
        assetType === 'logo'
          ? 'Logo deleted successfully'
          : `${assetType === 'image' ? 'Image' : 'Video'} deleted successfully`,
      clinicLogoUrl: logoUrl,
      clinicImageUrls: imageUrls,
      clinicVideoUrls: videoUrls,
      clinicImageUrl: imageUrls[0] ?? null,
    };
  }

  private normalizeClinicAssetValue(payload: {
    assetType: 'image' | 'video' | 'logo';
    dataUrl: string;
    fileName: string;
  }): string {
    const match = payload.dataUrl.match(/^data:([a-zA-Z0-9/+.-]+);base64,(.+)$/);

    if (!match) {
      throw new AppError('Invalid file data', 400);
    }

    const mimeType = match[1];
    const fileData = match[2];
    const isImage = payload.assetType === 'image' || payload.assetType === 'logo';

    if (isImage && !mimeType.startsWith('image/')) {
      throw new AppError('Please upload a valid image file', 400);
    }

    if (!isImage && !mimeType.startsWith('video/')) {
      throw new AppError('Please upload a valid video file', 400);
    }

    const rawSizeInBytes = Math.floor((fileData.length * 3) / 4);
    const maxSizeInBytes = isImage ? 8 * 1024 * 1024 : 20 * 1024 * 1024;

    if (rawSizeInBytes > maxSizeInBytes) {
      throw new AppError(
        isImage ? 'Image size must be 8MB or less' : 'Video size must be 20MB or less',
        400,
      );
    }

    return payload.dataUrl;
  }

  async requestInvitationOtp(payload: { email: string, phone: string, name: string }, currentDoctorId?: string) {
    const doctorId = this.accessService.ensureAuthenticatedDoctorId(currentDoctorId);
    await this.ensureDoctorLimitNotExceeded(doctorId);

    const doctor = await this.userRepository.findOne({ where: { id: doctorId } });
    if (!doctor) {
      throw new AppError('Main doctor account not found', 404);
    }

    const currentProfile = await this.doctorProfileRepository.findOne({
      where: { userId: doctorId },
    });

    if (!currentProfile) {
      throw new AppError('Clinic profile not found', 404);
    }

    // Find the main doctor (owner) of the clinic to send the authorization OTP
    const { profiles } = await this.getClinicScopedProfiles(doctorId);
    
    // Prioritize vinisha.codes@gmail.com if part of this clinic
    const allClinicUsers = await this.userRepository.find({
      where: { id: In(profiles.map(p => p.userId)) }
    });
    const vinishaAccount = allClinicUsers.find(u => u.email.trim().toLowerCase() === 'vinisha.codes@gmail.com');
    
    let mainDoctorAccount: User | null = vinishaAccount || null;
    
    if (!mainDoctorAccount) {
      const sortedProfiles = [...profiles].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      const mainProfile = sortedProfiles[0];
      if (mainProfile) {
        mainDoctorAccount = await this.userRepository.findOne({ where: { id: mainProfile.userId } });
      }
    }

    if (!mainDoctorAccount) {
      throw new AppError('Clinic owner account not found', 404);
    }

    const email = payload.email.trim().toLowerCase();
    const existingUser = await this.userRepository.findOne({ 
      where: { email },
      relations: ['doctorProfile']
    });

    if (existingUser) {
      if (existingUser.doctorProfile?.clinicName === currentProfile.clinicName) {
        throw new AppError('This doctor is already registered in your clinic.', 409);
      }
      throw new AppError('This email is already registered with another account.', 409);
    }

    // Send OTP to the MAIN doctor's email, but the OTP record will be for the NEW doctor's identity
    return await signupOtpService.requestOtpAndSendEmail({
      name: payload.name,
      email: payload.email.trim().toLowerCase(),
      phone: payload.phone.trim(),
      role: UserRole.DOCTOR,
    }, mainDoctorAccount.email); // Use main doctor's email for delivery
  }

  async verifyInvitationOtp(payload: { email: string; phone: string; otp: string }, currentDoctorId?: string) {
    this.accessService.ensureAuthenticatedDoctorId(currentDoctorId);
    
    // Verify OTP against the NEW doctor's identity (which was used as the key in the OTP store)
    return signupOtpService.verifyOtpAsync({
      email: payload.email.trim().toLowerCase(),
      phone: payload.phone.trim(),
      role: UserRole.DOCTOR,
      otp: payload.otp,
    });
  }

  async deleteDoctor(
    targetDoctorId: string,
    currentDoctorId?: string,
  ): Promise<{ message: string }> {
    const actorDoctorId = this.accessService.ensureAuthenticatedDoctorId(currentDoctorId);
    const targetDoctor = await this.getDoctorDetails(targetDoctorId, actorDoctorId);

    if (targetDoctor.userId === actorDoctorId) {
      throw new AppError('You cannot delete your own doctor account', 400);
    }

    const doctorsInClinic = await this.listDoctors(actorDoctorId);
    const targetDoctorItem = doctorsInClinic.find(d => d.userId === targetDoctor.userId);
    if (targetDoctorItem?.isMainDoctor) {
      throw new AppError('The primary doctor account cannot be deleted', 403);
    }

    await adminDoctorService.deleteDoctor(targetDoctor.userId);

    await this.activityRepository.save(
      this.activityRepository.create({
        doctorId: null,
        patientId: null,
        type: 'doctor-removed',
        message: `Doctor removed from clinic: ${targetDoctor.name} (${targetDoctor.email})`,
      }),
    );

    return { message: 'Doctor deleted successfully' };
  }
}
