import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiCheck,
  FiChevronDown,
  FiChevronUp,
  FiCreditCard,
  FiDollarSign,
  FiHome,
  FiLifeBuoy,
  FiTrash2,
  FiTrendingUp,
  FiUserCheck,
  FiUserX,
  FiUsers,
} from 'react-icons/fi';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { UserSubscriptionModal } from '@/components/billing/UserSubscriptionModal';
import { StatCard } from '@/components/dashboard/StatCard';
import {
  approveDoctorRequest,
  deleteDoctor,
  formatMetricValue,
  formatNumber,
  getAllDoctors,
  getClinicRequests,
  getDashboard,
  getDoctorRequests,
  getSubscribedUsers,
  getTrialUsers,
  rejectDoctorRequest,
  type AdminUserSubscriptionDetail,
  type ClinicRequest,
  type DashboardResponse,
  type DoctorRequest,
} from '@/services/admin';

type TrendData = {
  value: string;
  isUp: boolean;
  label: string;
};

const calculateTrend = (
  current: number,
  previous: number,
  label = 'vs last month',
): TrendData => {
  if (previous === 0) {
    return {
      value: current > 0 ? '+100%' : '0%',
      isUp: current >= previous,
      label,
    };
  }

  const rawPercentage = ((current - previous) / previous) * 100;
  const roundedPercentage = Math.round(rawPercentage);

  return {
    value: `${roundedPercentage >= 0 ? '+' : ''}${roundedPercentage}%`,
    isUp: roundedPercentage >= 0,
    label,
  };
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [doctors, setDoctors] = useState<DoctorRequest[]>([]);
  const [clinicRequests, setClinicRequests] = useState<ClinicRequest[]>([]);
  const [expandedClinic, setExpandedClinic] = useState<string | null>(null);
  const [expandedDoctor, setExpandedDoctor] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalUsers, setModalUsers] = useState<AdminUserSubscriptionDetail[]>(
    [],
  );
  const [isModalLoading, setIsModalLoading] = useState(false);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [dashboardResponse, doctorResponse, clinicResponse] =
        await Promise.all([
          getDashboard(),
          getDoctorRequests(),
          getClinicRequests(),
        ]);
      setData(dashboardResponse);
      setDoctors(doctorResponse);
      setClinicRequests(clinicResponse);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAllData();
  }, []);

  const handleAction = async (
    doctorId: string,
    action: 'approve' | 'reject',
  ) => {
    setActioningId(doctorId);
    try {
      if (action === 'approve') {
        await approveDoctorRequest(doctorId);
      } else {
        await rejectDoctorRequest(doctorId);
      }
      await loadAllData();
    } catch {
      alert(`Failed to ${action} doctor. Please try again.`);
    } finally {
      setActioningId(null);
    }
  };

  const handleOpenModal = async (
    type: 'trial' | 'subscribed' | 'all',
  ) => {
    setIsModalOpen(true);
    setModalTitle(
      type === 'trial'
        ? 'Trial Users'
        : type === 'subscribed'
          ? 'Subscribed Users'
          : 'All Doctors',
    );
    setIsModalLoading(true);
    try {
      if (type === 'trial') {
        setModalUsers(await getTrialUsers());
      } else if (type === 'subscribed') {
        setModalUsers(await getSubscribedUsers());
      } else {
        setModalUsers(await getAllDoctors());
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      alert('Failed to load users. Please try again.');
    } finally {
      setIsModalLoading(false);
    }
  };

  const derivedTrendSource = data?.charts.ownerSignups ?? [];
  const revenueTrendSource = data?.charts.revenueTrend ?? [];
  const currentSignupPoint = derivedTrendSource[derivedTrendSource.length - 1];
  const previousSignupPoint = derivedTrendSource[derivedTrendSource.length - 2];
  const currentRevenuePoint = revenueTrendSource[revenueTrendSource.length - 1];
  const previousRevenuePoint = revenueTrendSource[revenueTrendSource.length - 2];

  const fallbackTrends = {
    totalDoctors: calculateTrend(
      currentSignupPoint?.Total ?? 0,
      previousSignupPoint?.Total ?? 0,
    ),
    activeSubscriptions: calculateTrend(
      currentSignupPoint?.Active ?? 0,
      previousSignupPoint?.Active ?? 0,
    ),
    expiredUsers: calculateTrend(
      currentSignupPoint?.Expired ?? 0,
      previousSignupPoint?.Expired ?? 0,
    ),
    revenueStatistics: calculateTrend(
      currentRevenuePoint?.revenue ?? 0,
      previousRevenuePoint?.revenue ?? 0,
    ),
  };

  const topStats = [
    {
      title: 'Total Clinics',
      value: data ? formatNumber(data.summary.totalClinics) : '...',
      icon: <FiHome size={20} />,
      iconBgColor: 'bg-gradient-to-br from-violet-50 to-fuchsia-50',
      iconColor: 'text-violet-600',
      onClick: () => navigate('/admin/clinics/all'),
    },
    {
      title: 'Total Users',
      value: data ? formatNumber(data.summary.totalDoctors) : '...',
      icon: <FiUsers size={20} />,
      iconBgColor: 'bg-gradient-to-br from-slate-50 to-blue-50',
      iconColor: 'text-slate-600',
      trend: data?.trends?.totalDoctors ?? fallbackTrends.totalDoctors,
      onClick: () => void handleOpenModal('all'),
    },
    {
      title: 'Active Users',
      value: data ? formatNumber(data.summary.activeSubscriptions) : '...',
      icon: <FiUserCheck size={20} />,
      iconBgColor: 'bg-gradient-to-br from-emerald-50 to-teal-50',
      iconColor: 'text-emerald-600',
      trend: data?.trends?.activeSubscriptions ?? fallbackTrends.activeSubscriptions,
      onClick: () => void handleOpenModal('subscribed'),
    },
    {
      title: 'Trial Users',
      value: data ? formatNumber(data.summary.trialUsers) : '...',
      icon: <FiTrendingUp size={20} />,
      iconBgColor: 'bg-gradient-to-br from-blue-50 to-indigo-50',
      iconColor: 'text-blue-600',
      onClick: () => void handleOpenModal('trial'),
    },
    {
      title: 'Expired Users',
      value: data ? formatNumber(data.summary.expiredUsers) : '...',
      icon: <FiUserX size={20} />,
      iconBgColor: 'bg-gradient-to-br from-rose-50 to-pink-50',
      iconColor: 'text-rose-600',
      trend: data?.trends?.expiredUsers ?? fallbackTrends.expiredUsers,
      onClick: () => navigate('/admin/users/expired'),
    },
  ];

  const middleStats = [
    {
      title: 'Total Revenue',
      value: data ? formatMetricValue(data.summary.revenueStatistics) : '...',
      icon: <FiDollarSign size={20} />,
      iconBgColor: 'bg-gradient-to-br from-emerald-50 to-teal-50',
      iconColor: 'text-emerald-600',
      trend: data?.trends?.revenueStatistics ?? fallbackTrends.revenueStatistics,
      onClick: () => navigate('/admin/revenue'),
    },
    {
      title: 'Transactions',
      value: data ? formatNumber(data.summary.totalTransactions) : '...',
      icon: <FiCreditCard size={20} />,
      iconBgColor: 'bg-gradient-to-br from-violet-50 to-indigo-50',
      iconColor: 'text-violet-600',
      onClick: () => navigate('/admin/billing/clinic-subscriptions'),
    },
    {
      title: 'Open Tickets',
      value: data ? formatNumber(data.summary.openTickets) : '...',
      icon: <FiLifeBuoy size={20} />,
      iconBgColor: 'bg-gradient-to-br from-amber-50 to-orange-50',
      iconColor: 'text-amber-600',
      onClick: () => navigate('/admin/support', { state: { filter: 'Open' } }),
    },
    {
      title: 'In Progress',
      value: data ? formatNumber(data.summary.inProgressTickets) : '...',
      icon: <FiLifeBuoy size={20} />,
      iconBgColor: 'bg-gradient-to-br from-indigo-50 to-blue-50',
      iconColor: 'text-indigo-600',
      onClick: () =>
        navigate('/admin/support', { state: { filter: 'In Progress' } }),
    },
  ];

  const revenueChartData = data?.charts.revenueTrend ?? [];
  const signupChartData = data?.charts.ownerSignups ?? [];

  return (
    <div className="space-y-8 pb-8">
      <div>
        <p className="text-[1.15rem] text-slate-500">
          Welcome back! Here's what's happening today.
        </p>
      </div>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
        {topStats.map((stat) => (
          <StatCard key={stat.title} {...stat} layout="vertical" />
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
        {middleStats.map((stat) => (
          <StatCard key={stat.title} {...stat} layout="horizontal" />
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[30px] border border-slate-200/90 bg-white p-6 shadow-[0_20px_55px_-38px_rgba(15,23,42,0.3)]">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <FiTrendingUp className="text-slate-400" />
              <h3 className="text-[1.35rem] font-semibold text-slate-950">
                Revenue Over Time
              </h3>
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600"
              type="button"
            >
              Last 6 Months
              <FiChevronDown size={14} />
            </button>
          </div>

          <div className="h-[320px] w-full">
            <ResponsiveContainer height="100%" width="100%">
              <LineChart data={revenueChartData}>
                <CartesianGrid
                  stroke="#e2e8f0"
                  strokeDasharray="4 4"
                  vertical={false}
                />
                <XAxis
                  axisLine={false}
                  dataKey="label"
                  fontSize={12}
                  tick={{ fill: '#94a3b8' }}
                  tickLine={false}
                />
                <YAxis
                  axisLine={false}
                  fontSize={12}
                  tick={{ fill: '#94a3b8' }}
                  tickFormatter={(val) => `₹${val}`}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 16px 30px rgba(15,23,42,0.08)',
                  }}
                  formatter={(val) => [
                    `₹${Number(val).toLocaleString('en-IN')}`,
                    'Revenue',
                  ]}
                />
                <Line
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  dataKey="revenue"
                  dot={{ r: 4, fill: '#059669', strokeWidth: 2, stroke: '#fff' }}
                  stroke="#059669"
                  strokeWidth={2.5}
                  type="monotone"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-[30px] border border-slate-200/90 bg-white p-6 shadow-[0_20px_55px_-38px_rgba(15,23,42,0.3)]">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <FiUsers className="text-slate-400" />
              <h3 className="text-[1.35rem] font-semibold text-slate-950">
                Owner Signups
              </h3>
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600"
              type="button"
            >
              Last 6 Months
              <FiChevronDown size={14} />
            </button>
          </div>

          <div className="h-[320px] w-full">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={signupChartData}>
                <CartesianGrid
                  stroke="#e2e8f0"
                  strokeDasharray="4 4"
                  vertical={false}
                />
                <XAxis
                  axisLine={false}
                  dataKey="name"
                  fontSize={12}
                  tick={{ fill: '#94a3b8' }}
                  tickLine={false}
                />
                <YAxis
                  axisLine={false}
                  fontSize={12}
                  tick={{ fill: '#94a3b8' }}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 16px 30px rgba(15,23,42,0.08)',
                  }}
                />
                <Legend iconType="rect" verticalAlign="bottom" />
                <Bar barSize={12} dataKey="Total" fill="#0f172a" radius={[4, 4, 0, 0]} />
                <Bar barSize={12} dataKey="Active" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar barSize={12} dataKey="Trial" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[30px] border border-slate-200/90 bg-white shadow-[0_20px_55px_-38px_rgba(15,23,42,0.3)]">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h3 className="text-[1.4rem] font-semibold text-slate-950">
              Clinic Onboarding Requests
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Review and manage clinic onboarding requests.
            </p>
          </div>
          <button
            className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
            onClick={() => navigate('/admin/clinics/requests')}
            type="button"
          >
            Manage Clinics
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/70 text-xs uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="w-10 px-4 py-4" />
                <th className="px-4 py-4">Clinic</th>
                <th className="px-4 py-4">City</th>
                <th className="px-4 py-4">Owner</th>
                <th className="px-4 py-4">Requested On</th>
                <th className="px-4 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={6}>
                    Loading requests...
                  </td>
                </tr>
              ) : clinicRequests.length > 0 ? (
                clinicRequests.slice(0, 5).map((request) => {
                  const isExpanded = expandedClinic === request.id;
                  const clinicDoctors = doctors.filter((d) =>
                    request.clinicId
                      ? d.clinicId === request.clinicId
                      : d.clinicName.toLowerCase() === request.clinic.toLowerCase(),
                  );

                  return (
                    <React.Fragment key={request.id}>
                      <tr
                        className="cursor-pointer border-b border-slate-100 text-slate-700 transition hover:bg-slate-50"
                        onClick={() => {
                          setExpandedClinic(isExpanded ? null : request.id);
                          setExpandedDoctor(null);
                        }}
                      >
                        <td className="px-4 py-4 text-slate-400">
                          {clinicDoctors.length > 0 ? (
                            isExpanded ? (
                              <FiChevronUp size={18} />
                            ) : (
                              <FiChevronDown size={18} />
                            )
                          ) : null}
                        </td>
                        <td className="px-4 py-4 font-semibold text-slate-900">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-50 to-cyan-50 text-sm font-bold text-emerald-700">
                              {request.clinic.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex items-center gap-2">
                              <span>{request.clinic}</span>
                              {request.clinicId ? (
                                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                                  {request.clinicId}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">{request.city}</td>
                        <td className="px-4 py-4">{request.owner}</td>
                        <td className="numeric-inline px-4 py-4">{request.requestedOn}</td>
                        <td className="px-4 py-4 text-right">
                          <span
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                              request.status === 'Approved'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {request.status}
                          </span>
                        </td>
                      </tr>
                      {isExpanded && clinicDoctors.length > 0 ? (
                        <tr>
                          <td colSpan={6} className="bg-slate-50/30 px-4 py-4 lg:px-8">
                            <div className="space-y-3">
                              <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                Associated Doctors ({clinicDoctors.length})
                              </h4>

                              <div className="grid gap-3">
                                {clinicDoctors.map((doc) => (
                                  <DoctorDetailRow
                                    actioningId={actioningId}
                                    doc={doc}
                                    isExpanded={expandedDoctor === doc.userId}
                                    key={doc.userId}
                                    onAction={handleAction}
                                    onDelete={async (id, name) => {
                                      if (
                                        window.confirm(
                                          `Permanently delete doctor "${name}"? This frees up their email.`,
                                        )
                                      ) {
                                        setActioningId(id);
                                        try {
                                          await deleteDoctor(id);
                                          await loadAllData();
                                        } catch {
                                          alert('Failed to delete.');
                                        } finally {
                                          setActioningId(null);
                                        }
                                      }
                                    }}
                                    onToggle={() =>
                                      setExpandedDoctor(
                                        expandedDoctor === doc.userId ? null : doc.userId,
                                      )
                                    }
                                  />
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={6}>
                    No pending clinic requests.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-4 border-t border-slate-200 px-6 py-5 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Showing 1 to {Math.min(clinicRequests.length, 5)} of {clinicRequests.length}{' '}
            entries
          </p>
          <div className="flex items-center gap-2">
            <button
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-400"
              type="button"
            >
              <FiChevronDown className="rotate-90" size={16} />
            </button>
            <button
              className="flex h-10 min-w-10 items-center justify-center rounded-xl bg-emerald-600 px-3 text-sm font-semibold text-white shadow-sm"
              type="button"
            >
              1
            </button>
            <button
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-400"
              type="button"
            >
              <FiChevronDown className="-rotate-90" size={16} />
            </button>
          </div>
        </div>
      </section>

      <UserSubscriptionModal
        isLoading={isModalLoading}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onDelete={async (id, name) => {
          if (
            window.confirm(
              `Permanently delete doctor "${name}"? This frees up their email.`,
            )
          ) {
            setIsModalLoading(true);
            try {
              await deleteDoctor(id);
              if (modalTitle === 'Trial Users') {
                setModalUsers(await getTrialUsers());
              } else if (modalTitle === 'Subscribed Users') {
                setModalUsers(await getSubscribedUsers());
              } else {
                setModalUsers(await getAllDoctors());
              }
              await loadAllData();
            } catch {
              alert('Failed to delete.');
            } finally {
              setIsModalLoading(false);
            }
          }
        }}
        title={modalTitle}
        users={modalUsers}
      />
    </div>
  );
};

const DoctorDetailRow = ({
  doc,
  isExpanded,
  onToggle,
  onAction,
  onDelete,
  actioningId,
}: {
  doc: DoctorRequest;
  isExpanded: boolean;
  onToggle: () => void;
  onAction: (id: string, action: 'approve' | 'reject') => Promise<void>;
  onDelete: (id: string, name: string) => Promise<void>;
  actioningId: string | null;
}) => (
  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-emerald-200">
    <button
      className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-emerald-50/50"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      type="button"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 font-bold">
          {doc.name.charAt(0)}
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900">{doc.name}</p>
          <p className="text-[11px] text-slate-500">
            {doc.specialization} • {doc.experience} years exp
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              doc.approvalStatus === 'approved'
                ? 'text-emerald-600'
                : doc.approvalStatus === 'pending'
                  ? 'text-amber-600'
                  : 'text-rose-600'
            }`}
          >
            {doc.approvalStatus}
          </span>
          <button
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(doc.userId, doc.name);
            }}
            title="Permanently Delete"
            type="button"
          >
            <FiTrash2 size={14} />
          </button>
        </div>
        {isExpanded ? (
          <FiChevronUp size={16} className="text-slate-400" />
        ) : (
          <FiChevronDown size={16} className="text-slate-400" />
        )}
      </div>
    </button>

    {isExpanded ? (
      <div className="border-t border-slate-100 bg-white px-5 py-6">
        <div className="grid gap-y-6 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Doctor Name
            </p>
            <p className="text-sm font-medium text-slate-900">{doc.name}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Phone Number
            </p>
            <p className="text-sm font-medium text-slate-900">{doc.phone}</p>
          </div>
          <div className="sm:col-span-2 space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Clinic Address
            </p>
            <p className="text-sm font-medium text-slate-900">{doc.clinicAddress}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              City
            </p>
            <p className="text-sm font-medium text-slate-900">{doc.city}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Specialization
            </p>
            <p className="text-sm font-medium text-slate-900">{doc.specialization}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Qualification
            </p>
            <p className="text-sm font-medium text-slate-900">{doc.qualification}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Experience (Years)
            </p>
            <p className="text-sm font-medium text-slate-900">{doc.experience}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Consultation Fees
            </p>
            <p className="text-sm font-bold text-slate-900">₹{doc.consultationFees}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Council Name
            </p>
            <p className="text-sm font-medium text-slate-900">
              {doc.medicalCouncilBoard?.split(' ')[0]?.toLowerCase() || 'N/A'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Council Code
            </p>
            <p className="text-sm font-medium text-slate-900">{doc.medicalRegistrationNumber}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Council Board
            </p>
            <p className="text-sm font-medium text-slate-900">{doc.medicalCouncilBoard}</p>
          </div>
          <div className="sm:col-span-2 space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              About Doctor
            </p>
            <p className="text-sm leading-relaxed text-slate-600">
              {doc.aboutDoctor || 'No description provided.'}
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-6">
          <div className="flex gap-4">
            {doc.profileImageUrl ? (
              <a
                className="text-xs font-bold text-emerald-700 hover:underline"
                href={doc.profileImageUrl}
                rel="noreferrer"
                target="_blank"
              >
                View Photo
              </a>
            ) : null}
            {doc.certificateUrl ? (
              <a
                className="text-xs font-bold text-emerald-700 hover:underline"
                href={doc.certificateUrl}
                rel="noreferrer"
                target="_blank"
              >
                View Certificate
              </a>
            ) : null}
          </div>

          <div className="flex gap-2">
            {doc.approvalStatus === 'pending' ? (
              <>
                <button
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                  disabled={actioningId === doc.userId}
                  onClick={() => void onAction(doc.userId, 'approve')}
                  type="button"
                >
                  {actioningId === doc.userId ? 'Saving...' : 'Approve Profile'}
                </button>
                <button
                  className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"
                  disabled={actioningId === doc.userId}
                  onClick={() => void onAction(doc.userId, 'reject')}
                  type="button"
                >
                  Reject
                </button>
              </>
            ) : (
              <div
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${
                  doc.approvalStatus === 'approved'
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-rose-50 text-rose-600'
                }`}
              >
                <FiCheck size={14} /> {doc.approvalStatus}
              </div>
            )}
          </div>
        </div>
      </div>
    ) : null}
  </div>
);

export { Dashboard };
