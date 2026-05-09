import bcrypt from 'bcrypt';

import { AppError } from '../../../common/errors/app-error';
import { AppDataSource } from '../../../config/data-source';
import { AdminProfile as AdminProfileEntity } from '../../../entities/admin-profile.entity';
import type { UploadedFile } from '../../../types/uploaded-file';
import { User, UserRole } from '../../../entities/user.entity';
import { FileStorageService } from '../../files/services/file-storage.service';
import type { AdminProfile } from '../types/admin.types';
import type { UpdateAdminProfileDto } from '../dto/update-admin-profile.dto';

class AdminProfileService {
  private readonly userRepository = AppDataSource.getRepository(User);
  private readonly profileRepository = AppDataSource.getRepository(
    AdminProfileEntity,
  );
  private readonly fileStorageService = new FileStorageService();

  private extractUploadedFileId(fileUrl?: string | null): string | null {
    if (!fileUrl) {
      return null;
    }

    const match = fileUrl.match(/\/files\/([0-9a-fA-F-]{36})$/);
    return match?.[1] ?? null;
  }

  private async ensureProfileRecord(userId: string): Promise<AdminProfileEntity> {
    const user = await this.userRepository.findOne({
      where: { id: userId, role: UserRole.ADMIN },
    });

    if (!user) {
      throw new AppError('Admin account not found', 404);
    }

    const existingProfile = await this.profileRepository.findOne({
      where: { userId },
    });

    if (existingProfile) {
      return existingProfile;
    }

    const profile = this.profileRepository.create({
      userId,
      organizationName: 'CareLoop Health Services',
      location: 'MG Road, Bengaluru, Karnataka 560001',
      profileImageUrl: null,
    });

    return this.profileRepository.save(profile);
  }

  private mapProfile(
    user: User,
    profile: AdminProfileEntity,
  ): AdminProfile {
    return {
      id: profile.id,
      adminName: user.name,
      email: user.email,
      phoneNumber: user.phone,
      role: 'Super Admin',
      organizationName: profile.organizationName,
      location: profile.location,
      accountCreatedDate: user.createdAt.toISOString(),
      profileImageUrl: profile.profileImageUrl,
    };
  }

  async getProfile(userId: string): Promise<AdminProfile> {
    const profile = await this.ensureProfileRecord(userId);
    const user = await this.userRepository.findOne({
      where: { id: userId, role: UserRole.ADMIN },
    });

    if (!user) {
      throw new AppError('Admin account not found', 404);
    }

    return this.mapProfile(user, profile);
  }

  async updateProfile(
    userId: string,
    payload: UpdateAdminProfileDto,
    profileImageFile?: UploadedFile,
  ): Promise<AdminProfile> {
    const profile = await this.ensureProfileRecord(userId);
    const user = await this.userRepository.findOne({
      where: { id: userId, role: UserRole.ADMIN },
      select: ['id', 'name', 'email', 'phone', 'password', 'role', 'createdAt'],
    });

    if (!user) {
      throw new AppError('Admin account not found', 404);
    }

    if (payload.email && payload.email.trim().toLowerCase() !== user.email) {
      const existing = await this.userRepository.findOne({
        where: { email: payload.email.trim().toLowerCase() },
      });
      if (existing && existing.id !== userId) {
        throw new AppError('Email is already registered', 409);
      }
    }

    user.name = payload.adminName?.trim() || user.name;
    user.email = payload.email?.trim().toLowerCase() || user.email;
    user.phone = payload.phoneNumber?.trim() || user.phone;

    if (payload.newPassword?.trim()) {
      user.password = await bcrypt.hash(payload.newPassword.trim(), 12);
    }

    profile.organizationName =
      payload.organizationName?.trim() || profile.organizationName;
    profile.location = payload.location?.trim() || profile.location;
    const previousProfileImageFileId = this.extractUploadedFileId(
      profile.profileImageUrl,
    );

    if (profileImageFile) {
      if (!profileImageFile.buffer) {
        throw new AppError('Profile image upload is invalid', 400);
      }

      const storedFile = await this.fileStorageService.saveBuffer({
        fileName: profileImageFile.originalname,
        mimeType: profileImageFile.mimetype,
        fileSize: profileImageFile.size,
        buffer: profileImageFile.buffer,
      });

      profile.profileImageUrl = this.fileStorageService.buildFileUrl(storedFile.id);

      if (previousProfileImageFileId && previousProfileImageFileId !== storedFile.id) {
        await this.fileStorageService.deleteFile(previousProfileImageFileId);
      }
    } else {
      profile.profileImageUrl =
        payload.profileImageUrl === undefined
          ? profile.profileImageUrl
          : payload.profileImageUrl?.trim() || null;
    }

    await AppDataSource.transaction(async (manager) => {
      await manager.save(user);
      await manager.save(profile);
    });

    return this.mapProfile(user, profile);
  }
}

export const adminProfileService = new AdminProfileService();
