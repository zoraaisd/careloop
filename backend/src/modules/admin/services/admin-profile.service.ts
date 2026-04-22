import { adminStoreService } from './admin-store.service';
import type { AdminProfile } from '../types/admin.types';
import type { UpdateAdminProfileDto } from '../dto/update-admin-profile.dto';

class AdminProfileService {
  getProfile(): AdminProfile {
    return adminStoreService.getProfile();
  }

  updateProfile(payload: UpdateAdminProfileDto): AdminProfile {
    const currentProfile = adminStoreService.getProfile();

    const nextProfile: AdminProfile = {
      ...currentProfile,
      adminName: payload.adminName ?? currentProfile.adminName,
      email: payload.email ?? currentProfile.email,
      phoneNumber: payload.phoneNumber ?? currentProfile.phoneNumber,
      organizationName: payload.organizationName ?? currentProfile.organizationName,
      location: payload.location ?? currentProfile.location,
      profileImageUrl: payload.profileImageUrl ?? currentProfile.profileImageUrl,
    };

    return adminStoreService.saveProfile(nextProfile);
  }
}

export const adminProfileService = new AdminProfileService();
