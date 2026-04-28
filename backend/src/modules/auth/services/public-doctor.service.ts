import { EntityManager } from 'typeorm';

import { AppDataSource } from '../../../config/data-source';
import { AppError } from '../../../common/errors/app-error';
import { Appointment, AppointmentStatus } from '../../../entities/appointment.entity';
import { DoctorProfile } from '../../../entities/doctor-profile.entity';
import { DoctorAvailabilitySlot } from '../../../entities/doctor-availability-slot.entity';
import { Patient, PatientVerificationStatus } from '../../../entities/patient.entity';
import { DoctorApprovalStatus, User, UserRole } from '../../../entities/user.entity';
import { getWhatsappHealthcareService } from '../../whatsapp-healthcare/services/whatsapp-healthcare.service';
import type { CreatePublicAppointmentDto } from '../dto/create-public-appointment.dto';

type PublicDoctorRecord = {
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
  clinicImageUrl: string | null;
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

const toIsoDate = (value: Date) => value.toISOString().slice(0, 10);

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

    return profiles.map((profile) => this.serializeProfile(profile));
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

    return this.serializeProfile(profile);
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

      getWhatsappHealthcareService()?.syncExternalAppointment({
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

      return {
        message: `Appointment booked with ${doctor.name} on ${slot.day} at ${slot.startTime}.`,
        appointmentId: savedAppointment.id,
      };
    });
  }

  private async ensureApprovedDoctor(doctorId: string): Promise<PublicDoctorRecord> {
    if (!UUID_PATTERN.test(doctorId)) {
      throw new AppError('Approved doctor not found', 404);
    }

    return this.getApprovedDoctorById(doctorId);
  }

  private serializeProfile(profile: DoctorProfile & { user: User }): PublicDoctorRecord {
    return {
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
      clinicImageUrl: profile.clinicImageUrl,
    };
  }

  private async findRequestedSlot(params: {
    manager: EntityManager;
    doctorId: string;
    requestedSlotId: string;
  }): Promise<DoctorAvailabilitySlot | null> {
    const { manager, doctorId, requestedSlotId } = params;
    const slotRepository = manager.getRepository(DoctorAvailabilitySlot);

    const existingSlot = await slotRepository.findOne({
      where: { id: requestedSlotId, doctorId },
    });

    if (existingSlot) {
      return existingSlot;
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

  private async buildGeneratedAvailability(params: {
    doctor: PublicDoctorRecord;
    dateFrom: string;
    dateTo: string;
  }): Promise<PublicDoctorAvailabilitySlot[]> {
    const { doctor, dateFrom, dateTo } = params;
    const startDate = new Date(`${dateFrom}T00:00:00`);
    const endDate = new Date(`${dateTo}T00:00:00`);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate > endDate) {
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
