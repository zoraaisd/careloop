import { AppDataSource } from '../../../config/data-source';
import { ActivityLog } from '../../../entities/activity-log.entity';
import { Appointment } from '../../../entities/appointment.entity';
import { Chat } from '../../../entities/chat.entity';
import { DoctorProfile } from '../../../entities/doctor-profile.entity';
import { DoctorAvailabilitySlot } from '../../../entities/doctor-availability-slot.entity';
import { DoctorReview } from '../../../entities/doctor-review.entity';
import {
  DoctorApprovalStatus,
  SubscriptionStatus,
  User,
  UserRole,
} from '../../../entities/user.entity';
import { Doctor } from '../../../entities/doctor.entity';
import { FollowUp } from '../../../entities/follow-up.entity';
import { Patient } from '../../../entities/patient.entity';
import { Prescription } from '../../../entities/prescription.entity';
import { SupportTicket } from '../../../entities/support-ticket.entity';
import { AppError } from '../../../common/errors/app-error';
import { logger } from '../../../common/logger';
import { AdminSubscriptionPlan } from '../../../entities/admin-subscription-plan.entity';
import { adminBillingService } from './admin-billing.service';

class AdminDoctorService {
  private readonly userRepository = AppDataSource.getRepository(User);
  private readonly profileRepository = AppDataSource.getRepository(DoctorProfile);

  private async resolveDoctorProfile(identifier: string): Promise<DoctorProfile> {
    const normalizedIdentifier = identifier.trim();
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        normalizedIdentifier,
      );

    const directProfile = isUuid
      ? await this.profileRepository
          .createQueryBuilder('profile')
          .innerJoinAndSelect('profile.user', 'user')
          .where('user.id = :identifier', { identifier: normalizedIdentifier })
          .andWhere('user.role = :role', { role: UserRole.DOCTOR })
          .getOne()
      : null;

    if (directProfile) {
      return directProfile;
    }

    const clinicProfile = await this.profileRepository
      .createQueryBuilder('profile')
      .innerJoinAndSelect('profile.user', 'user')
      .where('profile.clinic_id = :identifier', { identifier: normalizedIdentifier })
      .andWhere('user.role = :role', { role: UserRole.DOCTOR })
      .orderBy('user.createdAt', 'ASC')
      .getOne();

    if (!clinicProfile) {
      throw new AppError('Doctor not found', 404);
    }

    return clinicProfile;
  }

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
    medicalRegistrationNumber: string | null;
    medicalCouncilBoard: string | null;
    councilRegisteredName: string | null;
    dateOfBirth: string | null;
    clinicId: string | null;
    clinicName: string;
    clinicPhone: string | null;
    clinicAddress: string;
    city: string;
    consultationFees: number;
    availableDays: string[];
    availableTimeSlots: string[];
    aboutDoctor: string | null;
    profileImageUrl: string | null;
    clinicImageUrl: string | null;
    clinicImageUrls: string[];
    clinicVideoUrls: string[];
    certificateUrl: string | null;
    createdAt: string;
  }>> {
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
      const matchesStatus = status ? profile.user?.approvalStatus === status : true;
      return isDoctor && matchesStatus;
    });

    return filteredProfiles.map((profile) => ({
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
      clinicPhone: profile.clinicPhone,
      clinicAddress: profile.clinicAddress,
      city: profile.city,
      consultationFees: Number(profile.consultationFees),
      availableDays: profile.availableDays,
      availableTimeSlots: profile.availableTimeSlots,
      aboutDoctor: profile.aboutDoctor,
      profileImageUrl: profile.profileImageUrl,
      clinicImageUrl: profile.clinicImageUrl,
      clinicImageUrls: profile.clinicImageUrls?.length
        ? profile.clinicImageUrls
        : profile.clinicImageUrl
          ? [profile.clinicImageUrl]
          : [],
      clinicVideoUrls: profile.clinicVideoUrls ?? [],
      certificateUrl: profile.certificateUrl,
      subscribedPlanId: profile.user.subscribedPlanId,
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
    medicalRegistrationNumber: string | null;
    medicalCouncilBoard: string | null;
    councilRegisteredName: string | null;
    dateOfBirth: string | null;
    clinicId: string | null;
    clinicName: string;
    clinicPhone: string | null;
    clinicAddress: string;
    city: string;
    consultationFees: number;
    availableDays: string[];
    availableTimeSlots: string[];
    aboutDoctor: string | null;
    profileImageUrl: string | null;
    clinicImageUrl: string | null;
    clinicImageUrls: string[];
    clinicVideoUrls: string[];
    certificateUrl: string | null;
    subscribedPlanId: string | null;
    createdAt: string;
  }> {
    const profile = await this.resolveDoctorProfile(doctorId);

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
      clinicPhone: profile.clinicPhone,
      clinicAddress: profile.clinicAddress,
      city: profile.city,
      consultationFees: Number(profile.consultationFees),
      availableDays: profile.availableDays,
      availableTimeSlots: profile.availableTimeSlots,
      aboutDoctor: profile.aboutDoctor,
      profileImageUrl: profile.profileImageUrl,
      clinicImageUrl: profile.clinicImageUrl,
      clinicImageUrls: profile.clinicImageUrls?.length
        ? profile.clinicImageUrls
        : profile.clinicImageUrl
          ? [profile.clinicImageUrl]
          : [],
      clinicVideoUrls: profile.clinicVideoUrls ?? [],
      certificateUrl: profile.certificateUrl,
      subscribedPlanId: profile.user.subscribedPlanId,
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

    await AppDataSource.transaction(async (manager) => {
      doctor.approvalStatus = status;

      if (status === DoctorApprovalStatus.APPROVED) {
        const profileRepo = manager.getRepository(DoctorProfile);
        const profile = await profileRepo.findOne({ where: { userId: doctor.id } });
        
        if (profile && !profile.clinicId) {
          const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
          profile.clinicId = `CLINIC-${randomStr}`;
          await profileRepo.save(profile);
        }
      }

      await manager.save(doctor);
    });

    return {
      userId: doctor.id,
      approvalStatus: doctor.approvalStatus,
    };
  }

  async updateDoctor(doctorId: string, updates: any): Promise<void> {
    const profile = await this.resolveDoctorProfile(doctorId);

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

    if (updates.subscribedPlanId) {
      const planId = updates.subscribedPlanId;
      const planRepository = AppDataSource.getRepository(AdminSubscriptionPlan);
      const plan = await planRepository.findOne({ where: { id: planId } });

      if (plan) {
        profile.user.subscribedPlanId = planId;
        profile.user.subscriptionStatus = SubscriptionStatus.ACTIVE;
        const now = new Date();
        profile.user.trialStartedAt = now;
        profile.user.trialEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        try {
          await adminBillingService.recordSubscription({
            clinicId: profile.userId,
            clinicName: profile.clinicName,
            planId: plan.id,
            planName: plan.name,
            status: 'Active',
            startDate: now.toISOString().split('T')[0]!,
            endDate: profile.user.trialEndsAt.toISOString().split('T')[0]!,
            amount: Number(plan.price),
            currency: plan.currency,
          });
          logger.info({ doctorId, planId }, 'Subscription record created successfully');
        } catch (recordError) {
          logger.error({ err: recordError, doctorId }, 'Failed to record subscription');
        }
      }
    }

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
      throw new AppError('Doctor account not found', 404);
    }

    const doctorEmail = user.email;

    logger.info({ doctorId, email: doctorEmail }, 'Aggressively purging doctor account and related data from database');

    try {
      await AppDataSource.transaction(async (manager) => {
        // Clear nullable doctor references first to avoid foreign-key issues in older schemas.
        await manager
          .createQueryBuilder()
          .update(Chat)
          .set({ doctorId: null })
          .where('doctor_id = :id', { id: doctorId })
          .execute();

        await manager
          .createQueryBuilder()
          .update(ActivityLog)
          .set({ doctorId: null })
          .where('doctor_id = :id', { id: doctorId })
          .execute();

        await manager
          .createQueryBuilder()
          .update(FollowUp)
          .set({ doctorId: null })
          .where('doctor_id = :id', { id: doctorId })
          .execute();

        await manager
          .createQueryBuilder()
          .update(Patient)
          .set({ primaryDoctorId: null })
          .where('primary_doctor_id = :id', { id: doctorId })
          .execute();

        // Delete dependent doctor-owned data.
        await manager.createQueryBuilder()
          .delete()
          .from(SupportTicket)
          .where('doctor_id = :id', { id: doctorId })
          .execute();

        await manager.createQueryBuilder()
          .delete()
          .from(DoctorAvailabilitySlot)
          .where('doctor_id = :id', { id: doctorId })
          .execute();

        await manager.createQueryBuilder()
          .delete()
          .from(DoctorReview)
          .where('doctor_id = :id', { id: doctorId })
          .execute();

        await manager.createQueryBuilder()
          .delete()
          .from(Appointment)
          .where('doctor_id = :id', { id: doctorId })
          .execute();

        await manager.createQueryBuilder()
          .delete()
          .from(Prescription)
          .where('doctor_id = :id', { id: doctorId })
          .execute();

        await manager.createQueryBuilder()
          .delete()
          .from(DoctorProfile)
          .where('user_id = :id', { id: doctorId })
          .execute();

        const normalizedEmail = doctorEmail.trim().toLowerCase();
        await manager.createQueryBuilder()
          .delete()
          .from(Doctor)
          .where('email = :email', { email: normalizedEmail })
          .execute();

        await manager.createQueryBuilder()
          .delete()
          .from(Doctor)
          .where('source_user_id = :id', { id: doctorId })
          .execute();

        const deleteResult = await manager.createQueryBuilder()
          .delete()
          .from(User)
          .where('id = :id', { id: doctorId })
          .execute();

        if (deleteResult.affected && deleteResult.affected > 0) {
          logger.info({ doctorId, email: doctorEmail }, 'Doctor User account successfully purged from database');
          return;
        }

        throw new AppError('Doctor account could not be deleted', 500);
      });
    } catch (error) {
      logger.error({ err: error, doctorId, email: doctorEmail }, 'Hard delete failed, falling back to doctor archival');

      await AppDataSource.transaction(async (manager) => {
        await manager.createQueryBuilder()
          .update(Chat)
          .set({ doctorId: null })
          .where('doctor_id = :id', { id: doctorId })
          .execute();

        await manager.createQueryBuilder()
          .update(ActivityLog)
          .set({ doctorId: null })
          .where('doctor_id = :id', { id: doctorId })
          .execute();

        await manager.createQueryBuilder()
          .update(FollowUp)
          .set({ doctorId: null })
          .where('doctor_id = :id', { id: doctorId })
          .execute();

        await manager.createQueryBuilder()
          .update(Patient)
          .set({ primaryDoctorId: null })
          .where('primary_doctor_id = :id', { id: doctorId })
          .execute();

        await manager.createQueryBuilder()
          .delete()
          .from(DoctorProfile)
          .where('user_id = :id', { id: doctorId })
          .execute();

        await manager.createQueryBuilder()
          .delete()
          .from(Doctor)
          .where('source_user_id = :id', { id: doctorId })
          .execute();

        await manager.createQueryBuilder()
          .delete()
          .from(Doctor)
          .where('email = :email', { email: doctorEmail.trim().toLowerCase() })
          .execute();

        const archivedEmail = `deleted+${doctorId}@careloop.local`;
        await manager.createQueryBuilder()
          .update(User)
          .set({
            role: UserRole.PATIENT,
            approvalStatus: DoctorApprovalStatus.REJECTED,
            subscriptionStatus: SubscriptionStatus.INACTIVE,
            mustChangePassword: false,
            trialStartedAt: null,
            trialEndsAt: null,
            subscribedPlanId: null,
            sessionVersion: () => '"session_version" + 1',
            email: archivedEmail,
            name: `${user.name} (Deleted)`,
          })
          .where('id = :id', { id: doctorId })
          .execute();
      });
    }

    logger.info({ doctorId }, 'Doctor account successfully purged from database');
  }
}

export const adminDoctorService = new AdminDoctorService();
