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
  patientCount: number;
  status: string;
};

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
  const { data } = await api.post('/auth/signup/request-otp-email', payload);
  return data as {
    message: string;
    expiresInSeconds: number;
    otp?: string;
    emailDelivered?: boolean;
    emailDeliveryError?: string;
  };
}

export async function verifyDoctorEmailOtp(payload: VerifyDoctorOtpPayload) {
  const { data } = await api.post('/auth/signup/verify-otp', payload);
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
