import React, { useEffect, useState } from 'react';
import { ClipboardList, CreditCard, RefreshCcw, Truck, Users } from 'lucide-react';
import { supplierApi } from './supplierApi';
import type { SupplierDashboard as SupplierDashboardData } from './types';
import { formatCurrency } from './format';

const emptyDashboard: SupplierDashboardData = {
  summary: {
    totalSuppliers: 0,
    activeSuppliers: 0,
    pendingOrders: 0,
    pendingPayments: 0,
    monthlyPurchaseAmount: 0,
    topSupplier: '-',
  },
  purchaseTrend: [],
  orderStatusOverview: [],
  paymentOverview: [],
  recentPurchaseOrders: [],
  topSuppliers: [],
};

const SupplierDashboard: React.FC = () => {
  const [data, setData] = useState<SupplierDashboardData>(emptyDashboard);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      setData(await supplierApi.dashboard());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const summaryCards = [
    { label: 'Total Suppliers', value: data.summary.totalSuppliers, icon: Truck, helper: '+12 this month', tone: 'bg-emerald-50 text-emerald-600' },
    { label: 'Active Suppliers', value: data.summary.activeSuppliers, icon: Users, helper: '+8 this month', tone: 'bg-emerald-50 text-emerald-600' },
    { label: 'Pending Orders', value: data.summary.pendingOrders, icon: ClipboardList, helper: 'View details', tone: 'bg-amber-50 text-amber-600' },
    { label: 'Pending Payments', value: formatCurrency(data.summary.pendingPayments), icon: CreditCard, helper: 'View details', tone: 'bg-red-50 text-red-600' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#142e26]">Supplier Dashboard</h1>
          <p className="text-sm text-[#607d74]">Purchases, payments, orders and supplier performance.</p>
        </div>
        <button
          type="button"
          onClick={() => void loadDashboard()}
          className="inline-flex items-center gap-2 rounded-lg border border-[#dce4e0] bg-white px-4 py-2 text-sm font-semibold text-[#173a31] shadow-sm"
        >
          <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-lg border border-[#dce4e0] bg-white p-4 shadow-sm">
            <div className={`mb-4 inline-flex rounded-lg p-2 ${card.tone}`}>
              <card.icon className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-[#607d74]">{card.label}</p>
            <p className="mt-1 truncate text-xl font-bold text-[#142e26]">{card.value}</p>
            <p className="mt-2 text-xs font-semibold text-[#16924d]">{card.helper}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SupplierDashboard;
