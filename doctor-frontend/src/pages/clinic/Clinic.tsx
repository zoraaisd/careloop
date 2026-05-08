import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getClinicDoctorDetails,
  getClinicDoctors,
  type ClinicDoctorDetails,
  type ClinicDoctorListItem,
  updateClinicDoctor,
} from '@/services/doctor-management';

const Clinic: React.FC = () => {
  const navigate = useNavigate();
  const [doctors, setDoctors] = React.useState<ClinicDoctorListItem[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [selectedDoctor, setSelectedDoctor] = React.useState<ClinicDoctorDetails | null>(null);
  const [isDetailsLoading, setIsDetailsLoading] = React.useState(false);
  const [isEditingDoctor, setIsEditingDoctor] = React.useState(false);
  const [isSavingDoctor, setIsSavingDoctor] = React.useState(false);
  const [doctorForm, setDoctorForm] = React.useState({
    name: '',
    email: '',
    mobile: '',
    specialty: '',
    experience: '',
    qualification: '',
    clinicName: '',
    clinicPhone: '',
    clinicAddress: '',
    city: '',
    aboutDoctor: '',
  });
  const [successMessage, setSuccessMessage] = React.useState('');

  React.useEffect(() => {
    const loadDoctors = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const response = await getClinicDoctors();
        setDoctors(response);
      } catch (error: any) {
        setErrorMessage(error?.response?.data?.message ?? 'Unable to load doctors right now.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadDoctors();
  }, []);

  const filteredDoctors = doctors.filter((doctor) =>
    [doctor.name, doctor.mobile, doctor.email, doctor.status]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(searchQuery.trim().toLowerCase())),
  );

  const getStatusClassName = (status: string) => {
    const normalizedStatus = status.toLowerCase();

    if (normalizedStatus === 'approved') {
      return 'bg-[#dcfce7] text-[#15803d]';
    }

    if (normalizedStatus === 'pending') {
      return 'bg-[#fef3c7] text-[#b45309]';
    }

    return 'bg-[#e2e8f0] text-[#475569]';
  };

  const handleOpenDoctorDetails = async (doctor: ClinicDoctorListItem) => {
    setIsDetailsLoading(true);
    setErrorMessage('');

    try {
      const response = await getClinicDoctorDetails(doctor.routeId || doctor.userId);
      const normalizedDoctor = {
        ...response,
        email: response.email && response.email !== 'N/A' ? response.email : doctor.email || 'N/A',
        mobile: response.mobile && response.mobile !== 'N/A' ? response.mobile : doctor.mobile || 'N/A',
        clinicPhone:
          response.clinicPhone && response.clinicPhone !== 'N/A'
            ? response.clinicPhone
            : doctor.clinicPhone || 'N/A',
      };
      setSelectedDoctor(normalizedDoctor);
      setDoctorForm({
        name: normalizedDoctor.name || '',
        email: normalizedDoctor.email || '',
        mobile: normalizedDoctor.mobile || '',
        specialty: normalizedDoctor.specialty || '',
        experience: normalizedDoctor.experience !== null ? String(normalizedDoctor.experience) : '',
        qualification: normalizedDoctor.qualification || '',
        clinicName: normalizedDoctor.clinicName || '',
        clinicPhone: normalizedDoctor.clinicPhone || '',
        clinicAddress: normalizedDoctor.clinicAddress || '',
        city: normalizedDoctor.city || '',
        aboutDoctor: normalizedDoctor.aboutDoctor || '',
      });
      setIsEditingDoctor(false);
      setSuccessMessage('');
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message ?? 'Unable to load doctor details right now.');
    } finally {
      setIsDetailsLoading(false);
    }
  };

  const handleDoctorFormChange =
    (field: keyof typeof doctorForm) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = field === 'experience' ? event.target.value.replace(/[^\d]/g, '').slice(0, 2) : event.target.value;
      setDoctorForm((current) => ({ ...current, [field]: value }));
    };

  const handleSaveDoctor = async () => {
    if (!selectedDoctor) {
      return;
    }

    setIsSavingDoctor(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await updateClinicDoctor(selectedDoctor.userId, {
        name: doctorForm.name.trim(),
        email: doctorForm.email.trim(),
        phone: doctorForm.mobile.trim(),
        specialization: doctorForm.specialty.trim(),
        experience: Number(doctorForm.experience || 0),
        qualification: doctorForm.qualification.trim(),
        clinicName: doctorForm.clinicName.trim(),
        clinicPhone: doctorForm.clinicPhone.trim(),
        clinicAddress: doctorForm.clinicAddress.trim(),
        city: doctorForm.city.trim(),
        aboutDoctor: doctorForm.aboutDoctor.trim(),
      });

      const updatedDoctor: ClinicDoctorDetails = {
        ...selectedDoctor,
        name: doctorForm.name.trim(),
        email: doctorForm.email.trim(),
        mobile: doctorForm.mobile.trim(),
        specialty: doctorForm.specialty.trim(),
        experience: Number(doctorForm.experience || 0),
        qualification: doctorForm.qualification.trim(),
        clinicName: doctorForm.clinicName.trim(),
        clinicPhone: doctorForm.clinicPhone.trim(),
        clinicAddress: doctorForm.clinicAddress.trim(),
        city: doctorForm.city.trim(),
        aboutDoctor: doctorForm.aboutDoctor.trim() || null,
      };

      setSelectedDoctor(updatedDoctor);
      setDoctors((current) =>
        current.map((doctor) =>
          doctor.userId === selectedDoctor.userId
            ? {
                ...doctor,
                name: updatedDoctor.name,
                email: updatedDoctor.email,
                mobile: updatedDoctor.mobile,
                specialty: updatedDoctor.specialty,
                clinicName: updatedDoctor.clinicName,
                clinicPhone: updatedDoctor.clinicPhone,
              }
            : doctor,
        ),
      );
      setIsEditingDoctor(false);
      setSuccessMessage(response.message || 'Updated successfully');
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message ?? 'Unable to update doctor right now.');
    } finally {
      setIsSavingDoctor(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <button
          type="button"
          className="cursor-pointer rounded-lg bg-[#1faa62] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#199453]"
          onClick={() => navigate('/clinic/add-doctor')}
        >
          + Add Doctor
        </button>

        <div className="w-full max-w-[280px]">
          <input
            className="w-full rounded-xl border border-[#d7e2dc] bg-white px-4 py-2.5 text-sm text-[#28453b] outline-none transition focus:border-[#1faa62]"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search doctors..."
            type="text"
            value={searchQuery}
          />
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#c6d3ce] bg-white shadow-sm">
        <div className="grid grid-cols-[2fr_1.2fr_1.6fr_1fr_1fr] gap-4 border-b border-[#dbe7e1] bg-[#f8fbf9] px-5 py-4 text-xs font-bold uppercase tracking-[0.14em] text-[#8aa198]">
          <span>Doctor Name</span>
          <span>Mobile</span>
          <span>Email</span>
          <span>Patient Count</span>
          <span>Status</span>
        </div>

        <div className="divide-y divide-[#edf3f0]">
          {isLoading ? (
            <div className="px-5 py-6 text-sm text-[#5f756e]">Loading doctors...</div>
          ) : errorMessage ? (
            <div className="px-5 py-6 text-sm font-medium text-[#dc2626]">{errorMessage}</div>
          ) : filteredDoctors.length === 0 ? (
            <div className="px-5 py-6 text-sm text-[#5f756e]">No doctors found.</div>
          ) : (
            filteredDoctors.map((doctor) => (
              <div
                key={doctor.userId}
                className="grid cursor-pointer grid-cols-[2fr_1.2fr_1.6fr_1fr_1fr] gap-4 px-5 py-4 text-sm text-[#28453b] transition hover:bg-[#f8fbf9]"
                onClick={() => void handleOpenDoctorDetails(doctor)}
              >
                <div>
                  <p className="font-semibold text-[#173229]">{doctor.name}</p>
                  <p className="mt-1 text-xs text-[#7a8f87]">{doctor.specialty || doctor.clinicName || 'Doctor'}</p>
                </div>
                <span>{doctor.mobile}</span>
                <span className="break-all">{doctor.email}</span>
                <span>{doctor.patientCount}</span>
                <div>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusClassName(doctor.status)}`}
                  >
                    {doctor.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {selectedDoctor ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(15,23,42,0.35)] px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 pt-0 shadow-[0_20px_60px_rgba(15,23,42,0.22)]">
            <div className="sticky top-0 z-10 -mx-6 mb-6 flex items-start justify-between gap-4 bg-white px-6 pt-6 pb-5">
              <div>
                <h2 className="text-2xl font-bold text-[#173229]">{selectedDoctor.name}</h2>
                <p className="mt-1 text-sm text-[#6c857d]">{selectedDoctor.specialty || 'Doctor Details'}</p>
              </div>
              <button
                type="button"
                className="cursor-pointer rounded-xl border border-[#d7e2dc] px-4 py-2 text-sm font-semibold text-[#28453b]"
                onClick={() => setSelectedDoctor(null)}
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-[#f8fbf9] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#89a097]">Email</p>
                {isEditingDoctor ? (
                  <input
                    className="mt-2 w-full rounded-xl border border-[#d7e2dc] bg-white px-3 py-2 text-sm text-[#173229] outline-none"
                    onChange={handleDoctorFormChange('email')}
                    type="email"
                    value={doctorForm.email}
                  />
                ) : (
                  <p className="mt-2 text-sm font-medium text-[#173229] break-all">{selectedDoctor.email}</p>
                )}
              </div>
              <div className="rounded-2xl bg-[#f8fbf9] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#89a097]">Mobile</p>
                {isEditingDoctor ? (
                  <input
                    className="mt-2 w-full rounded-xl border border-[#d7e2dc] bg-white px-3 py-2 text-sm text-[#173229] outline-none"
                    onChange={handleDoctorFormChange('mobile')}
                    type="text"
                    value={doctorForm.mobile}
                  />
                ) : (
                  <p className="mt-2 text-sm font-medium text-[#173229]">{selectedDoctor.mobile}</p>
                )}
              </div>
              <div className="rounded-2xl bg-[#f8fbf9] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#89a097]">Qualification</p>
                {isEditingDoctor ? (
                  <input
                    className="mt-2 w-full rounded-xl border border-[#d7e2dc] bg-white px-3 py-2 text-sm text-[#173229] outline-none"
                    onChange={handleDoctorFormChange('qualification')}
                    type="text"
                    value={doctorForm.qualification}
                  />
                ) : (
                  <p className="mt-2 text-sm font-medium text-[#173229]">{selectedDoctor.qualification || 'N/A'}</p>
                )}
              </div>
              <div className="rounded-2xl bg-[#f8fbf9] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#89a097]">Experience</p>
                {isEditingDoctor ? (
                  <input
                    className="mt-2 w-full rounded-xl border border-[#d7e2dc] bg-white px-3 py-2 text-sm text-[#173229] outline-none"
                    onChange={handleDoctorFormChange('experience')}
                    type="text"
                    value={doctorForm.experience}
                  />
                ) : (
                  <p className="mt-2 text-sm font-medium text-[#173229]">
                    {selectedDoctor.experience !== null ? `${selectedDoctor.experience} years` : 'N/A'}
                  </p>
                )}
              </div>
              <div className="rounded-2xl bg-[#f8fbf9] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#89a097]">Clinic Name</p>
                {isEditingDoctor ? (
                  <input
                    className="mt-2 w-full rounded-xl border border-[#d7e2dc] bg-white px-3 py-2 text-sm text-[#173229] outline-none"
                    onChange={handleDoctorFormChange('clinicName')}
                    type="text"
                    value={doctorForm.clinicName}
                  />
                ) : (
                  <p className="mt-2 text-sm font-medium text-[#173229]">{selectedDoctor.clinicName || 'N/A'}</p>
                )}
              </div>
              <div className="rounded-2xl bg-[#f8fbf9] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#89a097]">Clinic Number</p>
                {isEditingDoctor ? (
                  <input
                    className="mt-2 w-full rounded-xl border border-[#d7e2dc] bg-white px-3 py-2 text-sm text-[#173229] outline-none"
                    onChange={handleDoctorFormChange('clinicPhone')}
                    type="text"
                    value={doctorForm.clinicPhone}
                  />
                ) : (
                  <p className="mt-2 text-sm font-medium text-[#173229]">{selectedDoctor.clinicPhone || 'N/A'}</p>
                )}
              </div>
              <div className="rounded-2xl bg-[#f8fbf9] p-4 md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#89a097]">Clinic Address</p>
                {isEditingDoctor ? (
                  <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <input
                      className="w-full rounded-xl border border-[#d7e2dc] bg-white px-3 py-2 text-sm text-[#173229] outline-none"
                      onChange={handleDoctorFormChange('clinicAddress')}
                      type="text"
                      value={doctorForm.clinicAddress}
                    />
                    <input
                      className="w-full rounded-xl border border-[#d7e2dc] bg-white px-3 py-2 text-sm text-[#173229] outline-none"
                      onChange={handleDoctorFormChange('city')}
                      type="text"
                      value={doctorForm.city}
                    />
                  </div>
                ) : (
                  <p className="mt-2 text-sm font-medium text-[#173229]">
                    {selectedDoctor.clinicAddress || 'N/A'}
                    {selectedDoctor.city ? `, ${selectedDoctor.city}` : ''}
                  </p>
                )}
              </div>
              <div className="rounded-2xl bg-[#f8fbf9] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#89a097]">Patient Count</p>
                <p className="mt-2 text-sm font-medium text-[#173229]">{selectedDoctor.patientCount}</p>
              </div>
              <div className="rounded-2xl bg-[#f8fbf9] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#89a097]">Status</p>
                <div className="mt-2">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusClassName(selectedDoctor.status)}`}>
                    {selectedDoctor.status}
                  </span>
                </div>
              </div>
              <div className="rounded-2xl bg-[#f8fbf9] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#89a097]">Created On</p>
                <p className="mt-2 text-sm font-medium text-[#173229]">
                  {new Date(selectedDoctor.createdAt).toLocaleDateString('en-IN')}
                </p>
              </div>
              <div className="rounded-2xl bg-[#f8fbf9] p-4 md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#89a097]">About Doctor</p>
                {isEditingDoctor ? (
                  <textarea
                    className="mt-2 min-h-24 w-full rounded-xl border border-[#d7e2dc] bg-white px-3 py-2 text-sm text-[#173229] outline-none"
                    onChange={handleDoctorFormChange('aboutDoctor')}
                    value={doctorForm.aboutDoctor}
                  />
                ) : (
                  <p className="mt-2 text-sm font-medium leading-6 text-[#173229]">{selectedDoctor.aboutDoctor || 'N/A'}</p>
                )}
              </div>
            </div>

            {successMessage ? (
              <p className="mt-5 rounded-xl bg-[#dcfce7] px-4 py-3 text-sm font-semibold text-[#15803d]">
                {successMessage}
              </p>
            ) : null}

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#e6efeb] pt-5">
              <button
                type="button"
                className="cursor-pointer rounded-xl bg-[#1faa62] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#199453]"
                onClick={() => {
                  if (isEditingDoctor) {
                    void handleSaveDoctor();
                    return;
                  }
                  setIsEditingDoctor(true);
                  setSuccessMessage('');
                }}
              >
                {isSavingDoctor ? 'Saving...' : isEditingDoctor ? 'Save' : 'Edit'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isDetailsLoading ? (
        <div className="fixed bottom-6 right-6 rounded-full bg-[#173229] px-4 py-2 text-sm font-medium text-white shadow-lg">
          Loading details...
        </div>
      ) : null}
    </div>
  );
};

export default Clinic;
