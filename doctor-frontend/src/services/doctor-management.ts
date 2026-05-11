import api from '@/services/api';

type RequestDoctorOtpPayload = {
  name: string;
  email: string;
  phone: string;
  role: 'doctor';
};

type VerifyDoctorOtpPayload = {
  email: string;
  phone: string;
  role: 'doctor';
  otp: string;
};

type CreateClinicDoctorPayload = {
  name: string;
  email: string;
  phone: string;
  specialization: string;
  experience: number;
  qualification: string;
  aboutDoctor?: string;
  signupVerificationToken: string;
};

export type ClinicDoctorListItem = {
  userId: string;
  routeId?: string;
  name: string;
  mobile: string;
  email: string;
  clinicName: string | null;
  specialty: string | null;
  clinicPhone: string | null;
  clinicAddress?: string | null;
  city?: string | null;
  clinicLogoUrl?: string | null;
  clinicImageUrl?: string | null;
  clinicImageUrls?: string[];
  clinicVideoUrls?: string[];
  patientCount: number;
  status: string;
};

export type ClinicOverview = {
  clinicName: string;
  clinicPhone: string;
  clinicAddress: string;
  city?: string;
  clinicLogoUrl: string | null;
  clinicImageUrls: string[];
  clinicVideoUrls: string[];
};

export async function updateClinicOverview(payload: {
  clinicName: string;
  clinicPhone: string;
  clinicAddress: string;
  city: string;
}) {
  const { data } = await api.patch('/doctor/doctors/clinic-overview', payload);
  return data as {
    message: string;
    clinicName: string;
    clinicPhone: string;
    clinicAddress: string;
    city: string;
    clinicLogoUrl: string | null;
    clinicImageUrls: string[];
    clinicVideoUrls: string[];
  };
}

export async function uploadClinicAsset(payload: {
  assetType: 'image' | 'video' | 'logo';
  dataUrl: string;
  fileName: string;
}) {
  const { data } = await api.patch('/doctor/doctors/clinic-assets', payload);
  return data as {
    message: string;
    clinicLogoUrl: string | null;
    clinicImageUrls: string[];
    clinicVideoUrls: string[];
    clinicImageUrl: string | null;
  };
}

export async function deleteClinicAsset(assetType: 'image' | 'video' | 'logo') {
  const { data } = await api.delete(`/doctor/doctors/clinic-assets/${assetType}`);
  return data as {
    message: string;
    clinicLogoUrl: string | null;
    clinicImageUrls: string[];
    clinicVideoUrls: string[];
    clinicImageUrl: string | null;
  };
}

export type ClinicDoctorDetails = {
  userId: string;
  name: string;
  email: string;
  mobile: string;
  status: string;
  patientCount: number;
  clinicName: string | null;
  clinicPhone: string | null;
  clinicAddress: string | null;
  city: string | null;
  specialty: string | null;
  experience: number | null;
  qualification: string | null;
  aboutDoctor: string | null;
  consultationFees: string | null;
  availableDays: string[];
  availableTimeSlots: string[];
  createdAt: string;
};

export async function requestDoctorEmailOtp(payload: RequestDoctorOtpPayload) {
  const { data } = await api.post('/doctor/doctors/request-otp', payload);
  return data as {
    message: string;
    expiresInSeconds: number;
    otp?: string;
    emailDelivered?: boolean;
    emailDeliveryError?: string;
  };
}

export async function verifyDoctorEmailOtp(payload: VerifyDoctorOtpPayload) {
  const { data } = await api.post('/doctor/doctors/verify-otp', payload);
  return data as {
    message: string;
    signupVerificationToken: string;
  };
}

export async function createClinicDoctor(payload: CreateClinicDoctorPayload) {
  const { data } = await api.post('/doctor/doctors', payload);
  return data as {
    message: string;
    userId: string;
    temporaryPassword?: string;
  };
}

export async function getClinicDoctors() {
  const { data } = await api.get('/doctor/doctors');
  return data as ClinicDoctorListItem[];
}

export async function getClinicDoctorDetails(doctorId: string) {
  const { data } = await api.get(`/doctor/doctors/${doctorId}`);
  return data as ClinicDoctorDetails;
}

export async function updateClinicDoctor(
  doctorId: string,
  payload: Partial<{
    name: string;
    email: string;
    phone: string;
    specialization: string;
    experience: number;
    qualification: string;
    clinicName: string;
    clinicPhone: string;
    clinicAddress: string;
    city: string;
    aboutDoctor: string;
  }>,
) {
  const { data } = await api.patch(`/doctor/doctors/${doctorId}`, payload);
  return data as { message: string };
}

export async function getClinicOverview(
  doctors: ClinicDoctorListItem[],
  clinicName?: string | null,
  clinicPhone?: string | null,
) {
  const localClinicRecord = doctors.find(
    (doctor) =>
      (doctor.clinicImageUrls && doctor.clinicImageUrls.length > 0) ||
      (doctor.clinicVideoUrls && doctor.clinicVideoUrls.length > 0) ||
      doctor.clinicAddress,
  );

  if (localClinicRecord) {
    return {
      clinicName: localClinicRecord.clinicName || clinicName || 'Clinic not available',
      clinicPhone: clinicPhone || localClinicRecord.clinicPhone || 'Not available',
      clinicAddress: localClinicRecord.clinicAddress || 'Address not available',
      city: localClinicRecord.city || '',
      clinicLogoUrl: localClinicRecord.clinicLogoUrl || null,
      clinicImageUrls: localClinicRecord.clinicImageUrls || [],
      clinicVideoUrls: localClinicRecord.clinicVideoUrls || [],
    } as ClinicOverview;
  }
  return {
    clinicName: clinicName || doctors[0]?.clinicName || 'Clinic not available',
    clinicPhone: clinicPhone || doctors[0]?.clinicPhone || 'Not available',
    clinicAddress: doctors[0]?.clinicAddress || 'Address not available',
    city: doctors[0]?.city || '',
    clinicLogoUrl: doctors[0]?.clinicLogoUrl || null,
    clinicImageUrls: doctors[0]?.clinicImageUrls || [],
    clinicVideoUrls: doctors[0]?.clinicVideoUrls || [],
  } as ClinicOverview;
}
