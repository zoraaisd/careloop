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
    const [totalDoctors, pendingDoctorRequests, totalPatients] = await Promise.all([
      this.doctorProfileRepository.count(),
      this.doctorProfileRepository
        .createQueryBuilder('profile')
        .innerJoin('profile.user', 'user')
        .where('user.role = :role', { role: UserRole.DOCTOR })
        .andWhere('user.approval_status = :status', { status: DoctorApprovalStatus.PENDING })
        .getCount(),
      this.userRepository.count({
        where: { role: UserRole.PATIENT },
      }),
    ]);

    return {
      ...dashboard,
      summary: {
        ...dashboard.summary,
        totalDoctors,
        pendingDoctorRequests,
        totalPatients,
      },
    };
  }
}

export const adminDashboardService = new AdminDashboardService();
