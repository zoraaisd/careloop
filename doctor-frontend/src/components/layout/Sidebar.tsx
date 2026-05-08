import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarDays,
  Calendar,
  FileText,
  MessageSquare,
  CreditCard,
  Package,
  Activity,
  Settings,
  BarChart2,
  Ticket,
} from 'lucide-react';
import clsx from 'clsx';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label }) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-2.5 px-3 py-2 text-[14px] font-medium transition-colors border-l-2',
          isActive
            ? 'bg-[#c8e8d2] text-[#13804e] border-[#8ac7a2]'
            : 'text-[#32534a] hover:bg-[#eef5f1] hover:text-[#173a31] border-transparent'
        )
      }
    >
      <span className="text-[#43685e]">{icon}</span>
      {label}
    </NavLink>
  );
};

const Sidebar: React.FC = () => {
  return (
    <aside className="w-[216px] border-r border-[#bfd0c8] bg-[#f4f8f6] flex flex-col h-screen overflow-hidden shrink-0">
      <div className="h-[72px] flex items-center px-5 border-b border-[#bfd0c8] flex-shrink-0 bg-[#f4f8f6]">
        <img alt="CareLoop" className="h-12 w-auto object-contain" src="/mainlogo.png" />
      </div>

      <div className="flex-1 py-5 space-y-7 overflow-y-auto">
        <div>
          <h3 className="px-2 text-[11px] font-semibold text-[#68857b] tracking-[0.12em] uppercase mb-2">Main</h3>
          <div className="space-y-1">
            <NavItem to="/dashboard" icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard" />
          </div>
        </div>

        <div>
          <h3 className="px-2 text-[11px] font-semibold text-[#68857b] tracking-[0.12em] uppercase mb-2">Clinical</h3>
          <div className="space-y-1">
            <NavItem to="/patients" icon={<Users className="w-4 h-4" />} label="Patients" />
            <NavItem to="/clinic" icon={<Building2 className="w-4 h-4" />} label="Clinic" />
            <NavItem to="/appointments" icon={<CalendarDays className="w-4 h-4" />} label="Appointments" />
            <NavItem to="/calendar" icon={<Calendar className="w-4 h-4" />} label="Calendar" />
            <NavItem to="/prescriptions" icon={<FileText className="w-4 h-4" />} label="Prescriptions" />
            <NavItem to="/chat" icon={<MessageSquare className="w-4 h-4" />} label="Chat" />
          </div>
        </div>

        <div>
          <h3 className="px-2 text-[11px] font-semibold text-[#68857b] tracking-[0.12em] uppercase mb-2">Management</h3>
          <div className="space-y-1">
            <NavItem to="/subscription" icon={<CreditCard className="w-4 h-4" />} label="Subscription" />
            <NavItem to="/inventory" icon={<Package className="w-4 h-4" />} label="Inventory Mgmt" />
            <NavItem to="/activities" icon={<Activity className="w-4 h-4" />} label="Activities & Expenses" />
            <NavItem to="/automation" icon={<Settings className="w-4 h-4" />} label="Automation" />
            <NavItem to="/reports" icon={<BarChart2 className="w-4 h-4" />} label="Reports" />
          </div>
        </div>

        <div>
          <h3 className="px-2 text-[11px] font-semibold text-[#68857b] tracking-[0.12em] uppercase mb-2">Account</h3>
          <div className="space-y-1">
            <NavItem to="/ticket" icon={<Ticket className="w-4 h-4" />} label="Raise Ticket" />
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
