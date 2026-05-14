import React, { useEffect, useState } from 'react';
import { ClipboardList, CreditCard, Pencil, Plus, Power, Search, Trash2, Truck, Users, X } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supplierApi } from './supplierApi';
import type { Supplier, SupplierDashboard, SupplierDetailsResponse } from './types';
import { formatCurrency, statusClass } from './format';

const SupplierList: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [dashboard, setDashboard] = useState<SupplierDashboard | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [selectedSupplierDetails, setSelectedSupplierDetails] = useState<SupplierDetailsResponse | null>(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [supplierPendingDelete, setSupplierPendingDelete] = useState<Supplier | null>(null);

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
    const timer = window.setTimeout(() => setNotice(null), 3000);
    return () => window.clearTimeout(timer);
  }, [location.state]);

  useEffect(() => {
    if (!selectedSupplierId) {
      setSelectedSupplierDetails(null);
      return;
    }

    let isActive = true;

    const loadSupplierDetails = async () => {
      try {
        setIsDetailsLoading(true);
        const response = await supplierApi.details(selectedSupplierId);
        if (isActive) {
          setSelectedSupplierDetails(response);
        }
      } finally {
        if (isActive) {
          setIsDetailsLoading(false);
        }
      }
    };

    void loadSupplierDetails();

    return () => {
      isActive = false;
    };
  }, [selectedSupplierId]);

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

  const handleDelete = async (supplier: Supplier) => {
    await supplierApi.delete(supplier.id);
    await Promise.all([loadSuppliers(), refreshDashboard()]);
    setNotice('Supplier deleted successfully');
    setSupplierPendingDelete(null);
  };

  const handleOpenSupplierDetails = (supplierId: string) => {
    setSelectedSupplierId(supplierId);
  };

  const closeSupplierDetails = () => {
    setSelectedSupplierId(null);
    setSelectedSupplierDetails(null);
    setIsDetailsLoading(false);
  };

  const openDeleteConfirmation = (supplier: Supplier) => {
    setSupplierPendingDelete(supplier);
  };

  const closeDeleteConfirmation = () => {
    setSupplierPendingDelete(null);
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

      <div className="space-y-3 xl:hidden">
        {suppliers.map((supplier) => (
          <button
            key={supplier.id}
            className="w-full rounded-lg border border-[#dce4e0] bg-white p-4 text-left shadow-sm transition hover:border-[#cfe3d7] hover:bg-[#f8fbf9]"
            onClick={() => handleOpenSupplierDetails(supplier.id)}
            type="button"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#13804e]">{supplier.supplierCode}</p>
                <p className="mt-1 text-base font-bold text-[#142e26]">{supplier.supplierName}</p>
              </div>
              <span className={`rounded border px-2 py-1 text-xs font-bold ${statusClass(supplier.status)}`}>{supplier.status}</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-[#f8fbf9] px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#607d74]">Category</p>
                <p className="mt-1 font-medium text-[#142e26]">{supplier.category}</p>
              </div>
              <div className="rounded-lg bg-[#f8fbf9] px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#607d74]">Contact</p>
                <p className="mt-1 font-medium text-[#142e26]">{supplier.contactPerson || '-'}</p>
              </div>
              <div className="rounded-lg bg-[#f8fbf9] px-3 py-2 col-span-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#607d74]">Phone</p>
                <p className="mt-1 font-medium text-[#142e26]">{supplier.phone || '-'}</p>
              </div>
            </div>
            <div className="mt-4 flex gap-1.5">
              <button
                title="Edit"
                className="rounded p-2 hover:bg-[#eef3f0]"
                onClick={(event) => {
                  event.stopPropagation();
                  navigate(`/suppliers/add?edit=${supplier.id}`);
                }}
                type="button"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                title={supplier.status === 'Active' ? 'Deactivate' : 'Activate'}
                className={`rounded p-2 hover:bg-[#eef3f0] ${supplier.status === 'Active' ? '' : 'text-[#13804e]'}`}
                onClick={(event) => {
                  event.stopPropagation();
                  void handleStatusToggle(supplier);
                }}
                type="button"
              >
                <Power className="h-4 w-4" />
              </button>
              <button
                title="Delete"
                className="rounded p-2 text-red-600 hover:bg-red-50"
                onClick={(event) => {
                  event.stopPropagation();
                  openDeleteConfirmation(supplier);
                }}
                type="button"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </button>
        ))}
      </div>

      <div className="hidden rounded-lg border border-[#dce4e0] bg-white shadow-sm xl:block">
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
                <tr
                  key={supplier.id}
                  className="cursor-pointer hover:bg-[#f8fbf9]"
                  onClick={() => handleOpenSupplierDetails(supplier.id)}
                >
                  <td className="px-4 py-3 font-semibold text-[#13804e]">{supplier.supplierCode}</td>
                  <td className="px-4 py-3 font-semibold">{supplier.supplierName}</td>
                  <td className="px-4 py-3">{supplier.category}</td>
                  <td className="px-4 py-3">{supplier.contactPerson || '-'}</td>
                  <td className="px-4 py-3">{supplier.phone || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded border px-2 py-1 text-xs font-bold ${statusClass(supplier.status)}`}>{supplier.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <button
                        title="Edit"
                        className="rounded p-2 hover:bg-[#eef3f0]"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`/suppliers/add?edit=${supplier.id}`);
                        }}
                        type="button"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        title={supplier.status === 'Active' ? 'Deactivate' : 'Activate'}
                        className={`rounded p-2 hover:bg-[#eef3f0] ${supplier.status === 'Active' ? '' : 'text-[#13804e]'}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleStatusToggle(supplier);
                        }}
                        type="button"
                      >
                        <Power className="h-4 w-4" />
                      </button>
                      <button
                        title="Delete"
                        className="rounded p-2 text-red-600 hover:bg-red-50"
                        onClick={(event) => {
                          event.stopPropagation();
                          openDeleteConfirmation(supplier);
                        }}
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedSupplierId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d1f19]/45 p-4"
          onClick={closeSupplierDetails}
          role="presentation"
        >
          <div
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-[#dce4e0] bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Supplier details"
          >
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-[#eef3f0] bg-white px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#607d74]">Supplier details</p>
                <h2 className="mt-1 text-2xl font-bold text-[#142e26]">
                  {selectedSupplierDetails?.supplier.supplierName || 'Loading...'}
                </h2>
              </div>
              <button
                className="rounded-full p-2 text-[#607d74] transition hover:bg-[#eef3f0] hover:text-[#142e26]"
                onClick={closeSupplierDetails}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              {isDetailsLoading || !selectedSupplierDetails ? (
                <div className="rounded-xl border border-[#dce4e0] bg-[#f8fbf9] px-5 py-10 text-center text-sm font-medium text-[#607d74]">
                  Loading supplier details...
                </div>
              ) : (
                <>
                  <section className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl bg-[#f8fbf9] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#607d74]">Status</p>
                      <div className="mt-2">
                        <span className={`rounded border px-2 py-1 text-xs font-bold ${statusClass(selectedSupplierDetails.supplier.status)}`}>
                          {selectedSupplierDetails.supplier.status}
                        </span>
                      </div>
                    </div>
                    <div className="rounded-xl bg-[#f8fbf9] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#607d74]">Total Orders</p>
                      <p className="mt-2 text-xl font-bold text-[#142e26]">{selectedSupplierDetails.stats.totalOrders}</p>
                    </div>
                    <div className="rounded-xl bg-[#f8fbf9] p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#607d74]">Pending Payment</p>
                      <p className="mt-2 text-xl font-bold text-[#142e26]">{formatCurrency(selectedSupplierDetails.stats.pendingPayment)}</p>
                    </div>
                  </section>

                  <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {[
                      ['Supplier Code', selectedSupplierDetails.supplier.supplierCode],
                      ['Supplier Name', selectedSupplierDetails.supplier.supplierName],
                      ['Company Name', selectedSupplierDetails.supplier.companyName || '-'],
                      ['Category', selectedSupplierDetails.supplier.category],
                      ['License Number', selectedSupplierDetails.supplier.licenseNumber || '-'],
                      ['Contact Person', selectedSupplierDetails.supplier.contactPerson || '-'],
                      ['Phone', selectedSupplierDetails.supplier.phone || '-'],
                      ['Alternate Phone', selectedSupplierDetails.supplier.alternatePhone || '-'],
                      ['Email', selectedSupplierDetails.supplier.email || '-'],
                      [
                        'Address',
                        [
                          selectedSupplierDetails.supplier.addressLine1,
                          selectedSupplierDetails.supplier.city,
                          selectedSupplierDetails.supplier.state,
                          selectedSupplierDetails.supplier.country,
                          selectedSupplierDetails.supplier.pincode,
                        ].filter(Boolean).join(', ') || '-',
                      ],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl border border-[#eef3f0] bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#607d74]">{label}</p>
                        <p className="mt-2 text-sm font-semibold text-[#142e26]">{value}</p>
                      </div>
                    ))}
                  </section>

                  <section className="rounded-xl border border-[#eef3f0] bg-[#fcfdfc] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-[#142e26]">Documents</p>
                        <p className="text-xs text-[#607d74]">Uploaded supplier files</p>
                      </div>
                      <button
                        className="rounded-lg bg-[#16924d] px-3 py-2 text-sm font-semibold text-white"
                        onClick={() => navigate(`/suppliers/add?edit=${selectedSupplierDetails.supplier.id}`)}
                        type="button"
                      >
                        Edit supplier
                      </button>
                    </div>

                    {selectedSupplierDetails.documents.length > 0 ? (
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {selectedSupplierDetails.documents.map((document) => (
                          <div key={document.name} className="rounded-lg border border-[#dce4e0] bg-white px-4 py-3">
                            <p className="font-semibold text-[#142e26]">{document.name}</p>
                            <p className="mt-1 text-sm text-[#607d74]">{document.fileName}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-4 rounded-lg border border-dashed border-[#dce4e0] bg-white px-4 py-6 text-center text-sm font-medium text-[#607d74]">
                        No documents uploaded for this supplier yet.
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {supplierPendingDelete ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0d1f19]/45 p-4"
          onClick={closeDeleteConfirmation}
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[#dce4e0] bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Delete supplier confirmation"
          >
            <h3 className="text-xl font-bold text-[#142e26]">Delete Supplier?</h3>
            <p className="mt-3 text-sm leading-6 text-[#607d74]">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-[#142e26]">{supplierPendingDelete.supplierName}</span>?
              This action cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                className="rounded-lg border border-[#dce4e0] px-4 py-2 text-sm font-semibold text-[#142e26] hover:bg-[#f8fbf9]"
                onClick={closeDeleteConfirmation}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                onClick={() => void handleDelete(supplierPendingDelete)}
                type="button"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default SupplierList;
