import { EntityManager } from 'typeorm';
import fs from 'fs';
import path from 'path';

import { AppDataSource } from '../../../config/data-source';
import { AppError } from '../../../common/errors/app-error';
import { ActivityLog } from '../../../entities/activity-log.entity';
import { Appointment, AppointmentStatus } from '../../../entities/appointment.entity';
import { Chat, FollowUpStatus } from '../../../entities/chat.entity';
import { ChatMessage, ChatMessageType, ChatSenderType } from '../../../entities/chat-message.entity';
import { DoctorReview } from '../../../entities/doctor-review.entity';
import { DoctorProfile } from '../../../entities/doctor-profile.entity';
import { DoctorAvailabilitySlot } from '../../../entities/doctor-availability-slot.entity';
import { Patient, PatientVerificationStatus } from '../../../entities/patient.entity';
import { DoctorApprovalStatus, User, UserRole } from '../../../entities/user.entity';
import { logger } from '../../../common/logger';
import { WhatsappHealthcareService } from '../../whatsapp-healthcare/services/whatsapp-healthcare.service';
import type { CreatePublicAppointmentDto } from '../dto/create-public-appointment.dto';
import type { CreatePublicDoctorReviewDto } from '../dto/create-public-doctor-review.dto';
import { Doctor } from '../../../entities/doctor.entity';

type PublicDoctorRecord = {
  userId: string;
  name: string;
  specialization: string;
  experience: number;
  qualification: string;
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
  patientCount: number;
};

type PublicDoctorReviewRecord = {
  id: string;
  recommendDoctor: boolean;
  healthProblem: string;
  waitTime: string;
  improvements: string[];
  experienceStory: string;
  reviewerName: string;
  reviewerPhone: string;
  starRating: number;
  isAnonymous: boolean;
  createdAt: string;
};

type PublicDoctorAvailabilitySlot = {
  slotId: string;
  date: string;
  day: string;
  time: string;
  isGenerated?: boolean;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const GENERATED_SLOT_PREFIX = 'generated';
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const DAY_ALIASES: Record<string, (typeof DAY_NAMES)[number]> = {
  sun: 'Sunday',
  sunday: 'Sunday',
  mon: 'Monday',
  monday: 'Monday',
  tue: 'Tuesday',
  tues: 'Tuesday',
  tuesday: 'Tuesday',
  wed: 'Wednesday',
  weds: 'Wednesday',
  wednesday: 'Wednesday',
  thu: 'Thursday',
  thur: 'Thursday',
  thurs: 'Thursday',
  thursday: 'Thursday',
  fri: 'Friday',
  friday: 'Friday',
  sat: 'Saturday',
  saturday: 'Saturday',
};
const DEFAULT_TIME_RANGES = [
  { start: 9 * 60, end: 13 * 60 },
  { start: 14 * 60, end: 18 * 60 },
] as const;

const toIsoDate = (value: Date) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;

const parseIsoDate = (value: string) => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const parsed = new Date(year, monthIndex, day, 12, 0, 0, 0);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== monthIndex ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
};

const normalizeDayName = (value: string) => {
  const normalized = value.trim().toLowerCase();
  return DAY_ALIASES[normalized] ?? null;
};

const parseTimeLabelToMinutes = (value: string): number | null => {
  const match = value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);

  if (!match) {
    return null;
  }

  const rawHour = Number(match[1]);
  const minute = Number(match[2] ?? '0');
  const meridiem = match[3].toUpperCase();

  if (!Number.isInteger(rawHour) || rawHour < 1 || rawHour > 12 || minute < 0 || minute > 59) {
    return null;
  }

  let hour = rawHour % 12;

  if (meridiem === 'PM') {
    hour += 12;
  }

  return hour * 60 + minute;
};

const formatMinutesToTimeLabel = (minutes: number) => {
  const normalizedMinutes = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hour24 = Math.floor(normalizedMinutes / 60);
  const minute = normalizedMinutes % 60;
  const meridiem = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;

  return `${hour12}:${String(minute).padStart(2, '0')} ${meridiem}`;
};

const parseTimeRange = (value: string): { start: number; end: number } | null => {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const [startLabel, endLabel] = trimmed.split(/\s*-\s*/);

  if (!endLabel) {
    const start = parseTimeLabelToMinutes(startLabel);
    return start === null ? null : { start, end: start + 30 };
  }

  if (!startLabel) {
    return null;
  }

  const start = parseTimeLabelToMinutes(startLabel);
  const end = parseTimeLabelToMinutes(endLabel);

  if (start === null || end === null || end <= start) {
    return null;
  }

  return { start, end };
};

const isAllDaysToken = (value: string) => ['all', 'everyday', 'daily', 'all-days', 'all days'].includes(value.trim().toLowerCase());

const parseSlotDuration = (value: string) => {
  const normalized = value.trim().toLowerCase();
  const match = normalized.match(/^(\d{1,3})(?:\s*(?:min|mins|minute|minutes))?$/);

  if (!match) {
    return null;
  }

  const duration = Number(match[1]);
  return [15, 20, 30, 45, 60].includes(duration) ? duration : null;
};

const addDays = (value: Date, amount: number) => {
  const next = new Date(value);
  next.setDate(next.getDate() + amount);
  return next;
};

const buildGeneratedSlotId = (doctorId: string, date: string, time: string) =>
  `${GENERATED_SLOT_PREFIX}:${doctorId}:${date}:${time}`;

const parseGeneratedSlotId = (value: string) => {
  const match = value.match(/^generated:([^:]+):(\d{4}-\d{2}-\d{2}):(.+)$/);

  if (!match) {
    return null;
  }

  return {
    doctorId: match[1],
    date: match[2],
    time: match[3],
  };
};

class PublicDoctorService {
  private readonly doctorProfileRepository = AppDataSource.getRepository(DoctorProfile);
  private readonly slotRepository = AppDataSource.getRepository(DoctorAvailabilitySlot);
  private readonly appointmentRepository = AppDataSource.getRepository(Appointment);
  private readonly reviewRepository = AppDataSource.getRepository(DoctorReview);
  private readonly legacyDoctorRepository = AppDataSource.getRepository(Doctor);

  private normalizeStoredMediaAsset(value: string | null): string | null {
    if (!value) {
      return null;
    }

    if (/^data:/i.test(value) || /^https?:\/\//i.test(value)) {
      return value;
    }

    if (!value.startsWith('/uploads/')) {
      return null;
    }

    const filePath = path.join(process.cwd(), value.replace(/^\//, '').replace(/\//g, path.sep));
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const extension = path.extname(filePath).toLowerCase();
    const mimeType =
      extension === '.png'
        ? 'image/png'
        : extension === '.jpg' || extension === '.jpeg'
          ? 'image/jpeg'
          : extension === '.webp'
            ? 'image/webp'
            : extension === '.gif'
              ? 'image/gif'
              : extension === '.mp4'
                ? 'video/mp4'
                : extension === '.webm'
                  ? 'video/webm'
                  : extension === '.mov'
                    ? 'video/quicktime'
                    : null;

    if (!mimeType) {
      return null;
    }

    const fileBuffer = fs.readFileSync(filePath);
    return `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
  }

  private normalizeStoredMediaAssets(values: string[] | null | undefined): string[] {
    return (values ?? [])
      .map((value) => this.normalizeStoredMediaAsset(value))
      .filter((value): value is string => Boolean(value));
  }

  async getApprovedDoctors(search?: string): Promise<PublicDoctorRecord[]> {
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
    const patientCountByDoctorId = await this.getPatientCountMap(profiles.map((profile) => profile.userId));

    return profiles.map((profile) =>
      this.serializeProfile(profile, patientCountByDoctorId.get(profile.userId) ?? 0),
    );
  }

  async getApprovedDoctorById(doctorId: string): Promise<PublicDoctorRecord> {
    const profile = await this.doctorProfileRepository
      .createQueryBuilder('profile')
      .innerJoinAndSelect('profile.user', 'user')
      .where('profile.user_id = :doctorId', { doctorId })
      .andWhere('user.role = :role', { role: UserRole.DOCTOR })
      .andWhere('user.approval_status = :status', { status: DoctorApprovalStatus.APPROVED })
      .getOne();

    if (!profile) {
      throw new AppError('Approved doctor not found', 404);
    }

    const patientCount = await this.getPatientCount(profile.userId);
    return this.serializeProfile(profile, patientCount);
  }

  async getApprovedDoctorAvailability(
    doctorId: string,
    params?: { dateFrom?: string; dateTo?: string },
  ): Promise<PublicDoctorAvailabilitySlot[]> {
    const doctor = await this.ensureApprovedDoctor(doctorId);

    const today = new Date();
    const dateFrom = params?.dateFrom ?? toIsoDate(today);
    const dateTo =
      params?.dateTo ??
      toIsoDate(addDays(today, 30));

    const slots = await this.slotRepository.find({
      where: { doctorId },
      order: { date: 'ASC', startTime: 'ASC' },
    });

    const explicitSlots = slots
      .filter((slot) => !slot.isBooked && slot.date >= dateFrom && slot.date <= dateTo)
      .map((slot) => ({
        slotId: slot.id,
        date: slot.date,
        day: slot.day,
        time: slot.startTime,
      }));

    if (explicitSlots.length > 0) {
      return explicitSlots.sort((left, right) =>
        left.date === right.date
          ? left.time.localeCompare(right.time)
          : left.date.localeCompare(right.date),
      );
    }

    const generatedSlots = await this.buildGeneratedAvailability({
      doctor,
      dateFrom,
      dateTo,
    });

    return generatedSlots.sort((left, right) =>
      left.date === right.date
        ? left.time.localeCompare(right.time)
        : left.date.localeCompare(right.date),
    );
  }

  async createPublicAppointment(
    doctorId: string,
    payload: CreatePublicAppointmentDto,
  ): Promise<{ message: string; appointmentId: string }> {
    const doctor = await this.ensureApprovedDoctor(doctorId);

    return AppDataSource.transaction(async (manager) => {
      const patients = manager.getRepository(Patient);
      const slots = manager.getRepository(DoctorAvailabilitySlot);
      const appointments = manager.getRepository(Appointment);

      const normalizedPhone = payload.patientPhone.replace(/\D/g, '');
      const slot =
        (await this.findRequestedSlot({
          manager,
          doctorId,
          requestedSlotId: payload.slotId,
        })) ?? null;

      if (!slot) {
        throw new AppError('Selected appointment slot was not found', 404);
      }

      if (slot.isBooked) {
        throw new AppError('Selected appointment slot is no longer available', 409);
      }

      const existingPatient = await patients.findOne({
        where: { phone: normalizedPhone },
      });

      if (existingPatient && existingPatient.primaryDoctorId && existingPatient.primaryDoctorId !== doctorId) {
        throw new AppError(
          'This phone number is already linked to another doctor record. Please use a different number.',
          409,
        );
      }

      const patient =
        existingPatient ??
        patients.create({
          name: payload.patientName.trim(),
          phone: normalizedPhone,
          age: payload.patientAge,
          email: payload.patientEmail?.trim() || null,
          gender: payload.patientGender?.trim() || null,
          bloodGroup: null,
          condition: null,
          notes: null,
          verificationStatus: PatientVerificationStatus.PENDING,
          whatsappVerified: false,
          isActive: true,
          lastVisitAt: null,
          primaryDoctorId: doctorId,
        });

      patient.name = payload.patientName.trim();
      patient.age = payload.patientAge;
      patient.email = payload.patientEmail?.trim() || null;
      patient.gender = payload.patientGender?.trim() || null;
      patient.primaryDoctorId = doctorId;
      patient.isActive = true;

      const savedPatient = await patients.save(patient);

      const duplicateAppointment = await appointments.findOne({
        where: {
          doctorId,
          appointmentDate: slot.date,
          appointmentTime: slot.startTime,
        },
      });

      if (duplicateAppointment) {
        throw new AppError('Selected appointment slot is no longer available', 409);
      }

      const appointment = appointments.create({
        patientId: savedPatient.id,
        doctorId,
        appointmentDate: slot.date,
        appointmentTime: slot.startTime,
        day: slot.day,
        appointmentType: 'consultation',
        notes: payload.notes?.trim() || null,
        status: AppointmentStatus.SCHEDULED,
        billingAmount: doctor.consultationFees.toFixed(2),
        cancelledAt: null,
      });

      const savedAppointment = await appointments.save(appointment);

      slot.isBooked = true;
      slot.appointmentId = savedAppointment.id;
      await slots.save(slot);

      const welcomeMessage = this.buildDoctorWelcomeMessage({
        patientName: savedPatient.name,
        doctorName: doctor.name,
        day: slot.day,
        date: slot.date,
        time: slot.startTime,
      });

      await this.appendDoctorWelcomeMessage({
        manager,
        patientId: savedPatient.id,
        doctorId,
        message: welcomeMessage,
      });

      const whatsappService = await new WhatsappHealthcareService(doctorId).init();
      whatsappService.syncExternalAppointment({
        appointmentId: savedAppointment.id,
        patientId: savedPatient.id,
        patientName: savedPatient.name,
        patientPhone: savedPatient.phone,
        patientAge: savedPatient.age,
        patientGender: savedPatient.gender,
        patientEmail: savedPatient.email,
        doctorId,
        doctorName: doctor.name,
        specialization: doctor.specialization,
        consultationFee: doctor.consultationFees,
        slotId: slot.id,
        slotDay: slot.day,
        slotTime: slot.startTime,
        date: slot.date,
        notes: payload.notes?.trim() || null,
      });
      try {
        await whatsappService.notifyPatient(savedPatient.id, welcomeMessage, 'chat');
      } catch (error) {
        whatsappService.logMessage(
          savedPatient.phone,
          'outbound',
          welcomeMessage,
          'chat',
          savedPatient.id,
        );
        logger.error(
          { err: error, patientId: savedPatient.id, doctorId },
          'Failed to send appointment welcome WhatsApp message',
        );
      }
      whatsappService.logChat(
        savedPatient.id,
        doctorId,
        'doctor',
        welcomeMessage,
        'chat',
      );

      return {
        message: `Appointment booked with ${doctor.name} on ${slot.day} at ${slot.startTime}.`,
        appointmentId: savedAppointment.id,
      };
    });
  }

  async getDoctorReviews(doctorId: string): Promise<PublicDoctorReviewRecord[]> {
    await this.ensureApprovedDoctor(doctorId);

    const reviews = await this.reviewRepository.find({
      where: { doctorId },
      order: { createdAt: 'DESC' },
    });

    return reviews.map((review) => ({
      id: review.id,
      recommendDoctor: review.recommendDoctor,
      healthProblem: review.healthProblem,
      waitTime: review.waitTime,
      improvements: review.improvements,
      experienceStory: review.experienceStory,
      reviewerName: review.reviewerName,
      reviewerPhone: review.reviewerPhone,
      starRating: review.starRating,
      isAnonymous: review.isAnonymous,
      createdAt: review.createdAt.toISOString(),
    }));
  }

  async createDoctorReview(
    doctorId: string,
    payload: CreatePublicDoctorReviewDto,
  ): Promise<{ message: string; reviewId: string }> {
    await this.ensureApprovedDoctor(doctorId);

    const review = this.reviewRepository.create({
      doctorId,
      recommendDoctor: payload.recommendDoctor,
      healthProblem: payload.healthProblem.trim(),
      waitTime: payload.waitTime.trim(),
      improvements: payload.improvements.map((item) => item.trim()).filter(Boolean),
      experienceStory: payload.experienceStory.trim(),
      reviewerName: payload.reviewerName.trim(),
      reviewerPhone: payload.reviewerPhone.trim(),
      starRating: payload.starRating,
      isAnonymous: Boolean(payload.isAnonymous),
    });

    const saved = await this.reviewRepository.save(review);

    return {
      message: 'Review submitted successfully.',
      reviewId: saved.id,
    };
  }

  private async ensureApprovedDoctor(doctorId: string): Promise<PublicDoctorRecord> {
    if (!UUID_PATTERN.test(doctorId)) {
      throw new AppError('Approved doctor not found', 404);
    }

    return this.getApprovedDoctorById(doctorId);
  }

  private serializeProfile(profile: DoctorProfile & { user: User }, patientCount: number): PublicDoctorRecord {
    const clinicImageUrls = this.normalizeStoredMediaAssets(profile.clinicImageUrls);
    const fallbackImageUrl = this.normalizeStoredMediaAsset(profile.clinicImageUrl);
    const clinicVideoUrls = this.normalizeStoredMediaAssets(profile.clinicVideoUrls);

    return {
      userId: profile.userId,
      name: profile.user.name,
      specialization: profile.specialization,
      experience: profile.experience,
      qualification: profile.qualification,
      clinicName: profile.clinicName,
      clinicPhone: profile.clinicPhone,
      clinicAddress: profile.clinicAddress,
      city: profile.city,
      consultationFees: Number(profile.consultationFees),
      availableDays: profile.availableDays,
      availableTimeSlots: profile.availableTimeSlots,
      aboutDoctor: profile.aboutDoctor,
      profileImageUrl: profile.profileImageUrl,
      clinicImageUrl: clinicImageUrls[0] ?? fallbackImageUrl,
      clinicImageUrls: clinicImageUrls.length > 0 ? clinicImageUrls : fallbackImageUrl ? [fallbackImageUrl] : [],
      clinicVideoUrls,
      patientCount,
    };
  }

  private async getPatientCount(doctorId: string): Promise<number> {
    const raw = await this.appointmentRepository
      .createQueryBuilder('appointment')
      .select('COUNT(DISTINCT appointment.patient_id)', 'patientCount')
      .where('appointment.doctor_id = :doctorId', { doctorId })
      .andWhere('appointment.status != :cancelledStatus', { cancelledStatus: AppointmentStatus.CANCELLED })
      .getRawOne<{ patientCount: string }>();

    const dynamicCount = Number(raw?.patientCount ?? 0);
    const legacyDoctor = await this.legacyDoctorRepository.findOne({ where: { sourceUserId: doctorId } });
    const legacyCount = legacyDoctor?.patientCount ?? 0;

    return dynamicCount + legacyCount;
  }

  private async getPatientCountMap(doctorIds: string[]): Promise<Map<string, number>> {
    if (doctorIds.length === 0) {
      return new Map();
    }

    const rows = await this.appointmentRepository
      .createQueryBuilder('appointment')
      .select('appointment.doctor_id', 'doctorId')
      .addSelect('COUNT(DISTINCT appointment.patient_id)', 'patientCount')
      .where('appointment.doctor_id IN (:...doctorIds)', { doctorIds })
      .andWhere('appointment.status != :cancelledStatus', { cancelledStatus: AppointmentStatus.CANCELLED })
      .groupBy('appointment.doctor_id')
      .getRawMany<{ doctorId: string; patientCount: string }>();

    const legacyDoctors = await this.legacyDoctorRepository
      .createQueryBuilder('doctor')
      .select('doctor.source_user_id', 'doctorId')
      .addSelect('doctor.patient_count', 'legacyPatientCount')
      .where('doctor.source_user_id IN (:...doctorIds)', { doctorIds })
      .getRawMany<{ doctorId: string; legacyPatientCount: string }>();

    const legacyMap = new Map<string, number>();
    legacyDoctors.forEach((row) => {
      legacyMap.set(row.doctorId, Number(row.legacyPatientCount ?? 0));
    });

    const map = new Map<string, number>();
    doctorIds.forEach((id) => {
       const dynamicCount = Number(rows.find(r => r.doctorId === id)?.patientCount ?? 0);
       const legacyCount = legacyMap.get(id) ?? 0;
       map.set(id, dynamicCount + legacyCount);
    });

    return map;
  }

  private async findRequestedSlot(params: {
    manager: EntityManager;
    doctorId: string;
    requestedSlotId: string;
  }): Promise<DoctorAvailabilitySlot | null> {
    const { manager, doctorId, requestedSlotId } = params;
    const slotRepository = manager.getRepository(DoctorAvailabilitySlot);

    if (UUID_PATTERN.test(requestedSlotId)) {
      const existingSlot = await slotRepository.findOne({
        where: { id: requestedSlotId, doctorId },
      });

      if (existingSlot) {
        return existingSlot;
      }
    }

    const generatedSlot = parseGeneratedSlotId(requestedSlotId);

    if (!generatedSlot || generatedSlot.doctorId !== doctorId) {
      return null;
    }

    const alreadyCreated = await slotRepository.findOne({
      where: {
        doctorId,
        date: generatedSlot.date,
        startTime: generatedSlot.time,
      },
    });

    if (alreadyCreated) {
      return alreadyCreated;
    }

    const doctor = await this.ensureApprovedDoctor(doctorId);
    const generatedAvailability = await this.buildGeneratedAvailability({
      doctor,
      dateFrom: generatedSlot.date,
      dateTo: generatedSlot.date,
    });
    const matchingGenerated = generatedAvailability.find(
      (slot) => slot.date === generatedSlot.date && slot.time === generatedSlot.time,
    );

    if (!matchingGenerated) {
      return null;
    }

    const slot = slotRepository.create({
      doctorId,
      date: generatedSlot.date,
      day: matchingGenerated.day,
      startTime: generatedSlot.time,
      isBooked: false,
      appointmentId: null,
    });

    return slotRepository.save(slot);
  }

  private buildDoctorWelcomeMessage(params: {
    patientName: string;
    doctorName: string;
    day: string;
    date: string;
    time: string;
  }): string {
    return [
      `Hi ${params.patientName}, welcome to Dr. ${params.doctorName}'s care.`,
      `Your appointment is confirmed for ${params.day}, ${params.date} at ${params.time}.`,
      'Please reply here if you need help before your visit.',
    ].join(' ');
  }

  private async appendDoctorWelcomeMessage(params: {
    manager: EntityManager;
    patientId: string;
    doctorId: string;
    message: string;
  }): Promise<void> {
    const chats = params.manager.getRepository(Chat);
    const messages = params.manager.getRepository(ChatMessage);
    const activities = params.manager.getRepository(ActivityLog);

    let chat = await chats.findOne({ where: { patientId: params.patientId } });

    if (chat) {
      if (!chat.doctorId) {
        chat.doctorId = params.doctorId;
      }
    } else {
      chat = chats.create({
        patientId: params.patientId,
        doctorId: params.doctorId,
        followUpStatus: FollowUpStatus.NONE,
        unreadCount: 0,
      });
    }

    const savedChat = await chats.save(chat);
    const welcome = messages.create({
      chatId: savedChat.id,
      senderType: ChatSenderType.DOCTOR,
      messageType: ChatMessageType.TEXT,
      content: params.message,
      attachmentUrl: null,
    });
    const savedMessage = await messages.save(welcome);

    savedChat.lastMessage = params.message;
    savedChat.lastMessageType = ChatMessageType.TEXT;
    savedChat.lastMessageAt = savedMessage.createdAt;
    savedChat.unreadCount = 0;
    await chats.save(savedChat);

    await activities.save(
      activities.create({
        doctorId: params.doctorId,
        patientId: params.patientId,
        type: 'appointment-welcome',
        message: params.message,
      }),
    );
  }

  private async buildGeneratedAvailability(params: {
    doctor: PublicDoctorRecord;
    dateFrom: string;
    dateTo: string;
  }): Promise<PublicDoctorAvailabilitySlot[]> {
    const { doctor, dateFrom, dateTo } = params;
    const startDate = parseIsoDate(dateFrom);
    const endDate = parseIsoDate(dateTo);

    if (!startDate || !endDate || startDate > endDate) {
      return [];
    }

    const allScheduleTokens = [...doctor.availableDays, ...doctor.availableTimeSlots];
    const allowedDays = new Set(
      doctor.availableDays
        .map((day) => normalizeDayName(day))
        .filter((day): day is (typeof DAY_NAMES)[number] => Boolean(day)),
    );
    const hasAllDaysFallback = allScheduleTokens.some((value) => isAllDaysToken(value));
    const slotDuration = allScheduleTokens
      .map((value) => parseSlotDuration(value))
      .find((value): value is number => Boolean(value)) ?? 30;
    const timeRanges = doctor.availableTimeSlots
      .map((slot) => parseTimeRange(slot))
      .filter((slot): slot is { start: number; end: number } => Boolean(slot));

    if (allowedDays.size === 0 && hasAllDaysFallback) {
      DAY_NAMES.forEach((day) => allowedDays.add(day));
    }

    if (timeRanges.length === 0 && hasAllDaysFallback) {
      timeRanges.push(...DEFAULT_TIME_RANGES.map((range) => ({ ...range })));
    }

    if (allowedDays.size === 0 || timeRanges.length === 0) {
      return [];
    }

    const [existingSlots, appointments] = await Promise.all([
      this.slotRepository.find({
        where: { doctorId: doctor.userId },
        order: { date: 'ASC', startTime: 'ASC' },
      }),
      this.appointmentRepository.find({
        where: { doctorId: doctor.userId },
      }),
    ]);

    const occupied = new Set<string>();

    for (const slot of existingSlots) {
      if (slot.date >= dateFrom && slot.date <= dateTo) {
        occupied.add(`${slot.date}|${slot.startTime}`);
      }
    }

    for (const appointment of appointments) {
      if (appointment.appointmentDate >= dateFrom && appointment.appointmentDate <= dateTo) {
        occupied.add(`${appointment.appointmentDate}|${appointment.appointmentTime}`);
      }
    }

    const generated: PublicDoctorAvailabilitySlot[] = [];

    for (let current = new Date(startDate); current <= endDate; current = addDays(current, 1)) {
      const dayName = DAY_NAMES[current.getDay()];

      if (!allowedDays.has(dayName)) {
        continue;
      }

      const date = toIsoDate(current);

      for (const range of timeRanges) {
        for (let minute = range.start; minute + slotDuration <= range.end; minute += slotDuration) {
          const time = formatMinutesToTimeLabel(minute);
          const slotKey = `${date}|${time}`;

          if (occupied.has(slotKey)) {
            continue;
          }

          generated.push({
            slotId: buildGeneratedSlotId(doctor.userId, date, time),
            date,
            day: dayName,
            time,
            isGenerated: true,
          });
        }
      }
    }

    return generated;
  }
}

export const publicDoctorService = new PublicDoctorService();
