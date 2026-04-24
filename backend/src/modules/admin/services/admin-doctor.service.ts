import { AppDataSource } from '../../../config/data-source';
import { DoctorProfile } from '../../../entities/doctor-profile.entity';
import {
  DoctorApprovalStatus,
  SubscriptionStatus,
  User,
  UserRole,
} from '../../../entities/user.entity';
import { AppError } from '../../../common/errors/app-error';

class AdminDoctorService {
  private readonly userRepository = AppDataSource.getRepository(User);
  private readonly profileRepository = AppDataSource.getRepository(DoctorProfile);

  async getDoctorRequests(status?: DoctorApprovalStatus): Promise<Array<{
    userId: string;
    name: string;
    email: string;
    phone: string;
    approvalStatus: DoctorApprovalStatus;
    subscriptionStatus: SubscriptionStatus;
    trialStartedAt: string | null;
    trialEndsAt: string | null;
    specialization: string;
    experience: number;
    qualification: string;
    medicalRegistrationNumber: string;
    clinicName: string;
    clinicAddress: string;
    city: string;
    consultationFees: number;
    availableDays: string[];
    availableTimeSlots: string[];
    aboutDoctor: string | null;
    profileImageUrl: string | null;
    certificateUrl: string | null;
    createdAt: string;
  }>> {
    const query = this.profileRepository
      .createQueryBuilder('profile')
      .innerJoinAndSelect('profile.user', 'user')
      .where('user.role = :role', { role: UserRole.DOCTOR })
      .orderBy('user.createdAt', 'DESC');

    if (status) {
      query.andWhere('user.approval_status = :status', { status });
    }

    const profiles = await query.getMany();

    return profiles.map((profile) => ({
      userId: profile.userId,
      name: profile.user.name,
      email: profile.user.email,
      phone: profile.user.phone,
      approvalStatus: profile.user.approvalStatus,
      subscriptionStatus: profile.user.subscriptionStatus,
      trialStartedAt: profile.user.trialStartedAt?.toISOString() ?? null,
      trialEndsAt: profile.user.trialEndsAt?.toISOString() ?? null,
      specialization: profile.specialization,
      experience: profile.experience,
      qualification: profile.qualification,
      medicalRegistrationNumber: profile.medicalRegistrationNumber,
      clinicName: profile.clinicName,
      clinicAddress: profile.clinicAddress,
      city: profile.city,
      consultationFees: Number(profile.consultationFees),
      availableDays: profile.availableDays,
      availableTimeSlots: profile.availableTimeSlots,
      aboutDoctor: profile.aboutDoctor,
      profileImageUrl: profile.profileImageUrl,
      certificateUrl: profile.certificateUrl,
      createdAt: profile.user.createdAt.toISOString(),
    }));
  }

  async updateDoctorApprovalStatus(
    doctorId: string,
    status: DoctorApprovalStatus.APPROVED | DoctorApprovalStatus.REJECTED,
  ): Promise<{ userId: string; approvalStatus: DoctorApprovalStatus }> {
    const doctor = await this.userRepository.findOne({
      where: { id: doctorId, role: UserRole.DOCTOR },
    });

    if (!doctor) {
      throw new AppError('Doctor account not found', 404);
    }

    doctor.approvalStatus = status;
    await this.userRepository.save(doctor);

    return {
      userId: doctor.id,
      approvalStatus: doctor.approvalStatus,
    };
  }
}

export const adminDoctorService = new AdminDoctorService();
