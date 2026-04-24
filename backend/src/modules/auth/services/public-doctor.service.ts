import { AppDataSource } from '../../../config/data-source';
import { DoctorProfile } from '../../../entities/doctor-profile.entity';
import { DoctorApprovalStatus, User, UserRole } from '../../../entities/user.entity';

class PublicDoctorService {
  private readonly userRepository = AppDataSource.getRepository(User);
  private readonly doctorProfileRepository = AppDataSource.getRepository(DoctorProfile);

  async getApprovedDoctors(search?: string): Promise<Array<{
    userId: string;
    name: string;
    specialization: string;
    experience: number;
    qualification: string;
    clinicName: string;
    clinicAddress: string;
    city: string;
    consultationFees: number;
    availableDays: string[];
    availableTimeSlots: string[];
    aboutDoctor: string | null;
    profileImageUrl: string | null;
  }>> {
    const query = this.doctorProfileRepository
      .createQueryBuilder('profile')
      .innerJoinAndSelect('profile.user', 'user')
      .where('user.role = :role', { role: UserRole.DOCTOR })
      .andWhere('user.approval_status = :status', { status: DoctorApprovalStatus.APPROVED })
      .orderBy('user.createdAt', 'DESC');

    if (search?.trim()) {
      query.andWhere(
        '(LOWER(user.name) LIKE :search OR LOWER(profile.specialization) LIKE :search OR LOWER(profile.clinic_name) LIKE :search OR LOWER(profile.city) LIKE :search)',
        { search: `%${search.trim().toLowerCase()}%` },
      );
    }

    const profiles = await query.getMany();

    return profiles.map((profile) => ({
      userId: profile.userId,
      name: profile.user.name,
      specialization: profile.specialization,
      experience: profile.experience,
      qualification: profile.qualification,
      clinicName: profile.clinicName,
      clinicAddress: profile.clinicAddress,
      city: profile.city,
      consultationFees: Number(profile.consultationFees),
      availableDays: profile.availableDays,
      availableTimeSlots: profile.availableTimeSlots,
      aboutDoctor: profile.aboutDoctor,
      profileImageUrl: profile.profileImageUrl,
    }));
  }
}

export const publicDoctorService = new PublicDoctorService();
