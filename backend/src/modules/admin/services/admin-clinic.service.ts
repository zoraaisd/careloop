import { AppDataSource } from '../../../config/data-source';
import bcrypt from 'bcrypt';
import { DoctorProfile } from '../../../entities/doctor-profile.entity';
import {
  DoctorApprovalStatus,
  SubscriptionStatus,
  User,
  UserRole,
} from '../../../entities/user.entity';
import { AppError } from '../../../common/errors/app-error';
import { logger } from '../../../common/logger';
import { Doctor } from '../../../entities/doctor.entity';
import { SupportTicket } from '../../../entities/support-ticket.entity';
import { authEmailService } from '../../auth/services/auth-email.service';
import { adminStoreService } from './admin-store.service';
import type { CreateAdminClinicDoctorDto } from '../dto/create-admin-clinic-doctor.dto';
import type { CreateAdminClinicDto } from '../dto/create-admin-clinic.dto';
import type { UpdateClinicRequestStatusDto } from '../dto/update-clinic-request-status.dto';
import type { AdminClinic, AdminClinicListResponse, ClinicListOverview, ClinicRequest } from '../types/admin.types';

class AdminClinicService {
  private readonly profileRepository = AppDataSource.getRepository(DoctorProfile);
  private readonly userRepository = AppDataSource.getRepository(User);

  async inviteClinicDoctor(payload: CreateAdminClinicDoctorDto): Promise<{ message: string }> {
    const email = payload.email.trim().toLowerCase();
    const normalizedClinicPhone = payload.clinicPhone.trim();

    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new AppError('Email is already registered', 409);
    }

    const rawPassword = randomPassword();
    const hashedPassword = await bcrypt.hash(rawPassword, 12);
    const doctorName = ensureDrPrefix(payload.name);

    await AppDataSource.transaction(async (manager) => {
      const users = manager.getRepository(User);
      const doctorProfiles = manager.getRepository(DoctorProfile);
      const now = new Date();

      const user = users.create({
        name: doctorName,
        email,
        phone: normalizedClinicPhone,
        password: hashedPassword,
        role: UserRole.DOCTOR,
        approvalStatus: DoctorApprovalStatus.PENDING,
        trialStartedAt: now,
        trialEndsAt: new Date(now.getTime()),
        subscriptionStatus: SubscriptionStatus.INACTIVE,
        mustChangePassword: true,
      });

      const createdUser = await users.save(user);

      const profile = doctorProfiles.create({
        userId: createdUser.id,
        specialization: payload.specialization.trim(),
        experience: payload.experience,
        qualification: payload.qualification.trim(),
        medicalRegistrationNumber: payload.medicalRegistrationNumber.trim(),
        medicalCouncilBoard: payload.medicalCouncilBoard.trim(),
        councilRegisteredName: doctorName,
        dateOfBirth: payload.dateOfBirth,
        clinicName: payload.clinicName.trim(),
        clinicAddress: payload.clinicAddress.trim(),
        city: payload.city.trim(),
        clinicPhone: normalizedClinicPhone,
        consultationFees: Number(payload.consultationFees ?? 0).toFixed(2),
        availableDays: (payload.availableDays ?? []).map((day) => day.trim()).filter(Boolean),
        availableTimeSlots: (payload.availableTimeSlots ?? []).map((slot) => slot.trim()).filter(Boolean),
        aboutDoctor: payload.aboutDoctor?.trim() || null,
        profileImageUrl: payload.profileImageUrl?.trim() || null,
        certificateUrl: payload.certificateUrl?.trim() || null,
      });

      await doctorProfiles.save(profile);
    });

    void authEmailService.sendDoctorInviteEmail({
      name: doctorName,
      email,
      rawPassword,
      clinicName: payload.clinicName.trim(),
    });

    return {
      message: `Clinic added successfully. A temporary password has been sent to ${email}.`,
    };
  }

  private buildOverview(clinics: AdminClinic[]): ClinicListOverview {
    return {
      totalClinics: clinics.length,
      activeClinics: clinics.filter((clinic) => clinic.status === 'Active').length,
      pendingApprovalClinics: clinics.filter((clinic) => clinic.status === 'Pending Approval').length,
      suspendedClinics: clinics.filter((clinic) => clinic.status === 'Suspended').length,
    };
  }

  private mapApprovalStatus(
    approvalStatus: DoctorApprovalStatus,
    subscriptionStatus: SubscriptionStatus,
  ): AdminClinic['status'] {
    if (approvalStatus === DoctorApprovalStatus.APPROVED) {
      return subscriptionStatus === SubscriptionStatus.ACTIVE ? 'Active' : 'Approved';
    }

    if (approvalStatus === DoctorApprovalStatus.PENDING) {
      return 'Pending Approval';
    }

    return 'Suspended';
  }

  async getClinics(): Promise<AdminClinicListResponse> {
    const dummyClinics = [
      'Green Valley Clinic',
      'Healthy Path Care',
      'Prime Ortho Center',
      'Bright Smile Clinic',
      'Advanced Health Care',
      'Life Line Hospital',
    ];

    const profiles = await this.profileRepository.find({
      relations: { user: true },
    });

    const sortedProfiles = [...profiles].sort((a, b) => {
      const aTime = a.user?.createdAt ? new Date(a.user.createdAt).getTime() : 0;
      const bTime = b.user?.createdAt ? new Date(b.user.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    const filteredProfiles = sortedProfiles.filter((profile) => {
      const isDoctor = profile.user?.role === UserRole.DOCTOR;
      const isDummyClinic = dummyClinics.includes(profile.clinicName);
      return isDoctor && !isDummyClinic;
    });

    const getClinicKey = (profile: DoctorProfile) =>
      profile.clinicId?.trim().toLowerCase() ||
      `${profile.clinicName.trim().toLowerCase()}|${profile.city.trim().toLowerCase()}|${profile.clinicAddress.trim().toLowerCase()}`;

    const doctorsPerClinic = filteredProfiles.reduce((map, profile) => {
      const key = getClinicKey(profile);
      map.set(key, (map.get(key) ?? 0) + 1);
      return map;
    }, new Map<string, number>());
    const uniqueClinicProfiles = Array.from(
      filteredProfiles.reduce((map, profile) => {
        const key = getClinicKey(profile);
        if (!map.has(key)) {
          map.set(key, profile);
        }
        return map;
      }, new Map<string, (typeof filteredProfiles)[number]>()),
    ).map(([, profile]) => profile);

    const dbClinics = uniqueClinicProfiles.map((profile) => ({
      id: profile.clinicId?.trim() || profile.userId,
      clinicName: profile.clinicName,
      ownerName: profile.user.name,
      address: profile.clinicAddress,
      city: profile.city,
      contact: profile.user.phone,
      email: profile.user.email,
      subscriptionPlan:
        profile.user.subscriptionStatus === SubscriptionStatus.ACTIVE ? 'Active subscription' : 'Not subscribed',
      doctors: doctorsPerClinic.get(getClinicKey(profile)) ?? 1,
      patients: 0,
      status: this.mapApprovalStatus(profile.user.approvalStatus, profile.user.subscriptionStatus),
      createdAt: profile.user.createdAt.toISOString(),
    }));

    const mockClinics = adminStoreService.getClinics();
    const clinics = [...dbClinics, ...mockClinics];

    return {
      overview: this.buildOverview(clinics),
      clinics,
    };
  }

  async getClinicById(id: string): Promise<AdminClinic> {
    const response = await this.getClinics();
    const clinic = response.clinics.find((item) => item.id === id);

    if (!clinic) {
      throw new Error('Clinic not found');
    }

    return clinic;
  }

  createClinic(payload: CreateAdminClinicDto): AdminClinic {
    const normalizedPlan = adminStoreService.getPlanByName(payload.subscriptionPlan);

    const clinic: AdminClinic = {
      id: `clinic-${Date.now()}`,
      clinicName: payload.clinicName,
      ownerName: payload.ownerName,
      address: payload.address,
      city: payload.city ?? payload.address.split(',').map((part) => part.trim()).filter(Boolean).at(-1) ?? 'Unknown',
      contact: payload.contact,
      email: payload.email,
      subscriptionPlan: normalizedPlan?.name ?? payload.subscriptionPlan,
      doctors: payload.doctors,
      patients: payload.patients,
      status: payload.status,
      createdAt: new Date().toISOString(),
    };

    return adminStoreService.addClinic(clinic);
  }

  async deleteClinic(id: string): Promise<void> {
    let clinicEmail: string | undefined;

    // 1. Try to find the user in the database first to get the email
    const user = await this.userRepository.findOne({ where: { id } });
    if (user) {
      clinicEmail = user.email;
    }

    // 2. Try to remove from mock store
    let removedFromMock = false;
    try {
      adminStoreService.deleteClinic(id);
      removedFromMock = true;
    } catch {
      // Not in mock store
    }

    if (removedFromMock) {
      adminStoreService.purgeClinicPaymentsAndSubscriptions(id);
    }

    logger.info({ id, email: clinicEmail }, 'Aggressively purging clinic/doctor and all associated data from database');

    await AppDataSource.transaction(async (manager) => {
      // Deleting in order of dependencies (though most have CASCADE, we want to be explicit)
      
      // 1. Delete Support Tickets
      await manager.createQueryBuilder()
        .delete()
        .from(SupportTicket)
        .where('doctor_id = :id', { id })
        .execute();

      // 2. Delete Doctor Profile
      await manager.createQueryBuilder()
        .delete()
        .from(DoctorProfile)
        .where('user_id = :id', { id })
        .execute();

      // 3. Delete from legacy Doctor table
      if (clinicEmail) {
        const normalizedEmail = clinicEmail.trim().toLowerCase();
        await manager.createQueryBuilder()
          .delete()
          .from(Doctor)
          .where('email = :email', { email: normalizedEmail })
          .execute();
      }
      
      await manager.createQueryBuilder()
        .delete()
        .from(Doctor)
        .where('source_user_id = :id', { id })
        .execute();

      // 4. Finally delete the User record
      // This will trigger any remaining database-level cascades
      const deleteResult = await manager.createQueryBuilder()
        .delete()
        .from(User)
        .where('id = :id', { id })
        .execute();

      if (deleteResult.affected && deleteResult.affected > 0) {
        logger.info({ id, email: clinicEmail }, 'User account successfully purged from database');
      } else if (clinicEmail) {
        // Fallback: try deleting by email if ID didn't work (unlikely but safe)
        await manager.createQueryBuilder()
          .delete()
          .from(User)
          .where('email = :email', { email: clinicEmail.trim().toLowerCase() })
          .execute();
      }
    });

    logger.info({ id }, 'Purge complete');
  }

  async getClinicRequests(): Promise<ClinicRequest[]> {
    const dummyClinics = [
      'Green Valley Clinic',
      'Healthy Path Care',
      'Prime Ortho Center',
      'Bright Smile Clinic',
      'Advanced Health Care',
      'Life Line Hospital',
    ];

    const profiles = await this.profileRepository.find({
      relations: { user: true },
    });

    const sortedProfiles = [...profiles].sort((a, b) => {
      const aTime = a.user?.createdAt ? new Date(a.user.createdAt).getTime() : 0;
      const bTime = b.user?.createdAt ? new Date(b.user.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    const filteredProfiles = sortedProfiles.filter((profile) => {
      const isDoctor = profile.user?.role === UserRole.DOCTOR;
      const isApproved = profile.user?.approvalStatus === DoctorApprovalStatus.APPROVED;
      const isDummyClinic = dummyClinics.includes(profile.clinicName);
      return isDoctor && isApproved && !isDummyClinic;
    });

    const getClinicKey = (profile: DoctorProfile) =>
      profile.clinicId?.trim().toLowerCase() ||
      `${profile.clinicName.trim().toLowerCase()}|${profile.city.trim().toLowerCase()}|${profile.clinicAddress.trim().toLowerCase()}`;

    const uniqueClinicProfiles = Array.from(
      filteredProfiles.reduce((map, profile) => {
        const key = getClinicKey(profile);
        if (!map.has(key)) {
          map.set(key, profile);
        }
        return map;
      }, new Map<string, (typeof filteredProfiles)[number]>()),
    ).map(([, profile]) => profile);

    const dbRequests: ClinicRequest[] = uniqueClinicProfiles.map((profile) => ({
      id: profile.clinicId?.trim() || profile.userId,
      clinicId: profile.clinicId ?? undefined,
      clinic: profile.clinicName,
      city: profile.city,
      owner: profile.user.name,
      requestedOn: profile.user.createdAt.toISOString().split('T')[0],
      status: 'Approved',
      contact: profile.user.phone,
      email: profile.user.email,
    }));

    const mockRequests = adminStoreService.getClinicRequests();

    return [...dbRequests, ...mockRequests];
  }

  updateClinicRequestStatus(id: string, payload: UpdateClinicRequestStatusDto): ClinicRequest {
    return adminStoreService.updateClinicRequestStatus(id, payload.status);
  }
}

export const adminClinicService = new AdminClinicService();

function ensureDrPrefix(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  if (/^Dr\.?\s/i.test(trimmed)) return trimmed;
  return `Dr. ${trimmed}`;
}

function randomPassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let index = 0; index < length; index += 1) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
