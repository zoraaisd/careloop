import { AppDataSource } from '../../../config/data-source';
import { DoctorProfile } from '../../../entities/doctor-profile.entity';
import { User, UserRole, DoctorApprovalStatus } from '../../../entities/user.entity';
import { adminStoreService } from './admin-store.service';
import type { AdminDashboardResponse } from '../types/admin.types';

class AdminDashboardService {
  private readonly userRepository = AppDataSource.getRepository(User);
  private readonly doctorProfileRepository = AppDataSource.getRepository(DoctorProfile);

  async getDashboard(): Promise<AdminDashboardResponse> {
    const dashboard = adminStoreService.getDashboard();

    const dummyClinics = [
      'Green Valley Clinic',
      'Healthy Path Care',
      'Prime Ortho Center',
      'Bright Smile Clinic',
      'Advanced Health Care',
      'Life Line Hospital',
    ];

    const [totalDoctors, pendingDoctorRequests, totalPatients, profiles] = await Promise.all([
      this.doctorProfileRepository
        .createQueryBuilder('profile')
        .where('profile.clinic_name NOT IN (:...dummyClinics)', { dummyClinics })
        .getCount(),
      this.doctorProfileRepository
        .createQueryBuilder('profile')
        .innerJoin('profile.user', 'user')
        .where('user.role = :role', { role: UserRole.DOCTOR })
        .andWhere('user.approval_status = :status', { status: DoctorApprovalStatus.PENDING })
        .andWhere('profile.clinic_name NOT IN (:...dummyClinics)', { dummyClinics })
        .getCount(),
      this.userRepository.count({
        where: { role: UserRole.PATIENT },
      }),
      this.doctorProfileRepository
        .createQueryBuilder('profile')
        .select(['profile.clinic_name'])
        .where('profile.clinic_name NOT IN (:...dummyClinics)', { dummyClinics })
        .getMany(),
    ]);

    const uniqueDbClinics = new Set(profiles.map(p => p.clinicName.trim().toLowerCase())).size;
    const subscriptions = adminStoreService.getSubscriptions();
    const payments = adminStoreService.getPayments();
    const mockClinicRequests = adminStoreService.getClinicRequests();
    const pendingMockClinics = mockClinicRequests.filter(r => r.status === 'Pending').length;

    const activeSubscriptions = subscriptions.filter(s => s.status === 'Active').length;
    const totalRevenue = payments
      .filter(p => p.status === 'Paid')
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      ...dashboard,
      summary: {
        ...dashboard.summary,
        totalDoctors: totalDoctors + dashboard.summary.totalDoctors,
        pendingDoctorRequests,
        pendingClinicRequests: pendingDoctorRequests + pendingMockClinics,
        totalPatients: totalPatients + dashboard.summary.totalPatients,
        totalClinics: uniqueDbClinics + dashboard.recentClinics.length,
        activeSubscriptions: activeSubscriptions + dashboard.summary.activeSubscriptions,
        revenueStatistics: `Rs ${totalRevenue.toLocaleString('en-IN')}`,
      },
    };
  }
}

export const adminDashboardService = new AdminDashboardService();
