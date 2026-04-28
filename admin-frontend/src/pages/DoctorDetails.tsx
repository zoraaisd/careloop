import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { formatCurrency, getDoctorById, updateDoctor, type DoctorRequest } from '@/services/admin';

const DoctorDetails = () => {
  const navigate = useNavigate();
  const { doctorId = '' } = useParams();
  const [doctor, setDoctor] = useState<DoctorRequest | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<DoctorRequest>>({});
  const [isSaving, setIsSaving] = useState(false);

  const loadDoctor = async () => {
    try {
      const data = await getDoctorById(doctorId);
      setDoctor(data);
      setFormData(data);
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
    </div>
  );
};

export { DoctorDetails };
