import React, { useEffect, useMemo, useState } from 'react';
import api from '@/services/api';

type StatCard = {
  label: string;
  value: number;
  badge: string;
  accent: string;
};

type DashboardResponse = {
  summary: {
    totalPatients: number;
    waVerifiedCount: number;
    appointmentsCount: number;
    prescriptionsCount: number;
    unreadPatientChatsCount: number;
    waMessagesSentCount: number;
  };
  recentActivities: Array<{ activityId: string; message: string }>;
  pendingPatientChats: Array<{ chatId: string; patientName: string }>;
  todaysAppointments: Array<{ appointmentId: string; patientName: string; time: string }>;
};

const emptySummary = {
  totalPatients: 0,
  waVerifiedCount: 0,
  appointmentsCount: 0,
  prescriptionsCount: 0,
  unreadPatientChatsCount: 0,
  waMessagesSentCount: 0,
};

const cardMeta: Array<{ label: string; key: keyof typeof emptySummary; badge: string; accent: string }> = [
  { label: 'Total Patients', key: 'totalPatients', badge: '+0', accent: 'bg-[#32bb73]' },
  { label: 'WA Verified', key: 'waVerifiedCount', badge: 'verified', accent: 'bg-[#5b65ff]' },
  { label: 'Appointments', key: 'appointmentsCount', badge: 'scheduled', accent: 'bg-[#f2b94d]' },
  { label: 'Prescriptions', key: 'prescriptionsCount', badge: 'active', accent: 'bg-[#00b189]' },
  { label: 'WA Messages', key: 'waMessagesSentCount', badge: 'sent', accent: 'bg-[#9375ff]' },
];

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(emptySummary);
  const [recentActivities, setRecentActivities] = useState<Array<{ activityId: string; message: string }>>([]);
  const [pendingChats, setPendingChats] = useState<Array<{ chatId: string; patientName: string }>>([]);
  const [todaysAppointments, setTodaysAppointments] = useState<Array<{ appointmentId: string; patientName: string; time: string }>>([]);

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const response = await api.get<DashboardResponse>('/doctor/dashboard');
        setSummary(response.data?.summary ?? emptySummary);
        setRecentActivities(response.data?.recentActivities ?? []);
        setPendingChats(response.data?.pendingPatientChats ?? []);
        setTodaysAppointments(response.data?.todaysAppointments ?? []);
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
        setSummary(emptySummary);
        setRecentActivities([]);
        setPendingChats([]);
        setTodaysAppointments([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchDashboard();
  }, []);

  const statCards: StatCard[] = useMemo(
    () =>
      cardMeta.map((meta) => ({
        label: meta.label,
        value: summary[meta.key] ?? 0,
        badge: meta.badge,
        accent: meta.accent,
      })),
    [summary],
  );

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        {statCards.map((card) => (
          <article
            key={card.label}
            className="rounded-[12px] border border-[#bfd0c8] bg-[#f5f8f6] p-4 min-h-[112px] flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className={`h-2.5 w-2.5 rounded-full ${card.accent}`} />
              <span className="text-[12px] text-[#6a837c]">{card.badge}</span>
            </div>
            <div>
              <p className="text-[40px] leading-none font-semibold text-[#132b24]">
                {loading ? '-' : card.value}
              </p>
              <p className="text-[13px] text-[#23453b] mt-1">{card.label}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-3">
        <article className="rounded-[12px] border border-[#bfd0c8] bg-[#f5f8f6] p-4 min-h-[104px] xl:col-span-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[15px] font-semibold text-[#132a22]">Recent Activity</h2>
            <button type="button" className="text-[14px] text-[#285246] hover:underline">
              View all -&gt;
            </button>
          </div>
          <p className="text-center text-[13px] text-[#7a918a]">
            {loading ? 'Loading...' : recentActivities[0]?.message ?? 'No activity yet'}
          </p>
        </article>

        <article className="rounded-[12px] border border-[#bfd0c8] bg-[#f5f8f6] p-4 min-h-[104px] xl:col-span-3">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[15px] font-semibold text-[#132a22]">Pending Patient Chats</h2>
            <button type="button" className="text-[14px] text-[#285246] hover:underline">
              Open Chat -&gt;
            </button>
          </div>
          <p className="text-center text-[13px] text-[#7a918a]">
            {loading ? 'Loading...' : pendingChats.length > 0 ? `${pendingChats.length} pending chats` : 'No pending messages'}
          </p>
        </article>

        <article className="rounded-[12px] border border-[#bfd0c8] bg-[#f5f8f6] p-4 min-h-[104px] xl:col-span-3">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[15px] font-semibold text-[#132a22]">Today&apos;s Appointments</h2>
            <button type="button" className="text-[14px] text-[#285246] hover:underline">
              All -&gt;
            </button>
          </div>
          <p className="text-center text-[13px] text-[#7a918a]">
            {loading
              ? 'Loading...'
              : todaysAppointments.length > 0
                ? `${todaysAppointments.length} appointments scheduled`
                : 'No appointments scheduled'}
          </p>
        </article>
      </section>

      <div className="min-h-[180px]" />
    </div>
  );
};

export default Dashboard;
