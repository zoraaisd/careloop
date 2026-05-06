import bcrypt from 'bcrypt';
import { AppError } from '../../../common/errors/app-error';
import { AppDataSource } from '../../../config/data-source';
import { Appointment } from '../../../entities/appointment.entity';
import { Chat } from '../../../entities/chat.entity';
import { DoctorProfile } from '../../../entities/doctor-profile.entity';
import { Patient } from '../../../entities/patient.entity';
import { Prescription } from '../../../entities/prescription.entity';
import { User, UserRole, DoctorApprovalStatus, SubscriptionStatus } from '../../../entities/user.entity';
import { authEmailService } from '../../auth/services/auth-email.service';
import { signupOtpService } from '../../auth/services/signup-otp.service';
import { adminStoreService } from '../../admin/services/admin-store.service';
import { DoctorPortalAccessService } from './doctor-portal-access.service';
import type { DoctorPortalAccessSnapshot } from '../types/access.types';
import { logger } from '../../../common/logger';
import { subscriptionPlanSeed } from '../../admin/data/admin.mock-data';
import { razorpayService } from './razorpay.service';

export class DoctorAccessService {
  private readonly userRepository = AppDataSource.getRepository(User);
  private readonly patientRepository = AppDataSource.getRepository(Patient);
  private readonly appointmentRepository = AppDataSource.getRepository(Appointment);
  private readonly prescriptionRepository = AppDataSource.getRepository(Prescription);
  private readonly chatRepository = AppDataSource.getRepository(Chat);
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

    if (doctor.role === UserRole.DOCTOR) {
      try {
        const profileRepo = AppDataSource.getRepository(DoctorProfile);
        const profile = await profileRepo.findOne({
          where: { userId: doctor.id },
          select: ['userId', 'clinicId'],
        });
        if (profile?.clinicId) {
          snapshot.clinicId = profile.clinicId;
        }
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
    const medicalRegistrationNumber = requireString(payload?.medicalRegistrationNumber, 'medicalRegistrationNumber');
    const medicalCouncilBoard = requireString(payload?.medicalCouncilBoard, 'medicalCouncilBoard');
    const councilRegisteredName = requireString(payload?.councilRegisteredName, 'councilRegisteredName');
    const dateOfBirth = requireString(payload?.dateOfBirth, 'dateOfBirth');
    const parsedExperience = Number(payload?.experience);
    const parsedConsultationFees = Number(payload?.consultationFees);
    if (Number.isNaN(parsedExperience)) {
      throw new AppError('experience must be a valid number', 400);
    }
    if (Number.isNaN(parsedConsultationFees)) {
      throw new AppError('consultationFees must be a valid number', 400);
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
      });

      const createdUser = await users.save(user);

      const availableDays = Array.isArray(payload.availableDays)
        ? payload.availableDays
        : String(payload.availableDays || '')
            .split(',')
            .map((d: string) => d.trim())
            .filter(Boolean);
      const availableTimeSlots = Array.isArray(payload.availableTimeSlots)
        ? payload.availableTimeSlots
        : String(payload.availableTimeSlots || '')
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean);

      const profile = doctorProfiles.create({
        userId: createdUser.id,
        specialization,
        experience: parsedExperience,
        qualification,
        medicalRegistrationNumber,
        medicalCouncilBoard,
        councilRegisteredName,
        dateOfBirth,
        clinicName: existingProfile.clinicName,
        clinicAddress: existingProfile.clinicAddress,
        city: existingProfile.city,
        clinicId: existingProfile.clinicId ?? null,
        consultationFees: parsedConsultationFees.toFixed(2),
        availableDays,
        availableTimeSlots,
        aboutDoctor: normalizeString(payload?.aboutDoctor) || null,
        profileImageUrl: normalizeString(payload?.profileImageUrl) || null,
        clinicImageUrl: normalizeString(payload?.clinicImageUrl) || null,
        certificateUrl: normalizeString(payload?.certificateUrl) || null,
      });

      await doctorProfiles.save(profile);
    });

    void authEmailService.sendDoctorInviteEmail({
      name,
      email,
      rawPassword,
      clinicName: existingProfile.clinicName,
    });

    return { message: 'Doctor invited successfully' };
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

    if (doctorId !== targetDoctorId) {
      throw new AppError('Forbidden: you can only access your own doctor records', 403);
    }

    return this.ensureCurrentDoctor(doctorId);
  }

  async ensureOwnedPatient(
    patientId: string,
    currentDoctorId?: string,
  ): Promise<Patient> {
    const doctorId = this.ensureAuthenticatedDoctorId(currentDoctorId);
    const patient = await this.patientRepository.findOne({
      where: {
        id: patientId,
        isActive: true,
        primaryDoctorId: doctorId,
      },
    });

    if (!patient) {
      throw new AppError('Patient not found or not assigned to this doctor', 404);
    }

    return patient;
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

    // Record the subscription in admin mock store so revenue reflects it
    const PLAN_CATALOG: Record<string, { name: string; amount: number }> = {
      'plan-free-trial': { name: 'Free Trial',      amount: 0     },
      'plan-starter':    { name: 'Starter',         amount: 1999  },
      'plan-pro':        { name: 'Pro',             amount: 4999  },
      'plan-enterprise': { name: 'Enterprise',      amount: 14999 },
    };
    const planMeta = PLAN_CATALOG[planId] ?? { name: planId, amount: 2999 };

    const today = now.toISOString().split('T')[0]!;
    const endDate = doctor.trialEndsAt.toISOString().split('T')[0]!;
    const profileRepo = AppDataSource.getRepository(DoctorProfile);
    const profile = await profileRepo.findOne({ where: { userId: doctorId } });

    adminStoreService.recordDoctorSubscription({
      id: `sub-doctor-${doctorId}`,
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
    
    // Map internal plans to the format expected by the legacy frontend
    const plans = subscriptionPlanSeed.map(plan => ({
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
    const plan = subscriptionPlanSeed.find(p => p.id === planId);
    
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
