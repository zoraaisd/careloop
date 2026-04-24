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

export const getApprovedDoctors = async (search?: string): Promise<ApprovedDoctor[]> => {
  const { data } = await apiClient.get<ApprovedDoctor[]>('/auth/public/doctors', {
    params: search?.trim() ? { search: search.trim() } : undefined,
  });

  return data;
};
