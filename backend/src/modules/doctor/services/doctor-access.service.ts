import bcrypt from 'bcrypt';
import { In } from 'typeorm';
import { AppError } from '../../../common/errors/app-error';
import { AppDataSource } from '../../../config/data-source';
import { AdminPaymentRecord } from '../../../entities/admin-payment-record.entity';
import { AdminSubscriptionPlan } from '../../../entities/admin-subscription-plan.entity';
import { AdminSubscriptionRecord } from '../../../entities/admin-subscription-record.entity';
import { Appointment } from '../../../entities/appointment.entity';
import { Chat } from '../../../entities/chat.entity';
import { DoctorProfile } from '../../../entities/doctor-profile.entity';
import { Patient } from '../../../entities/patient.entity';
import { Prescription } from '../../../entities/prescription.entity';
import { User, UserRole, DoctorApprovalStatus, SubscriptionStatus } from '../../../entities/user.entity';
import { portalEmailService } from '../../../common/services/portal-email.service';
import { signupOtpService } from '../../../common/services/signup-otp.service';
import { DoctorPortalAccessService } from './doctor-portal-access.service';
import type { DoctorPortalAccessSnapshot } from '../types/access.types';
import { logger } from '../../../common/logger';
import { adminBillingService } from '../../admin/services/admin-billing.service';
import { razorpayService } from './razorpay.service';

export class DoctorAccessService {
  private get userRepository() {
    return AppDataSource.getRepository(User);
  }
  private get patientRepository() {
    return AppDataSource.getRepository(Patient);
  }
  private get appointmentRepository() {
    return AppDataSource.getRepository(Appointment);
  }
  private get prescriptionRepository() {
    return AppDataSource.getRepository(Prescription);
  }
  private get chatRepository() {
    return AppDataSource.getRepository(Chat);
  }
  private readonly portalAccessService = new DoctorPortalAccessService();

  ensureAuthenticatedDoctorId(currentDoctorId?: string): string {
    if (!currentDoctorId) {
      throw new AppError('Authenticated doctor context is required', 401);
    }

    return currentDoctorId;
  }

  async ensureCurrentDoctor(currentDoctorId?: string): Promise<User> {
    const doctorId = this.ensureAuthenticatedDoctorId(currentDoctorId);
    const doctor = await this.userRepository.findOne({
      where: { id: doctorId, role: UserRole.DOCTOR },
    });

    if (!doctor) {
      throw new AppError('Doctor account not found', 404);
    }

    return doctor;
  }

  async getAccessState(currentDoctorId?: string): Promise<DoctorPortalAccessSnapshot> {
    const doctor = await this.ensureCurrentDoctor(currentDoctorId);
    const snapshot = this.portalAccessService.buildAccessSnapshot(doctor);
    snapshot.doctorName = doctor.name;

    if (doctor.role === UserRole.DOCTOR) {
      try {
        const profileRepo = AppDataSource.getRepository(DoctorProfile);
        const profile = await profileRepo.findOne({
          where: { userId: doctor.id },
          select: ['userId', 'clinicId', 'clinicName', 'clinicPhone', 'clinicLogoUrl'],
        });
        if (profile?.clinicId) {
          snapshot.clinicId = profile.clinicId;
        }
        snapshot.clinicName = profile?.clinicName ?? null;
        snapshot.clinicPhone = profile?.clinicPhone ?? null;
        snapshot.clinicImageUrl = null;
        snapshot.clinicLogoUrl = profile?.clinicLogoUrl ?? null;
      } catch (error) {
        logger.warn(
          { err: error, doctorId: doctor.id },
          'Unable to load doctor clinicId for access state; returning snapshot without clinicId',
        );
      }
    }

    return snapshot;
  }

  async inviteDoctor(currentDoctorId: string, payload: any): Promise<any> {
    const doctorId = this.ensureAuthenticatedDoctorId(currentDoctorId);
    
    const profileRepo = AppDataSource.getRepository(DoctorProfile);
    const existingProfile = await profileRepo.findOne({ where: { userId: doctorId } });
    
    if (!existingProfile) {
      throw new AppError('Doctor profile not found', 403);
    }

    const normalizeString = (value: unknown): string => String(value ?? '').trim();
    const requireString = (value: unknown, field: string): string => {
      const normalized = normalizeString(value);
      if (!normalized) {
        throw new AppError(`${field} is required`, 400);
      }
      return normalized;
    };

    const email = requireString(payload?.email, 'email').toLowerCase();
    const name = requireString(payload?.name, 'name');
    const phone = requireString(payload?.phone, 'phone');
    const specialization = requireString(payload?.specialization, 'specialization');
    const qualification = requireString(payload?.qualification, 'qualification');
    const parsedExperience = Number(payload?.experience);
    if (Number.isNaN(parsedExperience)) {
      throw new AppError('experience must be a valid number', 400);
    }

    if (!payload.signupVerificationToken || typeof payload.signupVerificationToken !== 'string') {
      throw new AppError('Email OTP verification is required before adding doctor', 400);
    }

    signupOtpService.assertVerificationTokenForEmail(payload.signupVerificationToken, {
      email,
      role: UserRole.DOCTOR,
    });

    const existingUser = await this.userRepository.findOne({ where: { email } });
    
    if (existingUser) {
      throw new AppError('Email is already registered', 409);
    }

    const rawPassword = normalizeString(payload?.password) || randomPassword();
    const password = await bcrypt.hash(rawPassword, 12);

    await AppDataSource.transaction(async (manager) => {
      const users = manager.getRepository(User);
      const doctorProfiles = manager.getRepository(DoctorProfile);
      
      const now = new Date();
      
      const user = users.create({
        name,
        email,
        phone,
        password,
        role: UserRole.DOCTOR,
        approvalStatus: DoctorApprovalStatus.PENDING,
        trialStartedAt: now,
        trialEndsAt: new Date(now.getTime() + 0), // 0 days trial by default
        subscriptionStatus: SubscriptionStatus.INACTIVE,
        mustChangePassword: true,
      });

      const createdUser = await users.save(user);

      const profile = doctorProfiles.create({
        userId: createdUser.id,
        specialization,
        experience: parsedExperience,
        qualification,
        clinicName: existingProfile.clinicName,
        clinicAddress: existingProfile.clinicAddress,
        city: existingProfile.city,
        clinicId: existingProfile.clinicId ?? null,
        clinicPhone: normalizeString(payload?.clinicPhone),
      });

      await doctorProfiles.save(profile);
    });

    void portalEmailService.sendDoctorInviteEmail({
      name,
      email,
      rawPassword,
      clinicName: existingProfile.clinicName,
    });

    return {
      message: 'Doctor invited successfully',
      temporaryPassword:
        process.env.NODE_ENV !== 'production' ? rawPassword : undefined,
    };
  }

  async ensureDoctorPortalAccess(currentDoctorId?: string): Promise<User> {
    const doctor = await this.ensureCurrentDoctor(currentDoctorId);
    const accessState = this.portalAccessService.buildAccessSnapshot(doctor);

    if (!accessState.canAccessPortal) {
      throw new AppError(accessState.message, 403, accessState);
    }

    return doctor;
  }

  async ensureManagedDoctor(
    targetDoctorId: string,
    currentDoctorId?: string,
  ): Promise<User> {
    const doctorId = this.ensureAuthenticatedDoctorId(currentDoctorId);
    const clinicDoctorIds = await this.getClinicDoctorIds(doctorId);

    if (!clinicDoctorIds.includes(targetDoctorId)) {
      throw new AppError(
        'Forbidden: you can only access doctor records from your clinic',
        403,
      );
    }

    const targetDoctor = await this.userRepository.findOne({
      where: { id: targetDoctorId, role: UserRole.DOCTOR },
    });

    if (!targetDoctor) {
      throw new AppError('Doctor account not found', 404);
    }

    return targetDoctor;
  }

  async ensureOwnedPatient(
    patientId: string,
    currentDoctorId?: string,
  ): Promise<Patient> {
    const doctorId = this.ensureAuthenticatedDoctorId(currentDoctorId);
    const clinicDoctorIds = await this.getClinicDoctorIds(doctorId);
    const patient = await this.patientRepository.findOne({
      where: {
        id: patientId,
        isActive: true,
        primaryDoctorId: In(clinicDoctorIds),
      },
    });

    if (!patient) {
      throw new AppError('Patient not found or not assigned to this clinic', 404);
    }

    return patient;
  }

  async getClinicDoctorIds(currentDoctorId?: string): Promise<string[]> {
    const doctorId = this.ensureAuthenticatedDoctorId(currentDoctorId);
    const profileRepo = AppDataSource.getRepository(DoctorProfile);
    const currentProfile = await profileRepo.findOne({
      where: { userId: doctorId },
      select: ['clinicId', 'clinicName', 'clinicAddress', 'city'],
    });

    if (!currentProfile) {
      return [doctorId];
    }

    if (currentProfile.clinicId) {
      const profiles = await profileRepo.find({
        where: { clinicId: currentProfile.clinicId },
        select: ['userId'],
      });
      const ids = profiles.map((profile) => profile.userId).filter(Boolean);
      return Array.from(new Set(ids.length > 0 ? ids : [doctorId]));
    }

    if (currentProfile.clinicName && currentProfile.clinicAddress && currentProfile.city) {
      const profiles = await profileRepo.find({
        where: {
          clinicName: currentProfile.clinicName,
          clinicAddress: currentProfile.clinicAddress,
          city: currentProfile.city,
        },
        select: ['userId'],
      });
      const ids = profiles.map((profile) => profile.userId).filter(Boolean);
      return Array.from(new Set(ids.length > 0 ? ids : [doctorId]));
    }

    return [doctorId];
  }

  async ensureOwnedAppointment(
    appointmentId: string,
    currentDoctorId?: string,
  ): Promise<Appointment> {
    const doctorId = this.ensureAuthenticatedDoctorId(currentDoctorId);
    const appointment = await this.appointmentRepository.findOne({
      where: { id: appointmentId, doctorId },
      relations: { patient: true, doctor: true },
    });

    if (!appointment) {
      throw new AppError('Appointment not found or not assigned to this doctor', 404);
    }

    return appointment;
  }

  async ensureOwnedPrescription(
    prescriptionId: string,
    currentDoctorId?: string,
  ): Promise<Prescription> {
    const doctorId = this.ensureAuthenticatedDoctorId(currentDoctorId);
    const prescription = await this.prescriptionRepository.findOne({
      where: { id: prescriptionId, doctorId },
      relations: { patient: true, doctor: true, medicines: true },
    });

    if (!prescription) {
      throw new AppError('Prescription not found or not assigned to this doctor', 404);
    }

    return prescription;
  }

  async ensureOwnedChat(chatId: string, currentDoctorId?: string): Promise<Chat> {
    const doctorId = this.ensureAuthenticatedDoctorId(currentDoctorId);
    const chat = await this.chatRepository.findOne({
      where: { id: chatId, doctorId },
      relations: { patient: true },
    });

    if (!chat) {
      throw new AppError('Chat not found or not assigned to this doctor', 404);
    }

    return chat;
  }

  async subscribeToPlan(currentDoctorId: string | undefined, planId: string): Promise<DoctorPortalAccessSnapshot> {
    const doctorId = this.ensureAuthenticatedDoctorId(currentDoctorId);
    const doctor = await this.userRepository.findOne({
      where: { id: doctorId, role: UserRole.DOCTOR },
    });

    if (!doctor) {
      throw new AppError('Doctor account not found', 404);
    }

    if (doctor.approvalStatus !== DoctorApprovalStatus.APPROVED) {
      throw new AppError('Your account must be approved before subscribing', 403);
    }

    // Activate subscription (instant / demo mode — no real payment gateway)
    const isTrial = planId === 'plan-free-trial';
    const now = new Date();

    // Activate subscription (instant / demo mode — no real payment gateway)
    if (isTrial) {
      doctor.subscriptionStatus = SubscriptionStatus.INACTIVE;
      doctor.trialStartedAt = now;
      doctor.trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    } else {
      doctor.subscriptionStatus = SubscriptionStatus.ACTIVE;
      // Extend trial window as a subscription anchor — 30 days by default
      doctor.trialStartedAt = now;
      doctor.trialEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }

    doctor.subscribedPlanId = planId;
    await this.userRepository.save(doctor);

    const PLAN_CATALOG: Record<string, { name: string; amount: number }> = {
      'plan-free-trial': { name: 'Free Trial', amount: 0 },
      'plan-starter': { name: 'Starter', amount: 1999 },
      'plan-pro': { name: 'Pro', amount: 4999 },
      'plan-enterprise': { name: 'Enterprise', amount: 14999 },
    };
    const planRepository = AppDataSource.getRepository(AdminSubscriptionPlan);
    const subscriptionRepository = AppDataSource.getRepository(
      AdminSubscriptionRecord,
    );
    const paymentRepository = AppDataSource.getRepository(AdminPaymentRecord);
    const persistedPlan = await planRepository.findOne({ where: { id: planId } });
    const planMeta = persistedPlan
      ? {
          name: persistedPlan.name,
          amount: Number(persistedPlan.price),
        }
      : PLAN_CATALOG[planId] ?? { name: planId, amount: 2999 };

    const today = now.toISOString().split('T')[0]!;
    const endDate = doctor.trialEndsAt.toISOString().split('T')[0]!;
    const profileRepo = AppDataSource.getRepository(DoctorProfile);
    const profile = await profileRepo.findOne({ where: { userId: doctorId } });
    await subscriptionRepository.delete({ clinicId: doctorId });

    const subscriptionRecord = subscriptionRepository.create({
      clinicId: doctorId,
      clinicName: profile?.clinicName ?? 'Unknown Clinic',
      planId,
      planName: planMeta.name,
      status: 'Active',
      startDate: today,
      endDate,
      amount: planMeta.amount,
      currency: 'INR',
    });
    await subscriptionRepository.save(subscriptionRecord);

    if (planMeta.amount > 0) {
      const paymentRecord = paymentRepository.create({
        clinicId: doctorId,
        clinicName: profile?.clinicName ?? 'Unknown Clinic',
        planId,
        planName: planMeta.name,
        amount: planMeta.amount,
        currency: 'INR',
        paidOn: today,
        status: 'Paid',
      });
      await paymentRepository.save(paymentRecord);
    }

    const snapshot = this.portalAccessService.buildAccessSnapshot(doctor);
    return {
      ...snapshot,
      subscribedPlan: {
        planId,
        planName: planMeta.name,
        amount: planMeta.amount,
        currency: 'INR',
      },
    };
  }

  async getSubscriptionPlans(currentDoctorId?: string): Promise<any> {
    const doctor = await this.ensureCurrentDoctor(currentDoctorId);
    const snapshot = this.portalAccessService.buildAccessSnapshot(doctor);
    
    const activePlans = await adminBillingService.getPlans();
    
    // Map internal plans to the format expected by the legacy frontend
    const plans = activePlans.map(plan => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      price: plan.price,
      billingCycle: plan.billingCycle,
      status: plan.status,
      features: [
        `Doctors Limit: ${plan.doctorsLimit} doctors`,
        `Patients Limit: ${plan.patientsLimit.toLocaleString()} patients`,
        `WhatsApp Limit: ${plan.whatsappLimit.toLocaleString()} messages`,
      ],
    }));

    return {
      plans,
      currentSubscription: snapshot.subscribedPlan ? {
        planId: snapshot.subscribedPlan.planId,
        planName: snapshot.subscribedPlan.planName,
        status: snapshot.subscriptionStatus === SubscriptionStatus.ACTIVE ? 'Active' : 'Trial',
        endDate: snapshot.trialEndsAt,
        amount: snapshot.subscribedPlan.amount,
        paymentId: `PAY-${doctor.id.substring(0, 8).toUpperCase()}`,
      } : null
    };
  }

  async createPaymentOrder(currentDoctorId: string | undefined, planId: string): Promise<any> {
    const doctorId = this.ensureAuthenticatedDoctorId(currentDoctorId);
    const plans = await adminBillingService.getPlans();
    const plan = plans.find(p => p.id === planId);
    
    if (!plan) {
      throw new AppError('Subscription plan not found', 404);
    }

    if (plan.price === 0) {
      throw new AppError('Cannot create payment order for free plan. Use direct subscription instead.', 400);
    }

    const order = await razorpayService.createOrder(
      plan.price,
      plan.currency || 'INR',
      `receipt_sub_${doctorId.substring(0, 8)}_${Date.now()}`
    );

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID
    };
  }

  async verifyPayment(currentDoctorId: string | undefined, payload: {
    orderId: string;
    paymentId: string;
    signature: string;
    planId: string;
  }): Promise<DoctorPortalAccessSnapshot> {
    const { orderId, paymentId, signature, planId } = payload;
    
    const isValid = razorpayService.verifySignature(orderId, paymentId, signature);
    if (!isValid) {
      throw new AppError('Invalid payment signature', 400);
    }

    // signature is valid, proceed to activate subscription
    return this.subscribeToPlan(currentDoctorId, planId);
  }

}

function randomPassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$%';
  let out = '';
  for (let index = 0; index < length; index += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}
