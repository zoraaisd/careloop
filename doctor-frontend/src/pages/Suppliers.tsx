import React, { useEffect, useMemo, useState } from 'react';
import { Building2, MapPin, Package, Phone, RefreshCcw, Search, Truck } from 'lucide-react';
import api from '@/services/api';

type InventoryItem = {
  inventoryItemId: string;
  itemName: string;
  vendor: string | null;
  purchasePrice: number;
  stockQuantity: number;
  updatedAt: string;
};

type InventoryResponse = {
  items: InventoryItem[];
};

type SupplierSummary = {
  name: string;
  itemCount: number;
  totalStock: number;
  estimatedPurchaseValue: number;
  lastUpdatedAt: string | null;
};

const Suppliers: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadInventory = async () => {
    setLoading(true);
    try {
      const response = await api.get<InventoryResponse>('/doctor/inventory');
      setInventory(response.data?.items ?? []);
    } catch (error) {
      console.error('Failed to fetch supplier data', error);
      setInventory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadInventory();
  }, []);

  const suppliers = useMemo<SupplierSummary[]>(() => {
    const grouped = new Map<string, SupplierSummary>();

    inventory.forEach((item) => {
      const supplierName = item.vendor?.trim() || 'Unassigned Supplier';
      const existing = grouped.get(supplierName);
      const estimatedPurchaseValue = item.purchasePrice * item.stockQuantity;

      if (existing) {
        existing.itemCount += 1;
        existing.totalStock += item.stockQuantity;
        existing.estimatedPurchaseValue += estimatedPurchaseValue;
        if (!existing.lastUpdatedAt || new Date(item.updatedAt) > new Date(existing.lastUpdatedAt)) {
          existing.lastUpdatedAt = item.updatedAt;
        }
        return;
      }

      grouped.set(supplierName, {
        name: supplierName,
        itemCount: 1,
        totalStock: item.stockQuantity,
        estimatedPurchaseValue,
        lastUpdatedAt: item.updatedAt,
      });
    });

    return Array.from(grouped.values())
      .filter((supplier) => supplier.name.toLowerCase().includes(search.toLowerCase()))
      .sort((left, right) => right.itemCount - left.itemCount);
  }, [inventory, search]);

  const trackedSuppliers = suppliers.filter((supplier) => supplier.name !== 'Unassigned Supplier').length;
  const assignedItems = inventory.filter((item) => Boolean(item.vendor?.trim())).length;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#142e26]">Suppliers</h1>
          <p className="text-sm text-[#607d74]">Track supplier-linked inventory and identify items that still need vendor mapping.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8ea59d]" />
            <input
              type="text"
              placeholder="Search suppliers..."
              className="w-64 rounded-xl border border-[#dce4e0] bg-white py-2 pl-10 pr-4 text-sm shadow-sm focus:border-[#1faa62] focus:outline-none focus:ring-2 focus:ring-[#1faa62]/20"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={() => void loadInventory()}
            className="flex items-center gap-2 rounded-xl border border-[#dce4e0] bg-white px-4 py-2 text-sm font-semibold text-[#173a31] shadow-sm transition hover:bg-[#eef5f1]"
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Tracked Suppliers', value: trackedSuppliers, icon: Truck, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Assigned Items', value: assignedItems, icon: Package, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Supplier Groups', value: suppliers.length, icon: Building2, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Need Mapping', value: inventory.length - assignedItems, icon: MapPin, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((card) => (
          <div key={card.label} className="flex items-center justify-between rounded-2xl border border-[#dce4e0] bg-white p-5 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#607d74]">{card.label}</p>
              <p className="mt-2 text-2xl font-bold text-[#142e26]">{card.value}</p>
            </div>
            <div className={`rounded-2xl p-3 ${card.bg}`}>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#dce4e0] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#dce4e0] px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-[#142e26]">Supplier Directory</h2>
            <p className="text-xs text-[#607d74]">Built from current inventory vendor mapping.</p>
          </div>
          <span className="rounded-full bg-[#eef7f1] px-3 py-1 text-xs font-semibold text-[#16924d]">
            {suppliers.length} listed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#f8fbf9] text-xs uppercase tracking-[0.14em] text-[#607d74]">
              <tr>
                <th className="px-5 py-4">Supplier</th>
                <th className="px-5 py-4">Items</th>
                <th className="px-5 py-4">Stock Units</th>
                <th className="px-5 py-4">Est. Purchase Value</th>
                <th className="px-5 py-4">Last Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef3f0]">
              {loading ? (
                <tr>
                  <td className="px-5 py-16 text-center text-sm text-[#8ea59d]" colSpan={5}>
                    Loading supplier directory...
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td className="px-5 py-16 text-center text-sm text-[#8ea59d]" colSpan={5}>
                    No supplier records found for the current inventory.
                  </td>
                </tr>
              ) : (
                suppliers.map((supplier) => (
                  <tr key={supplier.name} className="hover:bg-[#f8fbf9]">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-[#142e26]">{supplier.name}</p>
                      <div className="mt-1 flex items-center gap-1 text-xs text-[#8ea59d]">
                        <Phone className="h-3.5 w-3.5" />
                        Contact details can be linked in vendor inventory records.
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-[#173a31]">{supplier.itemCount}</td>
                    <td className="px-5 py-4 text-sm text-[#32534a]">{supplier.totalStock}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-[#142e26]">
                      Rs. {Math.round(supplier.estimatedPurchaseValue).toLocaleString('en-IN')}
                    </td>
                    <td className="px-5 py-4 text-sm text-[#607d74]">
                      {supplier.lastUpdatedAt ? new Date(supplier.lastUpdatedAt).toLocaleDateString('en-IN') : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Suppliers;
