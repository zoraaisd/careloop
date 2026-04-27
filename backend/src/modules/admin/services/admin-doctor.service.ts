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
    medicalCouncilBoard: string;
    councilRegisteredName: string;
    dateOfBirth: string;
    clinicId: string | null;
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
    const dummyClinics = [
      'Green Valley Clinic',
      'Healthy Path Care',
      'Prime Ortho Center',
      'Bright Smile Clinic',
      'Advanced Health Care',
      'Life Line Hospital',
    ];

    const query = this.profileRepository
      .createQueryBuilder('profile')
      .innerJoinAndSelect('profile.user', 'user')
      .where('user.role = :role', { role: UserRole.DOCTOR })
      .andWhere('profile.clinic_name NOT IN (:...dummyClinics)', { dummyClinics })
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
      medicalCouncilBoard: profile.medicalCouncilBoard,
      councilRegisteredName: profile.councilRegisteredName,
      dateOfBirth: profile.dateOfBirth,
      clinicId: profile.clinicId,
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

  async getDoctorById(doctorId: string): Promise<{
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
    medicalCouncilBoard: string;
    councilRegisteredName: string;
    dateOfBirth: string;
    clinicId: string | null;
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
  }> {
    const profile = await this.profileRepository
      .createQueryBuilder('profile')
      .innerJoinAndSelect('profile.user', 'user')
      .where('user.id = :doctorId', { doctorId })
      .andWhere('user.role = :role', { role: UserRole.DOCTOR })
      .getOne();

    if (!profile) {
      throw new AppError('Doctor not found', 404);
    }

    return {
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
      medicalCouncilBoard: profile.medicalCouncilBoard,
      councilRegisteredName: profile.councilRegisteredName,
      dateOfBirth: profile.dateOfBirth,
      clinicId: profile.clinicId,
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
    };
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

    await AppDataSource.transaction(async (manager) => {
      await manager.save(doctor);

      if (status === DoctorApprovalStatus.APPROVED) {
        const profileRepo = manager.getRepository(DoctorProfile);
        const profile = await profileRepo.findOne({ where: { userId: doctor.id } });
        
        if (profile && !profile.clinicId) {
          const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
          profile.clinicId = `CLINIC-${randomStr}`;
          await profileRepo.save(profile);
        }
      }
    });

    return {
      userId: doctor.id,
      approvalStatus: doctor.approvalStatus,
    };
  }

  async updateDoctor(doctorId: string, updates: any): Promise<void> {
    const profile = await this.profileRepository.findOne({
      where: { userId: doctorId },
      relations: ['user'],
    });

    if (!profile) {
      throw new AppError('Doctor not found', 404);
    }

    if (updates.name) profile.user.name = updates.name;
    if (updates.email) profile.user.email = updates.email;
    if (updates.phone) profile.user.phone = updates.phone;
    if (updates.approvalStatus) profile.user.approvalStatus = updates.approvalStatus;
    if (updates.subscriptionStatus) profile.user.subscriptionStatus = updates.subscriptionStatus;

    if (updates.specialization) profile.specialization = updates.specialization;
    if (updates.experience !== undefined) profile.experience = updates.experience;
    if (updates.qualification) profile.qualification = updates.qualification;
    if (updates.clinicName) profile.clinicName = updates.clinicName;
    if (updates.clinicAddress) profile.clinicAddress = updates.clinicAddress;
    if (updates.city) profile.city = updates.city;
    if (updates.consultationFees !== undefined) profile.consultationFees = updates.consultationFees;

    await AppDataSource.transaction(async (manager) => {
      await manager.save(profile.user);
      await manager.save(profile);
    });
  }

  async deleteDoctor(doctorId: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: doctorId, role: UserRole.DOCTOR },
    });

    if (!user) {
      throw new AppError('Doctor not found', 404);
    }

    await this.userRepository.remove(user);
  }
}

export const adminDoctorService = new AdminDoctorService();
