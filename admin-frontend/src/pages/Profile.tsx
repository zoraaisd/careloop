import { useState, type ChangeEvent } from 'react';

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [draftProfileImageUrl, setDraftProfileImageUrl] = useState<string | null>(null);
  const [adminName, setAdminName] = useState('Aditi Nair');
  const [draftAdminName, setDraftAdminName] = useState('Aditi Nair');
  const [email, setEmail] = useState('aditi@careloop.com');
  const [draftEmail, setDraftEmail] = useState('aditi@careloop.com');
  const [phoneNumber, setPhoneNumber] = useState('+91 98765 43210');
  const [draftPhoneNumber, setDraftPhoneNumber] = useState('+91 98765 43210');
  const [password, setPassword] = useState('');
  const [organizationName] = useState('CareLoop Health Services');
  const [location] = useState('MG Road, Bengaluru, Karnataka 560001');
  const [accountCreatedDate] = useState('15 Jan 2024');

  const handleProfileImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setDraftProfileImageUrl(URL.createObjectURL(file));
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
    setPassword('');
    setIsEditing(true);
  };

  const handleSaveProfile = () => {
    setAdminName(draftAdminName);
    setEmail(draftEmail);
    setPhoneNumber(draftPhoneNumber);
    setProfileImageUrl(draftProfileImageUrl);
    setIsEditing(false);
    setPassword('');
  };

  const handleCancelEdit = () => {
    setDraftAdminName(adminName);
    setDraftEmail(email);
    setDraftPhoneNumber(phoneNumber);
    setDraftProfileImageUrl(profileImageUrl);
    setIsEditing(false);
    setPassword('');
  };

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
          {profileImageUrl ? (
            <img
              alt="Admin profile"
              className="h-28 w-28 rounded-full border border-emerald-200 object-cover"
              src={profileImageUrl}
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
              <label
                className="mt-4 inline-flex cursor-pointer items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                htmlFor="profile-image-upload"
              >
                Upload Profile Picture
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
              <p className="mt-1 font-semibold text-slate-900">{phoneNumber}</p>
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
            <p className="mt-1 font-semibold text-slate-900">{location}</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 p-4 transition duration-200 hover:border-emerald-300 hover:shadow-[0_8px_20px_-16px_rgba(22,163,74,0.45)] sm:col-span-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">Account Created Date</p>
            <p className="mt-1 font-semibold text-slate-900">{accountCreatedDate}</p>
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
