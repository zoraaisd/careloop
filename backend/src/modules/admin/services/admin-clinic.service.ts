import { AppDataSource } from '../../../config/data-source';
import bcrypt from 'bcrypt';
import { ActivityLog } from '../../../entities/activity-log.entity';
import { AdminClinicRecord } from '../../../entities/admin-clinic-record.entity';
import { AdminClinicRequest } from '../../../entities/admin-clinic-request.entity';
import { AdminPaymentRecord } from '../../../entities/admin-payment-record.entity';
import { AdminSubscriptionRecord } from '../../../entities/admin-subscription-record.entity';
import { Appointment } from '../../../entities/appointment.entity';
import { Chat } from '../../../entities/chat.entity';
import { DoctorProfile } from '../../../entities/doctor-profile.entity';
import { DoctorAvailabilitySlot } from '../../../entities/doctor-availability-slot.entity';
import { DoctorDashboardState } from '../../../entities/doctor-dashboard-state.entity';
import { DoctorReview } from '../../../entities/doctor-review.entity';
import {
  DoctorApprovalStatus,
  SubscriptionStatus,
  User,
  UserRole,
} from '../../../entities/user.entity';
import { AppError } from '../../../common/errors/app-error';
import { logger } from '../../../common/logger';
import { Doctor } from '../../../entities/doctor.entity';
import { ExpenseActivity } from '../../../entities/expense-activity.entity';
import { FollowUp } from '../../../entities/follow-up.entity';
import { InventoryItem } from '../../../entities/inventory-item.entity';
import { Patient } from '../../../entities/patient.entity';
import { PatientDocument } from '../../../entities/patient-document.entity';
import { PatientPayment } from '../../../entities/patient-payment.entity';
import { SupportTicket } from '../../../entities/support-ticket.entity';
import { Prescription } from '../../../entities/prescription.entity';
import { PurchaseOrder } from '../../../entities/purchase-order.entity';
import { PurchaseOrderItem } from '../../../entities/purchase-order-item.entity';
import { Supplier } from '../../../entities/supplier.entity';
import { SupplierInvoice } from '../../../entities/supplier-invoice.entity';
import { SupportChat } from '../../../entities/support-chat.entity';
import { portalEmailService } from '../../../common/services/portal-email.service';
import { signupOtpService } from '../../../common/services/signup-otp.service';
import type { CreateAdminClinicDoctorDto } from '../dto/create-admin-clinic-doctor.dto';
import type { CreateAdminClinicDto } from '../dto/create-admin-clinic.dto';
import type { UpdateClinicRequestStatusDto } from '../dto/update-clinic-request-status.dto';
import type { AdminClinic, AdminClinicListResponse, ClinicListOverview, ClinicRequest } from '../types/admin.types';

class AdminClinicService {
  private readonly profileRepository = AppDataSource.getRepository(DoctorProfile);
  private readonly userRepository = AppDataSource.getRepository(User);
  private readonly clinicRepository =
    AppDataSource.getRepository(AdminClinicRecord);
  private readonly clinicRequestRepository =
    AppDataSource.getRepository(AdminClinicRequest);

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value.trim(),
    );
  }

  private async resolveClinicDoctorProfiles(identifier: string): Promise<DoctorProfile[]> {
    const normalizedIdentifier = identifier.trim();
    const isUuid = this.isUuid(normalizedIdentifier);
    const baseQuery = this.profileRepository
      .createQueryBuilder('profile')
      .innerJoinAndSelect('profile.user', 'user')
      .where('user.role = :role', { role: UserRole.DOCTOR });

    const directProfile = isUuid
      ? await baseQuery
          .clone()
          .andWhere('(user.id = :identifier OR profile.clinic_id = :identifier)', {
            identifier: normalizedIdentifier,
          })
          .orderBy('user.createdAt', 'ASC')
          .getOne()
      : await baseQuery
          .clone()
          .andWhere('profile.clinic_id = :identifier', {
            identifier: normalizedIdentifier,
          })
          .orderBy('user.createdAt', 'ASC')
          .getOne();

    if (!directProfile) {
      throw new AppError('Clinic not found', 404);
    }

    if (directProfile.clinicId?.trim()) {
      return baseQuery
        .clone()
        .andWhere('profile.clinic_id = :clinicId', {
          clinicId: directProfile.clinicId.trim(),
        })
        .orderBy('user.createdAt', 'ASC')
        .getMany();
    }

    return baseQuery
      .clone()
      .andWhere('LOWER(TRIM(profile.clinic_name)) = :clinicName', {
        clinicName: directProfile.clinicName.trim().toLowerCase(),
      })
      .andWhere('LOWER(TRIM(profile.city)) = :city', {
        city: directProfile.city.trim().toLowerCase(),
      })
      .andWhere('LOWER(TRIM(profile.clinic_address)) = :clinicAddress', {
        clinicAddress: directProfile.clinicAddress.trim().toLowerCase(),
      })
      .orderBy('user.createdAt', 'ASC')
      .getMany();
  }

  async inviteClinicDoctor(
    payload: CreateAdminClinicDoctorDto,
  ): Promise<{ message: string; temporaryPassword?: string }> {
    const email = payload.email.trim().toLowerCase();
    const normalizedClinicPhone = payload.clinicPhone.trim();

    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new AppError('Email is already registered', 409);
    }

    // Verify OTP
    signupOtpService.assertVerificationToken(payload.signupVerificationToken, {
      email,
      phone: normalizedClinicPhone,
      role: UserRole.DOCTOR,
    });

    const rawPassword = randomPassword();
    const hashedPassword = await bcrypt.hash(rawPassword, 12);
    const doctorName = ensureDrPrefix(payload.name);

    await AppDataSource.transaction(async (manager) => {
      const users = manager.getRepository(User);
      const doctorProfiles = manager.getRepository(DoctorProfile);
      const now = new Date();

      const user = users.create({
        name: doctorName,
        email,
        phone: normalizedClinicPhone,
        password: hashedPassword,
        role: UserRole.DOCTOR,
        approvalStatus: DoctorApprovalStatus.PENDING,
        trialStartedAt: now,
        trialEndsAt: new Date(now.getTime()),
        subscriptionStatus: SubscriptionStatus.INACTIVE,
        mustChangePassword: true,
      });

      const createdUser = await users.save(user);

      const profile = doctorProfiles.create({
        userId: createdUser.id,
        specialization: payload.specialization.trim(),
        experience: payload.experience,
        qualification: payload.qualification.trim(),
        medicalRegistrationNumber: payload.medicalRegistrationNumber?.trim() || 'N/A',
        medicalCouncilBoard: payload.medicalCouncilBoard?.trim() || 'N/A',
        councilRegisteredName: doctorName,
        dateOfBirth: payload.dateOfBirth || '1970-01-01',
        clinicName: payload.clinicName.trim(),
        clinicAddress: payload.clinicAddress.trim(),
        city: payload.city.trim(),
        clinicPhone: normalizedClinicPhone,
        consultationFees: Number(payload.consultationFees ?? 0).toFixed(2),
        availableDays: (payload.availableDays ?? []).map((day) => day.trim()).filter(Boolean),
        availableTimeSlots: (payload.availableTimeSlots ?? []).map((slot) => slot.trim()).filter(Boolean),
        aboutDoctor: payload.aboutDoctor?.trim() || null,
        profileImageUrl: payload.profileImageUrl?.trim() || null,
        certificateUrl: payload.certificateUrl?.trim() || null,
      });

      await doctorProfiles.save(profile);
    });

    void portalEmailService.sendDoctorInviteEmail({
      name: doctorName,
      email,
      rawPassword,
      clinicName: payload.clinicName.trim(),
    });

    return {
      message: `Clinic added successfully. A temporary password has been sent to ${email}.`,
      temporaryPassword:
        process.env.NODE_ENV !== 'production' ? rawPassword : undefined,
    };
  }

  async requestInvitationOtp(payload: { email: string; phone: string; name: string }) {
    // Send OTP to the doctor's email provided in the form
    const targetEmail = payload.email.trim().toLowerCase();

    return await signupOtpService.requestOtpAndSendEmail(
      {
        name: payload.name.trim(),
        email: payload.email.trim().toLowerCase(),
        phone: payload.phone.trim(),
        role: UserRole.DOCTOR,
      },
      targetEmail,
    );
  }

  async verifyInvitationOtp(payload: { email: string; phone: string; otp: string }) {
    // Verify OTP against the NEW doctor's identity
    return signupOtpService.verifyOtpAsync({
      email: payload.email.trim().toLowerCase(),
      phone: payload.phone.trim(),
      role: UserRole.DOCTOR,
      otp: payload.otp,
    });
  }

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
    const profiles = await this.profileRepository.find({
      relations: { user: true },
    });

    const sortedProfiles = [...profiles].sort((a, b) => {
      const aTime = a.user?.createdAt ? new Date(a.user.createdAt).getTime() : 0;
      const bTime = b.user?.createdAt ? new Date(b.user.createdAt).getTime() : 0;
      return aTime - bTime;
    });

    const filteredProfiles = sortedProfiles.filter((profile) => {
      const isDoctor = profile.user?.role === UserRole.DOCTOR;
      return isDoctor;
    });

    const getClinicKey = (profile: DoctorProfile) =>
      profile.clinicId?.trim().toLowerCase() ||
      `${profile.clinicName.trim().toLowerCase()}|${profile.city.trim().toLowerCase()}|${profile.clinicAddress.trim().toLowerCase()}`;

    const doctorsPerClinic = filteredProfiles.reduce((map, profile) => {
      const key = getClinicKey(profile);
      map.set(key, (map.get(key) ?? 0) + 1);
      return map;
    }, new Map<string, number>());
    const uniqueClinicProfiles = Array.from(
      filteredProfiles.reduce((map, profile) => {
        const key = getClinicKey(profile);
        const existing = map.get(key);
        if (!existing || profile.user.email.trim().toLowerCase() === 'vinisha.codes@gmail.com') {
          map.set(key, profile);
        }
        return map;
      }, new Map<string, (typeof filteredProfiles)[number]>()),
    ).map(([, profile]) => profile);


    const dbClinics = uniqueClinicProfiles.map((profile) => ({
      id: profile.clinicId?.trim() || profile.userId,
      routeId: profile.userId,
      clinicName: profile.clinicName,
      ownerName: profile.user.name,
      address: profile.clinicAddress,
      city: profile.city,
      contact: profile.user.phone,
      email: profile.user.email,
      subscriptionPlan:
        profile.user.subscriptionStatus === SubscriptionStatus.ACTIVE ? 'Active subscription' : 'Not subscribed',
      doctors: doctorsPerClinic.get(getClinicKey(profile)) ?? 1,
      patients: 0,
      status: this.mapApprovalStatus(profile.user.approvalStatus, profile.user.subscriptionStatus),
      createdAt: profile.user.createdAt.toISOString(),
    }));

    const manualClinics = await this.clinicRepository.find({
      order: { createdAt: 'DESC' },
    });
    const mappedManualClinics = manualClinics.map((clinic) => ({
      id: clinic.id,
      routeId: clinic.id,
      clinicName: clinic.clinicName,
      ownerName: clinic.ownerName,
      address: clinic.address,
      city: clinic.city,
      contact: clinic.contact,
      email: clinic.email ?? undefined,
      subscriptionPlan: clinic.subscriptionPlan,
      doctors: clinic.doctors,
      patients: clinic.patients,
      status: clinic.status,
      createdAt: clinic.createdAt.toISOString(),
    })) satisfies AdminClinic[];

    const clinics = [...dbClinics, ...mappedManualClinics];

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

  async createClinic(payload: CreateAdminClinicDto): Promise<AdminClinic> {
    const clinic = this.clinicRepository.create({
      clinicName: payload.clinicName,
      ownerName: payload.ownerName,
      address: payload.address,
      city: payload.city ?? payload.address.split(',').map((part) => part.trim()).filter(Boolean).at(-1) ?? 'Unknown',
      contact: payload.contact,
      email: payload.email ?? null,
      subscriptionPlan: payload.subscriptionPlan,
      doctors: payload.doctors,
      patients: payload.patients,
      status: payload.status,
    });

    const saved = await this.clinicRepository.save(clinic);

    return {
      id: saved.id,
      clinicName: saved.clinicName,
      ownerName: saved.ownerName,
      address: saved.address,
      city: saved.city,
      contact: saved.contact,
      email: saved.email ?? undefined,
      subscriptionPlan: saved.subscriptionPlan,
      doctors: saved.doctors,
      patients: saved.patients,
      status: saved.status,
      createdAt: saved.createdAt.toISOString(),
    };
  }

  async deleteClinic(id: string): Promise<void> {
    const normalizedId = id.trim();
    const manualClinic = this.isUuid(normalizedId)
      ? await this.clinicRepository.findOne({ where: { id: normalizedId } })
      : null;
    if (manualClinic) {
      await this.clinicRepository.remove(manualClinic);
      return;
    }

    const profiles = await this.resolveClinicDoctorProfiles(normalizedId);
    const doctorIds = Array.from(new Set(profiles.map((profile) => profile.userId)));
    const clinicIds = Array.from(
      new Set(
        profiles
          .map((profile) => profile.clinicId?.trim())
          .filter((clinicId): clinicId is string => Boolean(clinicId)),
      ),
    );
    const doctorEmails = Array.from(
      new Set(
        profiles
          .map((profile) => profile.user.email.trim().toLowerCase())
          .filter(Boolean),
      ),
    );
    const clinicNames = Array.from(new Set(profiles.map((profile) => profile.clinicName.trim()).filter(Boolean)));

    logger.info(
      { id: normalizedId, doctorIds, clinicIds, clinicNames },
      'Aggressively purging clinic and all associated doctor data from database',
    );

    await AppDataSource.transaction(async (manager) => {
      await manager
        .createQueryBuilder()
        .update(Chat)
        .set({ doctorId: null })
        .where('doctor_id IN (:...doctorIds)', { doctorIds })
        .execute();

      await manager
        .createQueryBuilder()
        .update(ActivityLog)
        .set({ doctorId: null })
        .where('doctor_id IN (:...doctorIds)', { doctorIds })
        .execute();

      await manager
        .createQueryBuilder()
        .update(FollowUp)
        .set({ doctorId: null })
        .where('doctor_id IN (:...doctorIds)', { doctorIds })
        .execute();

      await manager
        .createQueryBuilder()
        .update(Patient)
        .set({ primaryDoctorId: null })
        .where('primary_doctor_id IN (:...doctorIds)', { doctorIds })
        .execute();

      await manager
        .createQueryBuilder()
        .delete()
        .from(SupportChat)
        .where('doctor_id IN (:...doctorIds)', { doctorIds })
        .execute();

      await manager
        .createQueryBuilder()
        .delete()
        .from(SupportTicket)
        .where('doctor_id IN (:...doctorIds)', { doctorIds })
        .execute();

      await manager
        .createQueryBuilder()
        .delete()
        .from(DoctorAvailabilitySlot)
        .where('doctor_id IN (:...doctorIds)', { doctorIds })
        .execute();

      await manager
        .createQueryBuilder()
        .delete()
        .from(DoctorReview)
        .where('doctor_id IN (:...doctorIds)', { doctorIds })
        .execute();

      await manager
        .createQueryBuilder()
        .delete()
        .from(Appointment)
        .where('doctor_id IN (:...doctorIds)', { doctorIds })
        .execute();

      await manager
        .createQueryBuilder()
        .delete()
        .from(Prescription)
        .where('doctor_id IN (:...doctorIds)', { doctorIds })
        .execute();

      await manager
        .createQueryBuilder()
        .delete()
        .from(PatientPayment)
        .where('doctor_id IN (:...doctorIds)', { doctorIds })
        .execute();

      await manager
        .createQueryBuilder()
        .delete()
        .from(PatientDocument)
        .where('doctor_id IN (:...doctorIds)', { doctorIds })
        .execute();

      await manager
        .createQueryBuilder()
        .delete()
        .from(DoctorDashboardState)
        .where('doctor_id IN (:...doctorIds)', { doctorIds })
        .execute();

      await manager
        .createQueryBuilder()
        .delete()
        .from(ExpenseActivity)
        .where('created_by_doctor_id IN (:...doctorIds)', { doctorIds })
        .execute();

      if (clinicIds.length > 0) {
        const purchaseOrders = await manager
          .createQueryBuilder(PurchaseOrder, 'purchaseOrder')
          .select('purchaseOrder.id', 'id')
          .where('purchaseOrder.clinicId IN (:...clinicIds)', { clinicIds })
          .getRawMany<{ id: string }>();

        const purchaseOrderIds = purchaseOrders.map((record) => record.id);
        if (purchaseOrderIds.length > 0) {
          await manager
            .createQueryBuilder()
            .delete()
            .from(PurchaseOrderItem)
            .where('"poId" IN (:...purchaseOrderIds)', { purchaseOrderIds })
            .execute();
        }

        await manager
          .createQueryBuilder()
          .delete()
          .from(SupplierInvoice)
          .where('"clinicId" IN (:...clinicIds)', { clinicIds })
          .execute();

        await manager
          .createQueryBuilder()
          .delete()
          .from(PurchaseOrder)
          .where('"clinicId" IN (:...clinicIds)', { clinicIds })
          .execute();

        await manager
          .createQueryBuilder()
          .delete()
          .from(InventoryItem)
          .where('"clinicId" IN (:...clinicIds)', { clinicIds })
          .execute();

        await manager
          .createQueryBuilder()
          .delete()
          .from(Supplier)
          .where('"clinicId" IN (:...clinicIds)', { clinicIds })
          .execute();

        await manager
          .createQueryBuilder()
          .delete()
          .from(AdminSubscriptionRecord)
          .where('clinic_id IN (:...clinicIds)', { clinicIds })
          .execute();

        await manager
          .createQueryBuilder()
          .delete()
          .from(AdminPaymentRecord)
          .where('clinic_id IN (:...clinicIds)', { clinicIds })
          .execute();

        await manager
          .createQueryBuilder()
          .delete()
          .from(AdminClinicRequest)
          .where('clinic_id IN (:...clinicIds)', { clinicIds })
          .execute();
      }

      if (clinicNames.length > 0) {
        await manager
          .createQueryBuilder()
          .delete()
          .from(AdminClinicRequest)
          .where('clinic_name IN (:...clinicNames)', { clinicNames })
          .execute();
      }

      if (doctorEmails.length > 0) {
        await manager
          .createQueryBuilder()
          .delete()
          .from(AdminClinicRequest)
          .where('email IN (:...doctorEmails)', { doctorEmails })
          .execute();
      }

      await manager
        .createQueryBuilder()
        .delete()
        .from(DoctorProfile)
        .where('user_id IN (:...doctorIds)', { doctorIds })
        .execute();

      if (doctorEmails.length > 0) {
        await manager
          .createQueryBuilder()
          .delete()
          .from(Doctor)
          .where('email IN (:...doctorEmails)', { doctorEmails })
          .execute();
      }

      await manager
        .createQueryBuilder()
        .delete()
        .from(Doctor)
        .where('source_user_id IN (:...doctorIds)', { doctorIds })
        .execute();

      const deleteResult = await manager
        .createQueryBuilder()
        .delete()
        .from(User)
        .where('id IN (:...doctorIds)', { doctorIds })
        .execute();

      if (!deleteResult.affected || deleteResult.affected < doctorIds.length) {
        throw new AppError('Clinic could not be fully deleted', 500);
      }
    });

    logger.info({ id: normalizedId, doctorIds }, 'Clinic purge complete');
  }

  async getClinicRequests(): Promise<ClinicRequest[]> {
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
      return isDoctor;
    });

    const getClinicKey = (profile: DoctorProfile) =>
      profile.clinicId?.trim().toLowerCase() ||
      `${profile.clinicName.trim().toLowerCase()}|${profile.city.trim().toLowerCase()}|${profile.clinicAddress.trim().toLowerCase()}`;

    const uniqueClinicProfiles = Array.from(
      filteredProfiles.reduce((map, profile) => {
        const key = getClinicKey(profile);
        if (!map.has(key)) {
          map.set(key, profile);
        }
        return map;
      }, new Map<string, (typeof filteredProfiles)[number]>()),
    ).map(([, profile]) => profile);

    const dbRequests: ClinicRequest[] = uniqueClinicProfiles.map((profile) => ({
      id: profile.clinicId?.trim() || profile.userId,
      clinicId: profile.clinicId ?? undefined,
      clinic: profile.clinicName,
      city: profile.city,
      owner: profile.user.name,
      requestedOn: profile.user.createdAt.toISOString().split('T')[0],
      status:
        profile.user.approvalStatus === DoctorApprovalStatus.APPROVED
          ? 'Approved'
          : profile.user.approvalStatus === DoctorApprovalStatus.REJECTED
            ? 'Rejected'
            : 'Pending',
      contact: profile.user.phone,
      email: profile.user.email,
    }));

    const storedRequests = await this.clinicRequestRepository.find({
      order: { createdAt: 'DESC' },
    });
    const mappedStoredRequests = storedRequests.map((request) => ({
      id: request.id,
      clinicId: request.clinicId ?? undefined,
      clinic: request.clinic,
      city: request.city,
      owner: request.owner,
      requestedOn: request.requestedOn,
      status: request.status,
      contact: request.contact ?? undefined,
      email: request.email ?? undefined,
    })) satisfies ClinicRequest[];

    return [...dbRequests, ...mappedStoredRequests];
  }

  async updateClinicRequestStatus(
    id: string,
    payload: UpdateClinicRequestStatusDto,
  ): Promise<ClinicRequest> {
    const storedRequest = await this.clinicRequestRepository.findOne({
      where: { id },
    });

    if (storedRequest) {
      storedRequest.status = payload.status;
      const saved = await this.clinicRequestRepository.save(storedRequest);
      return {
        id: saved.id,
        clinicId: saved.clinicId ?? undefined,
        clinic: saved.clinic,
        city: saved.city,
        owner: saved.owner,
        requestedOn: saved.requestedOn,
        status: saved.status,
        contact: saved.contact ?? undefined,
        email: saved.email ?? undefined,
      };
    }

    const profiles = await this.profileRepository.find({
      relations: { user: true },
    });
    const matchingProfiles = profiles.filter(
      (profile) =>
        profile.userId === id ||
        profile.clinicId === id ||
        profile.clinicName.trim().toLowerCase() === id.trim().toLowerCase(),
    );

    if (matchingProfiles.length === 0) {
      throw new AppError('Clinic request not found', 404);
    }

    const nextApprovalStatus =
      payload.status === 'Approved'
        ? DoctorApprovalStatus.APPROVED
        : payload.status === 'Rejected'
          ? DoctorApprovalStatus.REJECTED
          : DoctorApprovalStatus.PENDING;

    await AppDataSource.transaction(async (manager) => {
      for (const profile of matchingProfiles) {
        profile.user.approvalStatus = nextApprovalStatus;
        await manager.save(profile.user);
      }
    });

    const first = matchingProfiles[0];
    return {
      id: first.clinicId?.trim() || first.userId,
      clinicId: first.clinicId ?? undefined,
      clinic: first.clinicName,
      city: first.city,
      owner: first.user.name,
      requestedOn: first.user.createdAt.toISOString().split('T')[0],
      status: payload.status,
      contact: first.user.phone,
      email: first.user.email,
    };
  }
}

export const adminClinicService = new AdminClinicService();

function ensureDrPrefix(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  if (/^Dr\.?\s/i.test(trimmed)) return trimmed;
  return `Dr. ${trimmed}`;
}

function randomPassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let index = 0; index < length; index += 1) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
