import { getApprovedDoctors, type ApprovedDoctor } from '@/services/public-doctors';

export const clinicCategories = [
  'All Clinics',
  'Dermatology',
  'Pediatric',
  'Gynecology',
  'Cardiology',
  'Other',
] as const;

export type ClinicCategory = (typeof clinicCategories)[number];

export type PublicClinicDoctor = ApprovedDoctor;

export type PublicClinic = {
  id: string;
  name: string;
  category: Exclude<ClinicCategory, 'All Clinics'>;
  location: string;
  city: string;
  clinicPhone: string | null;
  imageUrl: string | null;
  imageUrls: string[];
  videoUrls: string[];
  doctorsCount: number;
  yearsOfService: number;
  verified: boolean;
  doctors: PublicClinicDoctor[];
};

const sanitizeKeyPart = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const getClinicLocation = (doctor: ApprovedDoctor) => doctor.clinicAddress || doctor.city || 'India';

const resolveClinicCategory = (specialization: string): Exclude<ClinicCategory, 'All Clinics'> => {
  const normalized = specialization.trim().toLowerCase();

  if (normalized.includes('dermat')) {
    return 'Dermatology';
  }

  if (normalized.includes('pediatric')) {
    return 'Pediatric';
  }

  if (normalized.includes('gyne')) {
    return 'Gynecology';
  }

  if (normalized.includes('cardio')) {
    return 'Cardiology';
  }

  return 'Other';
};

const buildClinicKey = (doctor: ApprovedDoctor) =>
  doctor.clinicId?.trim() ||
  [
    sanitizeKeyPart(doctor.clinicName || 'clinic'),
    sanitizeKeyPart(doctor.city || 'city'),
    sanitizeKeyPart(doctor.clinicAddress || 'address'),
  ]
    .filter(Boolean)
    .join('-');

const buildClinicRecord = (clinicDoctors: ApprovedDoctor[]): PublicClinic => {
  const [primaryDoctor] = clinicDoctors;
  const categories = clinicDoctors.map((doctor) => resolveClinicCategory(doctor.specialization));
  const primaryCategory =
    categories.find((category) => category !== 'Other') ?? categories[0] ?? 'Other';
  const maxExperience = clinicDoctors.reduce(
    (highest, doctor) => Math.max(highest, Number.isFinite(doctor.experience) ? doctor.experience : 0),
    0,
  );
  const sortedDoctors = [...clinicDoctors].sort((left, right) => left.name.localeCompare(right.name));
  const city = primaryDoctor?.city || '';
  const imageUrls = Array.from(
    new Set(
      clinicDoctors.flatMap((doctor) =>
        doctor.clinicImageUrls.length > 0
          ? doctor.clinicImageUrls
          : doctor.clinicImageUrl
            ? [doctor.clinicImageUrl]
            : [],
      ),
    ),
  );
  const videoUrls = Array.from(new Set(clinicDoctors.flatMap((doctor) => doctor.clinicVideoUrls)));

  return {
    id: buildClinicKey(primaryDoctor),
    name: primaryDoctor?.clinicName || 'CareLoop Clinic',
    category: primaryCategory,
    location: getClinicLocation(primaryDoctor),
    city,
    clinicPhone: primaryDoctor?.clinicPhone || null,
    imageUrl: imageUrls[0] || primaryDoctor?.profileImageUrl || null,
    imageUrls,
    videoUrls,
    doctorsCount: sortedDoctors.length,
    yearsOfService: maxExperience,
    verified: true,
    doctors: sortedDoctors,
  };
};

export const matchesClinicCategory = (clinic: PublicClinic, category: ClinicCategory) =>
  category === 'All Clinics' || clinic.category === category;

export const matchesClinicSearch = (clinic: PublicClinic, search: string) => {
  const term = search.trim().toLowerCase();

  if (!term) {
    return true;
  }

  return [clinic.name, clinic.category, clinic.location, clinic.city, ...clinic.doctors.map((doctor) => doctor.specialization)]
    .join(' ')
    .toLowerCase()
    .includes(term);
};

export const getPublicClinics = async (): Promise<PublicClinic[]> => {
  const doctors = await getApprovedDoctors();
  const clinicsMap = new Map<string, ApprovedDoctor[]>();

  doctors.forEach((doctor) => {
    const key = buildClinicKey(doctor);
    const existingDoctors = clinicsMap.get(key) ?? [];
    existingDoctors.push(doctor);
    clinicsMap.set(key, existingDoctors);
  });

  return Array.from(clinicsMap.values())
    .map(buildClinicRecord)
    .sort((left, right) => left.name.localeCompare(right.name));
};

export const getPublicClinicById = async (clinicId: string): Promise<PublicClinic | null> => {
  const clinics = await getPublicClinics();
  return clinics.find((clinic) => clinic.id === clinicId) ?? null;
};
