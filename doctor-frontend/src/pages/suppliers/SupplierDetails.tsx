import React, { useEffect, useState } from 'react';
import { ArrowLeft, Download } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { supplierApi } from './supplierApi';
import type { SupplierDetailsResponse } from './types';
import { formatCurrency, formatDate, statusClass } from './format';

const tabs = ['Profile', 'Purchase Entry', 'Documents'];
const paymentStatuses = ['Pending', 'Paid', 'Partially Paid'];

const SupplierDetails: React.FC = () => {
  const { supplierId } = useParams();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<SupplierDetailsResponse | null>(null);
  const initialTab = tabs.includes(searchParams.get('tab') || '') ? searchParams.get('tab') || tabs[0] : tabs[0];
  const [tab, setTab] = useState(initialTab);

  const loadSupplier = async () => {
    if (supplierId) {
      setData(await supplierApi.details(supplierId));
    }
  };

  useEffect(() => {
    void loadSupplier();
  }, [supplierId]);

  useEffect(() => {
    const nextTab = tabs.includes(searchParams.get('tab') || '') ? searchParams.get('tab') || tabs[0] : tabs[0];
    setTab(nextTab);
  }, [searchParams]);

  if (!data) {
    return <div className="rounded-lg border border-[#dce4e0] bg-white p-8 text-center text-[#607d74]">Loading supplier details...</div>;
  }

  const { supplier } = data;
  const address = [supplier.addressLine1, supplier.city, supplier.state, supplier.pincode].filter(Boolean).join(', ');

  return (
    <div className="space-y-5">
      <Link to="/suppliers/purchase-orders" className="inline-flex items-center gap-1 text-sm font-semibold text-[#13804e]"><ArrowLeft className="h-4 w-4" /> Back to Purchase</Link>
      <section className="rounded-lg border border-[#dce4e0] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-[#142e26]">{supplier.supplierName}</h1>
              <span className={`rounded border px-2 py-1 text-xs font-bold ${statusClass(supplier.status)}`}>{supplier.status}</span>
            </div>
            <p className="mt-1 text-sm text-[#607d74]">{supplier.supplierCode} / {supplier.category}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-[#f8fbf9] p-4"><p className="text-xs text-[#607d74]">Total Orders</p><p className="text-xl font-bold">{data.stats.totalOrders}</p></div>
            <div className="rounded-lg bg-[#f8fbf9] p-4"><p className="text-xs text-[#607d74]">Total Purchase</p><p className="text-xl font-bold">{formatCurrency(data.stats.totalPurchaseAmount)}</p></div>
            <div className="rounded-lg bg-[#f8fbf9] p-4"><p className="text-xs text-[#607d74]">Pending Payment</p><p className="text-xl font-bold">{formatCurrency(data.stats.pendingPayment)}</p></div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-[#dce4e0] bg-white shadow-sm">
        <div className="flex overflow-x-auto border-b border-[#eef3f0]">
          {tabs.map((item) => (
            <button key={item} className={`px-4 py-3 text-sm font-bold ${tab === item ? 'border-b-2 border-[#16924d] text-[#13804e]' : 'text-[#607d74]'}`} onClick={() => setTab(item)} type="button">
              {item}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === 'Profile' ? (
            <div className="grid gap-4 md:grid-cols-3">
              {[
                ['Supplier Name', supplier.supplierName],
                ['Company Name', supplier.companyName],
                ['Contact Person', supplier.contactPerson],
                ['Phone', supplier.phone],
                ['Email', supplier.email],
                ['Address', address || '-'],
                ['License Number', supplier.licenseNumber],
              ].map(([label, value]) => <div key={label} className="rounded-lg bg-[#f8fbf9] p-4"><p className="text-xs text-[#607d74]">{label}</p><p className="mt-1 font-semibold text-[#142e26]">{value || '-'}</p></div>)}
            </div>
          ) : null}

          {tab === 'Purchase Entry' ? (
            <PurchaseHistoryTable orders={data.purchaseOrders} onStatusChange={loadSupplier} />
          ) : null}
          {tab === 'Documents' ? (
            <div className="grid gap-3 md:grid-cols-3">
              {data.documents.map((document) => (
                <div key={document.name} className="flex items-center justify-between rounded-lg border border-[#eef3f0] p-4">
                  <div><p className="font-semibold">{document.name}</p><p className="text-xs text-[#607d74]">{document.fileName}</p></div>
                  <button type="button" className="rounded p-2 text-[#13804e] hover:bg-[#ecf8f1]" title="Download"><Download className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
};

const PurchaseHistoryTable = ({ orders, onStatusChange }: { orders: SupplierDetailsResponse['purchaseOrders']; onStatusChange: () => Promise<void> }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-[#f8fbf9] text-xs uppercase text-[#607d74]">
          <tr>
            {['Invoice Number', 'Purchase Date', 'Products Purchased', 'Amount', 'Payment Status'].map((column) => (
              <th className="px-4 py-3" key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#eef3f0]">
          {orders.map((order) => (
            <tr key={order.id}>
              <td className="px-4 py-3">{order.invoiceNumber || ''}</td>
              <td className="px-4 py-3">{formatDate(order.orderDate)}</td>
              <td className="px-4 py-3">
                {getPurchasedProductsLabel(order) ? (
                  <span className="text-[#142e26]">{getPurchasedProductsLabel(order)}</span>
                ) : (
                  <span className="text-[#607d74]">No items</span>
                )}
              </td>
              <td className="px-4 py-3 font-semibold">{formatCurrency(order.total)}</td>
              <td className="px-4 py-3">
                <select
                  className={`rounded border px-2 py-1 text-xs font-bold outline-none ${statusClass(order.paymentStatus)}`}
                  value={order.paymentStatus}
                  onChange={async (event) => {
                    await supplierApi.updatePurchaseOrderPaymentStatus(order.id, event.target.value);
                    await onStatusChange();
                  }}
                >
                  {paymentStatuses.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const getPurchasedProductsLabel = (order: SupplierDetailsResponse['purchaseOrders'][number]) => {
  const directNames = order.productNames?.trim();
  if (directNames) {
    return directNames;
  }

  const itemNames = (order.items || [])
    .map((item) => item.productName.trim())
    .filter(Boolean);

  return itemNames.length > 0 ? itemNames.join(', ') : '';
};

export default SupplierDetails;
