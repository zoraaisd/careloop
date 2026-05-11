import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Clock3,
  MapPin,
  Pencil,
  Phone,
  Search,
  Stethoscope,
  Trash2,
  Video,
} from 'lucide-react';
import {
  deleteClinicAsset,
  deleteClinicDoctor,
  getClinicOverview,
  getClinicDoctorDetails,
  getClinicDoctors,
  type ClinicOverview,
  type ClinicDoctorDetails,
  type ClinicDoctorListItem,
  uploadClinicAsset,
  updateClinicOverview,
  updateClinicDoctor,
} from '@/services/doctor-management';
import { getDoctorAccessState } from '@/services/doctor-access';

const resolveAssetUrl = (value: string) => {
  if (!value) {
    return '';
  }

  if (/^(https?:\/\/|data:)/i.test(value)) {
    return value;
  }

  const apiBaseUrl =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    'http://localhost:4001/api';

  const apiOrigin = new URL(apiBaseUrl).origin;
  return value.startsWith('/') ? `${apiOrigin}${value}` : `${apiOrigin}/${value}`;
};

const Clinic: React.FC = () => {
  const navigate = useNavigate();
  const [doctors, setDoctors] = React.useState<ClinicDoctorListItem[]>([]);
  const [clinicOverview, setClinicOverview] = React.useState<ClinicOverview | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [selectedDoctor, setSelectedDoctor] = React.useState<ClinicDoctorDetails | null>(null);
  const [isDetailsLoading, setIsDetailsLoading] = React.useState(false);
  const [isEditingDoctor, setIsEditingDoctor] = React.useState(false);
  const [isSavingDoctor, setIsSavingDoctor] = React.useState(false);
  const [isEditingClinic, setIsEditingClinic] = React.useState(false);
  const [isSavingClinic, setIsSavingClinic] = React.useState(false);
  const [isSavingAsset, setIsSavingAsset] = React.useState<'logo' | 'image' | 'video' | null>(null);
  const [clinicAssetMessage, setClinicAssetMessage] = React.useState('');
  const [clinicAssetError, setClinicAssetError] = React.useState('');
  const [savedAssetPreview, setSavedAssetPreview] = React.useState<{
    logo: string | null;
    image: string | null;
    video: string | null;
  }>({
    logo: null,
    image: null,
    video: null,
  });
  const [pendingAsset, setPendingAsset] = React.useState<{
    logo: { dataUrl: string; fileName: string } | null;
    image: { dataUrl: string; fileName: string } | null;
    video: { dataUrl: string; fileName: string } | null;
  }>({
    logo: null,
    image: null,
    video: null,
  });
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
    availableDays: [] as string[],
    availableTimeSlots: [] as string[],
  });
  const [timeRangeDraft, setTimeRangeDraft] = React.useState({
    startHour: '09',
    startMinute: '00',
    startPeriod: 'AM',
    endHour: '10',
    endMinute: '00',
    endPeriod: 'AM',
  });
  const [clinicForm, setClinicForm] = React.useState({
    clinicName: '',
    clinicPhone: '',
    clinicAddress: '',
    city: '',
  });
  const [successMessage, setSuccessMessage] = React.useState('');
  const logoInputRef = React.useRef<HTMLInputElement | null>(null);
  const imageInputRef = React.useRef<HTMLInputElement | null>(null);
  const videoInputRef = React.useRef<HTMLInputElement | null>(null);

  const refreshClinicData = React.useCallback(async () => {
    const [response, accessState] = await Promise.all([
      getClinicDoctors(),
      getDoctorAccessState().catch(() => null),
    ]);
    setDoctors(response);

    const overview = await getClinicOverview(
      response,
      accessState?.clinicName || response[0]?.clinicName,
      accessState?.clinicPhone || response[0]?.clinicPhone,
    ).catch(() => ({
      clinicName: accessState?.clinicName || response[0]?.clinicName || 'Clinic not available',
      clinicPhone: accessState?.clinicPhone || response[0]?.clinicPhone || 'Not available',
      clinicAddress: response[0]?.clinicAddress || 'Address not available',
      city: response[0]?.city || '',
      clinicLogoUrl: response[0]?.clinicLogoUrl || accessState?.clinicLogoUrl || null,
      clinicImageUrls: response[0]?.clinicImageUrls || [],
      clinicVideoUrls: response[0]?.clinicVideoUrls || [],
    }));

    setClinicOverview(overview);
    setClinicForm({
      clinicName: overview.clinicName || '',
      clinicPhone: overview.clinicPhone || '',
      clinicAddress: overview.clinicAddress || '',
      city: overview.city || '',
    });
    return { doctors: response, overview };
  }, []);

  React.useEffect(() => {
    const loadDoctors = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        await refreshClinicData();
      } catch (error: any) {
        setErrorMessage(error?.response?.data?.message ?? 'Unable to load doctors right now.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadDoctors();
  }, [refreshClinicData]);

  React.useEffect(() => {
    if (!clinicOverview) {
      return;
    }

    const payload = {
      clinicName: clinicOverview.clinicName,
      clinicPhone: clinicOverview.clinicPhone,
      clinicLogoUrl: clinicOverview.clinicLogoUrl ?? null,
      clinicImageUrl: clinicOverview.clinicImageUrls[0] ?? null,
    };

    window.localStorage.setItem('careloop.clinic.profile', JSON.stringify(payload));
    window.dispatchEvent(
      new CustomEvent('clinic-media-updated', {
        detail: payload,
      }),
    );
  }, [clinicOverview]);

  React.useEffect(() => {
    if (!clinicAssetMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setClinicAssetMessage('');
    }, 3000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [clinicAssetMessage]);

  const filteredDoctors = doctors.filter((doctor) =>
    [doctor.name, doctor.mobile, doctor.email, doctor.status]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(searchQuery.trim().toLowerCase())),
  );
  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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
        availableDays: normalizedDoctor.availableDays || [],
        availableTimeSlots: normalizedDoctor.availableTimeSlots || [],
      });
      setTimeRangeDraft({
        startHour: '09',
        startMinute: '00',
        startPeriod: 'AM',
        endHour: '10',
        endMinute: '00',
        endPeriod: 'AM',
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

  const handleToggleDay = (day: string) => {
    setDoctorForm((current) => ({
      ...current,
      availableDays: current.availableDays.includes(day)
        ? current.availableDays.filter((value) => value !== day)
        : [...current.availableDays, day],
    }));
  };

  const handleAddTimeSlot = () => {
    const slot = `${timeRangeDraft.startHour}:${timeRangeDraft.startMinute} ${timeRangeDraft.startPeriod} - ${timeRangeDraft.endHour}:${timeRangeDraft.endMinute} ${timeRangeDraft.endPeriod}`;
    if (
      timeRangeDraft.startHour === timeRangeDraft.endHour &&
      timeRangeDraft.startMinute === timeRangeDraft.endMinute &&
      timeRangeDraft.startPeriod === timeRangeDraft.endPeriod
    ) {
      return;
    }

    setDoctorForm((current) => {
      if (current.availableTimeSlots.includes(slot)) {
        return current;
      }
      return {
        ...current,
        availableTimeSlots: [...current.availableTimeSlots, slot],
      };
    });
  };

  const handleRemoveTimeSlot = (slotToRemove: string) => {
    setDoctorForm((current) => ({
      ...current,
      availableTimeSlots: current.availableTimeSlots.filter((slot) => slot !== slotToRemove),
    }));
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
        experience: Number(doctorForm.experience || 0),
        aboutDoctor: doctorForm.aboutDoctor.trim(),
        availableDays: doctorForm.availableDays,
        availableTimeSlots: doctorForm.availableTimeSlots,
      });

      const updatedDoctor: ClinicDoctorDetails = {
        ...selectedDoctor,
        experience: Number(doctorForm.experience || 0),
        availableDays: doctorForm.availableDays,
        availableTimeSlots: doctorForm.availableTimeSlots,
        aboutDoctor: doctorForm.aboutDoctor.trim() || null,
      };

      setSelectedDoctor(updatedDoctor);
      setIsEditingDoctor(false);
      setSuccessMessage(response.message || 'Updated successfully');
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message ?? 'Unable to update doctor right now.');
    } finally {
      setIsSavingDoctor(false);
    }
  };

  const handleDeleteDoctor = async (doctor: ClinicDoctorListItem) => {
    const confirmed = window.confirm(`Are you sure you want to delete doctor ${doctor.name}?`);
    if (!confirmed) {
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await deleteClinicDoctor(doctor.userId);
      setDoctors((current) => current.filter((item) => item.userId !== doctor.userId));
      if (selectedDoctor?.userId === doctor.userId) {
        setSelectedDoctor(null);
      }
      setSuccessMessage(response.message || 'Doctor deleted successfully');
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message ?? 'Unable to delete doctor right now.');
    }
  };

  const handleAssetSelection =
    (assetType: 'logo' | 'image' | 'video') => (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        if (!result) {
          return;
        }

        setPendingAsset((current) => ({
          ...current,
          [assetType]: {
            dataUrl: result,
            fileName: file.name,
          },
        }));
        setClinicAssetMessage('');
        setClinicAssetError('');
        setSuccessMessage('');
        setErrorMessage('');
      };
      reader.readAsDataURL(file);
      event.target.value = '';
    };

  const handleSaveAsset = async (assetType: 'logo' | 'image' | 'video') => {
    const asset = pendingAsset[assetType];

    if (!asset || !clinicOverview) {
      return;
    }

    setIsSavingAsset(assetType);
    setErrorMessage('');
    setSuccessMessage('');
    setClinicAssetMessage('');
    setClinicAssetError('');

    try {
      const response = await uploadClinicAsset({
        assetType,
        dataUrl: asset.dataUrl,
        fileName: asset.fileName,
      });

      setClinicOverview({
        ...clinicOverview,
        clinicLogoUrl: response.clinicLogoUrl,
        clinicImageUrls: response.clinicImageUrls,
        clinicVideoUrls: response.clinicVideoUrls,
      });
      setSavedAssetPreview((current) => ({
        ...current,
        [assetType]: asset.dataUrl,
      }));
      setPendingAsset((current) => ({ ...current, [assetType]: null }));
      setClinicAssetMessage(
        response.message ||
          `${assetType === 'logo' ? 'Logo' : assetType === 'image' ? 'Image' : 'Video'} saved successfully`,
      );
      window.dispatchEvent(
        new CustomEvent('clinic-media-updated', {
          detail: {
            clinicLogoUrl:
              assetType === 'logo'
                ? response.clinicLogoUrl
                : clinicOverview.clinicLogoUrl ?? null,
            clinicImageUrl:
              assetType === 'image'
                ? response.clinicImageUrls[0] ?? null
                : clinicOverview.clinicImageUrls[0] ?? null,
          },
        }),
      );
      await refreshClinicData();
    } catch (error: any) {
      const message = error?.response?.data?.message ?? `Unable to save clinic ${assetType} right now.`;
      setErrorMessage(message);
      setClinicAssetError(message);
    } finally {
      setIsSavingAsset(null);
    }
  };

  const handleClinicFormChange =
    (field: keyof typeof clinicForm) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setClinicForm((current) => ({
        ...current,
        [field]: event.target.value,
      }));
    };

  const handleSaveClinicOverview = async () => {
    if (!clinicOverview) {
      return;
    }

    setIsSavingClinic(true);
    setErrorMessage('');
    setSuccessMessage('');
    setClinicAssetMessage('');
    setClinicAssetError('');

    try {
      const response = await updateClinicOverview({
        clinicName: clinicForm.clinicName.trim(),
        clinicPhone: clinicForm.clinicPhone.trim(),
        clinicAddress: clinicForm.clinicAddress.trim(),
        city: clinicForm.city.trim(),
      });

      setClinicOverview({
        clinicName: response.clinicName,
        clinicPhone: response.clinicPhone,
        clinicAddress: response.clinicAddress,
        city: response.city,
        clinicLogoUrl: response.clinicLogoUrl,
        clinicImageUrls: response.clinicImageUrls,
        clinicVideoUrls: response.clinicVideoUrls,
      });
      setClinicForm({
        clinicName: response.clinicName,
        clinicPhone: response.clinicPhone,
        clinicAddress: response.clinicAddress,
        city: response.city,
      });
      setDoctors((current) =>
        current.map((doctor) => ({
          ...doctor,
          clinicName: response.clinicName,
          clinicPhone: response.clinicPhone,
          clinicAddress: response.clinicAddress,
          city: response.city,
        })),
      );
      window.dispatchEvent(
        new CustomEvent('clinic-media-updated', {
          detail: {
            clinicName: response.clinicName,
            clinicPhone: response.clinicPhone,
            clinicLogoUrl: response.clinicLogoUrl,
            clinicImageUrl: clinicOverview.clinicImageUrls[0] ?? null,
          },
        }),
      );
      setIsEditingClinic(false);
      setClinicAssetMessage(response.message || 'Clinic details updated successfully');
      await refreshClinicData();
    } catch (error: any) {
      const message = error?.response?.data?.message ?? 'Unable to update clinic details right now.';
      setErrorMessage(message);
      setClinicAssetError(message);
    } finally {
      setIsSavingClinic(false);
    }
  };

  const handleDeleteAsset = async (assetType: 'logo' | 'image' | 'video') => {
    const hasSavedAsset = Boolean(
      assetType === 'logo'
        ? clinicOverview?.clinicLogoUrl || savedAssetPreview.logo
        : assetType === 'image'
          ? clinicOverview?.clinicImageUrls[0] || savedAssetPreview.image
          : clinicOverview?.clinicVideoUrls[0] || savedAssetPreview.video,
    );
    const hasPendingAsset = Boolean(pendingAsset[assetType]);

    if (!hasSavedAsset && !hasPendingAsset) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete this clinic ${assetType}?`,
    );

    if (!confirmed) {
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');
    setClinicAssetMessage('');
    setClinicAssetError('');

    if (hasPendingAsset && !hasSavedAsset) {
      setPendingAsset((current) => ({ ...current, [assetType]: null }));
      setClinicAssetMessage(
        `${assetType === 'logo' ? 'Logo' : assetType === 'image' ? 'Image' : 'Video'} removed`,
      );
      return;
    }

    setIsSavingAsset(assetType);

    try {
      const response = await deleteClinicAsset(assetType);

      setClinicOverview((current) =>
        current
          ? {
              ...current,
              clinicLogoUrl: response.clinicLogoUrl,
              clinicImageUrls: response.clinicImageUrls,
              clinicVideoUrls: response.clinicVideoUrls,
            }
          : current,
      );
      setSavedAssetPreview((current) => ({
        ...current,
        [assetType]: null,
      }));
      setPendingAsset((current) => ({
        ...current,
        [assetType]: null,
      }));
      setClinicAssetMessage(
        response.message ||
          `${assetType === 'logo' ? 'Logo' : assetType === 'image' ? 'Image' : 'Video'} deleted successfully`,
      );
      window.dispatchEvent(
        new CustomEvent('clinic-media-updated', {
          detail: {
            clinicLogoUrl:
              assetType === 'logo'
                ? null
                : response.clinicLogoUrl ?? clinicOverview?.clinicLogoUrl ?? null,
            clinicImageUrl:
              assetType === 'image'
                ? null
                : response.clinicImageUrls[0] ?? null,
          },
        }),
      );
      await refreshClinicData();
    } catch (error: any) {
      const message = error?.response?.data?.message ?? `Unable to delete clinic ${assetType} right now.`;
      setErrorMessage(message);
      setClinicAssetError(message);
    } finally {
      setIsSavingAsset(null);
    }
  };

  const clinicLogoPreview =
    pendingAsset.logo?.dataUrl ||
    savedAssetPreview.logo ||
    (clinicOverview?.clinicLogoUrl ? resolveAssetUrl(clinicOverview.clinicLogoUrl) : '');
  const clinicImagePreview =
    pendingAsset.image?.dataUrl ||
    savedAssetPreview.image ||
    (clinicOverview?.clinicImageUrls[0] ? resolveAssetUrl(clinicOverview.clinicImageUrls[0]) : '');
  const clinicVideoPreview =
    pendingAsset.video?.dataUrl ||
    savedAssetPreview.video ||
    (clinicOverview?.clinicVideoUrls[0] ? resolveAssetUrl(clinicOverview.clinicVideoUrls[0]) : '');
  const clinicInitial = (clinicOverview?.clinicName || 'C').trim().charAt(0).toUpperCase();

  return (
    <div className="space-y-6">
      <input
        ref={logoInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleAssetSelection('logo')}
        type="file"
      />
      <input
        ref={imageInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleAssetSelection('image')}
        type="file"
      />
      <input
        ref={videoInputRef}
        accept="video/*"
        className="hidden"
        onChange={handleAssetSelection('video')}
        type="file"
      />
      {clinicOverview ? (
        <section className="grid gap-5 xl:grid-cols-[1.2fr_0.9fr]">
          <div className="rounded-[28px] border border-[#dbe8e2] bg-white px-6 py-5 shadow-[0_18px_55px_rgba(20,56,46,0.08)]">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-[15px] font-semibold text-[#173229]">Clinic Details</p>
              </div>
              <button
                type="button"
                className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-[#d4e6dc] bg-white px-4 py-2 text-sm font-semibold text-[#1aa65f] transition hover:bg-[#f2fff7]"
                onClick={() => {
                  if (isEditingClinic) {
                    void handleSaveClinicOverview();
                    return;
                  }
                  setClinicForm({
                    clinicName: clinicOverview.clinicName || '',
                    clinicPhone: clinicOverview.clinicPhone || '',
                    clinicAddress: clinicOverview.clinicAddress || '',
                    city: clinicOverview.city || '',
                  });
                  setIsEditingClinic(true);
                  setClinicAssetMessage('');
                  setClinicAssetError('');
                }}
              >
                <Pencil className="h-4 w-4" />
                {isSavingClinic ? 'Saving...' : isEditingClinic ? 'Save Clinic' : 'Edit Clinic'}
              </button>
            </div>

            <div className="mb-5 flex items-center gap-4">
              {clinicLogoPreview ? (
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[20px] bg-white shadow-[0_10px_30px_rgba(24,147,86,0.10)]">
                  <img
                    alt={`${clinicOverview.clinicName} logo`}
                    className="h-full w-full object-contain"
                    src={clinicLogoPreview}
                  />
                </div>
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#ecfff2] text-[20px] font-semibold text-[#189356] shadow-[0_10px_30px_rgba(24,147,86,0.10)]">
                  {clinicInitial}
                </div>
              )}
              <div>
                {isEditingClinic ? (
                  <input
                    className="w-full rounded-2xl border border-[#d7e2dc] bg-white px-4 py-2.5 text-[18px] font-bold text-[#173229] outline-none"
                    onChange={handleClinicFormChange('clinicName')}
                    type="text"
                    value={clinicForm.clinicName}
                  />
                ) : (
                  <h2 className="text-[20px] font-bold text-[#173229]">{clinicOverview.clinicName}</h2>
                )}
                <div className="mt-1.5 inline-flex items-center gap-2 text-sm font-medium text-[#56766c]">
                  <CheckCircle2 className="h-4 w-4 text-[#1aa65f]" />
                  Verified Clinic
                </div>
              </div>
            </div>

            <div className="mb-5 border-t border-[#edf3f0]" />

            <div className="space-y-3">
              <div className="flex gap-3 rounded-[22px] bg-[#fbfdfc] px-4 py-3 shadow-[inset_0_0_0_1px_#edf4f0]">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#e2ece7] bg-white text-[#1aa65f]">
                  <Phone className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#617f76]">Mobile Number</p>
                  {isEditingClinic ? (
                    <input
                      className="mt-1.5 w-full rounded-xl border border-[#d7e2dc] bg-white px-3 py-2 text-[15px] font-semibold text-[#173229] outline-none"
                      onChange={handleClinicFormChange('clinicPhone')}
                      type="text"
                      value={clinicForm.clinicPhone}
                    />
                  ) : (
                    <p className="mt-1.5 text-[15px] font-semibold text-[#173229]">{clinicOverview.clinicPhone}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 rounded-[22px] bg-[#fbfdfc] px-4 py-3 shadow-[inset_0_0_0_1px_#edf4f0]">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#e2ece7] bg-white text-[#1aa65f]">
                  <MapPin className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#617f76]">Address</p>
                  {isEditingClinic ? (
                    <div className="mt-1.5 grid gap-2.5">
                      <textarea
                        className="min-h-20 w-full rounded-xl border border-[#d7e2dc] bg-white px-3 py-2 text-[15px] font-semibold text-[#173229] outline-none"
                        onChange={handleClinicFormChange('clinicAddress')}
                        value={clinicForm.clinicAddress}
                      />
                      <input
                        className="w-full rounded-xl border border-[#d7e2dc] bg-white px-3 py-2 text-[15px] font-semibold text-[#173229] outline-none"
                        onChange={handleClinicFormChange('city')}
                        placeholder="City"
                        type="text"
                        value={clinicForm.city}
                      />
                    </div>
                  ) : (
                    <p className="mt-1.5 text-[15px] font-semibold text-[#173229]">
                      {clinicOverview.clinicAddress}
                      {clinicOverview.city ? `, ${clinicOverview.city}` : ''}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-[28px] border border-[#dbe8e2] bg-white px-5 py-4 shadow-[0_18px_55px_rgba(20,56,46,0.08)]">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[15px] font-semibold text-[#173229]">Clinic Logo</p>
                {(() => {
                  const hasSavedLogo = Boolean(savedAssetPreview.logo || clinicOverview.clinicLogoUrl);
                  const hasPendingLogo = Boolean(pendingAsset.logo);

                  return (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="cursor-pointer rounded-2xl border border-[#d4e6dc] bg-white px-4 py-2 text-sm font-semibold text-[#1aa65f] transition hover:bg-[#f2fff7]"
                        onClick={() => {
                          if (pendingAsset.logo) {
                            void handleSaveAsset('logo');
                            return;
                          }
                          logoInputRef.current?.click();
                        }}
                      >
                        {isSavingAsset === 'logo' ? 'Saving...' : hasPendingLogo ? 'Save Logo' : hasSavedLogo ? 'Edit Logo' : 'Add Logo'}
                      </button>
                      {(hasSavedLogo || hasPendingLogo) ? (
                        <button
                          type="button"
                          className="cursor-pointer rounded-2xl border border-[#f3d3d3] bg-white px-4 py-2 text-sm font-semibold text-[#dd4c4c] transition hover:bg-[#fff5f5]"
                          onClick={() => {
                            void handleDeleteAsset('logo');
                          }}
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  );
                })()}
              </div>

              {clinicLogoPreview ? (
                <div className="overflow-hidden rounded-[24px] border border-[#e0ebe6] bg-white shadow-[0_10px_26px_rgba(20,56,46,0.06)]">
                  <img
                    alt={`${clinicOverview.clinicName} logo`}
                    className="h-[170px] w-full object-contain bg-white"
                    src={clinicLogoPreview}
                  />
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-[#d7e2dc] bg-[#fbfdfc] px-5 py-8 text-center text-sm text-[#6c857d]">
                  No clinic logo available.
                </div>
              )}
            </div>

            <div className="rounded-[28px] border border-[#dbe8e2] bg-white px-5 py-4 shadow-[0_18px_55px_rgba(20,56,46,0.08)]">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[15px] font-semibold text-[#173229]">Clinic Image</p>
                {(() => {
                  const hasSavedImage = Boolean(savedAssetPreview.image || clinicOverview.clinicImageUrls[0]);
                  const hasPendingImage = Boolean(pendingAsset.image);

                  return (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="cursor-pointer rounded-2xl border border-[#d4e6dc] bg-white px-4 py-2 text-sm font-semibold text-[#1aa65f] transition hover:bg-[#f2fff7]"
                        onClick={() => {
                          if (pendingAsset.image) {
                            void handleSaveAsset('image');
                            return;
                          }
                          imageInputRef.current?.click();
                        }}
                      >
                        {isSavingAsset === 'image' ? 'Saving...' : hasPendingImage ? 'Save Image' : hasSavedImage ? 'Edit Image' : 'Add Image'}
                      </button>
                      {(hasSavedImage || hasPendingImage) ? (
                        <button
                          type="button"
                          className="cursor-pointer rounded-2xl border border-[#f3d3d3] bg-white px-4 py-2 text-sm font-semibold text-[#dd4c4c] transition hover:bg-[#fff5f5]"
                          onClick={() => {
                            void handleDeleteAsset('image');
                          }}
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  );
                })()}
              </div>

              {clinicImagePreview ? (
                <div className="overflow-hidden rounded-[24px] border border-[#e0ebe6] bg-white shadow-[0_10px_26px_rgba(20,56,46,0.06)]">
                  <img
                    alt={clinicOverview.clinicName}
                    className="h-[170px] w-full object-contain bg-white"
                    src={clinicImagePreview}
                  />
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-[#d7e2dc] bg-[#fbfdfc] px-5 py-8 text-center text-sm text-[#6c857d]">
                  No clinic image available.
                </div>
              )}
            </div>

            <div className="rounded-[28px] border border-[#dbe8e2] bg-white px-5 py-4 shadow-[0_18px_55px_rgba(20,56,46,0.08)]">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[15px] font-semibold text-[#173229]">Clinic Video</p>
                {(() => {
                  const hasSavedVideo = Boolean(savedAssetPreview.video || clinicOverview.clinicVideoUrls[0]);
                  const hasPendingVideo = Boolean(pendingAsset.video);

                  return (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="cursor-pointer rounded-2xl border border-[#d4e6dc] bg-white px-4 py-2 text-sm font-semibold text-[#1aa65f] transition hover:bg-[#f2fff7]"
                        onClick={() => {
                          if (pendingAsset.video) {
                            void handleSaveAsset('video');
                            return;
                          }
                          videoInputRef.current?.click();
                        }}
                      >
                        {isSavingAsset === 'video' ? 'Saving...' : hasPendingVideo ? 'Save Video' : hasSavedVideo ? 'Edit' : 'Add Video'}
                      </button>
                      {(hasSavedVideo || hasPendingVideo) ? (
                        <button
                          type="button"
                          className="cursor-pointer rounded-2xl border border-[#f3d3d3] bg-white px-4 py-2 text-sm font-semibold text-[#dd4c4c] transition hover:bg-[#fff5f5]"
                          onClick={() => {
                            void handleDeleteAsset('video');
                          }}
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  );
                })()}
              </div>

              {clinicVideoPreview ? (
                <div className="overflow-hidden rounded-[24px] border border-[#e0ebe6] bg-white p-2.5 shadow-[0_10px_26px_rgba(20,56,46,0.06)]">
                  <video className="max-h-[170px] w-full rounded-[18px] bg-black" controls preload="metadata" src={clinicVideoPreview} />
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-[#d7e2dc] bg-[#fbfdfc] px-5 py-7 text-center text-[#6c857d]">
                  <Video className="mx-auto h-5 w-5 text-[#728e84]" />
                  <p className="mt-2.5 text-sm font-semibold text-[#173229]">No clinic video available.</p>
                  <p className="mt-1.5 text-sm">Add a video to introduce your clinic.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {clinicAssetMessage ? (
        <div className="rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm font-semibold text-[#15803d]">
          {clinicAssetMessage}
        </div>
      ) : null}

      {clinicAssetError ? (
        <div className="rounded-2xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm font-semibold text-[#dc2626]">
          {clinicAssetError}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[28px] border border-[#dbe8e2] bg-white shadow-[0_18px_55px_rgba(20,56,46,0.08)]">
        <div className="border-b border-[#edf3f0] px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#effcf4] text-[#1aa65f]">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-[#173229]">Doctors</h3>
                <p className="mt-1 text-sm text-[#6f8980]">Manage doctors associated with this clinic.</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <button
                type="button"
                className="cursor-pointer rounded-2xl bg-[#1faa62] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_24px_rgba(31,170,98,0.22)] transition hover:bg-[#199453]"
                onClick={() => navigate('/clinic/add-doctor')}
              >
                + Add Doctor
              </button>

              <div className="relative w-full min-w-[280px] lg:w-[300px]">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7fa194]" />
                <input
                  className="w-full rounded-2xl border border-[#d7e2dc] bg-white px-11 py-3 text-sm text-[#28453b] outline-none transition focus:border-[#1faa62]"
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search doctors..."
                  type="text"
                  value={searchQuery}
                />
              </div>

            </div>
          </div>
        </div>

        <div className="grid grid-cols-[1.7fr_1.2fr_1fr_1.6fr_1fr_1fr_1fr] gap-4 border-b border-[#edf3f0] bg-[#fbfdfc] px-5 py-4 text-xs font-bold text-[#3f5a52]">
          <span>Doctor Name</span>
          <span>Specialization</span>
          <span>Mobile</span>
          <span>Email</span>
          <span>Patient Count</span>
          <span>Status</span>
          <span>Actions</span>
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
                className="grid cursor-pointer grid-cols-[1.7fr_1.2fr_1fr_1.6fr_1fr_1fr_1fr] gap-4 px-5 py-5 text-sm text-[#28453b] transition hover:bg-[#f8fbf9]"
                onClick={() => void handleOpenDoctorDetails(doctor)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ecfff2] text-sm font-semibold text-[#189356]">
                    {doctor.name
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part[0]?.toUpperCase() || '')
                      .join('') || 'DR'}
                  </div>
                  <div>
                    <p className="font-semibold text-[#173229]">{doctor.name}</p>
                    <p className="mt-1 text-xs text-[#7a8f87]">{doctor.specialty || doctor.clinicName || 'Doctor'}</p>
                  </div>
                </div>
                <span>{doctor.specialty || 'N/A'}</span>
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
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#d4e6dc] bg-white text-[#1aa65f] transition hover:bg-[#f2fff7]"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleOpenDoctorDetails(doctor);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#f3d3d3] bg-white text-[#dd4c4c] transition hover:bg-[#fff5f5]"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleDeleteDoctor(doctor);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-[#edf3f0] px-5 py-5 text-sm text-[#6f8980]">
          <p>{`Showing ${filteredDoctors.length} of ${doctors.length} doctor${doctors.length === 1 ? '' : 's'}`}</p>
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
                <p className="mt-2 text-sm font-medium text-[#173229] break-all">{selectedDoctor.email}</p>
              </div>
              <div className="rounded-2xl bg-[#f8fbf9] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#89a097]">Mobile</p>
                <p className="mt-2 text-sm font-medium text-[#173229]">{selectedDoctor.mobile}</p>
              </div>
              <div className="rounded-2xl bg-[#f8fbf9] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#89a097]">Qualification</p>
                <p className="mt-2 text-sm font-medium text-[#173229]">{selectedDoctor.qualification || 'N/A'}</p>
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
                <p className="mt-2 text-sm font-medium text-[#173229]">{selectedDoctor.clinicName || 'N/A'}</p>
              </div>
              <div className="rounded-2xl bg-[#f8fbf9] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#89a097]">Clinic Number</p>
                <p className="mt-2 text-sm font-medium text-[#173229]">{selectedDoctor.clinicPhone || 'N/A'}</p>
              </div>
              <div className="rounded-2xl bg-[#f8fbf9] p-4 md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#89a097]">Clinic Address</p>
                <p className="mt-2 text-sm font-medium text-[#173229]">
                  {selectedDoctor.clinicAddress || 'N/A'}
                  {selectedDoctor.city ? `, ${selectedDoctor.city}` : ''}
                </p>
              </div>
              <div className="rounded-2xl bg-[#f8fbf9] p-4 md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#89a097]">Select Days</p>
                {isEditingDoctor ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {weekDays.map((day) => (
                      <button
                        key={day}
                        type="button"
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                          doctorForm.availableDays.includes(day)
                            ? 'border-[#1faa62] bg-[#e9f9f0] text-[#15803d]'
                            : 'border-[#d7e2dc] bg-white text-[#4b635b]'
                        }`}
                        onClick={() => handleToggleDay(day)}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm font-medium text-[#173229]">
                    {selectedDoctor.availableDays.length > 0 ? selectedDoctor.availableDays.join(', ') : 'N/A'}
                  </p>
                )}
              </div>
              <div className="rounded-2xl bg-[#f8fbf9] p-4 md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#89a097]">Time Slots</p>
                {isEditingDoctor ? (
                  <>
                    <div className="mt-2 rounded-2xl bg-[#f1f5f3] p-3">
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_1fr_auto] md:items-center">
                        <div className="rounded-xl border border-[#d7e2dc] bg-white px-3 py-2">
                          <div className="flex items-center gap-2 text-[#6f8980]">
                            <Clock3 className="h-4 w-4" />
                            <span className="text-xs font-semibold">Start</span>
                          </div>
                          <div className="mt-2 grid grid-cols-3 gap-2">
                            <select
                              className="rounded-lg border border-[#d7e2dc] bg-white px-2 py-1.5 text-sm"
                              value={timeRangeDraft.startHour}
                              onChange={(event) =>
                                setTimeRangeDraft((current) => ({ ...current, startHour: event.target.value }))
                              }
                            >
                              {Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0')).map((hour) => (
                                <option key={hour} value={hour}>{hour}</option>
                              ))}
                            </select>
                            <select
                              className="rounded-lg border border-[#d7e2dc] bg-white px-2 py-1.5 text-sm"
                              value={timeRangeDraft.startMinute}
                              onChange={(event) =>
                                setTimeRangeDraft((current) => ({ ...current, startMinute: event.target.value }))
                              }
                            >
                              {Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0')).map((minute) => (
                                <option key={minute} value={minute}>{minute}</option>
                              ))}
                            </select>
                            <select
                              className="rounded-lg border border-[#d7e2dc] bg-white px-2 py-1.5 text-sm"
                              value={timeRangeDraft.startPeriod}
                              onChange={(event) =>
                                setTimeRangeDraft((current) => ({ ...current, startPeriod: event.target.value }))
                              }
                            >
                              <option value="AM">AM</option>
                              <option value="PM">PM</option>
                            </select>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-[#6f8980]">to</span>
                        <div className="rounded-xl border border-[#d7e2dc] bg-white px-3 py-2">
                          <div className="flex items-center gap-2 text-[#6f8980]">
                            <Clock3 className="h-4 w-4" />
                            <span className="text-xs font-semibold">End</span>
                          </div>
                          <div className="mt-2 grid grid-cols-3 gap-2">
                            <select
                              className="rounded-lg border border-[#d7e2dc] bg-white px-2 py-1.5 text-sm"
                              value={timeRangeDraft.endHour}
                              onChange={(event) =>
                                setTimeRangeDraft((current) => ({ ...current, endHour: event.target.value }))
                              }
                            >
                              {Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0')).map((hour) => (
                                <option key={hour} value={hour}>{hour}</option>
                              ))}
                            </select>
                            <select
                              className="rounded-lg border border-[#d7e2dc] bg-white px-2 py-1.5 text-sm"
                              value={timeRangeDraft.endMinute}
                              onChange={(event) =>
                                setTimeRangeDraft((current) => ({ ...current, endMinute: event.target.value }))
                              }
                            >
                              {Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0')).map((minute) => (
                                <option key={minute} value={minute}>{minute}</option>
                              ))}
                            </select>
                            <select
                              className="rounded-lg border border-[#d7e2dc] bg-white px-2 py-1.5 text-sm"
                              value={timeRangeDraft.endPeriod}
                              onChange={(event) =>
                                setTimeRangeDraft((current) => ({ ...current, endPeriod: event.target.value }))
                              }
                            >
                              <option value="AM">AM</option>
                              <option value="PM">PM</option>
                            </select>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="rounded-xl bg-[#1faa62] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#199453]"
                          onClick={handleAddTimeSlot}
                        >
                          Add Slot
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {doctorForm.availableTimeSlots.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          className="rounded-full border border-[#d7e2dc] bg-white px-3 py-1.5 text-xs font-semibold text-[#28453b] transition hover:border-[#f3d3d3] hover:text-[#dd4c4c]"
                          onClick={() => handleRemoveTimeSlot(slot)}
                          title="Remove time slot"
                        >
                          {slot} x
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-sm font-medium text-[#173229]">
                    {selectedDoctor.availableTimeSlots.length > 0 ? selectedDoctor.availableTimeSlots.join(', ') : 'N/A'}
                  </p>
                )}
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
