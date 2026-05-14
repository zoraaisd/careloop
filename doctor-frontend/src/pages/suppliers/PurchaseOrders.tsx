import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Save, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supplierApi } from './supplierApi';
import type { PurchaseOrder, Supplier } from './types';
import { formatCurrency, formatDate } from './format';

type OrderItem = {
  productName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  tax: number;
};

const createEmptyItem = (category = 'Medicine'): OrderItem => ({
  productName: '',
  category,
  quantity: 1,
  unitPrice: 0,
  tax: 5,
});

const paymentStatuses = ['Pending', 'Paid', 'Partially Paid'];

const orderRank = (order: PurchaseOrder) => new Date(order.createdAt || order.orderDate).getTime();

const PurchaseOrders: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [poDate, setPoDate] = useState(new Date().toISOString().slice(0, 10));
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('Pending');
  const [gstNumber, setGstNumber] = useState('');
  const [items, setItems] = useState<OrderItem[]>([createEmptyItem()]);

  const loadOrders = async () => {
    const orderResponse = await supplierApi.purchaseOrders();
    setOrders(orderResponse.items);
    return orderResponse.items;
  };

  const loadSuppliers = async () => {
    const supplierResponse = await supplierApi.list();
    setSuppliers(supplierResponse.items);
    setSupplierId((current) => current || supplierResponse.items[0]?.id || '');
    return supplierResponse.items;
  };

  useEffect(() => {
    void Promise.all([loadOrders(), loadSuppliers()]);
  }, []);

  const selectedSupplierCategory = useMemo(
    () => suppliers.find((supplier) => supplier.id === supplierId)?.category || 'Medicine',
    [supplierId, suppliers],
  );

  const resetForm = (nextSupplierId?: string) => {
    const resolvedSupplierId = nextSupplierId || suppliers[0]?.id || '';
    const resolvedCategory = suppliers.find((supplier) => supplier.id === resolvedSupplierId)?.category || 'Medicine';
    setSupplierId(resolvedSupplierId);
    setPoDate(new Date().toISOString().slice(0, 10));
    setInvoiceNumber('');
    setPaymentStatus('Pending');
    setGstNumber('');
    setItems([createEmptyItem(resolvedCategory)]);
  };

  const openNewPurchase = async (nextSupplierId?: string) => {
    let availableSuppliers = suppliers;
    if (suppliers.length === 0) {
      availableSuppliers = await loadSuppliers();
    }
    const resolvedSupplierId = nextSupplierId || availableSuppliers[0]?.id || '';
    const resolvedCategory = availableSuppliers.find((supplier) => supplier.id === resolvedSupplierId)?.category || 'Medicine';
    setSupplierId(resolvedSupplierId);
    setPoDate(new Date().toISOString().slice(0, 10));
    setInvoiceNumber('');
    setPaymentStatus('Pending');
    setGstNumber('');
    setItems([createEmptyItem(resolvedCategory)]);
    setShowForm(true);
  };

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const tax = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice * item.tax) / 100, 0);
    return { subtotal, tax, grandTotal: subtotal + tax };
  }, [items]);

  const groupedOrders = useMemo(() => {
    const supplierMap = new Map<string, PurchaseOrder>();

    orders.forEach((order) => {
      const existing = supplierMap.get(order.supplierId);
      if (!existing) {
        supplierMap.set(order.supplierId, order);
        return;
      }

      const firstOrder = orderRank(order) < orderRank(existing) ? order : existing;
      const latestOrder = orderRank(order) >= orderRank(existing) ? order : existing;

      supplierMap.set(order.supplierId, {
        ...firstOrder,
        invoiceNumber: latestOrder.invoiceNumber,
        orderDate: latestOrder.orderDate,
        total: latestOrder.total,
        createdAt: firstOrder.createdAt,
      });
    });

    return Array.from(supplierMap.values()).sort((left, right) => orderRank(left) - orderRank(right));
  }, [orders]);

  const updateItem = (index: number, field: keyof OrderItem, value: string | number) => {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  };

  const handleSupplierChange = (nextSupplierId: string) => {
    const nextCategory = suppliers.find((supplier) => supplier.id === nextSupplierId)?.category || 'Medicine';
    setSupplierId(nextSupplierId);
    setItems((current) =>
      current.map((item) => ({
        ...item,
        category: nextCategory,
      })),
    );
  };

  const saveOrder = async () => {
    if (!supplierId) return;
    if (!invoiceNumber.trim()) {
      alert('Please enter invoice number');
      return;
    }
    await supplierApi.createPurchaseOrder({
      supplierId,
      orderDate: poDate,
      invoiceNumber: invoiceNumber.trim(),
      paymentStatus,
      gstNumber,
      items,
      status: 'Confirmed',
    });
    setShowForm(false);
    resetForm();
    await Promise.all([loadOrders(), loadSuppliers()]);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#142e26]">Purchase Entry</h1>
          <p className="text-sm text-[#607d74]">Create purchase entries with product line items and totals.</p>
        </div>
        <button type="button" className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#16924d] px-4 py-2 text-sm font-semibold text-white sm:w-auto" onClick={() => void openNewPurchase()}>
          <Plus className="h-4 w-4" /> Create Entry
        </button>
      </div>

      {showForm ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-[#142e26]/35 p-4 pt-10">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-2xl border border-[#dce4e0] bg-white p-4 shadow-2xl sm:p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="font-bold text-[#142e26]">Create New Purchase</h2>
              <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="rounded p-2 hover:bg-[#eef3f0]"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="space-y-1"><span className="text-xs font-bold text-[#607d74]">Supplier Name</span><select className="w-full rounded-lg border border-[#dce4e0] px-3 py-2 text-sm" value={supplierId} onChange={(event) => handleSupplierChange(event.target.value)}>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.supplierName}</option>)}</select></label>
              <label className="space-y-1"><span className="text-xs font-bold text-[#607d74]">Invoice Number</span><input className="w-full rounded-lg border border-[#dce4e0] px-3 py-2 text-sm" value={invoiceNumber} onChange={(event) => setInvoiceNumber(event.target.value)} placeholder="Enter invoice number" /></label>
              <label className="space-y-1"><span className="text-xs font-bold text-[#607d74]">Purchase Date</span><input className="w-full rounded-lg border border-[#dce4e0] px-3 py-2 text-sm" type="date" value={poDate} onChange={(event) => setPoDate(event.target.value)} /></label>
              <label className="space-y-1"><span className="text-xs font-bold text-[#607d74]">Payment Status</span><select className="w-full rounded-lg border border-[#dce4e0] px-3 py-2 text-sm" value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)}>{paymentStatuses.map((item) => <option key={item}>{item}</option>)}</select></label>
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
                        <td className="px-3 py-2">
                          <input
                            className="w-28 rounded border border-[#dce4e0] bg-[#f8fbf9] px-2 py-1 text-[#607d74]"
                            value={item.category}
                            readOnly
                          />
                        </td>
                        <td className="px-3 py-2"><input className="w-20 rounded border border-[#dce4e0] px-2 py-1" type="number" value={item.quantity} onChange={(event) => updateItem(index, 'quantity', Number(event.target.value))} /></td>
                        <td className="px-3 py-2"><input className="w-24 rounded border border-[#dce4e0] px-2 py-1" type="number" value={item.unitPrice} onChange={(event) => updateItem(index, 'unitPrice', Number(event.target.value))} /></td>
                        <td className="px-3 py-2"><input className="w-20 rounded border border-[#dce4e0] bg-[#f8fbf9] px-2 py-1 text-[#607d74]" type="number" value={item.tax} readOnly /></td>
                        <td className="px-3 py-2 font-bold">{formatCurrency(total)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <button type="button" className="mt-3 rounded-lg bg-[#ecf8f1] px-4 py-2 text-sm font-bold text-[#13804e]" onClick={() => setItems((current) => [...current, createEmptyItem(selectedSupplierCategory)])}>+ Add Item</button>

            <div className="mt-5 flex justify-end">
              <div className="w-full max-w-xs rounded-lg bg-[#f8fbf9] p-4 text-sm">
                <Row label="Total Product Amount" value={formatCurrency(totals.subtotal)} />
                <Row label="Tax Amount" value={formatCurrency(totals.tax)} />
                <Row label="Total Amount" value={formatCurrency(totals.grandTotal)} strong />
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button type="button" className="rounded-lg border border-[#dce4e0] px-4 py-2 text-sm font-semibold" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</button>
              <button type="button" className="inline-flex items-center gap-2 rounded-lg bg-[#16924d] px-4 py-2 text-sm font-semibold text-white" onClick={() => void saveOrder()}><Save className="h-4 w-4" /> Save Purchase</button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="rounded-lg border border-[#dce4e0] bg-white shadow-sm">
        <Table
          orders={groupedOrders}
          onNewPurchase={(nextSupplierId) => void openNewPurchase(nextSupplierId)}
          onOpenHistory={(nextSupplierId) => navigate(`/suppliers/${nextSupplierId}?tab=Purchase Entry`)}
        />
      </section>
    </div>
  );
};

const Row = ({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) => (
  <div className={`flex justify-between py-1 ${strong ? 'border-t border-[#dce4e0] pt-3 font-bold' : ''}`}><span>{label}</span><span>{value}</span></div>
);

const Table = ({ orders, onNewPurchase, onOpenHistory }: { orders: PurchaseOrder[]; onNewPurchase: (supplierId: string) => void; onOpenHistory: (supplierId: string) => void }) => (
  <>
    <div className="space-y-3 xl:hidden">
      {orders.map((order) => (
        <div key={order.id} className="rounded-lg border border-[#eef3f0] bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-[#13804e]">{order.poNumber}</p>
              <p className="mt-1 text-sm font-semibold text-[#142e26]">{order.supplierName}</p>
            </div>
            <button type="button" className="inline-flex items-center gap-2 rounded-lg bg-[#ecf8f1] px-3 py-2 text-xs font-bold text-[#13804e]" onClick={() => onNewPurchase(order.supplierId)}>
              <Plus className="h-3.5 w-3.5" /> New Purchase
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-[#f8fbf9] px-3 py-2"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#607d74]">Invoice</p><p className="mt-1 font-medium">{order.invoiceNumber || '-'}</p></div>
            <div className="rounded-lg bg-[#f8fbf9] px-3 py-2"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#607d74]">Date</p><p className="mt-1 font-medium">{formatDate(order.orderDate)}</p></div>
            <div className="rounded-lg bg-[#f8fbf9] px-3 py-2 col-span-2"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#607d74]">Amount</p><p className="mt-1 font-medium">{formatCurrency(order.total)}</p></div>
          </div>
          <button type="button" className="mt-4 text-sm font-semibold text-[#13804e]" onClick={() => onOpenHistory(order.supplierId)}>Open History</button>
        </div>
      ))}
    </div>
    <div className="hidden overflow-x-auto xl:block">
    <table className="w-full text-left text-sm">
      <thead className="bg-[#f8fbf9] text-xs uppercase text-[#607d74]"><tr>{['Entry Number', 'Invoice Number', 'Supplier Name', 'Last Date', 'Amount', 'Actions'].map((column) => <th className="px-4 py-3" key={column}>{column}</th>)}</tr></thead>
      <tbody className="divide-y divide-[#eef3f0]">
        {orders.map((order) => (
          <tr key={order.id} className="cursor-pointer hover:bg-[#f8fbf9]" onClick={() => onOpenHistory(order.supplierId)}>
            <td className="px-4 py-3 font-semibold text-[#13804e]">{order.poNumber}</td>
            <td className="px-4 py-3">{order.invoiceNumber || ''}</td>
            <td className="px-4 py-3 font-semibold text-[#13804e]">{order.supplierName}</td>
            <td className="px-4 py-3">{formatDate(order.orderDate)}</td>
            <td className="px-4 py-3">{formatCurrency(order.total)}</td>
            <td className="px-4 py-3">
              <button type="button" className="inline-flex items-center gap-2 rounded-lg bg-[#ecf8f1] px-3 py-2 text-xs font-bold text-[#13804e]" onClick={(event) => { event.stopPropagation(); onNewPurchase(order.supplierId); }}>
                <Plus className="h-3.5 w-3.5" /> New Purchase
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  </>
);

export default PurchaseOrders;
