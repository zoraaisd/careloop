import { randomBytes } from 'crypto';
import bcrypt from 'bcrypt';

import { AppError } from '../../../common/errors/app-error';
import { AppDataSource } from '../../../config/data-source';
import { DoctorProfile } from '../../../entities/doctor-profile.entity';
import { Patient } from '../../../entities/patient.entity';
import { DoctorApprovalStatus, SubscriptionStatus, User, UserRole } from '../../../entities/user.entity';
import { DoctorAccessService } from './doctor-access.service';
import type { CreateDoctorDto } from '../dto/create-doctor.dto';

const SALT_ROUNDS = 12;
const DOCTOR_TRIAL_DAYS = 0;

type DoctorDirectoryItem = {
  userId: string;
  name: string;
  mobile: string;
  email: string;
  patientCount: number;
  status: DoctorApprovalStatus;
};

export class DoctorManagementService {
  private readonly userRepository = AppDataSource.getRepository(User);
  private readonly patientRepository = AppDataSource.getRepository(Patient);
  private readonly accessService = new DoctorAccessService();

  async listDoctors(currentDoctorId?: string): Promise<DoctorDirectoryItem[]> {
    this.accessService.ensureAuthenticatedDoctorId(currentDoctorId);

    const doctors = await this.userRepository.find({
      where: { role: UserRole.DOCTOR },
      order: { createdAt: 'DESC' },
    });

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
      patientCount: patientCountMap.get(doctor.id) ?? 0,
      status: doctor.approvalStatus,
    }));
  }

  async createDoctor(payload: CreateDoctorDto, currentDoctorId?: string): Promise<{ message: string; userId: string }> {
    this.accessService.ensureAuthenticatedDoctorId(currentDoctorId);

    const email = payload.email.trim().toLowerCase();
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new AppError('Email is already registered', 409);
    }

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
          userId: createdUser.id,
          specialization: payload.specialization.trim(),
          experience: payload.experience,
          qualification: payload.qualification.trim(),
          medicalRegistrationNumber: payload.medicalRegistrationNumber.trim(),
          clinicName: payload.clinicName.trim(),
          clinicAddress: payload.clinicAddress.trim(),
          city: payload.city.trim(),
          consultationFees: payload.consultationFees.toFixed(2),
          availableDays: payload.availableDays.map((day) => day.trim()),
          availableTimeSlots: payload.availableTimeSlots.map((slot) => slot.trim()),
          aboutDoctor: payload.aboutDoctor?.trim() || null,
          profileImageUrl: payload.profileImageUrl?.trim() || null,
          clinicImageUrl: payload.clinicImageUrl?.trim() || null,
          certificateUrl: payload.certificateUrl?.trim() || null,
        }),
      );

      return createdUser;
    });

    return {
      message: 'Doctor created successfully',
      userId: savedUser.id,
    };
  }
}
