import React, { useEffect, useState } from 'react';
import { ArrowLeft, Download, Plus } from 'lucide-react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import api from '@/services/api';
import { supplierApi } from './supplierApi';
import type { SupplierDetailsResponse } from './types';
import { formatCurrency, formatDate, statusClass } from './format';

const tabs = ['Profile', 'Purchase Entry', 'Documents'];
const paymentStatuses = ['Pending', 'Paid', 'Partially Paid'];

const getAbsoluteFileUrl = (fileUrl: string) => {
  if (/^https?:\/\//i.test(fileUrl)) {
    return fileUrl;
  }

  const apiBaseUrl = api.defaults.baseURL ?? window.location.origin;
  return new URL(fileUrl, `${apiBaseUrl}/`).toString();
};

const SupplierDetails: React.FC = () => {
  const { supplierId } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<SupplierDetailsResponse | null>(null);
  const initialTab = tabs.includes(searchParams.get('tab') || '') ? searchParams.get('tab') || tabs[0] : tabs[0];
  const [tab, setTab] = useState(initialTab);
  const supplierNotice = (location.state as { supplierNotice?: string } | null)?.supplierNotice;

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

  const openDocumentPreview = async (fileUrl: string) => {
    const response = await api.get<Blob>(getAbsoluteFileUrl(fileUrl), {
      responseType: 'blob',
    });
    const objectUrl = window.URL.createObjectURL(response.data);
    window.open(objectUrl, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 60_000);
  };

  const downloadDocument = async (fileUrl: string, fileName: string) => {
    const response = await api.get<Blob>(getAbsoluteFileUrl(fileUrl), {
      params: { download: 1 },
      responseType: 'blob',
    });
    const objectUrl = window.URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 60_000);
  };

  if (!data) {
    return <div className="rounded-lg border border-[#dce4e0] bg-white p-8 text-center text-[#607d74]">Loading supplier details...</div>;
  }

  const { supplier } = data;
  const address = [supplier.addressLine1, supplier.city, supplier.state, supplier.pincode].filter(Boolean).join(', ');

  return (
    <div className="space-y-5 [&_button]:cursor-pointer [&_a]:cursor-pointer">
      <Link to="/suppliers/purchase-orders" className="inline-flex items-center gap-1 text-sm font-semibold text-[#13804e]"><ArrowLeft className="h-4 w-4" /> Back to Purchase</Link>
      {supplierNotice ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {supplierNotice}
        </div>
      ) : null}
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

        <div className="p-4 sm:p-5">
          {tab === 'Profile' ? (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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

              <div className="rounded-xl border border-[#eef3f0] p-4">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-bold text-[#142e26]">Products Supplied</h3>
                    <p className="text-sm text-[#607d74]">Track current stock, last purchase, and restock the same product without duplicates.</p>
                  </div>
                  <Link className="inline-flex items-center gap-2 rounded-lg bg-[#16924d] px-4 py-2 text-sm font-semibold text-white" to={`/suppliers/purchase-orders?supplierId=${supplier.id}`}>
                    <Plus className="h-4 w-4" /> Add Product
                  </Link>
                </div>

                {data.productsSupplied.length > 0 ? (
                  <div className="space-y-3">
                    {data.productsSupplied.map((product) => (
                      <div key={`${product.inventoryItemId || product.productName}-${product.unit || ''}`} className="rounded-lg bg-[#f8fbf9] p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <p className="font-semibold text-[#142e26]">{product.productName}</p>
                            <p className="text-sm text-[#607d74]">
                              {product.category}
                              {product.unit ? ` / ${product.unit}` : ''}
                              {product.sku ? ` / SKU: ${product.sku}` : ''}
                            </p>
                          </div>
                          <Link
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#ecf8f1] px-3 py-2 text-sm font-bold text-[#13804e]"
                            to={`/suppliers/purchase-orders?supplierId=${supplier.id}${product.inventoryItemId ? `&productId=${product.inventoryItemId}` : ''}`}
                          >
                            <Plus className="h-3.5 w-3.5" /> Restock
                          </Link>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-lg bg-white px-3 py-2"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#607d74]">Current Stock</p><p className="mt-1 font-semibold text-[#142e26]">{product.currentStock}</p></div>
                          <div className="rounded-lg bg-white px-3 py-2"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#607d74]">Last Purchase</p><p className="mt-1 font-semibold text-[#142e26]">{product.lastPurchaseDate ? formatDate(product.lastPurchaseDate) : '-'}</p></div>
                          <div className="rounded-lg bg-white px-3 py-2"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#607d74]">Last Price</p><p className="mt-1 font-semibold text-[#142e26]">{formatCurrency(product.lastPurchasePrice)}</p></div>
                          <div className="rounded-lg bg-white px-3 py-2"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#607d74]">Total Purchased</p><p className="mt-1 font-semibold text-[#142e26]">{product.totalPurchased}</p></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-[#dce4e0] bg-[#fbfdfc] px-4 py-8 text-center">
                    <p className="font-semibold text-[#142e26]">No products added for this supplier yet.</p>
                    <p className="mt-1 text-sm text-[#607d74]">Use purchase entry to add the first product, then next time just restock it.</p>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {tab === 'Purchase Entry' ? (
            <PurchaseHistoryTable orders={data.purchaseOrders} onStatusChange={loadSupplier} />
          ) : null}
          {tab === 'Documents' ? (
            data.documents.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {data.documents.map((document) => (
                  <div
                    key={document.name}
                    className="flex items-center justify-between rounded-lg border border-[#eef3f0] p-4 transition hover:border-[#cfe3d7] hover:bg-[#f8fbf9]"
                    onClick={() => void openDocumentPreview(document.fileUrl)}
                    role="button"
                    tabIndex={0}
                    title={`Open ${document.name}`}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        void openDocumentPreview(document.fileUrl);
                      }
                    }}
                  >
                    <div>
                      <p className="font-semibold">{document.name}</p>
                      <p className="text-xs text-[#607d74]">{document.fileName}</p>
                    </div>
                    <a
                      className="rounded p-2 text-[#13804e] hover:bg-[#ecf8f1]"
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void downloadDocument(document.fileUrl, document.fileName);
                      }}
                      title={`Download ${document.name}`}
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-[#dce4e0] bg-[#f8fbf9] px-5 py-8 text-center">
                <p className="text-sm font-semibold text-[#142e26]">No supplier documents added yet.</p>
                <p className="mt-1 text-sm text-[#607d74]">Upload License and ID Proof from the supplier form.</p>
                <Link
                  className="mt-4 inline-flex rounded-lg bg-[#16924d] px-4 py-2 text-sm font-semibold text-white"
                  to={`/suppliers/add?edit=${supplier.id}`}
                >
                  Add documents
                </Link>
              </div>
            )
          ) : null}
        </div>
      </section>
    </div>
  );
};

const PurchaseHistoryTable = ({ orders, onStatusChange }: { orders: SupplierDetailsResponse['purchaseOrders']; onStatusChange: () => Promise<void> }) => {
  return (
    <>
    <div className="space-y-3 lg:hidden">
      {orders.map((order) => (
        <div key={order.id} className="rounded-lg border border-[#eef3f0] bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-[#142e26]">{order.invoiceNumber || '-'}</p>
              <p className="mt-1 text-sm text-[#607d74]">{formatDate(order.orderDate)}</p>
            </div>
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
          </div>
          <div className="mt-4 grid gap-3 text-sm">
            <div className="rounded-lg bg-[#f8fbf9] px-3 py-2"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#607d74]">Products</p><p className="mt-1">{getPurchasedProductsLabel(order) || 'No items'}</p></div>
            <div className="rounded-lg bg-[#f8fbf9] px-3 py-2"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#607d74]">Batch</p><p className="mt-1">{getBatchesLabel(order) || '-'}</p></div>
            <div className="rounded-lg bg-[#f8fbf9] px-3 py-2"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#607d74]">Amount</p><p className="mt-1 font-semibold">{formatCurrency(order.total)}</p></div>
          </div>
        </div>
      ))}
    </div>
    <div className="hidden overflow-x-auto lg:block">
      <table className="w-full text-left text-sm">
        <thead className="bg-[#f8fbf9] text-xs uppercase text-[#607d74]">
          <tr>
            {['Invoice Number', 'Purchase Date', 'Products Purchased', 'Batch', 'Amount', 'Payment Status'].map((column) => (
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
              <td className="px-4 py-3">
                <span className="text-[#607d74]">{getBatchesLabel(order) || '-'}</span>
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
    </>
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

const getBatchesLabel = (order: SupplierDetailsResponse['purchaseOrders'][number]) => {
  const batches = (order.items || [])
    .map((item) => {
      const batch = item.batchNumber?.trim();
      if (!batch) return '';
      if (batch.includes('-')) {
        const [year, month] = batch.split('-');
        return `${month}/${year}`;
      }
      return batch;
    })
    .filter(Boolean);

  return Array.from(new Set(batches)).join(', ');
};

export default SupplierDetails;
