import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiCheck,
  FiChevronDown,
  FiChevronUp,
  FiTrash2,
  FiUsers,
  FiUserCheck,
  FiTrendingUp,
  FiUserX,
  FiDollarSign,
  FiCreditCard,
  FiLifeBuoy,
} from 'react-icons/fi';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';

import {
  formatMetricValue,
  formatNumber,
  getDashboard,
  getDoctorRequests,
  getClinicRequests,
  approveDoctorRequest,
  rejectDoctorRequest,
  deleteDoctor,
  getTrialUsers,
  getSubscribedUsers,
  getAllDoctors,
  type AdminUserSubscriptionDetail,
  type DashboardResponse,
  type DoctorRequest,
  type ClinicRequest,
} from '@/services/admin';
import { UserSubscriptionModal } from '@/components/billing/UserSubscriptionModal';
import { StatCard } from '@/components/dashboard/StatCard';

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
  const [modalUsers, setModalUsers] = useState<AdminUserSubscriptionDetail[]>([]);
  const [isModalLoading, setIsModalLoading] = useState(false);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [dashboardResponse, doctorResponse, clinicResponse] = await Promise.all([
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

  const handleAction = async (doctorId: string, action: 'approve' | 'reject') => {
    setActioningId(doctorId);
    try {
      if (action === 'approve') {
        await approveDoctorRequest(doctorId);
      } else {
        await rejectDoctorRequest(doctorId);
      }
      await loadAllData();
    } catch (error) {
      alert(`Failed to ${action} doctor. Please try again.`);
    } finally {
      setActioningId(null);
    }
  };

  const handleOpenModal = async (type: 'trial' | 'subscribed' | 'all') => {
    setIsModalOpen(true);
    setModalTitle(
      type === 'trial' ? 'Trial Users' : type === 'subscribed' ? 'Subscribed Users' : 'All Doctors',
    );
    setIsModalLoading(true);
    try {
      if (type === 'trial') {
        const users = await getTrialUsers();
        setModalUsers(users);
      } else if (type === 'subscribed') {
        const users = await getSubscribedUsers();
        setModalUsers(users);
      } else {
        const users = await getAllDoctors();
        setModalUsers(users);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      alert('Failed to load users. Please try again.');
    } finally {
      setIsModalLoading(false);
    }
  };

  const topStats = [
    {
      title: 'Total Users',
      value: data ? formatNumber(data.summary.totalDoctors) : '...',
      icon: <FiUsers size={20} />,
      iconBgColor: 'bg-slate-50',
      iconColor: 'text-slate-600',
      trend: { value: '+12%', isUp: true, label: 'this month' },
      onClick: () => navigate('/admin/users/all'),
    },
    {
      title: 'Active Users',
      value: data ? formatNumber(data.summary.activeSubscriptions) : '...',
      icon: <FiUserCheck size={20} />,
      iconBgColor: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      trend: { value: '+8%', isUp: true, label: 'vs last month' },
      onClick: () => navigate('/admin/users/active'),
    },
    {
      title: 'Trial Users',
      value: data ? formatNumber(data.summary.trialUsers) : '...',
      icon: <FiTrendingUp size={20} />,
      iconBgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      onClick: () => navigate('/admin/users/trial'),
    },
    {
      title: 'Expired Users',
      value: data ? formatNumber(data.summary.expiredUsers) : '...',
      icon: <FiUserX size={20} />,
      iconBgColor: 'bg-rose-50',
      iconColor: 'text-rose-600',
      trend: { value: '-5%', isUp: false, label: 'vs last month' },
      onClick: () => navigate('/admin/users/expired'),
    },
  ];

  const middleStats = [
    {
      title: 'Total Revenue',
      value: data ? formatMetricValue(data.summary.revenueStatistics) : '...',
      icon: <FiDollarSign size={20} />,
      iconBgColor: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      trend: { value: '+18%', isUp: true, label: 'this year' },
      onClick: () => navigate('/admin/revenue'),
    },
    {
      title: 'Transactions',
      value: data ? formatNumber(data.summary.totalTransactions) : '...',
      icon: <FiCreditCard size={20} />,
      iconBgColor: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
      onClick: () => navigate('/admin/billing/clinic-subscriptions'),
    },
    {
      title: 'Open Tickets',
      value: data ? formatNumber(data.summary.openTickets) : '...',
      icon: <FiLifeBuoy size={20} />,
      iconBgColor: 'bg-amber-50',
      iconColor: 'text-amber-600',
      onClick: () => navigate('/admin/support', { state: { filter: 'Open' } }),
    },
    {
      title: 'In Progress',
      value: data ? formatNumber(data.summary.inProgressTickets) : '...',
      icon: <FiLifeBuoy size={20} />,
      iconBgColor: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
      onClick: () => navigate('/admin/support', { state: { filter: 'In Progress' } }),
    },
  ];

  const revenueChartData = data?.charts.revenueTrend ?? [];
  const signupChartData = data?.charts.ownerSignups ?? [];

  return (
    <div className="space-y-8 pb-8">
      {/* Greeting Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-slate-500">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Top 4 Stats */}
      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {topStats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </section>

      {/* Middle 3 Stats */}
      <section className="grid gap-6 sm:grid-cols-1 md:grid-cols-3">
        {middleStats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </section>

      {/* Charts Section */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-2">
            <FiTrendingUp className="text-slate-400" />
            <h3 className="font-bold text-slate-900">Revenue Over Time</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer height="100%" width="100%">
              <LineChart data={revenueChartData}>
                <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
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
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                  formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Revenue']}
                />
                <Line
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  dataKey="revenue"
                  dot={{ r: 4, fill: '#0f172a', strokeWidth: 2, stroke: '#fff' }}
                  name="Revenue"
                  stroke="#0f172a"
                  strokeWidth={2}
                  type="monotone"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-2">
            <FiUsers className="text-slate-400" />
            <h3 className="font-bold text-slate-900">Owner Signups</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={signupChartData}>
                <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
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
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                />
                <Legend iconType="rect" verticalAlign="bottom" />
                <Bar barSize={12} dataKey="Active" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar barSize={12} dataKey="Expired" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar barSize={12} dataKey="Total" fill="#0f172a" radius={[4, 4, 0, 0]} />
                <Bar barSize={12} dataKey="Trial" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Clinic Requests Section */}
      <section className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-emerald-100 px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Clinic Onboarding Requests</h3>
            <p className="mt-1 text-sm text-slate-500">Review requests grouped by clinic registration.</p>
          </div>
          <button
            className="text-xs font-bold text-emerald-600 hover:underline"
            onClick={() => navigate('/admin/clinics/requests')}
            type="button"
          >
            Manage Clinics
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-emerald-100 bg-emerald-50/40 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-10 px-4 py-3" />
                <th className="px-4 py-3">Clinic</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Requested On</th>
                <th className="px-4 py-3 text-right">Status</th>
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
                  const clinicDoctors = doctors.filter(
                    (d) => request.clinicId 
                      ? d.clinicId === request.clinicId 
                      : d.clinicName.toLowerCase() === request.clinic.toLowerCase()
                  );

                  return (
                    <React.Fragment key={request.id}>
                      <tr
                        className="cursor-pointer border-b border-slate-100 text-slate-700 transition hover:bg-emerald-50/40"
                        onClick={() => {
                          setExpandedClinic(isExpanded ? null : request.id);
                          setExpandedDoctor(null);
                        }}
                      >
                        <td className="px-4 py-3 text-slate-400">
                          {clinicDoctors.length > 0 && (
                            isExpanded ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {request.clinic}
                          {request.clinicId && (
                            <span className="ml-2 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                              {request.clinicId}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">{request.city}</td>
                        <td className="px-4 py-3">{request.owner}</td>
                        <td className="numeric-inline px-4 py-3">{request.requestedOn}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            request.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {request.status}
                          </span>
                        </td>
                      </tr>
                      {isExpanded && clinicDoctors.length > 0 && (
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
                                    doc={doc}
                                    isExpanded={expandedDoctor === doc.userId}
                                    onToggle={() => setExpandedDoctor(expandedDoctor === doc.userId ? null : doc.userId)}
                                    onAction={handleAction}
                                    onDelete={async (id, name) => {
                                      if (window.confirm(`Permanently delete doctor "${name}"? This frees up their email.`)) {
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
                                    actioningId={actioningId}
                                  />
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
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
      </section>

      <UserSubscriptionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalTitle}
        users={modalUsers}
        isLoading={isModalLoading}
        onDelete={async (id, name) => {
          if (window.confirm(`Permanently delete doctor "${name}"? This frees up their email.`)) {
            setIsModalLoading(true);
            try {
              await deleteDoctor(id);
              // Refresh modal data
              if (modalTitle === 'Trial Users') {
                setModalUsers(await getTrialUsers());
              } else if (modalTitle === 'Subscribed Users') {
                setModalUsers(await getSubscribedUsers());
              } else {
                setModalUsers(await getAllDoctors());
              }
              await loadAllData(); // Refresh dashboard stats
            } catch {
              alert('Failed to delete.');
            } finally {
              setIsModalLoading(false);
            }
          }
        }}
      />
    </div>
  );
};

// Helper component for nested doctor rows in Clinic Requests
const DoctorDetailRow = ({ doc, isExpanded, onToggle, onAction, onDelete, actioningId }: { 
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
          <p className="text-[11px] text-slate-500">{doc.specialization} • {doc.experience} years exp</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
            doc.approvalStatus === 'approved' ? 'text-emerald-600' : 
            doc.approvalStatus === 'pending' ? 'text-amber-600' : 'text-rose-600'
          }`}>
            {doc.approvalStatus}
          </span>
          <button
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(doc.userId, doc.name);
            }}
            title="Permanently Delete"
          >
            <FiTrash2 size={14} />
          </button>
        </div>
        {isExpanded ? <FiChevronUp size={16} className="text-slate-400" /> : <FiChevronDown size={16} className="text-slate-400" />}
      </div>
    </button>

    {isExpanded && (
      <div className="border-t border-slate-100 bg-white px-5 py-6">
        <div className="grid gap-y-6 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Doctor Name</p>
            <p className="text-sm font-medium text-slate-900">{doc.name}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Phone Number</p>
            <p className="text-sm font-medium text-slate-900">{doc.phone}</p>
          </div>
          <div className="sm:col-span-2 space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Clinic Address</p>
            <p className="text-sm font-medium text-slate-900">{doc.clinicAddress}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">City</p>
            <p className="text-sm font-medium text-slate-900">{doc.city}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Specialization</p>
            <p className="text-sm font-medium text-slate-900">{doc.specialization}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Qualification</p>
            <p className="text-sm font-medium text-slate-900">{doc.qualification}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Experience (Years)</p>
            <p className="text-sm font-medium text-slate-900">{doc.experience}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Consultation Fees</p>
            <p className="text-sm font-bold text-slate-900">₹{doc.consultationFees}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Council Name</p>
            <p className="text-sm font-medium text-slate-900">{doc.medicalCouncilBoard?.split(' ')[0]?.toLowerCase() || 'N/A'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Council Code</p>
            <p className="text-sm font-medium text-slate-900">{doc.medicalRegistrationNumber}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Council Board</p>
            <p className="text-sm font-medium text-slate-900">{doc.medicalCouncilBoard}</p>
          </div>
          <div className="sm:col-span-2 space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">About Doctor</p>
            <p className="text-sm text-slate-600 leading-relaxed">{doc.aboutDoctor || 'No description provided.'}</p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-6">
          <div className="flex gap-4">
            {doc.profileImageUrl && (
              <a className="text-xs font-bold text-emerald-700 hover:underline" href={doc.profileImageUrl} rel="noreferrer" target="_blank">View Photo</a>
            )}
            {doc.certificateUrl && (
              <a className="text-xs font-bold text-emerald-700 hover:underline" href={doc.certificateUrl} rel="noreferrer" target="_blank">View Certificate</a>
            )}
          </div>
          
          <div className="flex gap-2">
            {doc.approvalStatus === 'pending' ? (
              <>
                <button
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                  disabled={actioningId === doc.userId}
                  onClick={() => void onAction(doc.userId, 'approve')}
                >
                  {actioningId === doc.userId ? 'Saving...' : 'Approve Profile'}
                </button>
                <button
                  className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"
                  disabled={actioningId === doc.userId}
                  onClick={() => void onAction(doc.userId, 'reject')}
                >
                  Reject
                </button>
              </>
            ) : (
              <div className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${
                doc.approvalStatus === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              }`}>
                <FiCheck size={14} /> {doc.approvalStatus}
              </div>
            )}
          </div>
        </div>
      </div>
    )}
  </div>
);

export { Dashboard };
