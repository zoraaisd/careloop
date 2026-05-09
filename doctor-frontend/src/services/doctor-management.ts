import api from '@/services/api';

const isRenderableClinicAsset = (value: unknown): value is string =>
  typeof value === 'string' && /^(data:|https?:\/\/)/i.test(value.trim());

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
  };
}

export async function getClinicDoctors() {
  try {
    const { data } = await api.get('/doctor/doctors');
    return data as ClinicDoctorListItem[];
  } catch (error: any) {
    const statusCode = error?.response?.status;
    if (![401, 403, 404].includes(statusCode)) {
      throw error;
    }

    const { data } = await api.get('/auth/public/doctors');
    const doctors = Array.isArray(data) ? data : [];

    return doctors.map((doctor: any) => ({
      userId: String(doctor.userId || doctor.routeId || ''),
      routeId: String(doctor.routeId || doctor.userId || ''),
      name: doctor.name || 'Unknown doctor',
      mobile: doctor.phone || doctor.clinicPhone || 'N/A',
      email: doctor.email || 'N/A',
      clinicName: doctor.clinicName || null,
      specialty: doctor.specialization || null,
      clinicPhone: doctor.clinicPhone || null,
      clinicAddress: doctor.clinicAddress || null,
      city: doctor.city || null,
      clinicLogoUrl: isRenderableClinicAsset(doctor.clinicLogoUrl) ? doctor.clinicLogoUrl : null,
      clinicImageUrl: isRenderableClinicAsset(doctor.clinicImageUrl) ? doctor.clinicImageUrl : null,
      clinicImageUrls: Array.isArray(doctor.clinicImageUrls)
        ? doctor.clinicImageUrls.filter(isRenderableClinicAsset)
        : isRenderableClinicAsset(doctor.clinicImageUrl)
          ? [doctor.clinicImageUrl]
          : [],
      clinicVideoUrls: Array.isArray(doctor.clinicVideoUrls)
        ? doctor.clinicVideoUrls.filter(isRenderableClinicAsset)
        : [],
      patientCount: Number(doctor.patientCount ?? 0),
      status: 'approved',
    })) as ClinicDoctorListItem[];
  }
}

export async function getClinicDoctorDetails(doctorId: string) {
  try {
    const { data } = await api.get(`/doctor/doctors/${doctorId}`);
    return data as ClinicDoctorDetails;
  } catch (error: any) {
    const statusCode = error?.response?.status;
    if (![401, 403, 404].includes(statusCode)) {
      throw error;
    }

    const { data } = await api.get(`/auth/public/doctors/${doctorId}`);
    const doctor = data as any;

    return {
      userId: String(doctor.userId || doctor.routeId || doctorId),
      name: doctor.name || 'Unknown doctor',
      email: doctor.email || 'N/A',
      mobile: doctor.phone || doctor.clinicPhone || 'N/A',
      status: 'approved',
      patientCount: Number(doctor.patientCount ?? 0),
      clinicName: doctor.clinicName || null,
      clinicPhone: doctor.clinicPhone || null,
      clinicAddress: doctor.clinicAddress || null,
      city: doctor.city || null,
      specialty: doctor.specialization || null,
      experience: Number(doctor.experience ?? 0),
      qualification: doctor.qualification || null,
      aboutDoctor: doctor.aboutDoctor || null,
      consultationFees:
        doctor.consultationFees !== undefined && doctor.consultationFees !== null
          ? String(doctor.consultationFees)
          : null,
      availableDays: Array.isArray(doctor.availableDays) ? doctor.availableDays : [],
      availableTimeSlots: Array.isArray(doctor.availableTimeSlots) ? doctor.availableTimeSlots : [],
      createdAt: doctor.createdAt || new Date().toISOString(),
    };
  }
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

  const { data } = await api.get('/auth/public/doctors');
  const publicDoctors = Array.isArray(data) ? data : [];
  const doctorIds = new Set(doctors.map((doctor) => doctor.userId));
  const doctorEmails = new Set(doctors.map((doctor) => doctor.email.toLowerCase()));

  const matchedDoctor =
    publicDoctors.find((doctor: any) => doctorIds.has(String(doctor.userId || doctor.routeId || ''))) ||
    publicDoctors.find((doctor: any) => doctor.email && doctorEmails.has(String(doctor.email).toLowerCase())) ||
    publicDoctors.find(
      (doctor: any) =>
        clinicName &&
        typeof doctor.clinicName === 'string' &&
        doctor.clinicName.trim().toLowerCase() === clinicName.trim().toLowerCase(),
    ) ||
    publicDoctors[0];

  if (!matchedDoctor) {
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

  const imageUrls = Array.isArray(matchedDoctor.clinicImageUrls)
    ? matchedDoctor.clinicImageUrls.filter(isRenderableClinicAsset)
    : isRenderableClinicAsset(matchedDoctor.clinicImageUrl)
      ? [matchedDoctor.clinicImageUrl]
      : [];
  const videoUrls = Array.isArray(matchedDoctor.clinicVideoUrls)
    ? matchedDoctor.clinicVideoUrls.filter(isRenderableClinicAsset)
    : [];
  return {
    clinicName: matchedDoctor.clinicName || clinicName || doctors[0]?.clinicName || 'Clinic not available',
    clinicPhone: clinicPhone || doctors[0]?.clinicPhone || 'Not available',
    clinicAddress: matchedDoctor.clinicAddress || doctors[0]?.clinicAddress || 'Address not available',
    city: matchedDoctor.city || doctors[0]?.city || '',
    clinicLogoUrl: isRenderableClinicAsset(matchedDoctor.clinicLogoUrl) ? matchedDoctor.clinicLogoUrl : null,
    clinicImageUrls: imageUrls,
    clinicVideoUrls: videoUrls,
  } as ClinicOverview;
}
