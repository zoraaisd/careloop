import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { formatCurrency, getDoctorById, updateDoctor, type DoctorRequest } from '@/services/admin';

type ClinicMediaItem = {
  type: 'image' | 'video' | 'external-video';
  url: string;
};

const isVideoData = (url: string) =>
  url.startsWith('data:video/') || /\.(mp4|webm|ogg)(?:[?#].*)?$/i.test(url);

const PlayBadge = () => (
  <span className="absolute inset-0 flex items-center justify-center bg-slate-950/20">
    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 shadow-sm">
      <span className="ml-1 h-0 w-0 border-y-[9px] border-l-[14px] border-y-transparent border-l-emerald-700" />
    </span>
  </span>
);

const DoctorDetails = () => {
  const navigate = useNavigate();
  const { doctorId = '' } = useParams();
  const [doctor, setDoctor] = useState<DoctorRequest | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<DoctorRequest>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  const loadDoctor = async () => {
    try {
      const data = await getDoctorById(doctorId);
      setDoctor(data);
      setFormData(data);
      setActiveMediaIndex(0);
    } catch (error) {
      console.error('Error loading doctor:', error);
    }
  };

  useEffect(() => {
    loadDoctor();
  }, [doctorId]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateDoctor(doctorId, formData);
      setIsEditing(false);
      await loadDoctor();
    } catch (error) {
      alert('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const clinicMediaItems = useMemo<ClinicMediaItem[]>(() => {
    if (!doctor) return [];

    const imageUrls = doctor.clinicImageUrls?.length
      ? doctor.clinicImageUrls
      : doctor.clinicImageUrl
        ? [doctor.clinicImageUrl]
        : [];

    return [
      ...imageUrls.map((url) => ({ type: 'image' as const, url })),
      ...(doctor.clinicVideoUrls ?? []).map((url) => ({
        type: isVideoData(url) ? 'video' as const : 'external-video' as const,
        url,
      })),
    ];
  }, [doctor]);

  if (!doctor) {
    return (
      <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">Loading doctor details...</p>
      </div>
    );
  }

  const Label = ({ children }: { children: React.ReactNode }) => (
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{children}</p>
  );
  const activeMediaItem = clinicMediaItems[activeMediaIndex] ?? clinicMediaItems[0] ?? null;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-950">{doctor.name}</h2>
            <p className="mt-2 text-sm text-slate-500">{doctor.clinicName}</p>
          </div>
          <div className="flex gap-3">
            {!isEditing ? (
              <button
                className="rounded-xl bg-[#16A34A] px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                onClick={() => setIsEditing(true)}
                type="button"
              >
                Edit Profile
              </button>
            ) : (
              <>
                <button
                  className="rounded-xl border border-slate-200 bg-white px-6 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  onClick={() => {
                    setIsEditing(false);
                    setFormData(doctor);
                  }}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="rounded-xl bg-[#16A34A] px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                  disabled={isSaving}
                  onClick={handleSave}
                  type="button"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            )}
            <button
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50"
              onClick={() => navigate('/admin/doctors')}
              type="button"
            >
              Back
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
          <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
            {[
              { label: 'Doctor Name', key: 'name' },
              { label: 'Phone Number', key: 'phone' },
              { label: 'Email', key: 'email' },
              { label: 'Clinic Name', key: 'clinicName' },
              { label: 'Clinic Address', key: 'clinicAddress', fullWidth: true },
              { label: 'City', key: 'city' },
              { label: 'Specialization', key: 'specialization' },
              { label: 'Qualification', key: 'qualification' },
              { label: 'Experience (Years)', key: 'experience', type: 'number' },
              { label: 'Consultation Fees', key: 'consultationFees', type: 'number' },
              { label: 'Council Name', key: 'councilRegisteredName' },
              { label: 'Council Code', key: 'medicalRegistrationNumber' },
              { label: 'Council Board', key: 'medicalCouncilBoard' },
            ].map((field) => (
              <div key={field.key} className={field.fullWidth ? 'md:col-span-2' : ''}>
                <Label>{field.label}</Label>
                {isEditing ? (
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
                    onChange={(e) => setFormData({ ...formData, [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value })}
                    type={field.type || 'text'}
                    value={(formData as any)[field.key] || ''}
                  />
                ) : (
                  <p className="mt-1 text-sm text-slate-800">
                    {field.key === 'consultationFees'
                      ? formatCurrency(doctor.consultationFees)
                      : (doctor as any)[field.key]}
                  </p>
                )}
              </div>
            ))}

            <div className="md:col-span-2">
              <Label>About Doctor</Label>
              {isEditing ? (
                <textarea
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
                  onChange={(e) => setFormData({ ...formData, aboutDoctor: e.target.value })}
                  rows={4}
                  value={formData.aboutDoctor || ''}
                />
              ) : (
                <p className="mt-1 text-sm leading-relaxed text-slate-800">{doctor.aboutDoctor || 'No description provided.'}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Clinic Photos</h3>
            <p className="mt-1 text-sm text-slate-500">{doctor.clinicName}</p>
          </div>
        </div>

        {activeMediaItem ? (
          <div className="mt-5 space-y-4">
            <div className="relative overflow-hidden rounded-xl bg-slate-100">
              {activeMediaItem.type === 'image' ? (
                <img
                  alt={`${doctor.clinicName} clinic ${activeMediaIndex + 1}`}
                  className="h-80 w-full object-cover"
                  src={activeMediaItem.url}
                />
              ) : activeMediaItem.type === 'video' ? (
                <video
                  className="h-80 w-full object-cover"
                  controls
                  playsInline
                  src={activeMediaItem.url}
                />
              ) : (
                <a
                  aria-label={`Open clinic media ${activeMediaIndex + 1}`}
                  className="relative flex h-80 items-center justify-center bg-slate-900 text-white transition hover:bg-slate-800"
                  href={activeMediaItem.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  <PlayBadge />
                </a>
              )}
            </div>

            {clinicMediaItems.length > 1 ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6">
                {clinicMediaItems.map((item, index) => (
                  <button
                    aria-label={`Show clinic media ${index + 1}`}
                    className={[
                      'relative h-20 overflow-hidden rounded-lg border bg-slate-100 transition',
                      activeMediaIndex === index ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-slate-200 hover:border-emerald-300',
                    ].join(' ')}
                    key={`${item.url}-${index}`}
                    onClick={() => setActiveMediaIndex(index)}
                    type="button"
                  >
                    {item.type === 'image' ? (
                      <img alt="" className="h-full w-full object-cover" src={item.url} />
                    ) : item.type === 'video' ? (
                      <video className="h-full w-full object-cover" muted src={item.url} />
                    ) : (
                      <span className="block h-full w-full bg-slate-900" />
                    )}
                    {item.type !== 'image' ? <PlayBadge /> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <p className="mt-5 text-sm text-slate-600">Clinic photo is not available yet.</p>
        )}
      </section>
    </div>
  );
};

export { DoctorDetails };
