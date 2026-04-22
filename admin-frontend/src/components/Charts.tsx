import type { ReactNode } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const chartColors = {
  green600: '#16A34A',
  green500: '#22C55E',
  green300: '#86EFAC',
  slate400: '#94A3B8',
};

const systemActivityData = [
  { day: 'Mon', logins: 430, tasks: 180 },
  { day: 'Tue', logins: 510, tasks: 210 },
  { day: 'Wed', logins: 470, tasks: 205 },
  { day: 'Thu', logins: 560, tasks: 228 },
  { day: 'Fri', logins: 640, tasks: 260 },
  { day: 'Sat', logins: 420, tasks: 175 },
  { day: 'Sun', logins: 390, tasks: 160 },
];

const newClinicData = [
  { month: 'Jan', clinics: 14 },
  { month: 'Feb', clinics: 18 },
  { month: 'Mar', clinics: 21 },
  { month: 'Apr', clinics: 26 },
  { month: 'May', clinics: 23 },
  { month: 'Jun', clinics: 29 },
];

type RevenueTrendDatum = {
  month: string;
  monthly: number;
  yearly: number;
};

type RevenueDistributionDatum = {
  name: string;
  value: number;
};

const ChartCard = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm transition duration-200 hover:border-emerald-300 hover:shadow-[0_12px_30px_-18px_rgba(22,163,74,0.45)] sm:p-5">
    <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
    <div className="mt-4 h-72 w-full">{children}</div>
  </section>
);

const SystemActivityChart = () => (
  <ChartCard title="System Activity Graph">
    <ResponsiveContainer height="100%" width="100%">
      <LineChart data={systemActivityData}>
        <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
        <XAxis dataKey="day" tick={{ fill: chartColors.slate400, fontSize: 12 }} />
        <YAxis tick={{ fill: chartColors.slate400, fontSize: 12 }} />
        <Tooltip />
        <Legend />
        <Line dataKey="logins" name="Admin & Clinic Logins" stroke={chartColors.green600} strokeWidth={2.5} />
        <Line dataKey="tasks" name="Resolved Tasks" stroke={chartColors.green500} strokeWidth={2.5} />
      </LineChart>
    </ResponsiveContainer>
  </ChartCard>
);

const NewClinicRegistrationsChart = () => (
  <ChartCard title="New Clinic Registrations Chart">
    <ResponsiveContainer height="100%" width="100%">
      <AreaChart data={newClinicData}>
        <defs>
          <linearGradient id="clinicGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={chartColors.green500} stopOpacity={0.8} />
            <stop offset="100%" stopColor={chartColors.green500} stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
        <XAxis dataKey="month" tick={{ fill: chartColors.slate400, fontSize: 12 }} />
        <YAxis tick={{ fill: chartColors.slate400, fontSize: 12 }} />
        <Tooltip />
        <Area
          dataKey="clinics"
          fill="url(#clinicGradient)"
          name="New Clinics"
          stroke={chartColors.green600}
          strokeWidth={2.5}
          type="monotone"
        />
      </AreaChart>
    </ResponsiveContainer>
  </ChartCard>
);

const RevenueTrendChart = ({
  data,
}: {
  data: RevenueTrendDatum[];
}) => (
  <ChartCard title="Revenue Growth Trend">
    <ResponsiveContainer height="100%" width="100%">
      <BarChart data={data}>
        <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" />
        <XAxis dataKey="month" tick={{ fill: chartColors.slate400, fontSize: 12 }} />
        <YAxis tick={{ fill: chartColors.slate400, fontSize: 12 }} />
        <Tooltip />
        <Legend />
        <Bar dataKey="monthly" fill={chartColors.green500} name="Monthly Revenue" radius={[8, 8, 0, 0]} />
        <Bar dataKey="yearly" fill={chartColors.green300} name="Yearly Accumulation" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </ChartCard>
);

const ClinicRevenueDistributionChart = ({
  data,
}: {
  data: RevenueDistributionDatum[];
}) => (
  <ChartCard title="Clinic Revenue Distribution">
    <ResponsiveContainer height="100%" width="100%">
      <PieChart>
        <Tooltip />
        <Legend />
        <Pie cx="50%" cy="45%" data={data} dataKey="value" innerRadius={60} outerRadius={90} label>
          {data.map((entry, index) => (
            <Cell
              fill={[chartColors.green600, chartColors.green500, chartColors.green300][index % 3]}
              key={entry.name}
            />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  </ChartCard>
);

export {
  ClinicRevenueDistributionChart,
  NewClinicRegistrationsChart,
  RevenueTrendChart,
  SystemActivityChart,
};
