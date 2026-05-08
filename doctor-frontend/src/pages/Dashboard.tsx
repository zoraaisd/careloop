import React from 'react';

type StatCard = {
  label: string;
  value: string;
  badge: string;
  accent: string;
};

const statCards: StatCard[] = [
  { label: 'Total Patients', value: '2', badge: '+0', accent: 'bg-[#32bb73]' },
  { label: 'WA Verified', value: '0', badge: 'verified', accent: 'bg-[#5b65ff]' },
  { label: 'Appointments', value: '0', badge: 'scheduled', accent: 'bg-[#f2b94d]' },
  { label: 'Prescriptions', value: '0', badge: 'active', accent: 'bg-[#00b189]' },
  { label: 'WA Messages', value: '0', badge: 'sent', accent: 'bg-[#9375ff]' },
];

const Dashboard: React.FC = () => {
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
              <p className="text-[40px] leading-none font-semibold text-[#132b24]">{card.value}</p>
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
          <p className="text-center text-[13px] text-[#7a918a]">No activity yet</p>
        </article>

        <article className="rounded-[12px] border border-[#bfd0c8] bg-[#f5f8f6] p-4 min-h-[104px] xl:col-span-3">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[15px] font-semibold text-[#132a22]">Pending Patient Chats</h2>
            <button type="button" className="text-[14px] text-[#285246] hover:underline">
              Open Chat -&gt;
            </button>
          </div>
          <p className="text-center text-[13px] text-[#7a918a]">No pending messages</p>
        </article>

        <article className="rounded-[12px] border border-[#bfd0c8] bg-[#f5f8f6] p-4 min-h-[104px] xl:col-span-3">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[15px] font-semibold text-[#132a22]">Today&apos;s Appointments</h2>
            <button type="button" className="text-[14px] text-[#285246] hover:underline">
              All -&gt;
            </button>
          </div>
          <p className="text-center text-[13px] text-[#7a918a]">No appointments scheduled</p>
        </article>
      </section>

      <div className="min-h-[180px]" />
    </div>
  );
};

export default Dashboard;
