import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type Clinic = {
  id: number;
  clinicName: string;
  ownerName: string;
  address: string;
  contact: string;
  subscriptionPlan: string;
  doctors: number;
  patients: number;
  status: string;
};

const initialClinics: Clinic[] = [
  {
    id: 1,
    clinicName: 'Green Valley Clinic',
    ownerName: 'Dr. A. Sharma',
    address: '12 MG Road, Bangalore',
    contact: '+91 99876 54211',
    subscriptionPlan: 'Enterprise',
    doctors: 24,
    patients: 4500,
    status: 'Active',
  },
  {
    id: 2,
    clinicName: 'Healthy Path Care',
    ownerName: 'Dr. M. Patel',
    address: '24 Civil Lines, Pune',
    contact: '+91 99765 43011',
    subscriptionPlan: 'Growth',
    doctors: 15,
    patients: 2600,
    status: 'Pending Approval',
  },
  {
    id: 3,
    clinicName: 'Prime Ortho Center',
    ownerName: 'Dr. N. Rao',
    address: '8 Ring Road, Hyderabad',
    contact: '+91 99543 22200',
    subscriptionPlan: 'Growth',
    doctors: 13,
    patients: 2200,
    status: 'Suspended',
  },
];

const actionBtnClass =
  'rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50';

const Clinics = () => {
  const navigate = useNavigate();
  const [clinics, setClinics] = useState<Clinic[]>(initialClinics);

  const activeCount = useMemo(() => clinics.filter((clinic) => clinic.status === 'Active').length, [clinics]);
  const pendingCount = useMemo(
    () => clinics.filter((clinic) => clinic.status === 'Pending Approval').length,
    [clinics],
  );
  const suspendedCount = useMemo(
    () => clinics.filter((clinic) => clinic.status === 'Suspended').length,
    [clinics],
  );

  const handleDelete = (id: number) => {
    setClinics((current) => current.filter((clinic) => clinic.id !== id));
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-2xl font-semibold text-slate-900">Clinic Management</h3>
            <p className="mt-1 text-sm text-slate-500">Dashboard &gt; Clinics &gt; All Clinics</p>
          </div>
          <button
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            onClick={() => navigate('/admin/clinics/add')}
            type="button"
          >
            + Add New Clinic
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-600">Total Clinics</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{clinics.length}</p>
            <p className="mt-1 text-sm text-emerald-700">All registered clinics</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-600">Active Clinics</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{activeCount}</p>
            <p className="mt-1 text-sm text-emerald-700">Active and running</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-600">Pending Approval</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{pendingCount}</p>
            <p className="mt-1 text-sm text-amber-600">Awaiting review</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-600">Suspended Clinics</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{suspendedCount}</p>
            <p className="mt-1 text-sm text-rose-600">Currently suspended</p>
          </article>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm transition duration-200 hover:border-emerald-300 hover:shadow-[0_14px_30px_-22px_rgba(22,163,74,0.45)]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-emerald-100 bg-emerald-50/40 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-3">Clinic Name</th>
                <th className="px-3 py-3">Owner Name</th>
                <th className="px-3 py-3">Address</th>
                <th className="px-3 py-3">Contact Number</th>
                <th className="px-3 py-3">Subscription Plan</th>
                <th className="px-3 py-3">Doctors</th>
                <th className="px-3 py-3">Patients</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clinics.map((clinic) => (
                <tr className="border-b border-slate-100 text-slate-700 transition hover:bg-emerald-50/40" key={clinic.id}>
                  <td className="px-3 py-3 font-medium">{clinic.clinicName}</td>
                  <td className="px-3 py-3">{clinic.ownerName}</td>
                  <td className="px-3 py-3">{clinic.address}</td>
                  <td className="px-3 py-3">{clinic.contact}</td>
                  <td className="px-3 py-3">{clinic.subscriptionPlan}</td>
                  <td className="px-3 py-3">{clinic.doctors}</td>
                  <td className="px-3 py-3">{clinic.patients}</td>
                  <td className="px-3 py-3">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      {clinic.status}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <button className={actionBtnClass} type="button">
                        View
                      </button>
                      <button className={actionBtnClass} onClick={() => handleDelete(clinic.id)} type="button">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export { Clinics };
