import React, { useEffect, useState } from 'react';
import { ClipboardList, CreditCard, Eye, Pencil, Plus, Power, Search, Trash2, Truck, Users } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supplierApi } from './supplierApi';
import type { Supplier, SupplierDashboard } from './types';
import { formatCurrency, statusClass } from './format';

const SupplierList: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [dashboard, setDashboard] = useState<SupplierDashboard | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadSuppliers = async () => {
    const response = await supplierApi.list(search ? { search } : undefined);
    setSuppliers(response.items);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void loadSuppliers(), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    void supplierApi.dashboard().then(setDashboard);
  }, []);

  useEffect(() => {
    const supplierNotice = (location.state as { supplierNotice?: string } | null)?.supplierNotice;
    if (!supplierNotice) return;

    setNotice(supplierNotice);
    void supplierApi.dashboard().then(setDashboard);
    window.history.replaceState({}, document.title);
    const timer = window.setTimeout(() => setNotice(null), 3000);
    return () => window.clearTimeout(timer);
  }, [location.state]);

  const refreshDashboard = async () => {
    const data = await supplierApi.dashboard();
    setDashboard(data);
  };

  const handleStatusToggle = async (supplier: Supplier) => {
    const nextStatus = supplier.status === 'Active' ? 'Inactive' : 'Active';
    await supplierApi.update(supplier.id, { status: nextStatus });
    await Promise.all([loadSuppliers(), refreshDashboard()]);
    setNotice(nextStatus === 'Active' ? 'Supplier activated successfully' : 'Supplier deactivated successfully');
  };

  const handleDelete = async (supplierId: string) => {
    await supplierApi.delete(supplierId);
    await Promise.all([loadSuppliers(), refreshDashboard()]);
    setNotice('Supplier deleted successfully');
  };

  return (
    <div className="space-y-5">
      {notice ? (
        <div className="fixed right-6 top-24 z-50 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 shadow-lg">
          {notice}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#142e26]">Supplier List</h1>
          <p className="text-sm text-[#607d74]">Search and manage suppliers.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Total Suppliers',
            value: dashboard?.summary.totalSuppliers ?? suppliers.length,
            icon: Truck,
            tone: 'bg-emerald-50 text-emerald-600',
          },
          {
            label: 'Active Suppliers',
            value: dashboard?.summary.activeSuppliers ?? suppliers.filter((supplier) => supplier.status === 'Active').length,
            icon: Users,
            tone: 'bg-emerald-50 text-emerald-600',
          },
          {
            label: 'Pending Orders',
            value: dashboard?.summary.pendingOrders ?? 0,
            icon: ClipboardList,
            tone: 'bg-amber-50 text-amber-600',
          },
          {
            label: 'Pending Payments',
            value: formatCurrency(dashboard?.summary.pendingPayments ?? 0),
            icon: CreditCard,
            tone: 'bg-red-50 text-red-600',
          },
        ].map((card) => (
          <div key={card.label} className="rounded-lg border border-[#dce4e0] bg-white p-4 shadow-sm">
            <div className={`mb-4 inline-flex rounded-lg p-2 ${card.tone}`}>
              <card.icon className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-[#607d74]">{card.label}</p>
            <p className="mt-1 truncate text-xl font-bold text-[#142e26]">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-[#dce4e0] bg-white shadow-sm">
        <div className="border-b border-[#eef3f0] p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative max-w-xl flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8ea59d]" />
              <input className="w-full rounded-lg border border-[#dce4e0] py-2 pl-10 pr-4 text-sm outline-none focus:border-[#16924d]" placeholder="Search supplier name, contact, code..." value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Link className="inline-flex items-center gap-2 rounded-lg bg-[#16924d] px-4 py-2 text-sm font-semibold text-white" to="/suppliers/add">
                <Plus className="h-4 w-4" /> Add Supplier
              </Link>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f8fbf9] text-xs uppercase text-[#607d74]">
              <tr>
                <th className="px-4 py-3">Supplier Code</th>
                <th className="px-4 py-3">Supplier Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Contact Person</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef3f0]">
              {suppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-[#f8fbf9]">
                  <td className="px-4 py-3 font-semibold text-[#13804e]">{supplier.supplierCode}</td>
                  <td className="px-4 py-3 font-semibold">{supplier.supplierName}</td>
                  <td className="px-4 py-3">{supplier.category}</td>
                  <td className="px-4 py-3">{supplier.contactPerson || '-'}</td>
                  <td className="px-4 py-3">{supplier.phone || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded border px-2 py-1 text-xs font-bold ${statusClass(supplier.status)}`}>{supplier.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button title="View" className="rounded p-2 hover:bg-[#eef3f0]" onClick={() => navigate(`/suppliers/${supplier.id}`)} type="button"><Eye className="h-4 w-4" /></button>
                      <button title="Edit" className="rounded p-2 hover:bg-[#eef3f0]" onClick={() => navigate(`/suppliers/add?edit=${supplier.id}`)} type="button"><Pencil className="h-4 w-4" /></button>
                      <button
                        title={supplier.status === 'Active' ? 'Deactivate' : 'Activate'}
                        className={`rounded p-2 hover:bg-[#eef3f0] ${supplier.status === 'Active' ? '' : 'text-[#13804e]'}`}
                        onClick={() => void handleStatusToggle(supplier)}
                        type="button"
                      >
                        <Power className="h-4 w-4" />
                      </button>
                      <button title="Delete" className="rounded p-2 text-red-600 hover:bg-red-50" onClick={() => void handleDelete(supplier.id)} type="button"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SupplierList;
