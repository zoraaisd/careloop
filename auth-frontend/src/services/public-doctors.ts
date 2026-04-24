import { apiClient } from '@/services/api';

export type ApprovedDoctor = {
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
};

export type ApprovedDoctorAvailabilitySlot = {
  slotId: string;
  date: string;
  day: string;
  time: string;
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

export const getApprovedDoctors = async (search?: string): Promise<ApprovedDoctor[]> => {
  const { data } = await apiClient.get<ApprovedDoctor[]>('/auth/public/doctors', {
    params: search?.trim() ? { search: search.trim() } : undefined,
  });

  return data;
};

export const getApprovedDoctorById = async (doctorId: string): Promise<ApprovedDoctor> => {
  const { data } = await apiClient.get<ApprovedDoctor>(`/auth/public/doctors/${doctorId}`);
  return data;
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
