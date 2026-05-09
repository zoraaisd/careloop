import { apiClient } from '@/services/api';
import axios from 'axios';

export type Doctor = {
  id: number;
  sourceUserId: string | null;
  name: string;
  email: string;
  specialization: string;
  experience: number;
  clinicName: string;
  fees: number;
  about: string | null;
  patientCount: number;
};

export type ApprovedDoctor = {
  userId: string;
  routeId?: string;
  clinicId?: string;
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

export type DoctorReview = {
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

export type ApprovedDoctorAvailabilitySlot = {
  slotId: string;
  date: string;
  day: string;
  time: string;
  isGenerated?: boolean;
};

export type CreatePublicAppointmentPayload = {
  slotId: string;
  patientName: string;
  patientPhone: string;
  patientEmail?: string;
  patientAge: number;
  patientGender?: string;
  notes?: string;
};

export type CreateDoctorReviewPayload = {
  recommendDoctor: boolean;
  healthProblem: string;
  waitTime: string;
  improvements: string[];
  experienceStory: string;
  reviewerName: string;
  reviewerPhone: string;
  starRating: number;
  isAnonymous?: boolean;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const coerceStringId = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return null;
};

const normalizeDoctor = (value: unknown): Doctor => {
  const record = value as Partial<Doctor> & Record<string, unknown>;

  return {
    id: Number(record.id ?? 0),
    sourceUserId: typeof record.sourceUserId === 'string' ? record.sourceUserId : null,
    name: typeof record.name === 'string' ? record.name : 'Unknown doctor',
    email: typeof record.email === 'string' ? record.email : 'Email not available',
    specialization:
      typeof record.specialization === 'string' ? record.specialization : 'Specialization not available',
    experience: Number(record.experience ?? 0),
    clinicName: typeof record.clinicName === 'string' ? record.clinicName : 'Clinic not available',
    fees: Number(record.fees ?? 0),
    about: typeof record.about === 'string' ? record.about : null,
    patientCount: Number(record.patientCount ?? 0),
  };
};

export const getDoctors = async (): Promise<Doctor[]> => {
  const { data } = await apiClient.get<unknown>('/doctors');
  return Array.isArray(data) ? data.map(normalizeDoctor) : [];
};

export const getDoctorById = async (id: string): Promise<Doctor> => {
  const { data } = await apiClient.get<unknown>(`/doctors/${id}`);
  return normalizeDoctor(data);
};

export const resolvePublicDoctorId = async (doctorId: string): Promise<string> => {
  if (UUID_PATTERN.test(doctorId)) {
    return doctorId;
  }

  if (!/^\d+$/.test(doctorId)) {
    throw new Error('Invalid doctor id');
  }

  const doctor = await getDoctorById(doctorId);

  if (!doctor.sourceUserId) {
    throw new Error('Doctor is not linked to a public profile');
  }

  return doctor.sourceUserId;
};

const normalizeApprovedDoctor = (value: unknown): ApprovedDoctor => {
  const record = value as Partial<ApprovedDoctor> &
    Record<string, unknown> & { id?: unknown; sourceUserId?: unknown; fees?: unknown; about?: unknown };

  const userId = coerceStringId(record.userId) ?? coerceStringId(record.sourceUserId) ?? '';
  const fallbackLegacyId = coerceStringId(record.id) ?? userId;
  const routeId = userId || fallbackLegacyId;
  const clinicImageUrls = Array.isArray(record.clinicImageUrls)
    ? record.clinicImageUrls.filter((url): url is string => typeof url === 'string' && Boolean(url.trim()))
    : [];
  const clinicImageUrl = typeof record.clinicImageUrl === 'string' && record.clinicImageUrl.trim()
    ? record.clinicImageUrl
    : clinicImageUrls[0] ?? null;
  const clinicVideoUrls = Array.isArray(record.clinicVideoUrls)
    ? record.clinicVideoUrls.filter((url): url is string => typeof url === 'string' && Boolean(url.trim()))
    : [];

  return {
    userId,
    routeId,
    clinicId: coerceStringId(record.clinicId) ?? undefined,
    name: typeof record.name === 'string' ? record.name : 'Unknown doctor',
    specialization:
      typeof record.specialization === 'string' ? record.specialization : 'Specialization not available',
    experience: Number(record.experience ?? 0),
    qualification: typeof record.qualification === 'string' ? record.qualification : '',
    clinicName: typeof record.clinicName === 'string' ? record.clinicName : 'Clinic not available',
    clinicPhone: typeof record.clinicPhone === 'string' ? record.clinicPhone : null,
    clinicAddress: typeof record.clinicAddress === 'string' ? record.clinicAddress : '',
    city: typeof record.city === 'string' ? record.city : '',
    consultationFees: Number(record.consultationFees ?? record.fees ?? 0),
    availableDays: Array.isArray(record.availableDays) ? record.availableDays.filter((day): day is string => typeof day === 'string') : [],
    availableTimeSlots: Array.isArray(record.availableTimeSlots)
      ? record.availableTimeSlots.filter((slot): slot is string => typeof slot === 'string')
      : [],
    aboutDoctor:
      typeof record.aboutDoctor === 'string'
        ? record.aboutDoctor
        : typeof record.about === 'string'
          ? record.about
          : null,
    profileImageUrl: typeof record.profileImageUrl === 'string' ? record.profileImageUrl : null,
    clinicImageUrl,
    clinicImageUrls: clinicImageUrls.length ? clinicImageUrls : clinicImageUrl ? [clinicImageUrl] : [],
    clinicVideoUrls,
    patientCount: Number(record.patientCount ?? 0),
  };
};

export const getApprovedDoctorRouteId = (doctor: ApprovedDoctor): string =>
  doctor.routeId || doctor.userId;

export const getApprovedDoctors = async (search?: string): Promise<ApprovedDoctor[]> => {
  const { data } = await apiClient.get<unknown>('/auth/public/doctors', {
    params: search?.trim() ? { search: search.trim() } : undefined,
  });

  return Array.isArray(data) ? data.map(normalizeApprovedDoctor) : [];
};

export const getApprovedDoctorById = async (doctorId: string): Promise<ApprovedDoctor> => {
  const { data } = await apiClient.get<unknown>(`/auth/public/doctors/${doctorId}`);
  return normalizeApprovedDoctor(data);
};

export const getApprovedDoctorAvailability = async (
  doctorId: string,
  params?: { dateFrom?: string; dateTo?: string },
): Promise<ApprovedDoctorAvailabilitySlot[]> => {
  const { data } = await apiClient.get<ApprovedDoctorAvailabilitySlot[]>(
    `/auth/public/doctors/${doctorId}/availability`,
    { params },
  );

  return data;
};

export const createPublicAppointment = async (
  doctorId: string,
  payload: CreatePublicAppointmentPayload,
): Promise<{ message: string; appointmentId: string }> => {
  const { data } = await apiClient.post<{ message: string; appointmentId: string }>(
    `/auth/public/doctors/${doctorId}/appointments`,
    payload,
  );

  return data;
};

export const getDoctorReviews = async (doctorId: string): Promise<DoctorReview[]> => {
  try {
    const { data } = await apiClient.get<DoctorReview[]>(`/auth/public/doctors/${doctorId}/reviews`);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return [];
    }

    throw error;
  }
};

export const createDoctorReview = async (
  doctorId: string,
  payload: CreateDoctorReviewPayload,
): Promise<{ message: string; reviewId: string }> => {
  const { data } = await apiClient.post<{ message: string; reviewId: string }>(
    `/auth/public/doctors/${doctorId}/reviews`,
    payload,
  );

  return data;
};
