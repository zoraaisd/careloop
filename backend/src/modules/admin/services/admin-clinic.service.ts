import { adminStoreService } from './admin-store.service';
import type { CreateAdminClinicDto } from '../dto/create-admin-clinic.dto';
import type { UpdateClinicRequestStatusDto } from '../dto/update-clinic-request-status.dto';
import type { AdminClinic, AdminClinicListResponse, ClinicListOverview, ClinicRequest } from '../types/admin.types';

class AdminClinicService {
  private buildOverview(clinics: AdminClinic[]): ClinicListOverview {
    return {
      totalClinics: clinics.length,
      activeClinics: clinics.filter((clinic) => clinic.status === 'Active').length,
      pendingApprovalClinics: clinics.filter((clinic) => clinic.status === 'Pending Approval').length,
      suspendedClinics: clinics.filter((clinic) => clinic.status === 'Suspended').length,
    };
  }

  getClinics(): AdminClinicListResponse {
    const clinics = adminStoreService.getClinics();

    return {
      overview: this.buildOverview(clinics),
      clinics,
    };
  }

  getClinicById(id: string): AdminClinic {
    return adminStoreService.getClinicById(id);
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

  getClinicRequests(): ClinicRequest[] {
    return adminStoreService.getClinicRequests();
  }

  updateClinicRequestStatus(id: string, payload: UpdateClinicRequestStatusDto): ClinicRequest {
    return adminStoreService.updateClinicRequestStatus(id, payload.status);
  }
}

export const adminClinicService = new AdminClinicService();
