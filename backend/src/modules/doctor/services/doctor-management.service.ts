import { randomBytes } from 'crypto';
import bcrypt from 'bcrypt';

import { AppError } from '../../../common/errors/app-error';
import { AppDataSource } from '../../../config/data-source';
import { DoctorProfile } from '../../../entities/doctor-profile.entity';
import { Patient } from '../../../entities/patient.entity';
import { DoctorApprovalStatus, SubscriptionStatus, User, UserRole } from '../../../entities/user.entity';
import { DoctorAccessService } from './doctor-access.service';
import { signupOtpService } from '../../auth/services/signup-otp.service';
import type { CreateDoctorDto } from '../dto/create-doctor.dto';

const SALT_ROUNDS = 12;
const DOCTOR_TRIAL_DAYS = 0;

type DoctorDirectoryItem = {
  userId: string;
  name: string;
  mobile: string;
  email: string;
  clinicName: string | null;
  specialty: string | null;
  clinicPhone: string | null;
  patientCount: number;
  status: DoctorApprovalStatus;
};

type DoctorDirectoryDetails = {
  userId: string;
  name: string;
  email: string;
  mobile: string;
  status: DoctorApprovalStatus;
  patientCount: number;
  clinicName: string | null;
  clinicPhone: string | null;
  clinicAddress: string | null;
  city: string | null;
  specialty: string | null;
  experience: number | null;
  qualification: string | null;
  aboutDoctor: string | null;
  consultationFees: string | null;
  availableDays: string[];
  availableTimeSlots: string[];
  createdAt: Date;
};

export class DoctorManagementService {
  private readonly userRepository = AppDataSource.getRepository(User);
  private readonly patientRepository = AppDataSource.getRepository(Patient);
  private readonly doctorProfileRepository = AppDataSource.getRepository(DoctorProfile);
  private readonly accessService = new DoctorAccessService();

  async listDoctors(currentDoctorId?: string): Promise<DoctorDirectoryItem[]> {
    const doctorId = this.accessService.ensureAuthenticatedDoctorId(currentDoctorId);
    const currentProfile = await this.doctorProfileRepository.findOne({
      where: { userId: doctorId },
      select: ['clinicId', 'clinicName', 'clinicAddress', 'city'],
    });

    const query = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.doctorProfile', 'profile')
      .where('user.role = :role', { role: UserRole.DOCTOR })
      .andWhere('user.approval_status IN (:...statuses)', { statuses: [DoctorApprovalStatus.APPROVED, DoctorApprovalStatus.PENDING] });

    if (currentProfile?.clinicId) {
      query.andWhere('profile.clinic_id = :clinicId', { clinicId: currentProfile.clinicId });
    } else {
      const clinicName = currentProfile?.clinicName?.trim();
      const clinicAddress = currentProfile?.clinicAddress?.trim();
      const city = currentProfile?.city?.trim();

      if (clinicName && clinicAddress && city) {
        query.andWhere('profile.clinic_name = :clinicName', { clinicName });
        query.andWhere('profile.clinic_address = :clinicAddress', { clinicAddress });
        query.andWhere('profile.city = :city', { city });
      } else {
        query.andWhere('user.id = :currentDoctorId', { currentDoctorId: doctorId });
      }
    }

    const doctors = await query
      .orderBy('profile.clinic_id', 'ASC')
      .addOrderBy('user.createdAt', 'DESC')
      .getMany();

    const patientCounts = await this.patientRepository
      .createQueryBuilder('patient')
      .select('patient.primaryDoctorId', 'doctorId')
      .addSelect('COUNT(*)', 'count')
      .where('patient.isActive = true')
      .andWhere('patient.primaryDoctorId IS NOT NULL')
      .groupBy('patient.primaryDoctorId')
      .getRawMany<{ doctorId: string; count: string }>();

    const patientCountMap = new Map(
      patientCounts.map((item) => [item.doctorId, Number(item.count || 0)]),
    );

    return doctors.map((doctor) => ({
      userId: doctor.id,
      name: doctor.name,
      mobile: doctor.phone,
      email: doctor.email,
      clinicName: doctor.doctorProfile?.clinicName || null,
      specialty: doctor.doctorProfile?.specialization || null,
      clinicPhone: doctor.doctorProfile?.clinicPhone || null,
      patientCount: patientCountMap.get(doctor.id) ?? 0,
      status: doctor.approvalStatus,
    }));
  }

  async createDoctor(payload: CreateDoctorDto, currentDoctorId?: string): Promise<{ message: string; userId: string }> {
    const doctorId = this.accessService.ensureAuthenticatedDoctorId(currentDoctorId);
    const currentProfile = await this.doctorProfileRepository.findOne({
      where: { userId: doctorId },
    });
    if (!currentProfile?.clinicName?.trim() || !currentProfile?.clinicAddress?.trim() || !currentProfile?.city?.trim()) {
      throw new AppError('Clinic details are missing in your dashboard profile. Please complete your clinic details first.', 400);
    }

    const email = payload.email.trim().toLowerCase();
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new AppError('Email is already registered', 409);
    }

    // Verify OTP
    signupOtpService.assertVerificationToken(payload.signupVerificationToken, {
      email,
      phone: payload.phone.trim(),
      role: UserRole.DOCTOR,
    });

    const generatedPassword = randomBytes(24).toString('hex');
    const password = await bcrypt.hash(generatedPassword, SALT_ROUNDS);
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + DOCTOR_TRIAL_DAYS * 24 * 60 * 60 * 1000);

    const savedUser = await AppDataSource.transaction(async (manager) => {
      const users = manager.getRepository(User);
      const doctorProfiles = manager.getRepository(DoctorProfile);

      const createdUser = await users.save(
        users.create({
          name: payload.name.trim(),
          email,
          phone: payload.phone.trim(),
          password,
          role: UserRole.DOCTOR,
          approvalStatus: DoctorApprovalStatus.PENDING,
          trialStartedAt: now,
          trialEndsAt,
          subscriptionStatus: SubscriptionStatus.INACTIVE,
        }),
      );

      await doctorProfiles.save(
        doctorProfiles.create({
          user: createdUser,
          specialization: payload.specialization.trim(),
          experience: payload.experience,
          qualification: payload.qualification.trim(),
          clinicId: currentProfile?.clinicId || null,
          clinicName: currentProfile.clinicName.trim(),
          clinicAddress: currentProfile.clinicAddress.trim(),
          city: currentProfile.city.trim(),
          clinicPhone: currentProfile.clinicPhone?.trim() || null,
        }),
      );

      return createdUser;
    });

    return {
      message: 'Doctor created successfully',
      userId: savedUser.id,
    };
  }

  async getDoctorDetails(targetDoctorId: string, currentDoctorId?: string): Promise<DoctorDirectoryDetails> {
    const doctorId = this.accessService.ensureAuthenticatedDoctorId(currentDoctorId);
    const currentProfile = await this.doctorProfileRepository.findOne({
      where: { userId: doctorId },
      select: ['clinicId', 'clinicName', 'clinicAddress', 'city'],
    });

    const query = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.doctorProfile', 'profile')
      .where('user.id = :targetDoctorId', { targetDoctorId })
      .andWhere('user.role = :role', { role: UserRole.DOCTOR });

    if (currentProfile?.clinicId) {
      query.andWhere('profile.clinic_id = :clinicId', { clinicId: currentProfile.clinicId });
    } else {
      const clinicName = currentProfile?.clinicName?.trim();
      const clinicAddress = currentProfile?.clinicAddress?.trim();
      const city = currentProfile?.city?.trim();

      if (clinicName && clinicAddress && city) {
        query.andWhere('profile.clinic_name = :clinicName', { clinicName });
        query.andWhere('profile.clinic_address = :clinicAddress', { clinicAddress });
        query.andWhere('profile.city = :city', { city });
      } else {
        query.andWhere('user.id = :currentDoctorId', { currentDoctorId: doctorId });
      }
    }

    const doctor = await query.getOne();

    if (!doctor) {
      throw new AppError('Doctor not found', 404);
    }

    const patientCount = await this.patientRepository.count({
      where: {
        isActive: true,
        primaryDoctorId: doctor.id,
      },
    });

    return {
      userId: doctor.id,
      name: doctor.name,
      email: doctor.email,
      mobile: doctor.phone,
      status: doctor.approvalStatus,
      patientCount,
      clinicName: doctor.doctorProfile?.clinicName || null,
      clinicPhone: doctor.doctorProfile?.clinicPhone || null,
      clinicAddress: doctor.doctorProfile?.clinicAddress || null,
      city: doctor.doctorProfile?.city || null,
      specialty: doctor.doctorProfile?.specialization || null,
      experience: doctor.doctorProfile?.experience ?? null,
      qualification: doctor.doctorProfile?.qualification || null,
      aboutDoctor: doctor.doctorProfile?.aboutDoctor || null,
      consultationFees: doctor.doctorProfile?.consultationFees || null,
      availableDays: doctor.doctorProfile?.availableDays ?? [],
      availableTimeSlots: doctor.doctorProfile?.availableTimeSlots ?? [],
      createdAt: doctor.createdAt,
    };
  }

  async updateDoctor(
    targetDoctorId: string,
    updates: Partial<{
      name: string;
      email: string;
      phone: string;
      specialization: string;
      experience: number;
      qualification: string;
      clinicName: string;
      clinicPhone: string;
      clinicAddress: string;
      city: string;
      aboutDoctor: string;
    }>,
    currentDoctorId?: string,
  ): Promise<{ message: string }> {
    const doctor = await this.getDoctorDetails(targetDoctorId, currentDoctorId);

    const profile = await this.doctorProfileRepository.findOne({
      where: { userId: doctor.userId },
      relations: ['user'],
    });

    if (!profile) {
      throw new AppError('Doctor not found', 404);
    }

    if (typeof updates.name === 'string' && updates.name.trim()) {
      profile.user.name = updates.name.trim();
    }
    if (typeof updates.email === 'string' && updates.email.trim()) {
      profile.user.email = updates.email.trim().toLowerCase();
    }
    if (typeof updates.phone === 'string' && updates.phone.trim()) {
      profile.user.phone = updates.phone.trim();
    }
    if (typeof updates.specialization === 'string' && updates.specialization.trim()) {
      profile.specialization = updates.specialization.trim();
    }
    if (typeof updates.experience === 'number' && !Number.isNaN(updates.experience)) {
      profile.experience = updates.experience;
    }
    if (typeof updates.qualification === 'string' && updates.qualification.trim()) {
      profile.qualification = updates.qualification.trim();
    }
    if (typeof updates.clinicName === 'string' && updates.clinicName.trim()) {
      profile.clinicName = updates.clinicName.trim();
    }
    if (typeof updates.clinicPhone === 'string') {
      profile.clinicPhone = updates.clinicPhone.trim() || null;
    }
    if (typeof updates.clinicAddress === 'string' && updates.clinicAddress.trim()) {
      profile.clinicAddress = updates.clinicAddress.trim();
    }
    if (typeof updates.city === 'string' && updates.city.trim()) {
      profile.city = updates.city.trim();
    }
    if (typeof updates.aboutDoctor === 'string') {
      profile.aboutDoctor = updates.aboutDoctor.trim() || null;
    }

    await AppDataSource.transaction(async (manager) => {
      await manager.save(profile.user);
      await manager.save(profile);
    });

    return { message: 'Doctor updated successfully' };
  }
}
