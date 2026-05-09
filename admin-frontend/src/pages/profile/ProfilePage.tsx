import { useEffect, useState, type ChangeEvent } from 'react';
import { Building2, Calendar, Mail, MapPin, Phone, ShieldCheck, User, UserRound } from 'lucide-react';

import { getAdminProfile, updateAdminProfile } from '@/services/admin';

const formatPhoneDisplay = (value: string): string => {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, '');

  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }

  if (digits.length === 10) {
    return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
 
  return trimmed;
};

const formatProfileDateDisplay = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
};

const getInitials = (name: string): string => {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'AD';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
};

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [draftProfileImageUrl, setDraftProfileImageUrl] = useState<string | null>(null);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [adminName, setAdminName] = useState('');
  const [draftAdminName, setDraftAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [draftEmail, setDraftEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [draftPhoneNumber, setDraftPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [location, setLocation] = useState('');
  const [accountCreatedDate, setAccountCreatedDate] = useState('');

  useEffect(() => {
    void (async () => {
      const profile = await getAdminProfile();
      setAdminName(profile.adminName);
      setDraftAdminName(profile.adminName);
      setEmail(profile.email);
      setDraftEmail(profile.email);
      setPhoneNumber(profile.phoneNumber);
      setDraftPhoneNumber(profile.phoneNumber);
      setProfileImageUrl(profile.profileImageUrl);
      setDraftProfileImageUrl(profile.profileImageUrl);
      setOrganizationName(profile.organizationName);
      setLocation(profile.location);
      setAccountCreatedDate(profile.accountCreatedDate);
    })();
  }, []);

  const handleProfileImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setDraftProfileImageUrl(reader.result);
        setProfileImageFile(file);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleEditClick = () => {
    if (isEditing) {
      setIsEditing(false);
      setPassword('');
      return;
    }

    setDraftAdminName(adminName);
    setDraftEmail(email);
    setDraftPhoneNumber(phoneNumber);
    setDraftProfileImageUrl(profileImageUrl);
    setProfileImageFile(null);
    setPassword('');
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    try {
      const profile = await updateAdminProfile({
        adminName: draftAdminName,
        email: draftEmail,
        phoneNumber: draftPhoneNumber,
        profileImageUrl: profileImageFile ? undefined : draftProfileImageUrl,
        profileImageFile,
        newPassword: password || undefined,
      });

      setAdminName(profile.adminName);
      setEmail(profile.email);
      setPhoneNumber(profile.phoneNumber);
      setProfileImageUrl(profile.profileImageUrl);
      setDraftProfileImageUrl(profile.profileImageUrl);
      setProfileImageFile(null);
      window.dispatchEvent(
        new CustomEvent('admin-profile-updated', {
          detail: {
            adminName: profile.adminName,
            profileImageUrl: profile.profileImageUrl,
          },
        }),
      );
      setIsEditing(false);
      setPassword('');
    } catch {
      alert('Unable to save profile changes. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setDraftAdminName(adminName);
    setDraftEmail(email);
    setDraftPhoneNumber(phoneNumber);
    setDraftProfileImageUrl(profileImageUrl);
    setProfileImageFile(null);
    setIsEditing(false);
    setPassword('');
  };

  const currentProfileImage = isEditing ? draftProfileImageUrl : profileImageUrl;
  const cardClassName =
    'rounded-xl border border-slate-200 bg-white p-4 transition duration-150 hover:border-emerald-200';
  const labelClassName = 'text-[11px] uppercase tracking-[0.12em] text-slate-500';

  return (
    <section className="rounded-2xl border border-slate-200 bg-[#f8fafb] p-5 shadow-[0_8px_30px_-24px_rgba(15,23,42,0.38)] sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <UserRound className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-[28px] font-semibold leading-tight text-slate-900">Admin Profile</h3>
            <p className="text-sm text-slate-500">Manage your account information and preferences</p>
          </div>
        </div>
        <button
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          onClick={handleEditClick}
          type="button"
        >
          {isEditing ? 'Close Edit' : 'Edit Profile'}
        </button>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[250px_1fr]">
        <div className="relative flex min-h-[360px] flex-col items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-[#f5faf7] to-[#eef5f2] p-5 text-center">
          {currentProfileImage ? (
            <img
              alt="Admin profile"
              className="h-40 w-40 rounded-full border-4 border-white object-cover shadow-md"
              src={currentProfileImage}
            />
          ) : (
            <div className="flex h-40 w-40 items-center justify-center rounded-full bg-emerald-600 text-4xl font-bold text-white shadow-md">
              {getInitials(adminName)}
            </div>
          )}

          <div className="mt-4 text-center">
            <p className={labelClassName}>Profile Picture</p>
          </div>

          {isEditing ? (
            <>
              <label
                className="mt-4 inline-flex cursor-pointer items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                htmlFor="profile-image-upload"
              >
                Choose File
              </label>
              <input
                accept="image/*"
                className="hidden"
                id="profile-image-upload"
                onChange={handleProfileImageChange}
                type="file"
              />
            </>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className={cardClassName}>
            <p className={labelClassName}>Admin Name</p>
            {isEditing ? (
              <input
                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
                onChange={(event) => setDraftAdminName(event.target.value)}
                type="text"
                value={draftAdminName}
              />
            ) : (
              <div className="mt-2 flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                  <User className="h-4 w-4" />
                </span>
                <p className="font-semibold text-slate-900">{adminName}</p>
              </div>
            )}
          </div>
          <div className={cardClassName}>
            <p className={labelClassName}>Email</p>
            {isEditing ? (
              <input
                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
                onChange={(event) => setDraftEmail(event.target.value)}
                type="email"
                value={draftEmail}
              />
            ) : (
              <div className="mt-2 flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                  <Mail className="h-4 w-4" />
                </span>
                <p className="font-semibold text-slate-900">{email}</p>
              </div>
            )}
          </div>
          <div className={cardClassName}>
            <p className={labelClassName}>Phone Number</p>
            {isEditing ? (
              <input
                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
                onChange={(event) => setDraftPhoneNumber(event.target.value)}
                type="tel"
                value={draftPhoneNumber}
              />
            ) : (
              <div className="mt-2 flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                  <Phone className="h-4 w-4" />
                </span>
                <p className="numeric-display text-[1.05rem] font-semibold text-slate-900">{formatPhoneDisplay(phoneNumber)}</p>
              </div>
            )}
          </div>
          <div className={cardClassName}>
            <p className={labelClassName}>Role</p>
            <div className="mt-2 flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <p className="font-semibold text-slate-900">Super Admin</p>
            </div>
          </div>
          <div className={cardClassName}>
            <p className={labelClassName}>Organization Name</p>
            <div className="mt-2 flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <Building2 className="h-4 w-4" />
              </span>
              <p className="font-semibold text-slate-900">{organizationName}</p>
            </div>
          </div>
          <div className={cardClassName}>
            <p className={labelClassName}>Location / Address</p>
            <div className="mt-2 flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <MapPin className="h-4 w-4" />
              </span>
              <p className="font-semibold text-slate-900 [font-variant-numeric:tabular-nums_lining-nums]">{location}</p>
            </div>
          </div>
          <div className={`${cardClassName} sm:col-span-2`}>
            <p className={labelClassName}>Account Created Date</p>
            <div className="mt-2 flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <Calendar className="h-4 w-4" />
              </span>
              <p className="numeric-display text-[1.05rem] font-semibold text-slate-900">
                {formatProfileDateDisplay(accountCreatedDate)}
              </p>
            </div>
          </div>
          {isEditing ? (
            <div className={`${cardClassName} sm:col-span-2`}>
              <p className={labelClassName}>Change Password</p>
              <input
                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter new password"
                type="password"
                value={password}
              />
            </div>
          ) : null}

          {isEditing ? (
            <div className="flex items-center gap-3 sm:col-span-2">
              <button
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                onClick={handleSaveProfile}
                type="button"
              >
                Save Changes
              </button>
              <button
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                onClick={handleCancelEdit}
                type="button"
              >
                Cancel
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export { Profile };
