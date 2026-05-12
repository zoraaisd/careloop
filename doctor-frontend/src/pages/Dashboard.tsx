import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  BadgeIndianRupee,
  CalendarClock,
  CheckCircle2,
  ClipboardPlus,
  MessageCircleMore,
  Plus,
  ShieldCheck,
  Stethoscope,
  UserRoundPlus,
  Users,
} from 'lucide-react';
import api from '@/services/api';
import { getAuthSession } from '@/services/auth-storage';
import { subscribeToDashboardRefresh } from '@/services/dashboard-refresh';

type DashboardResponse = {
  summary: {
    totalPatients: number;
    waVerifiedCount: number;
    appointmentsCount: number;
    prescriptionsCount: number;
    unreadPatientChatsCount: number;
    waMessagesSentCount: number;
  };
  recentActivities: Array<{
    activityId: string;
    type: string;
    message: string;
    createdAt: string;
  }>;
  pendingPatientChats: Array<{
    chatId: string;
    patientName: string;
    unreadCount: number;
    lastMessage: string;
    lastMessageAt: string | null;
  }>;
  todaysAppointments: Array<{
    appointmentId: string;
    patientName: string;
    doctorName: string;
    time: string;
    status: string;
  }>;
  currentDoctor: {
    doctorId: string | null;
    doctorName: string;
  } | null;
};

type AppointmentRow = {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  patientName: string;
  doctorName: string;
  date: string;
  time: string;
  status: string;
  billingAmount?: number | string | null;
};

type AppointmentListResponse = {
  total: number;
  items: AppointmentRow[];
};

type ReportResponse = {
  summary: {
    newPatients: number;
    appointments: number;
    revenue: number;
    expenses: number;
    net: number;
    averageBilling: number;
  };
};

type StatCard = {
  label: string;
  value: number;
  helper: string;
  icon: React.ReactNode;
  iconClassName: string;
  to: string;
};

const emptyDashboard: DashboardResponse = {
  summary: {
    totalPatients: 0,
    waVerifiedCount: 0,
    appointmentsCount: 0,
    prescriptionsCount: 0,
    unreadPatientChatsCount: 0,
    waMessagesSentCount: 0,
  },
  recentActivities: [],
  pendingPatientChats: [],
  todaysAppointments: [],
  currentDoctor: null,
};

const emptyReport: ReportResponse = {
  summary: {
    newPatients: 0,
    appointments: 0,
    revenue: 0,
    expenses: 0,
    net: 0,
    averageBilling: 0,
  },
};

const statMeta: Array<{
  label: string;
  value: (dashboard: DashboardResponse) => number;
  helper: (dashboard: DashboardResponse) => string;
  icon: React.ReactNode;
  iconClassName: string;
  to: string;
}> = [
  {
    label: 'Total Patients',
    value: (dashboard) => dashboard.summary.totalPatients,
    helper: () => '↑ 20% from last month',
    icon: <Users className="h-6 w-6" />,
    iconClassName: 'bg-[#eaf8f0] text-[#16924d]',
    to: '/patients',
  },
  {
    label: 'WA Verified',
    value: (dashboard) => dashboard.summary.waVerifiedCount,
    helper: (dashboard) =>
      dashboard.summary.totalPatients > 0
        ? `${Math.round((dashboard.summary.waVerifiedCount / dashboard.summary.totalPatients) * 100)}% verified`
        : 'No verifications yet',
    icon: <ShieldCheck className="h-6 w-6" />,
    iconClassName: 'bg-[#eef4ff] text-[#3873ff]',
    to: '/patients',
  },
  {
    label: 'Appointments',
    value: (dashboard) => dashboard.summary.appointmentsCount,
    helper: () => '↑ 50% from last week',
    icon: <CalendarClock className="h-6 w-6" />,
    iconClassName: 'bg-[#fff4e9] text-[#f59e0b]',
    to: '/appointments',
  },
  {
    label: 'Prescriptions',
    value: (dashboard) => dashboard.summary.prescriptionsCount,
    helper: () => '↑ 25% from last week',
    icon: <ClipboardPlus className="h-6 w-6" />,
    iconClassName: 'bg-[#f5efff] text-[#8b5cf6]',
    to: '/prescriptions',
  },
  {
    label: 'WA Messages',
    value: (dashboard) => dashboard.summary.waMessagesSentCount,
    helper: (dashboard) =>
      dashboard.summary.unreadPatientChatsCount > 0
        ? `${dashboard.summary.unreadPatientChatsCount} unread replies`
        : 'No new messages',
    icon: <MessageCircleMore className="h-6 w-6" />,
    iconClassName: 'bg-[#edf9f4] text-[#1ba751]',
    to: '/chat',
  },
];

const formatCompactTime = (value: string) => {
  const normalized = value.trim();
  if (/^\d{1,2}:\d{2}\s?(AM|PM)$/i.test(normalized)) {
    return normalized.toUpperCase();
  }

  if (!/^\d{2}:\d{2}$/.test(normalized)) {
    return value;
  }

  const [hourText, minuteText] = normalized.split(':');
  const rawHour = Number(hourText);
  const hour12 = rawHour % 12 || 12;
  const period = rawHour >= 12 ? 'PM' : 'AM';
  return `${hour12}:${minuteText} ${period}`;
};

const formatActivityTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Recently';
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

const getDateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseMoney = (value: number | string | null | undefined) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const buildWeeklySeries = (appointments: AppointmentRow[]) => {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return {
      key: getDateKey(date),
      label: date.toLocaleDateString('en-US', { weekday: 'short' }),
      value: 0,
    };
  });

  const counts = new Map<string, number>();
  appointments.forEach((appointment) => {
    const currentValue = counts.get(appointment.date) ?? 0;
    counts.set(appointment.date, currentValue + 1);
  });

  return days.map((day) => ({
    label: day.label,
    value: counts.get(day.key) ?? 0,
  }));
};

const buildChart = (series: Array<{ label: string; value: number }>) => {
  const width = 520;
  const height = 180;
  const safeMax = Math.max(...series.map((point) => point.value), 1);
  const stepX = width / Math.max(series.length - 1, 1);

  const points = series.map((point, index) => {
    const x = index * stepX;
    const y = height - (point.value / safeMax) * (height - 20) - 10;
    return { ...point, x, y };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1]?.x ?? width} ${height} L ${points[0]?.x ?? 0} ${height} Z`;

  return { width, height, points, linePath, areaPath, maxValue: safeMax };
};

const getAppointmentVariant = (status: string) => {
  const normalized = status.toLowerCase();
  if (normalized === 'done') return 'completed';
  if (normalized === 'cancelled') return 'cancelled';
  if (normalized === 'no_show' || normalized === 'no-show' || normalized === 'noshow') return 'no-show';
  return 'scheduled';
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardResponse>(emptyDashboard);
  const [report, setReport] = useState<ReportResponse>(emptyReport);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);

  useEffect(() => {
    let isMounted = true;
    let inFlight = false;

    const fetchDashboard = async (showLoader = false) => {
      if (inFlight) {
        return;
      }

      inFlight = true;
      if (showLoader && isMounted) {
        setLoading(true);
      }

      try {
        const today = getDateKey(new Date());
        const monthStart = new Date();
        monthStart.setDate(monthStart.getDate() - 29);
        const from = getDateKey(monthStart);

        const [dashboardResponse, reportResponse, appointmentResponse] = await Promise.all([
          api.get<DashboardResponse>('/doctor/dashboard'),
          api.get<ReportResponse>(`/doctor/reports?dateFrom=${from}&dateTo=${today}`),
          api.get<AppointmentListResponse | AppointmentRow[]>('/doctor/appointments'),
        ]);

        if (!isMounted) {
          return;
        }

        setDashboard(dashboardResponse.data ?? emptyDashboard);
        setReport(reportResponse.data ?? emptyReport);

        const appointmentPayload = appointmentResponse.data;
        setAppointments(Array.isArray(appointmentPayload) ? appointmentPayload : appointmentPayload?.items ?? []);
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
        if (isMounted) {
          setDashboard(emptyDashboard);
          setReport(emptyReport);
          setAppointments([]);
        }
      } finally {
        inFlight = false;
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    const handleWindowFocus = () => {
      void fetchDashboard(false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void fetchDashboard(false);
      }
    };

    const unsubscribe = subscribeToDashboardRefresh(() => {
      void fetchDashboard(false);
    });

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void fetchDashboard(false);
      }
    }, 30000);

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    void fetchDashboard(true);

    return () => {
      isMounted = false;
      unsubscribe();
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const session = getAuthSession();

  const weeklySeries = buildWeeklySeries(appointments);
  const chart = buildChart(weeklySeries);

  const completedCount = appointments.filter((appointment) => getAppointmentVariant(appointment.status) === 'completed').length;
  const scheduledCount = appointments.filter((appointment) => getAppointmentVariant(appointment.status) === 'scheduled').length;
  const cancelledCount = appointments.filter((appointment) => getAppointmentVariant(appointment.status) === 'cancelled').length;
  const noShowCount = appointments.filter((appointment) => getAppointmentVariant(appointment.status) === 'no-show').length;
  const totalAppointmentSummary = completedCount + scheduledCount + cancelledCount + noShowCount;

  const completedPercent = totalAppointmentSummary > 0 ? Math.round((completedCount / totalAppointmentSummary) * 100) : 0;
  const scheduledPercent = totalAppointmentSummary > 0 ? Math.round((scheduledCount / totalAppointmentSummary) * 100) : 0;
  const cancelledPercent = totalAppointmentSummary > 0 ? Math.round((cancelledCount / totalAppointmentSummary) * 100) : 0;
  const noShowPercent =
    totalAppointmentSummary > 0 ? Math.max(100 - completedPercent - scheduledPercent - cancelledPercent, 0) : 0;

  const donutStyle = {
    background:
      totalAppointmentSummary > 0
        ? `conic-gradient(#67d391 0% ${completedPercent}%, #9ec5fe ${completedPercent}% ${
            completedPercent + scheduledPercent
          }%, #facc15 ${completedPercent + scheduledPercent}% ${
            completedPercent + scheduledPercent + cancelledPercent
          }%, #a855f7 ${completedPercent + scheduledPercent + cancelledPercent}% 100%)`
        : 'conic-gradient(#e8eeee 0% 100%)',
  };

  const topDoctors = Array.from(
    appointments.reduce((map, appointment) => {
      const current = map.get(appointment.doctorName) ?? {
        name: appointment.doctorName || 'Doctor',
        appointments: 0,
        revenue: 0,
      };
      current.appointments += 1;
      current.revenue += parseMoney(appointment.billingAmount);
      map.set(appointment.doctorName, current);
      return map;
    }, new Map<string, { name: string; appointments: number; revenue: number }>()),
  )
    .map((entry) => entry[1])
    .sort((left, right) => right.appointments - left.appointments)
    .slice(0, 3);

  const statCards: StatCard[] = statMeta.map((meta) => ({
    label: meta.label,
    value: meta.value(dashboard),
    helper: meta.helper(dashboard),
    icon: meta.icon,
    iconClassName: meta.iconClassName,
    to: meta.to,
  }));

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {statCards.map((card) => (
          <button
            key={card.label}
            type="button"
            onClick={() => navigate(card.to)}
            className="min-h-[126px] rounded-2xl border border-[#e8eeee] bg-white p-5 text-left shadow-[0_8px_22px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-[#cfe6d8]"
          >
            <div className="flex items-start gap-5">
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${card.iconClassName}`}>
                {card.icon}
              </div>
              <div className="min-w-0">
                <p className="text-[28px] font-semibold leading-none text-[#0d1815]">{loading ? '-' : card.value}</p>
                <p className="mt-3 text-[14px] font-medium text-[#465a53]">{card.label}</p>
                <p
                  className={`mt-3 text-xs font-medium ${
                    card.helper.startsWith('↑') ? 'text-[#148f50]' : 'text-[#6f827a]'
                  }`}
                >
                  {loading ? 'Loading...' : card.helper}
                </p>
              </div>
            </div>
          </button>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.7fr_1fr_0.9fr]">
        <article className="rounded-2xl border border-[#e8eeee] bg-white p-5 shadow-[0_8px_22px_rgba(15,23,42,0.045)]">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[17px] font-semibold text-[#0d1815]">Overview</h3>
            <button
              type="button"
              onClick={() => navigate('/appointments')}
              className="rounded-lg border border-[#e7ece9] bg-white px-4 py-2 text-sm font-medium text-[#0d1815] transition hover:border-[#cfe6d8] hover:text-[#149e5b]"
            >
              This Week
            </button>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
            <button
              type="button"
              onClick={() => navigate('/patients')}
              className="text-left transition hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-2 text-[#3873ff]">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eef7ff]">
                  <UserRoundPlus className="h-4 w-4" />
                </span>
                <span className="text-sm font-medium text-[#465a53]">New Patients</span>
              </div>
              <p className="mt-1 pl-10 text-[19px] font-semibold leading-none text-[#0d1815]">{loading ? '-' : report.summary.newPatients}</p>
              <p className="mt-2 pl-10 text-xs font-medium text-[#149e5b]">↑ 100%</p>
            </button>
            <button
              type="button"
              onClick={() => navigate('/appointments')}
              className="text-left transition hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-2 text-[#f59e0b]">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fff8e9]">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <span className="text-sm font-medium text-[#465a53]">Completed Appts</span>
              </div>
              <p className="mt-1 pl-10 text-[19px] font-semibold leading-none text-[#0d1815]">{loading ? '-' : completedCount}</p>
              <p className="mt-2 pl-10 text-xs font-medium text-[#149e5b]">↑ 33%</p>
            </button>
            <button
              type="button"
              onClick={() => navigate('/activities')}
              className="text-left transition hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-2 text-[#149e5b]">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#edf9f4]">
                  <BadgeIndianRupee className="h-4 w-4" />
                </span>
                <span className="text-sm font-medium text-[#465a53]">Total Revenue</span>
              </div>
              <p className="mt-1 pl-10 text-[19px] font-semibold leading-none text-[#0d1815]">
                {loading ? '-' : `₹ ${report.summary.revenue.toLocaleString('en-IN')}`}
              </p>
              <p className="mt-2 pl-10 text-xs font-medium text-[#149e5b]">↑ 28%</p>
            </button>
            <button
              type="button"
              onClick={() => navigate('/activities')}
              className="text-left transition hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-2 text-[#eab308]">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fffbe8]">
                  <Activity className="h-4 w-4" />
                </span>
                <span className="text-sm font-medium text-[#465a53]">Avg. Billing</span>
              </div>
              <p className="mt-1 pl-10 text-[19px] font-semibold leading-none text-[#0d1815]">
                {loading ? '-' : `₹ ${Math.round(report.summary.averageBilling).toLocaleString('en-IN')}`}
              </p>
              <p className="mt-2 pl-10 text-xs font-medium text-[#149e5b]">↑ 12%</p>
            </button>
          </div>

          <button
            type="button"
            onClick={() => navigate('/appointments')}
            className="mt-5 block w-full text-left transition hover:-translate-y-0.5"
          >
            <svg className="h-[190px] w-full" viewBox={`0 0 ${chart.width} ${chart.height + 30}`} preserveAspectRatio="none">
              <defs>
                <linearGradient id="dashboardArea" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#62d391" stopOpacity="0.42" />
                  <stop offset="100%" stopColor="#62d391" stopOpacity="0.04" />
                </linearGradient>
              </defs>
              {[0, 1, 2, 3].map((index) => {
                const y = ((chart.height - 10) / 4) * index + 10;
                return <line key={index} x1="0" x2={chart.width} y1={y} y2={y} stroke="#ebf2ee" strokeWidth="1" />;
              })}
              <path d={chart.areaPath} fill="url(#dashboardArea)" />
              <path d={chart.linePath} fill="none" stroke="#19a953" strokeWidth="3" strokeLinecap="round" />
              {chart.points.map((point) => (
                <g key={point.label}>
                  <circle cx={point.x} cy={point.y} fill="#19a953" r="4.5" />
                  <text x={point.x} y={chart.height + 20} fill="#70857d" fontSize="12" textAnchor="middle">
                    {point.label}
                  </text>
                </g>
              ))}
            </svg>
          </button>
        </article>

        <article className="rounded-2xl border border-[#e8eeee] bg-white p-5 shadow-[0_8px_22px_rgba(15,23,42,0.045)]">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[17px] font-semibold text-[#0d1815]">Today's Schedule</h3>
            <button type="button" onClick={() => navigate('/calendar')} className="text-sm font-semibold text-[#149e5b]">
              View Calendar
            </button>
          </div>

          <div className="mt-5 divide-y divide-[#edf2ef]">
            {loading ? (
              <div className="rounded-xl border border-dashed border-[#d6e4dd] bg-[#f8fbf9] px-4 py-8 text-center text-sm text-[#7b8f87]">
                Loading schedule...
              </div>
            ) : dashboard.todaysAppointments.length > 0 ? (
              dashboard.todaysAppointments.slice(0, 4).map((appointment) => (
                <button
                  key={appointment.appointmentId}
                  type="button"
                  onClick={() => navigate('/calendar')}
                  className="flex w-full items-center justify-between gap-3 py-4 text-left transition hover:bg-[#f8fcfa]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#edf3ff] text-base font-semibold text-[#3873ff]">
                      {appointment.patientName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#183229]">{appointment.patientName}</p>
                      <p className="text-sm text-[#6f827a]">{appointment.status}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-[#ecf8f1] px-3 py-1.5 text-xs font-semibold text-[#16924d]">
                    {formatCompactTime(appointment.time)}
                  </span>
                </button>
              ))
            ) : (
              <button
                type="button"
                onClick={() => navigate('/calendar')}
                className="w-full rounded-2xl border border-dashed border-[#d6e4dd] bg-[#f8fbf9] px-4 py-8 text-center"
              >
                <p className="text-sm font-semibold text-[#27453a]">No appointments scheduled</p>
                <p className="mt-1 text-xs text-[#799086]">Your next booking will show here.</p>
              </button>
            )}
          </div>

          {!loading && dashboard.todaysAppointments.length > 4 ? (
            <button type="button" onClick={() => navigate('/calendar')} className="mt-4 text-sm font-semibold text-[#149e5b]">
              +{dashboard.todaysAppointments.length - 4} more appointments
            </button>
          ) : null}
        </article>

        <article className="rounded-2xl border border-[#e8eeee] bg-white p-5 shadow-[0_8px_22px_rgba(15,23,42,0.045)]">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[17px] font-semibold text-[#0d1815]">Pending Patient Chats</h3>
            <button type="button" onClick={() => navigate('/chat')} className="text-sm font-semibold text-[#149e5b]">
              Open Chat
            </button>
          </div>

          <div className="mt-6 flex min-h-[255px] flex-col items-center justify-center px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#e8f8ef] text-[#1ba751]">
              <MessageCircleMore className="h-8 w-8" />
            </div>
            {loading ? (
              <p className="mt-6 text-sm text-[#7b8f87]">Loading chats...</p>
            ) : dashboard.pendingPatientChats.length > 0 ? (
              <div className="mt-6 w-full space-y-3">
                {dashboard.pendingPatientChats.slice(0, 3).map((chat) => (
                  <button
                    key={chat.chatId}
                    type="button"
                    onClick={() => navigate('/chat')}
                    className="block w-full rounded-2xl border border-[#edf3ef] bg-white px-4 py-3 text-left transition hover:border-[#cfe6d8]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-[#183229]">{chat.patientName}</p>
                      <span className="rounded-full bg-[#ecf8f1] px-2.5 py-1 text-xs font-semibold text-[#16924d]">
                        {chat.unreadCount} unread
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-[#758780]">{chat.lastMessage || 'New patient reply available'}</p>
                  </button>
                ))}
              </div>
            ) : (
              <>
                <p className="mt-6 text-base font-semibold text-[#183229]">No pending messages</p>
                <p className="mt-2 text-sm text-[#7a8d85]">You're all caught up!</p>
              </>
            )}
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1.2fr_1fr]">
        <article className="rounded-2xl border border-[#e8eeee] bg-white p-5 shadow-[0_8px_22px_rgba(15,23,42,0.045)]">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[17px] font-semibold text-[#0d1815]">Recent Activity</h3>
            <button type="button" onClick={() => navigate('/activities')} className="text-sm font-semibold text-[#149e5b]">
              View All
            </button>
          </div>

          <div className="mt-5 space-y-4">
            {loading ? (
              Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="mt-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eff8f3] text-[#16924d]">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-56 rounded-full bg-[#eef3f0]" />
                    <div className="h-3 w-24 rounded-full bg-[#f2f6f4]" />
                  </div>
                </div>
              ))
            ) : dashboard.recentActivities.length > 0 ? (
              dashboard.recentActivities.slice(0, 4).map((activity) => (
                <button
                  key={activity.activityId}
                  type="button"
                  onClick={() => navigate('/activities')}
                  className="flex w-full items-start gap-3 rounded-2xl p-2 text-left transition hover:bg-[#f8fbf9]"
                >
                  <div className="mt-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eff8f3] text-[#16924d]">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-base font-medium text-[#183229]">{activity.message}</p>
                    <p className="mt-1 text-sm text-[#7a8d85]">{formatActivityTime(activity.createdAt)}</p>
                  </div>
                </button>
              ))
            ) : (
              <button
                type="button"
                onClick={() => navigate('/activities')}
                className="w-full rounded-2xl bg-[#f8fbf9] px-4 py-5 text-left text-sm text-[#7a8d85]"
              >
                No activity recorded yet.
              </button>
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-[#e8eeee] bg-white p-5 shadow-[0_8px_22px_rgba(15,23,42,0.045)]">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[17px] font-semibold text-[#0d1815]">Appointments Summary</h3>
            <button
              type="button"
              onClick={() => navigate('/appointments')}
              className="rounded-lg border border-[#e7ece9] bg-white px-4 py-2 text-sm font-medium text-[#0d1815] transition hover:border-[#cfe6d8] hover:text-[#149e5b]"
            >
              This Week
            </button>
          </div>

          <button
            type="button"
            onClick={() => navigate('/appointments')}
            className="mt-6 flex w-full flex-col items-center justify-center gap-6 text-left lg:flex-row lg:items-center"
          >
            <div
              className="relative mx-auto flex aspect-square w-full max-w-[220px] items-center justify-center rounded-full sm:max-w-[240px]"
              style={donutStyle}
            >
              <div className="flex aspect-square w-[60%] flex-col items-center justify-center rounded-full bg-white shadow-[inset_0_0_0_1px_rgba(230,239,234,1)]">
                <span className="text-[clamp(2rem,6vw,2.75rem)] font-semibold leading-none text-[#132b24]">
                  {loading ? '-' : totalAppointmentSummary}
                </span>
                <span className="text-sm text-[#6f827a]">Total</span>
              </div>
            </div>
            <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="flex min-w-0 items-center justify-between gap-3 rounded-2xl bg-[#f8fbf9] px-4 py-3 text-sm">
                <div className="flex items-center gap-2 text-[#4f655d]">
                  <span className="h-3 w-3 rounded-full bg-[#67d391]" />
                  Completed
                </div>
                <span className="font-medium text-[#1e332c]">{completedCount} ({completedPercent}%)</span>
              </div>
              <div className="flex min-w-0 items-center justify-between gap-3 rounded-2xl bg-[#f8fbf9] px-4 py-3 text-sm">
                <div className="flex items-center gap-2 text-[#4f655d]">
                  <span className="h-3 w-3 rounded-full bg-[#9ec5fe]" />
                  Scheduled
                </div>
                <span className="font-medium text-[#1e332c]">{scheduledCount} ({scheduledPercent}%)</span>
              </div>
              <div className="flex min-w-0 items-center justify-between gap-3 rounded-2xl bg-[#f8fbf9] px-4 py-3 text-sm">
                <div className="flex items-center gap-2 text-[#4f655d]">
                  <span className="h-3 w-3 rounded-full bg-[#facc15]" />
                  Cancelled
                </div>
                <span className="font-medium text-[#1e332c]">{cancelledCount} ({cancelledPercent}%)</span>
              </div>
              <div className="flex min-w-0 items-center justify-between gap-3 rounded-2xl bg-[#f8fbf9] px-4 py-3 text-sm">
                <div className="flex items-center gap-2 text-[#4f655d]">
                  <span className="h-3 w-3 rounded-full bg-[#a855f7]" />
                  No Show
                </div>
                <span className="font-medium text-[#1e332c]">{noShowCount} ({noShowPercent}%)</span>
              </div>
            </div>
          </button>
        </article>

        <article className="rounded-2xl border border-[#e8eeee] bg-white p-5 shadow-[0_8px_22px_rgba(15,23,42,0.045)]">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[17px] font-semibold text-[#0d1815]">Top Doctors (This Month)</h3>
            <button type="button" onClick={() => navigate('/appointments')} className="text-sm font-semibold text-[#149e5b]">
              View All
            </button>
          </div>

          <div className="mt-5 space-y-4">
            {(topDoctors.length > 0
              ? topDoctors
              : [
                  {
                    name: dashboard.currentDoctor?.doctorName || session?.name || 'Doctor',
                    appointments: dashboard.summary.appointmentsCount,
                    revenue: report.summary.revenue,
                  },
                ]
            ).map((doctor, index) => (
              <button
                key={`${doctor.name}-${index}`}
                type="button"
                onClick={() => navigate('/appointments')}
                className="flex w-full items-center justify-between gap-3 rounded-2xl p-2 text-left transition hover:bg-[#f8fbf9]"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold ${
                      index === 0
                        ? 'bg-[#e8f8ef] text-[#149e5b]'
                        : index === 1
                          ? 'bg-[#edf3ff] text-[#3873ff]'
                          : 'bg-[#fff1e8] text-[#ea7a15]'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-base font-semibold text-[#183229]">{doctor.name}</p>
                    <p className="text-sm text-[#7a8d85]">
                      {index === 0 ? 'Cardiology' : index === 1 ? 'General Physician' : 'Orthopedics'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[28px] font-semibold leading-none text-[#132b24]">{doctor.appointments}</p>
                  <p className="text-sm text-[#7a8d85]">Appointments</p>
                </div>
              </button>
            ))}
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-[#e8eeee] bg-white p-5 shadow-[0_8px_22px_rgba(15,23,42,0.045)]">
        <h3 className="text-[17px] font-semibold text-[#0d1815]">Quick Actions</h3>
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-6">
          {[
            { label: 'Add Patient', to: '/patients', tone: 'border-[#cfe8d7] bg-[#f3fbf6] text-[#149e5b]', icon: <Plus className="h-4 w-4" /> },
            { label: 'New Appointment', to: '/appointments', tone: 'border-[#d9e6ff] bg-[#f5f8ff] text-[#3873ff]', icon: <CalendarClock className="h-4 w-4" /> },
            { label: 'New Prescription', to: '/prescriptions', tone: 'border-[#eadcff] bg-[#faf5ff] text-[#8b5cf6]', icon: <ClipboardPlus className="h-4 w-4" /> },
            { label: 'Send Message', to: '/chat', tone: 'border-[#cfead9] bg-[#f1fbf5] text-[#16924d]', icon: <MessageCircleMore className="h-4 w-4" /> },
            { label: 'Add Expense', to: '/activities', tone: 'border-[#ffe8c7] bg-[#fff9ed] text-[#d49117]', icon: <BadgeIndianRupee className="h-4 w-4" /> },
            { label: 'Raise Ticket', to: '/ticket', tone: 'border-[#ffe2bf] bg-[#fff7ed] text-[#ea7a15]', icon: <Stethoscope className="h-4 w-4" /> },
          ].map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => navigate(action.to)}
              className={`inline-flex min-h-11 items-center justify-center gap-3 rounded-lg border px-4 py-3 text-sm font-semibold transition hover:-translate-y-0.5 ${action.tone}`}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
