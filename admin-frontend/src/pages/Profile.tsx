import { useEffect, useState, type ChangeEvent } from 'react';

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

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [draftProfileImageUrl, setDraftProfileImageUrl] = useState<string | null>(null);
  const [isLocalFileSelected, setIsLocalFileSelected] = useState(false);
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

    setDraftProfileImageUrl(URL.createObjectURL(file));
    setIsLocalFileSelected(true);
  };

  const handleProfileImageUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
    setDraftProfileImageUrl(event.target.value);
    setIsLocalFileSelected(false);
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
    setIsLocalFileSelected(false);
    setPassword('');
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    const profile = await updateAdminProfile({
      adminName: draftAdminName,
      email: draftEmail,
      phoneNumber: draftPhoneNumber,
      profileImageUrl: draftProfileImageUrl,
      newPassword: password || undefined,
    });

    setAdminName(profile.adminName);
    setEmail(profile.email);
    setPhoneNumber(profile.phoneNumber);
    setProfileImageUrl(profile.profileImageUrl);
    setIsEditing(false);
    setPassword('');
  };

  const handleCancelEdit = () => {
    setDraftAdminName(adminName);
    setDraftEmail(email);
    setDraftPhoneNumber(phoneNumber);
    setDraftProfileImageUrl(profileImageUrl);
    setIsLocalFileSelected(false);
    setIsEditing(false);
    setPassword('');
  };

  const currentProfileImage = isEditing ? draftProfileImageUrl : profileImageUrl;

  return (
    <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm transition duration-200 hover:border-emerald-300 hover:shadow-[0_14px_30px_-20px_rgba(22,163,74,0.45)] sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900">Admin Profile</h3>
        <button
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          onClick={handleEditClick}
          type="button"
        >
          {isEditing ? 'Close Edit' : 'Edit Profile'}
        </button>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[260px_1fr]">
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5 text-center">
          {currentProfileImage ? (
            <img
              alt="Admin profile"
              className="h-28 w-28 rounded-full border border-emerald-200 object-cover"
              src={currentProfileImage}
            />
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-emerald-600 text-3xl font-bold text-white">
              AD
            </div>
          )}

          {!isEditing ? (
            <div className="mt-4 text-center">
              <p className="text-xs uppercase tracking-wide text-slate-500">Profile Picture</p>
            </div>
          ) : null}

          {isEditing ? (
            <>
              {/* URL Input */}
              <div className="mt-4 w-full">
                <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Or enter image URL</p>
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
                  onChange={handleProfileImageUrlChange}
                  placeholder="https://example.com/image.jpg"
                  type="url"
                  value={isLocalFileSelected ? '' : draftProfileImageUrl || ''}
                />
              </div>
              
              {/* File Upload */}
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
          <div className="rounded-2xl border border-emerald-100 p-4 transition duration-200 hover:border-emerald-300 hover:shadow-[0_8px_20px_-16px_rgba(22,163,74,0.45)]">
            <p className="text-xs uppercase tracking-wide text-slate-500">Admin Name</p>
            {isEditing ? (
              <input
                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
                onChange={(event) => setDraftAdminName(event.target.value)}
                type="text"
                value={draftAdminName}
              />
            ) : (
              <p className="mt-1 font-semibold text-slate-900">{adminName}</p>
            )}
          </div>
          <div className="rounded-2xl border border-emerald-100 p-4 transition duration-200 hover:border-emerald-300 hover:shadow-[0_8px_20px_-16px_rgba(22,163,74,0.45)]">
            <p className="text-xs uppercase tracking-wide text-slate-500">Email</p>
            {isEditing ? (
              <input
                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
                onChange={(event) => setDraftEmail(event.target.value)}
                type="email"
                value={draftEmail}
              />
            ) : (
              <p className="mt-1 font-semibold text-slate-900">{email}</p>
            )}
          </div>
          <div className="rounded-2xl border border-emerald-100 p-4 transition duration-200 hover:border-emerald-300 hover:shadow-[0_8px_20px_-16px_rgba(22,163,74,0.45)]">
            <p className="text-xs uppercase tracking-wide text-slate-500">Phone Number</p>
            {isEditing ? (
              <input
                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
                onChange={(event) => setDraftPhoneNumber(event.target.value)}
                type="tel"
                value={draftPhoneNumber}
              />
            ) : (
              <p className="numeric-display mt-2 text-[1.05rem] font-semibold text-slate-900">
                {formatPhoneDisplay(phoneNumber)}
              </p>
            )}
          </div>
          <div className="rounded-2xl border border-emerald-100 p-4 transition duration-200 hover:border-emerald-300 hover:shadow-[0_8px_20px_-16px_rgba(22,163,74,0.45)]">
            <p className="text-xs uppercase tracking-wide text-slate-500">Role</p>
            <p className="mt-1 font-semibold text-slate-900">Super Admin</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 p-4 transition duration-200 hover:border-emerald-300 hover:shadow-[0_8px_20px_-16px_rgba(22,163,74,0.45)]">
            <p className="text-xs uppercase tracking-wide text-slate-500">Organization Name</p>
            <p className="mt-1 font-semibold text-slate-900">{organizationName}</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 p-4 transition duration-200 hover:border-emerald-300 hover:shadow-[0_8px_20px_-16px_rgba(22,163,74,0.45)]">
            <p className="text-xs uppercase tracking-wide text-slate-500">Location / Address</p>
            <p className="mt-1 font-semibold text-slate-900 [font-variant-numeric:tabular-nums_lining-nums]">
              {location}
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-100 p-4 transition duration-200 hover:border-emerald-300 hover:shadow-[0_8px_20px_-16px_rgba(22,163,74,0.45)] sm:col-span-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">Account Created Date</p>
            <p className="numeric-display mt-2 text-[1.05rem] font-semibold text-slate-900">
              {formatProfileDateDisplay(accountCreatedDate)}
            </p>
          </div>
          {isEditing ? (
            <div className="rounded-2xl border border-emerald-100 p-4 transition duration-200 hover:border-emerald-300 hover:shadow-[0_8px_20px_-16px_rgba(22,163,74,0.45)] sm:col-span-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">Change Password</p>
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
