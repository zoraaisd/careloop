import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Save, X } from 'lucide-react';
import { supplierApi } from './supplierApi';
import type { PurchaseOrder, Supplier } from './types';
import { formatCurrency, formatDate, statusClass } from './format';

type OrderItem = {
  productName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  tax: number;
};

const emptyItem: OrderItem = {
  productName: '',
  category: 'Medicine',
  quantity: 1,
  unitPrice: 0,
  tax: 0,
};

const PurchaseOrders: React.FC = () => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [poDate, setPoDate] = useState(new Date().toISOString().slice(0, 10));
  const [gstNumber, setGstNumber] = useState('');
  const [items, setItems] = useState<OrderItem[]>([{ ...emptyItem, productName: 'Paracetamol 650mg', unitPrice: 45, quantity: 100 }]);

  const load = async () => {
    const [orderResponse, supplierResponse] = await Promise.all([supplierApi.purchaseOrders(), supplierApi.list()]);
    setOrders(orderResponse.items);
    setSuppliers(supplierResponse.items);
    setSupplierId((current) => current || supplierResponse.items[0]?.id || '');
  };

  useEffect(() => {
    void load();
  }, []);

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const tax = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice * item.tax) / 100, 0);
    return { subtotal, tax, grandTotal: subtotal + tax };
  }, [items]);

  const updateItem = (index: number, field: keyof OrderItem, value: string | number) => {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  };

  const saveOrder = async () => {
    if (!supplierId) return;
    await supplierApi.createPurchaseOrder({
      supplierId,
      orderDate: poDate,
      gstNumber,
      items,
      status: 'Confirmed',
    });
    setShowForm(false);
    setGstNumber('');
    setItems([{ ...emptyItem }]);
    await load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#142e26]">Purchase Entry</h1>
          <p className="text-sm text-[#607d74]">Create purchase entries with product line items and totals.</p>
        </div>
        <button type="button" className="inline-flex items-center gap-2 rounded-lg bg-[#16924d] px-4 py-2 text-sm font-semibold text-white" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" /> Create Entry
        </button>
      </div>

      {showForm ? (
        <section className="rounded-lg border border-[#dce4e0] bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-bold text-[#142e26]">Create Purchase Entry</h2>
            <button type="button" onClick={() => setShowForm(false)} className="rounded p-2 hover:bg-[#eef3f0]"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-1"><span className="text-xs font-bold text-[#607d74]">Supplier Name</span><select className="w-full rounded-lg border border-[#dce4e0] px-3 py-2 text-sm" value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.supplierName}</option>)}</select></label>
            <label className="space-y-1"><span className="text-xs font-bold text-[#607d74]">Entry Date</span><input className="w-full rounded-lg border border-[#dce4e0] px-3 py-2 text-sm" type="date" value={poDate} onChange={(event) => setPoDate(event.target.value)} /></label>
            <label className="space-y-1"><span className="text-xs font-bold text-[#607d74]">GST Number</span><input className="w-full rounded-lg border border-[#dce4e0] px-3 py-2 text-sm" value={gstNumber} onChange={(event) => setGstNumber(event.target.value)} /></label>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f8fbf9] text-xs uppercase text-[#607d74]"><tr>{['Product Name', 'Category', 'Quantity', 'Unit Price', 'Tax %', 'Total'].map((column) => <th className="px-3 py-3" key={column}>{column}</th>)}</tr></thead>
              <tbody>
                {items.map((item, index) => {
                  const base = item.quantity * item.unitPrice;
                  const total = base + (base * item.tax) / 100;
                  return (
                    <tr key={index} className="border-b border-[#eef3f0]">
                      <td className="px-3 py-2"><input className="w-48 rounded border border-[#dce4e0] px-2 py-1" value={item.productName} onChange={(event) => updateItem(index, 'productName', event.target.value)} /></td>
                      <td className="px-3 py-2"><select className="rounded border border-[#dce4e0] px-2 py-1" value={item.category} onChange={(event) => updateItem(index, 'category', event.target.value)}><option>Medicine</option><option>Lab Supplies</option><option>Surgical</option><option>Equipment</option></select></td>
                      <td className="px-3 py-2"><input className="w-20 rounded border border-[#dce4e0] px-2 py-1" type="number" value={item.quantity} onChange={(event) => updateItem(index, 'quantity', Number(event.target.value))} /></td>
                      <td className="px-3 py-2"><input className="w-24 rounded border border-[#dce4e0] px-2 py-1" type="number" value={item.unitPrice} onChange={(event) => updateItem(index, 'unitPrice', Number(event.target.value))} /></td>
                      <td className="px-3 py-2"><input className="w-20 rounded border border-[#dce4e0] px-2 py-1" type="number" value={item.tax} onChange={(event) => updateItem(index, 'tax', Number(event.target.value))} /></td>
                      <td className="px-3 py-2 font-bold">{formatCurrency(total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button type="button" className="mt-3 rounded-lg bg-[#ecf8f1] px-4 py-2 text-sm font-bold text-[#13804e]" onClick={() => setItems((current) => [...current, { ...emptyItem }])}>+ Add Item</button>

          <div className="mt-5 flex justify-end">
            <div className="w-full max-w-xs rounded-lg bg-[#f8fbf9] p-4 text-sm">
              <Row label="Subtotal" value={formatCurrency(totals.subtotal)} />
              <Row label="Tax Amount" value={formatCurrency(totals.tax)} />
              <Row label="Grand Total" value={formatCurrency(totals.grandTotal)} strong />
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className="rounded-lg border border-[#dce4e0] px-4 py-2 text-sm font-semibold" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="button" className="inline-flex items-center gap-2 rounded-lg bg-[#16924d] px-4 py-2 text-sm font-semibold text-white" onClick={() => void saveOrder()}><Save className="h-4 w-4" /> Save Entry</button>
          </div>
        </section>
      ) : null}

      <section className="rounded-lg border border-[#dce4e0] bg-white shadow-sm">
        <Table orders={orders} />
      </section>
    </div>
  );
};

const Row = ({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) => (
  <div className={`flex justify-between py-1 ${strong ? 'border-t border-[#dce4e0] pt-3 font-bold' : ''}`}><span>{label}</span><span>{value}</span></div>
);

const Table = ({ orders }: { orders: PurchaseOrder[] }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left text-sm">
      <thead className="bg-[#f8fbf9] text-xs uppercase text-[#607d74]"><tr>{['Entry Number', 'Supplier Name', 'Date', 'Amount', 'Status'].map((column) => <th className="px-4 py-3" key={column}>{column}</th>)}</tr></thead>
      <tbody className="divide-y divide-[#eef3f0]">{orders.map((order) => <tr key={order.id}><td className="px-4 py-3 font-semibold text-[#13804e]">{order.poNumber}</td><td className="px-4 py-3">{order.supplierName}</td><td className="px-4 py-3">{formatDate(order.orderDate)}</td><td className="px-4 py-3">{formatCurrency(order.total)}</td><td className="px-4 py-3"><span className={`rounded border px-2 py-1 text-xs font-bold ${statusClass(order.status)}`}>{order.status}</span></td></tr>)}</tbody>
    </table>
  </div>
);

export default PurchaseOrders;
