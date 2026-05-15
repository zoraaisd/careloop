import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiTrash2, FiUsers, FiUserCheck, FiClock, FiUserX } from 'react-icons/fi';
import { LinkButton } from '@/components/ui/Button';
import {
  formatNumber,
  getClinics,
  getDoctorRequests,
  deleteClinic,
  type Clinic,
} from '@/services/admin';

type FilterType = 'all' | 'active' | 'pending' | 'suspended';

const STATUS_FILTER_MAP: Record<FilterType, string | null> = {
  all: null,
  active: 'Active',
  pending: 'Pending Approval',
  suspended: 'Suspended',
};

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
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const openDoctorDetails = (clinic: Clinic) => {
    navigate(`/admin/doctors/${clinic.routeId || clinic.id}`);
  };

  const fetchClinics = async () => {
    setIsLoading(true);
    try {
      const [clinicResponse, doctorResponse] = await Promise.all([
        getClinics(),
        getDoctorRequests(),
      ]);

      const doctorsByEmail = new Map(
        doctorResponse.map((doctor) => [doctor.email.trim().toLowerCase(), doctor.userId]),
      );

      const clinicsWithRouteIds = clinicResponse.clinics.map((clinic) => ({
        ...clinic,
        routeId:
          clinic.routeId ||
          (clinic.email ? doctorsByEmail.get(clinic.email.trim().toLowerCase()) : undefined) ||
          clinic.id,
      }));

      setClinics(clinicsWithRouteIds);
      setOverview(clinicResponse.overview);
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
    if (
      window.confirm(
        `Are you sure you want to remove the clinic "${name}"? This will also remove the associated doctor account.`,
      )
    ) {
      try {
        await deleteClinic(clinicId);
        await fetchClinics();
      } catch (error: any) {
        alert(error?.response?.data?.message ?? 'Failed to remove clinic. Please try again.');
      }
    }
  };

  // Derived counts from the actual list (more accurate than API overview)
  const totalCount = clinics.length;
  const activeCount = useMemo(() => clinics.filter((c) => c.status === 'Active').length, [clinics]);
  const pendingCount = useMemo(
    () => clinics.filter((c) => c.status === 'Pending Approval').length,
    [clinics],
  );
  const suspendedCount = useMemo(
    () => clinics.filter((c) => c.status === 'Suspended').length,
    [clinics],
  );

  const filteredClinics = useMemo(() => {
    const statusMatch = STATUS_FILTER_MAP[activeFilter];
    if (!statusMatch) return clinics;
    return clinics.filter((c) => c.status === statusMatch);
  }, [clinics, activeFilter]);

  const statCards = [
    {
      key: 'all' as FilterType,
      label: 'Total Registered Clinics',
      count: totalCount || overview.totalClinics,
      subLabel: 'All clinic accounts',
      icon: <FiUsers size={20} />,
      iconBg: 'bg-slate-100',
      iconColor: 'text-slate-600',
      activeBorder: 'border-slate-400',
      activeText: 'text-slate-900',
    },
    {
      key: 'active' as FilterType,
      label: 'Approved Clinics',
      count: activeCount || overview.activeClinics,
      subLabel: 'Approved or active accounts',
      icon: <FiUserCheck size={20} />,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      activeBorder: 'border-emerald-500',
      activeText: 'text-emerald-700',
    },
    {
      key: 'pending' as FilterType,
      label: 'Pending Approval',
      count: pendingCount || overview.pendingApprovalClinics,
      subLabel: 'Awaiting review',
      icon: <FiClock size={20} />,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      activeBorder: 'border-amber-500',
      activeText: 'text-amber-700',
    },
    {
      key: 'suspended' as FilterType,
      label: 'Rejected Clinics',
      count: suspendedCount || overview.suspendedClinics,
      subLabel: 'Rejected accounts',
      icon: <FiUserX size={20} />,
      iconBg: 'bg-rose-50',
      iconColor: 'text-rose-600',
      activeBorder: 'border-rose-500',
      activeText: 'text-rose-700',
    },
  ];

  const statusColors: Record<string, string> = {
    Active: 'bg-emerald-50 text-emerald-700',
    'Pending Approval': 'bg-amber-50 text-amber-700',
    Suspended: 'bg-rose-50 text-rose-700',
    Approved: 'bg-emerald-50 text-emerald-700',
    Pending: 'bg-amber-50 text-amber-700',
  };

  return (
    <div className="space-y-6">
      {/* Header + Stat Cards */}
      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-2xl font-bold text-slate-900">Registered Clinics</h3>
            <p className="mt-1 text-sm text-slate-500">Dashboard &gt; Clinics &gt; All Registered Clinics</p>
          </div>
          <LinkButton className="px-4 py-2.5" to="/admin/clinics/add">
            Add Clinic
          </LinkButton>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => {
            const isActive = activeFilter === card.key;
            return (
              <button
                key={card.key}
                onClick={() => setActiveFilter(card.key)}
                type="button"
                className={`rounded-2xl border-2 bg-white p-4 text-left transition-all duration-150 hover:shadow-md focus:outline-none ${
                  isActive
                    ? `${card.activeBorder} shadow-sm`
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {card.label}
                    </p>
                    <p
                      className={`mt-2 text-3xl font-bold ${
                        isActive ? card.activeText : 'text-slate-900'
                      }`}
                    >
                      {formatNumber(card.count)}
                    </p>
                    <p
                      className={`mt-1 text-xs font-medium ${
                        isActive ? card.activeText : 'text-slate-400'
                      }`}
                    >
                      {card.subLabel}
                    </p>
                  </div>
                  <div
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${card.iconBg} ${card.iconColor}`}
                  >
                    {card.icon}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Filtered Table */}
      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {/* Table heading */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h4 className="font-semibold text-slate-900">
              {statCards.find((c) => c.key === activeFilter)?.label}
            </h4>
            <p className="mt-0.5 text-xs text-slate-500">
              Showing {filteredClinics.length} record{filteredClinics.length !== 1 ? 's' : ''}
            </p>
          </div>
          {/* Filter pill buttons */}
          <div className="hidden gap-1 sm:flex">
            {statCards.map((card) => (
              <button
                key={card.key}
                onClick={() => setActiveFilter(card.key)}
                type="button"
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  activeFilter === card.key
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {card.key === 'all' ? 'All' : card.key.charAt(0).toUpperCase() + card.key.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Doctor Name</th>
                <th className="px-4 py-3">Clinic Name</th>
                <th className="px-4 py-3">Contact Number</th>
                <th className="px-4 py-3">Subscription</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-400" colSpan={6}>
                    Loading data...
                  </td>
                </tr>
              ) : filteredClinics.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-400" colSpan={6}>
                    No records found for this filter.
                  </td>
                </tr>
              ) : (
                filteredClinics.map((clinic) => (
                  <tr
                    className="group border-b border-slate-100 text-slate-700 transition hover:bg-slate-50"
                    key={clinic.id}
                  >
                    <td
                      className="cursor-pointer px-4 py-3 font-medium text-slate-900 hover:text-emerald-700"
                      onClick={() => openDoctorDetails(clinic)}
                    >
                      {clinic.ownerName}
                    </td>
                    <td
                      className="cursor-pointer px-4 py-3"
                      onClick={() => openDoctorDetails(clinic)}
                    >
                      {clinic.clinicName}
                    </td>
                    <td
                      className="cursor-pointer px-4 py-3"
                      onClick={() => openDoctorDetails(clinic)}
                    >
                      {clinic.contact}
                    </td>
                    <td
                      className="cursor-pointer px-4 py-3"
                      onClick={() => openDoctorDetails(clinic)}
                    >
                      {clinic.subscriptionPlan}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          statusColors[clinic.status] ?? 'bg-slate-50 text-slate-600'
                        }`}
                      >
                        {clinic.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        onClick={() => handleDelete(clinic.id, clinic.clinicName)}
                        title="Remove Clinic"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export { Clinics };
