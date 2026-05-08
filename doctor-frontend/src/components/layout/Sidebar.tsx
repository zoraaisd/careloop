import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserRound,
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
          'flex items-center gap-3 px-4 py-2.5 text-[15px] font-medium transition-colors border-l-4',
          isActive
            ? 'bg-green-50 text-green-700 border-green-600'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-transparent'
        )
      }
    >
      {icon}
      {label}
    </NavLink>
  );
};

const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 border-r border-gray-200 bg-white flex flex-col h-screen overflow-y-auto shrink-0">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg border-2 border-green-500 text-green-500 flex items-center justify-center font-bold">
            +
          </div>
          <span className="text-xl font-bold text-blue-900">CareLoop</span>
        </div>
      </div>

      <div className="flex-1 py-6 space-y-8">
        {/* MAIN */}
        <div>
          <h3 className="px-6 text-xs font-semibold text-gray-400 tracking-wider uppercase mb-3">Main</h3>
          <div className="space-y-1">
            <NavItem to="/dashboard" icon={<LayoutDashboard className="w-5 h-5" />} label="Dashboard" />
          </div>
        </div>

        {/* CLINICAL */}
        <div>
          <h3 className="px-6 text-xs font-semibold text-gray-400 tracking-wider uppercase mb-3">Clinical</h3>
          <div className="space-y-1">
            <NavItem to="/patients" icon={<Users className="w-5 h-5" />} label="Patients" />
            <NavItem to="/doctors" icon={<UserRound className="w-5 h-5" />} label="Doctors" />
            <NavItem to="/appointments" icon={<CalendarDays className="w-5 h-5" />} label="Appointments" />
            <NavItem to="/calendar" icon={<Calendar className="w-5 h-5" />} label="Calendar" />
            <NavItem to="/prescriptions" icon={<FileText className="w-5 h-5" />} label="Prescriptions" />
            <NavItem to="/chat" icon={<MessageSquare className="w-5 h-5" />} label="Chat" />
          </div>
        </div>

        {/* MANAGEMENT */}
        <div>
          <h3 className="px-6 text-xs font-semibold text-gray-400 tracking-wider uppercase mb-3">Management</h3>
          <div className="space-y-1">
            <NavItem to="/subscription" icon={<CreditCard className="w-5 h-5" />} label="Subscription" />
            <NavItem to="/inventory" icon={<Package className="w-5 h-5" />} label="Inventory Mgmt" />
            <NavItem to="/activities" icon={<Activity className="w-5 h-5" />} label="Activities & Expenses" />
            <NavItem to="/automation" icon={<Settings className="w-5 h-5" />} label="Automation" />
            <NavItem to="/reports" icon={<BarChart2 className="w-5 h-5" />} label="Reports" />
          </div>
        </div>

        {/* ACCOUNT */}
        <div>
          <h3 className="px-6 text-xs font-semibold text-gray-400 tracking-wider uppercase mb-3">Account</h3>
          <div className="space-y-1">
            <NavItem to="/ticket" icon={<Ticket className="w-5 h-5" />} label="Raise Ticket" />
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

