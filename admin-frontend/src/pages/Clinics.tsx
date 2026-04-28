import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiTrash2 } from 'react-icons/fi';
import { formatNumber, getClinics, deleteClinic, type Clinic } from '@/services/admin';

const Clinics = () => {
  const navigate = useNavigate();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [overview, setOverview] = useState({
    totalClinics: 0,
    activeClinics: 0,
    pendingApprovalClinics: 0,
    suspendedClinics: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchClinics = async () => {
    setIsLoading(true);
    try {
      const response = await getClinics();
      setClinics(response.clinics);
      setOverview(response.overview);
    } catch (error) {
      console.error('Error fetching clinics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClinics();
  }, []);

  const handleDelete = async (clinicId: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove the clinic "${name}"? This will also remove the associated doctor account.`)) {
      try {
        await deleteClinic(clinicId);
        setClinics(clinics.filter((c) => c.id !== clinicId));
      } catch (error) {
        alert('Failed to remove clinic. Please try again.');
      }
    }
  };

  const activeCount = useMemo(() => clinics.filter((clinic) => clinic.status === 'Active').length, [clinics]);
  const pendingCount = useMemo(
    () => clinics.filter((clinic) => clinic.status === 'Pending Approval').length,
    [clinics],
  );
  const suspendedCount = useMemo(
    () => clinics.filter((clinic) => clinic.status === 'Suspended').length,
    [clinics],
  );

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-2xl font-semibold text-slate-900">Registered Doctors</h3>
            <p className="mt-1 text-sm text-slate-500">Dashboard &gt; Doctors &gt; All Registered Doctors</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-600">Total Registered Doctors</p>
            <p className="numeric-display mt-1 text-3xl font-bold text-slate-900">{formatNumber(overview.totalClinics)}</p>
            <p className="mt-1 text-sm text-emerald-700">All doctor accounts</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-600">Approved Doctors</p>
            <p className="numeric-display mt-1 text-3xl font-bold text-slate-900">{formatNumber(overview.activeClinics || activeCount)}</p>
            <p className="mt-1 text-sm text-emerald-700">Approved or active accounts</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-600">Pending Approval</p>
            <p className="numeric-display mt-1 text-3xl font-bold text-slate-900">{formatNumber(overview.pendingApprovalClinics || pendingCount)}</p>
            <p className="mt-1 text-sm text-amber-600">Awaiting review</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-600">Rejected Doctors</p>
            <p className="numeric-display mt-1 text-3xl font-bold text-slate-900">{formatNumber(overview.suspendedClinics || suspendedCount)}</p>
            <p className="mt-1 text-sm text-rose-600">Rejected accounts</p>
          </article>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm transition duration-200 hover:border-emerald-300 hover:shadow-[0_14px_30px_-22px_rgba(22,163,74,0.45)]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-emerald-100 bg-emerald-50/40 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-3">Doctor Name</th>
                <th className="px-3 py-3">Clinic Name</th>
                <th className="px-3 py-3">Contact Number</th>
                <th className="px-3 py-3">Subscription</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-3 py-4 text-slate-500" colSpan={6}>
                    Loading data...
                  </td>
                </tr>
              ) : clinics.map((clinic) => (
                <tr
                  className="group border-b border-slate-100 text-slate-700 transition hover:bg-emerald-50/40"
                  key={clinic.id}
                >
                  <td className="px-3 py-3 font-medium cursor-pointer" onClick={() => navigate(`/admin/doctors/${clinic.id}`)}>{clinic.ownerName}</td>
                  <td className="px-3 py-3 cursor-pointer" onClick={() => navigate(`/admin/doctors/${clinic.id}`)}>{clinic.clinicName}</td>
                  <td className="px-3 py-3 cursor-pointer" onClick={() => navigate(`/admin/doctors/${clinic.id}`)}>{clinic.contact}</td>
                  <td className="px-3 py-3 cursor-pointer" onClick={() => navigate(`/admin/doctors/${clinic.id}`)}>{clinic.subscriptionPlan}</td>
                  <td className="px-3 py-3">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      {clinic.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                      onClick={() => handleDelete(clinic.id, clinic.clinicName)}
                      title="Remove Clinic"
                    >
                      <FiTrash2 size={16} />
                    </button>
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
