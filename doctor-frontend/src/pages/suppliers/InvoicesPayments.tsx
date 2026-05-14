import React, { useEffect, useState } from 'react';
import { Download, Eye, Search } from 'lucide-react';
import { supplierApi } from './supplierApi';
import type { SupplierInvoice } from './types';
import { formatCurrency, formatDate, statusClass } from './format';

const InvoicesPayments: React.FC = () => {
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [search, setSearch] = useState('');

  const load = async () => {
    const invoiceResponse = await supplierApi.invoices();
    setInvoices(invoiceResponse.items);
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredInvoices = invoices.filter((invoice) =>
    [invoice.invoiceNumber, invoice.supplierName, invoice.poNumber]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[#142e26]">Invoices & Payments</h1>
        <p className="text-sm text-[#607d74]">Search invoices and manage payment actions.</p>
      </div>
      <section className="rounded-lg border border-[#dce4e0] bg-white shadow-sm">
        <div className="border-b border-[#eef3f0] px-4">
          <div className="inline-flex border-b-2 border-[#16924d] py-3 text-sm font-bold text-[#13804e]">
            Invoices
          </div>
        </div>
        <div className="p-4">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8ea59d]" />
            <input
              className="w-full rounded-lg border border-[#dce4e0] py-2 pl-10 pr-4 text-sm"
              placeholder="Search invoice number, supplier..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f8fbf9] text-xs uppercase text-[#607d74]"><tr>{['Invoice Number', 'Supplier', 'Entry Number', 'Invoice Date', 'Due Date', 'Amount', 'Paid Amount', 'Balance', 'Status', 'Actions'].map((column) => <th className="px-4 py-3" key={column}>{column}</th>)}</tr></thead>
            <tbody className="divide-y divide-[#eef3f0]">
              {filteredInvoices.map((invoice) => (
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
