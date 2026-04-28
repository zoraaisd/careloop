import { AppDataSource } from '../../../config/data-source';
import { DoctorProfile } from '../../../entities/doctor-profile.entity';
import {
  DoctorApprovalStatus,
  SubscriptionStatus,
  UserRole,
} from '../../../entities/user.entity';
import { adminStoreService } from './admin-store.service';
import type { CreateAdminClinicDto } from '../dto/create-admin-clinic.dto';
import type { UpdateClinicRequestStatusDto } from '../dto/update-clinic-request-status.dto';
import type { AdminClinic, AdminClinicListResponse, ClinicListOverview, ClinicRequest } from '../types/admin.types';

class AdminClinicService {
  private readonly profileRepository = AppDataSource.getRepository(DoctorProfile);

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

    const doctorsPerClinic = filteredProfiles.reduce((map, profile) => {
      const key = profile.clinicName.trim().toLowerCase();
      map.set(key, (map.get(key) ?? 0) + 1);
      return map;
    }, new Map<string, number>());

    const dbClinics = filteredProfiles.map((profile) => ({
      id: profile.userId,
      clinicName: profile.clinicName,
      ownerName: profile.user.name,
      address: profile.clinicAddress,
      city: profile.city,
      contact: profile.user.phone,
      email: profile.user.email,
      subscriptionPlan:
        profile.user.subscriptionStatus === SubscriptionStatus.ACTIVE ? 'Active subscription' : 'Not subscribed',
      doctors: doctorsPerClinic.get(profile.clinicName.trim().toLowerCase()) ?? 1,
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

  deleteClinic(id: string): void {
    adminStoreService.deleteClinic(id);
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

    const dbRequests: ClinicRequest[] = filteredProfiles.map((profile) => ({
      id: profile.userId,
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
