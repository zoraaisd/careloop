import React, { useEffect, useState } from 'react';
import { Download, Eye, Filter, Search, Send, Wallet } from 'lucide-react';
import { supplierApi } from './supplierApi';
import type { Supplier, SupplierInvoice } from './types';
import { formatCurrency, formatDate, statusClass } from './format';

const InvoicesPayments: React.FC = () => {
  const [tab, setTab] = useState<'Invoices' | 'Payments'>('Invoices');
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [supplierId, setSupplierId] = useState('All');
  const [date, setDate] = useState('');

  const load = async () => {
    const [invoiceResponse, supplierResponse] = await Promise.all([supplierApi.invoices(), supplierApi.list()]);
    setInvoices(invoiceResponse.items);
    setSuppliers(supplierResponse.items);
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = invoices.filter((invoice) => {
    const matchesSearch = [invoice.invoiceNumber, invoice.supplierName, invoice.poNumber].filter(Boolean).some((value) => String(value).toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = status === 'All' || invoice.status === status;
    const matchesSupplier = supplierId === 'All' || invoice.supplierId === supplierId;
    const matchesDate = !date || invoice.invoiceDate === date || invoice.dueDate === date;
    return matchesSearch && matchesStatus && matchesSupplier && matchesDate;
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[#142e26]">Invoices & Payments</h1>
        <p className="text-sm text-[#607d74]">Invoice search, supplier filter, payment status filter and payment actions.</p>
      </div>
      <section className="rounded-lg border border-[#dce4e0] bg-white shadow-sm">
        <div className="flex gap-4 border-b border-[#eef3f0] px-4">
          {(['Invoices', 'Payments'] as const).map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={`py-3 text-sm font-bold ${tab === item ? 'border-b-2 border-[#16924d] text-[#13804e]' : 'text-[#607d74]'}`}>{item}</button>)}
        </div>
        <div className="flex flex-wrap gap-3 p-4">
          <div className="relative min-w-72 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8ea59d]" />
            <input className="w-full rounded-lg border border-[#dce4e0] py-2 pl-10 pr-4 text-sm" placeholder="Search invoice number, supplier..." value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <select className="rounded-lg border border-[#dce4e0] px-3 py-2 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}><option>All</option><option>Paid</option><option>Pending</option><option>Partially Paid</option><option>Overdue</option></select>
          <select className="rounded-lg border border-[#dce4e0] px-3 py-2 text-sm" value={supplierId} onChange={(event) => setSupplierId(event.target.value)}><option>All</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.supplierName}</option>)}</select>
          <input className="rounded-lg border border-[#dce4e0] px-3 py-2 text-sm" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          <button className="inline-flex items-center gap-2 rounded-lg border border-[#dce4e0] px-4 py-2 text-sm font-semibold" type="button"><Filter className="h-4 w-4" /> Filter</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f8fbf9] text-xs uppercase text-[#607d74]"><tr>{['Invoice Number', 'Supplier', 'Entry Number', 'Invoice Date', 'Due Date', 'Amount', 'Paid Amount', 'Balance', 'Status', 'Actions'].map((column) => <th className="px-4 py-3" key={column}>{column}</th>)}</tr></thead>
            <tbody className="divide-y divide-[#eef3f0]">
              {filtered.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="px-4 py-3 font-semibold text-[#13804e]">{invoice.invoiceNumber}</td>
                  <td className="px-4 py-3">{invoice.supplierName}</td>
                  <td className="px-4 py-3">{invoice.poNumber || '-'}</td>
                  <td className="px-4 py-3">{formatDate(invoice.invoiceDate)}</td>
                  <td className="px-4 py-3">{formatDate(invoice.dueDate)}</td>
                  <td className="px-4 py-3">{formatCurrency(invoice.amount)}</td>
                  <td className="px-4 py-3">{formatCurrency(invoice.paidAmount)}</td>
                  <td className="px-4 py-3">{formatCurrency(invoice.balance)}</td>
                  <td className="px-4 py-3"><span className={`rounded border px-2 py-1 text-xs font-bold ${statusClass(invoice.status)}`}>{invoice.status}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button title="View Invoice" className="rounded p-2 hover:bg-[#eef3f0]" type="button"><Eye className="h-4 w-4" /></button>
                      <button title="Download PDF" className="rounded p-2 hover:bg-[#eef3f0]" type="button"><Download className="h-4 w-4" /></button>
                      <button title="Record Payment" className="rounded p-2 hover:bg-[#eef3f0]" type="button" onClick={() => void supplierApi.recordPayment(invoice.id, invoice.balance).then(load)}><Wallet className="h-4 w-4" /></button>
                      <button title="Send Reminder" className="rounded p-2 hover:bg-[#eef3f0]" type="button"><Send className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default InvoicesPayments;
