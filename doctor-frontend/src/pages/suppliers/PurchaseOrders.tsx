import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Save, X, Upload, Download, FileSpreadsheet, Trash2, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
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

type ImportPreview = {
  items: OrderItem[];
  summary: {
    totalRows: number;
    importedCount: number;
    errorCount: number;
  };
  errors: string[];
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
  const [importing, setImporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);

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

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0 || !supplierId) return;
    
    setImporting(true);
    try {
      const result = await supplierApi.importProducts(acceptedFiles[0]!, supplierId);
      setImportPreview(result);
    } catch (error) {
      console.error('Import failed', error);
      alert('Failed to parse Excel file. Please ensure it follows the correct format.');
    } finally {
      setImporting(false);
    }
  }, [supplierId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    multiple: false,
  });

  const handleConfirmImport = () => {
    if (!importPreview) return;
    setItems((current) => {
      // Remove empty row if it's the only one
      const baseItems = current.length === 1 && !current[0]!.productName ? [] : current;
      return [...baseItems, ...importPreview.items];
    });
    setImportPreview(null);
    setShowImportModal(false);
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

            <div className="mt-6 flex items-center justify-between border-b border-[#dce4e0] pb-3">
              <h3 className="text-sm font-bold text-[#142e26]">Product Items</h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void supplierApi.downloadTemplate()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#dce4e0] bg-white px-3 py-1.5 text-xs font-bold text-[#607d74] transition-colors hover:bg-gray-50"
                >
                  <Download className="h-3.5 w-3.5" /> Template
                </button>
                <button
                  type="button"
                  onClick={() => setShowImportModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#ecf8f1] px-3 py-1.5 text-xs font-bold text-[#13804e] transition-colors hover:bg-[#d9f1e4]"
                >
                  <Upload className="h-3.5 w-3.5" /> Bulk Import
                </button>
              </div>
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
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => setItems((current) => current.filter((_, i) => i !== index))}
                            className="rounded p-1.5 text-red-400 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
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

      {showImportModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#142e26]/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl rounded-3xl bg-white shadow-2xl animate-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-[#dce4e0] p-6">
              <div>
                <h2 className="text-xl font-bold text-[#142e26]">Bulk Product Import</h2>
                <p className="text-sm text-[#607d74]">Upload an Excel or CSV file to add multiple products at once.</p>
              </div>
              <button onClick={() => { setShowImportModal(false); setImportPreview(null); }} className="rounded-full p-2 hover:bg-gray-100">
                <X className="h-6 w-6 text-[#607d74]" />
              </button>
            </div>

            <div className="p-6">
              {!importPreview ? (
                <div 
                  {...getRootProps()} 
                  className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 transition-all ${
                    isDragActive ? 'border-[#16924d] bg-[#f0f9f4]' : 'border-[#dce4e0] hover:border-[#16924d] hover:bg-[#f8fbf9]'
                  } cursor-pointer`}
                >
                  <input {...getInputProps()} />
                  <div className="mb-4 rounded-full bg-[#f0f9f4] p-4 text-[#16924d]">
                    {importing ? <Loader2 className="h-10 w-10 animate-spin" /> : <FileSpreadsheet className="h-10 w-10" />}
                  </div>
                  <p className="mb-2 text-lg font-bold text-[#142e26]">
                    {importing ? 'Processing file...' : 'Drop your file here or click to browse'}
                  </p>
                  <p className="text-sm text-[#607d74]">Supports .xlsx, .xls, and .csv files</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <SummaryCard label="Total Rows" value={importPreview.summary.totalRows} icon={FileSpreadsheet} color="blue" />
                    <SummaryCard label="Ready to Import" value={importPreview.summary.importedCount} icon={CheckCircle2} color="green" />
                    <SummaryCard label="Validation Errors" value={importPreview.summary.errorCount} icon={AlertCircle} color="red" />
                  </div>

                  {importPreview.errors.length > 0 && (
                    <div className="max-h-32 overflow-y-auto rounded-xl bg-red-50 p-4 text-sm text-red-700">
                      <p className="mb-2 font-bold uppercase tracking-wider text-[10px]">Errors found in file:</p>
                      <ul className="list-inside list-disc space-y-1">
                        {importPreview.errors.map((err, i) => <li key={i}>{err}</li>)}
                      </ul>
                    </div>
                  )}

                  <div className="max-h-64 overflow-auto rounded-xl border border-[#dce4e0]">
                    <table className="w-full text-left text-sm">
                      <thead className="sticky top-0 bg-[#f8fbf9] text-xs font-bold uppercase text-[#607d74]">
                        <tr>{['Product', 'Qty', 'Price', 'Tax', 'Total'].map(c => <th key={c} className="px-4 py-3">{c}</th>)}</tr>
                      </thead>
                      <tbody className="divide-y divide-[#eef3f0]">
                        {importPreview.items.map((item, i) => (
                          <tr key={i}>
                            <td className="px-4 py-3 font-medium">{item.productName}</td>
                            <td className="px-4 py-3">{item.quantity}</td>
                            <td className="px-4 py-3">₹{item.unitPrice}</td>
                            <td className="px-4 py-3">{item.tax}%</td>
                            <td className="px-4 py-3 font-bold">₹{item.quantity * item.unitPrice + (item.quantity * item.unitPrice * item.tax / 100)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-[#dce4e0] bg-[#f8fbf9] p-6">
              <button 
                onClick={() => { setShowImportModal(false); setImportPreview(null); }} 
                className="rounded-xl border border-[#dce4e0] bg-white px-6 py-2.5 font-bold text-[#607d74] hover:bg-gray-50"
              >
                Cancel
              </button>
              {importPreview && (
                <button 
                  onClick={handleConfirmImport} 
                  disabled={importPreview.items.length === 0}
                  className="rounded-xl bg-[#16924d] px-8 py-2.5 font-bold text-white shadow-lg transition-all hover:bg-[#127d41] active:scale-95 disabled:opacity-50"
                >
                  Import {importPreview.items.length} Products
                </button>
              )}
            </div>
          </div>
        </div>
      )}

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
  <div className={`flex justify-between py-1 ${strong ? 'border-t border-[#dce4e0] pt-3 font-bold text-base' : ''}`}><span>{label}</span><span>{value}</span></div>
);

const SummaryCard = ({ label, value, icon: Icon, color }: { label: string, value: number, icon: any, color: 'green' | 'red' | 'blue' }) => {
  const styles = {
    green: 'bg-green-50 text-green-700 border-green-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100'
  };
  return (
    <div className={`rounded-2xl border p-4 ${styles[color]}`}>
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 opacity-60" />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
};

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
