import React, { useEffect, useState, useMemo } from 'react';
import api from '@/services/api';
import { supplierApi } from '@/pages/suppliers/supplierApi';
import type { Supplier } from '@/pages/suppliers/types';
import { 
  Search, Plus, Package, AlertTriangle, Bell, Activity, 
  Database, Trash2, RefreshCcw, 
  X, ChevronDown, Calendar, DollarSign, MapPin
} from 'lucide-react';
import clsx from 'clsx';

type InventoryItem = {
  inventoryItemId: string;
  itemName: string;
  sku: string | null;
  medicineType: string | null;
  category: string;
  stockQuantity: number;
  stockUnit: string;
  strengthComposition: string | null;
  barcodeQrCode: string | null;
  storageType: string | null;
  prescriptionRequired: boolean;
  gstTax: number;
  purchasePrice: number;
  sellingPrice: number;
  minimumStockLevel: number;
  reorderLevel: number;
  isActive: boolean;
  storageArea: string | null;
  rackShelf: string | null;
  row: string | null;
  column: string | null;
  boxBinNumber: string | null;
  slotPosition: string | null;
  notes: string | null;
  vendor: string | null;
  invoiceNumber: string | null;
  paymentStatus: string;
  gstNumber: string | null;
  batchNumber: string | null;
  expiryDate: string | null;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
};

type InventorySummary = {
  itemsCount: number;
  totalUnits: number;
  lowStockCount: number;
  stockValue: number;
};

type InventoryResponse = {
  summary: InventorySummary;
  items: InventoryItem[];
};

type ApiValidationDetail = {
  field?: string;
  constraints?: Record<string, string>;
};

type SupplierProductOption = {
  productName: string;
  category: string;
};

const UNIT_OPTIONS: Record<string, string[]> = {
  Medicines: [
    "Tablets",
    "Capsules",
    "Bottles",
    "Strips",
    "Vials",
    "Ampoules",
    "mL",
    "mg"
  ],
  Consumables: [
    "Boxes",
    "Packs",
    "Pieces",
    "Rolls",
    "Pairs",
    "Units"
  ],
  Surgical: [
    "Sets",
    "Kits",
    "Pieces",
    "Units",
    "Trays",
    "Pairs"
  ],
  Equipment: [
    "Units",
    "Machines",
    "Sets",
    "Devices",
    "Pieces"
  ]
};

const normalizeInventoryCategory = (category: string | null | undefined) => {
  const normalized = (category || '').trim().toLowerCase();

  if (normalized === 'medicine' || normalized === 'medicines') return 'Medicines';
  if (normalized === 'lab supplies' || normalized === 'consumables') return 'Consumables';
  if (normalized === 'surgical') return 'Surgical';
  if (normalized === 'equipment') return 'Equipment';

  return 'Medicines';
};

const Inventory: React.FC = () => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [data, setData] = useState<InventoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState<InventoryItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [supplierProducts, setSupplierProducts] = useState<SupplierProductOption[]>([]);
  const [restockData, setRestockData] = useState({
    quantity: 0,
    batchNumber: '',
    expiryDate: '',
    purchasePrice: 0,
    sellingPrice: 0
  });

  useEffect(() => {
    if (showRestockModal) {
      setRestockData({
        quantity: 0,
        batchNumber: '',
        expiryDate: '',
        purchasePrice: showRestockModal.purchasePrice || 0,
        sellingPrice: showRestockModal.sellingPrice || 0
      });
    }
  }, [showRestockModal]);
  
  const [newItem, setNewItem] = useState({
    itemName: '',
    sku: '',
    category: 'Medicines',
    unit: 'Units',
      invoiceNumber: '',
      paymentStatus: 'Pending',
      gstNumber: '',
      gstTax: 5,
      quantity: 0,
      reorderLevel: 10,
      purchasePrice: 0,
      sellingPrice: 0,
      vendor: '',
      batchNo: '',
      expiryDate: '',
      location: '',
    description: ''
  });

  const currentQuantity = useMemo(() => {
    if (!data || !newItem.itemName.trim()) {
      return 0;
    }

    const matchedItem = data.items.find((item) =>
      item.itemName.trim().toLowerCase() === newItem.itemName.trim().toLowerCase()
      && normalizeInventoryCategory(item.category) === newItem.category,
    );

    return matchedItem?.stockQuantity ?? 0;
  }, [data, newItem.itemName, newItem.category]);

  const productSubtotal = useMemo(() => newItem.reorderLevel * newItem.purchasePrice, [newItem.reorderLevel, newItem.purchasePrice]);
  const taxAmount = useMemo(() => (productSubtotal * newItem.gstTax) / 100, [productSubtotal, newItem.gstTax]);
  const totalAmount = useMemo(() => productSubtotal + taxAmount, [productSubtotal, taxAmount]);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const response = await api.get<InventoryResponse>('/doctor/inventory');
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch inventory', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchInventory();
  }, []);

  useEffect(() => {
    if (!showAddModal) return;

    void supplierApi.list().then((response) => {
      setSuppliers(response.items);
    }).catch((error) => {
      console.error('Failed to fetch suppliers', error);
    });
  }, [showAddModal]);

  const filteredItems = useMemo(() => {
    if (!data) return [];
    const keyword = search.toLowerCase();
    return data.items.filter(item => 
      item.itemName.toLowerCase().includes(keyword) || 
      item.sku?.toLowerCase().includes(keyword) ||
      item.category.toLowerCase().includes(keyword)
    );
  }, [data, search]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        itemName: newItem.itemName,
        category: newItem.category,
        unit: newItem.unit,
        invoiceNumber: newItem.invoiceNumber,
        paymentStatus: newItem.paymentStatus,
        gstNumber: newItem.gstNumber,
        gstTax: newItem.gstTax,
        quantity: newItem.reorderLevel,
        reorderLevel: newItem.reorderLevel,
        purchasePrice: newItem.purchasePrice,
        sellingPrice: newItem.sellingPrice,
        ...(newItem.vendor.trim() ? { vendor: newItem.vendor.trim() } : {}),
        ...(newItem.sku.trim() ? { sku: newItem.sku.trim() } : {}),
        ...(newItem.description.trim() ? { notes: newItem.description.trim() } : {}),
        ...(newItem.location.trim() ? { storageArea: newItem.location.trim() } : {}),
        ...(newItem.batchNo.trim() ? { batchNumber: newItem.batchNo.trim() } : {}),
        ...(newItem.expiryDate ? { expiryDate: newItem.expiryDate } : {}),
      };

      await api.post('/doctor/inventory', payload);
      setShowAddModal(false);
      setNewItem({
        itemName: '',
        sku: '',
        category: 'Medicines',
        unit: 'Units',
        invoiceNumber: '',
        paymentStatus: 'Pending',
        gstNumber: '',
        gstTax: 5,
        quantity: 0,
        reorderLevel: 10,
        purchasePrice: 0,
        sellingPrice: 0,
        vendor: '',
        batchNo: '',
        expiryDate: '',
        location: '',
        description: ''
      });
      void fetchInventory();
    } catch (error: any) {
      const details = Array.isArray(error.response?.data?.details)
        ? (error.response.data.details as ApiValidationDetail[])
        : [];
      const detailText = details
        .map((detail) => {
          const messages = detail.constraints ? Object.values(detail.constraints).join(', ') : '';
          return detail.field ? `${detail.field}: ${messages}` : messages;
        })
        .filter(Boolean)
        .join('\n');
      const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message;
      console.error('Failed to add item', { message: errorMsg, details });
      alert(detailText ? `Failed to save item:\n${detailText}` : `Failed to save item: ${errorMsg}`);
    }
  };

  const handleSupplierSelect = async (supplierId: string) => {
    setSelectedSupplierId(supplierId);

    const selectedSupplier = suppliers.find((supplier) => supplier.id === supplierId);
    const nextCategory = normalizeInventoryCategory(selectedSupplier?.category);

    setNewItem((current) => ({
      ...current,
      vendor: selectedSupplier?.supplierName || '',
      category: nextCategory,
      unit: UNIT_OPTIONS[nextCategory]?.[0] || current.unit,
      itemName: '',
    }));

    if (!supplierId) {
      setSupplierProducts([]);
      return;
    }

    try {
      const supplierDetails = await supplierApi.details(supplierId);
      setSupplierProducts(
        supplierDetails.productsSupplied.map((product) => ({
          productName: product.productName,
          category: normalizeInventoryCategory(product.category),
        })),
      );
    } catch (error) {
      console.error('Failed to fetch supplier products', error);
      setSupplierProducts([]);
    }
  };

  const handleProductSelect = (productName: string) => {
    const selectedProduct = supplierProducts.find((product) => product.productName === productName);
    const nextCategory = normalizeInventoryCategory(selectedProduct?.category || newItem.category);

    setNewItem((current) => ({
      ...current,
      itemName: productName,
      category: nextCategory,
      unit: UNIT_OPTIONS[nextCategory]?.[0] || current.unit,
    }));
  };

  const handleRestock = async () => {
    if (!showRestockModal) return;
    try {
      await api.patch(`/doctor/inventory/${showRestockModal.inventoryItemId}/restock`, restockData);
      setShowRestockModal(null);
      setRestockData({ quantity: 0, batchNumber: '', expiryDate: '', purchasePrice: 0, sellingPrice: 0 });
      void fetchInventory();
    } catch (error) {
      console.error('Failed to restock', error);
    }
  };

  const getStockStatus = (qty: number, reorder: number) => {
    if (qty <= 0) return { label: 'Out of Stock', color: 'bg-red-100 text-red-700 border-red-200' };
    if (qty <= reorder) return { label: 'Low Stock', color: 'bg-orange-100 text-orange-700 border-orange-200' };
    return { label: 'Healthy', color: 'bg-green-100 text-green-700 border-green-200' };
  };

  return (
    <div className="space-y-5 pb-10 sm:space-y-6">
      {/* Header with Title and Search */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#142e26]">Inventory Management - Clinic HQ</h1>
          <p className="text-sm text-[#607d74]">Manage medical stock, tracking and restocking.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8ea59d]" />
            <input
              type="text"
              placeholder="Search inventory..."
              className="w-full rounded-xl border border-[#dce4e0] bg-white py-2 pl-10 pr-4 text-sm shadow-sm focus:border-[#1faa62] focus:outline-none focus:ring-2 focus:ring-[#1faa62]/20 sm:w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#1faa62] px-4 py-2 text-sm font-semibold text-white shadow-md transition-all active:scale-95 hover:bg-[#179353]"
          >
            <Plus className="w-4 h-4" />
            Add New Item
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Active Items', value: data?.summary.itemsCount || 0, icon: Database, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Low Stock Alerts', value: data?.summary.lowStockCount || 0, icon: Bell, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Near Expiry (30 Days)', value: 30, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Control Substance Check', value: 0, icon: Activity, color: 'text-purple-600', bg: 'bg-purple-50' }
        ].map((card, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-[#dce4e0] shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-[#607d74] uppercase tracking-wider mb-1">{card.label}</p>
              <p className="text-2xl font-bold text-[#142e26]">{card.value}</p>
            </div>
            <div className={clsx("p-3 rounded-xl", card.bg)}>
              <card.icon className={clsx("w-5 h-5", card.color)} />
            </div>
          </div>
        ))}
      </div>

      {/* Main Table Area */}
      <div className="space-y-3 lg:hidden">
        {loading ? (
          <div className="rounded-2xl border border-[#dce4e0] bg-white px-4 py-10 text-center text-[#8ea59d] shadow-sm">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1faa62] border-t-transparent"></div>
              <p className="text-sm">Loading stock data...</p>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-[#dce4e0] bg-white px-4 py-10 text-center text-[#8ea59d] shadow-sm">
            <Package className="mx-auto mb-3 h-12 w-12 opacity-20" />
            <p>No inventory items found matching your search.</p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const status = getStockStatus(item.stockQuantity, item.reorderLevel);
            return (
              <div
                key={item.inventoryItemId}
                className="rounded-2xl border border-[#dce4e0] bg-white p-4 shadow-sm"
                onClick={() => setSelectedItem(item)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[#142e26]">{item.sku || `INV-${item.inventoryItemId.slice(0, 4)}`}</p>
                    <p className="mt-1 text-base font-bold text-[#142e26]">{item.itemName}</p>
                    <p className="text-xs text-[#8ea59d]">{item.strengthComposition || 'Standard'}</p>
                  </div>
                  <span className={clsx("rounded-lg border px-2.5 py-1 text-xs font-bold", status.color)}>
                    {item.stockQuantity}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-[#f8fbf9] px-3 py-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#607d74]">Supplier</p>
                    <p className="mt-1 font-medium text-[#142e26]">{item.vendor || '-'}</p>
                  </div>
                  <div className="rounded-xl bg-[#f8fbf9] px-3 py-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#607d74]">Category</p>
                    <p className="mt-1 font-medium text-[#142e26]">{item.category}</p>
                  </div>
                  <div className="rounded-xl bg-[#f8fbf9] px-3 py-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#607d74]">Reorder</p>
                    <p className="mt-1 font-medium text-[#142e26]">{item.reorderLevel}</p>
                  </div>
                  <div className="rounded-xl bg-[#f8fbf9] px-3 py-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#607d74]">Price</p>
                    <p className="mt-1 font-medium text-[#142e26]">Rs {item.purchasePrice} / Rs {item.sellingPrice}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="text-xs text-[#8ea59d]">
                    {item.expiryDate ? `Expiry: ${new Date(item.expiryDate).toLocaleDateString()}` : 'No Expiry'}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowRestockModal(item);
                      }}
                      className="rounded-lg p-2 text-[#1faa62] transition-colors hover:bg-[#eef5f1]"
                      title="Restock"
                    >
                      <RefreshCcw className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Are you sure you want to delete this item?')) {
                          void api.delete(`/doctor/inventory/${item.inventoryItemId}`).then(() => fetchInventory());
                        }
                      }}
                      className="rounded-lg p-2 text-red-400 transition-colors hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-[#dce4e0] bg-white shadow-sm lg:block">
        <div className="p-5 border-b border-[#dce4e0] flex items-center justify-between">
          <h2 className="font-bold text-[#142e26]">Current Stock</h2>
          <div />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1080px] w-full border-collapse text-left">
            <thead>
              <tr className="bg-[#f8fbf9] border-b border-[#dce4e0]">
                <th className="px-5 py-4 text-xs font-bold text-[#607d74] uppercase tracking-wider">Item ID</th>
                <th className="px-5 py-4 text-xs font-bold text-[#607d74] uppercase tracking-wider">Product Name</th>
                <th className="px-5 py-4 text-xs font-bold text-[#607d74] uppercase tracking-wider">Supplier</th>
                <th className="px-5 py-4 text-xs font-bold text-[#607d74] uppercase tracking-wider">Category</th>
                <th className="px-5 py-4 text-xs font-bold text-[#607d74] uppercase tracking-wider text-center">Qty</th>
                <th className="px-5 py-4 text-xs font-bold text-[#607d74] uppercase tracking-wider text-center">Reorder</th>
                <th className="px-5 py-4 text-xs font-bold text-[#607d74] uppercase tracking-wider">Expiry</th>
                <th className="px-5 py-4 text-xs font-bold text-[#607d74] uppercase tracking-wider">Price (P/S)</th>
                <th className="px-5 py-4 text-xs font-bold text-[#607d74] uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f4f2]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-20 text-center text-[#8ea59d]">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-4 border-[#1faa62] border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-sm">Loading stock data...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-20 text-center text-[#8ea59d]">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No inventory items found matching your search.</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const status = getStockStatus(item.stockQuantity, item.reorderLevel);
                  return (
                    <tr 
                      key={item.inventoryItemId} 
                      className="hover:bg-[#f8fbf9] transition-colors group cursor-pointer"
                      onClick={() => setSelectedItem(item)}
                    >
                      <td className="px-5 py-4">
                        <div className="text-sm font-medium text-[#142e26]">{item.sku || `INV-${item.inventoryItemId.slice(0, 4)}`}</div>
                        {item.batchNumber && <div className="text-[10px] text-[#8ea59d] font-bold uppercase">Batch: {item.batchNumber}</div>}
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm font-bold text-[#142e26]">{item.itemName}</div>
                        <div className="text-xs text-[#8ea59d]">{item.strengthComposition || 'Standard'}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm text-[#142e26]">{item.vendor || '-'}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-100 text-[10px] font-bold uppercase">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={clsx("px-2.5 py-1 rounded-lg border text-xs font-bold", status.color)}>
                          {item.stockQuantity}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center text-sm text-[#607d74]">
                        {item.reorderLevel}
                      </td>
                      <td className="px-5 py-4">
                        {item.expiryDate ? (
                          <div className="text-xs font-bold text-[#142e26]">
                            {new Date(item.expiryDate).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg bg-gray-50 text-gray-400 border border-gray-100 text-[10px] font-bold uppercase">
                            No Expiry
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-xs font-bold text-[#142e26]">₹{item.purchasePrice} / ₹{item.sellingPrice}</div>
                        <div className="text-[10px] text-[#8ea59d] uppercase">Purch / Sell</div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowRestockModal(item);
                            }}
                            className="p-2 text-[#1faa62] hover:bg-[#eef5f1] rounded-lg transition-colors"
                            title="Restock"
                          >
                            <RefreshCcw className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Are you sure you want to delete this item?')) {
                                void api.delete(`/doctor/inventory/${item.inventoryItemId}`).then(() => fetchInventory());
                              }
                            }}
                            className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors" title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Restock Modal */}
      {showRestockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-[#dce4e0] flex items-center justify-between bg-[#f8fbf9]">
              <h3 className="text-lg font-bold text-[#142e26]">Restock Item</h3>
              <button onClick={() => setShowRestockModal(null)} className="p-2 hover:bg-white rounded-full transition-colors" title="Close">
                <X className="w-5 h-5 text-[#607d74]" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="p-4 bg-[#f8fbf9] rounded-xl border border-[#dce4e0]">
                <p className="text-[10px] text-[#607d74] uppercase font-bold tracking-wider mb-1">Product</p>
                <p className="font-bold text-[#142e26] text-sm">{showRestockModal.itemName}</p>
                <div className="flex justify-between mt-2 text-xs">
                  <span className="text-[#607d74]">Current Stock:</span>
                  <span className="font-bold text-[#1faa62]">{showRestockModal.stockQuantity} {showRestockModal.stockUnit}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#607d74] uppercase tracking-wide">Restock Qty</label>
                  <div className="relative">
                    <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8ea59d]" />
                    <input
                      type="number"
                      className="w-full pl-10 pr-4 py-3 bg-white border border-[#dce4e0] rounded-xl outline-none focus:ring-2 focus:ring-[#1faa62]/20 focus:border-[#1faa62] text-sm"
                      placeholder="0"
                      value={restockData.quantity || ''}
                      onChange={(e) => setRestockData({...restockData, quantity: Number(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#607d74] uppercase tracking-wide">New Batch No.</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-white border border-[#dce4e0] rounded-xl outline-none focus:ring-2 focus:ring-[#1faa62]/20 focus:border-[#1faa62] text-sm"
                    placeholder="e.g. BN-2024"
                    value={restockData.batchNumber}
                    onChange={(e) => setRestockData({...restockData, batchNumber: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#607d74] uppercase tracking-wide">Purchase Price</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8ea59d]" />
                    <input
                      type="number"
                      className="w-full pl-10 pr-4 py-3 bg-white border border-[#dce4e0] rounded-xl outline-none focus:ring-2 focus:ring-[#1faa62]/20 focus:border-[#1faa62] text-sm"
                      placeholder="0.00"
                      value={restockData.purchasePrice || ''}
                      onChange={(e) => setRestockData({...restockData, purchasePrice: Number(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#607d74] uppercase tracking-wide">Selling Price</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8ea59d]" />
                    <input
                      type="number"
                      className="w-full pl-10 pr-4 py-3 bg-white border border-[#dce4e0] rounded-xl outline-none focus:ring-2 focus:ring-[#1faa62]/20 focus:border-[#1faa62] text-sm"
                      placeholder="0.00"
                      value={restockData.sellingPrice || ''}
                      onChange={(e) => setRestockData({...restockData, sellingPrice: Number(e.target.value)})}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#607d74] uppercase tracking-wide">Expiry Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8ea59d]" />
                  <input
                    type="date"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-[#dce4e0] rounded-xl outline-none focus:ring-2 focus:ring-[#1faa62]/20 focus:border-[#1faa62] text-sm"
                    value={restockData.expiryDate}
                    onChange={(e) => setRestockData({...restockData, expiryDate: e.target.value})}
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3 border-t border-[#dce4e0] bg-[#f8fbf9] p-6 sm:flex-row">
              <button 
                onClick={() => setShowRestockModal(null)}
                className="flex-1 px-4 py-3 bg-white border border-[#dce4e0] text-[#607d74] rounded-xl font-bold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleRestock}
                disabled={!restockData.quantity || restockData.quantity <= 0}
                className="flex-1 px-4 py-3 bg-[#1faa62] text-white rounded-xl font-bold hover:bg-[#179353] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
              >
                Confirm Restock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl my-8 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-[#dce4e0] flex items-center justify-between bg-white sticky top-0 z-10">
              <div>
                <h3 className="text-xl font-bold text-[#142e26]">Add New Item to Inventory</h3>
                <p className="text-sm text-[#607d74]">Enter product details to add to your clinical stock.</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-[#f4f8f6] rounded-full transition-colors" title="Close">
                <X className="w-6 h-6 text-[#607d74]" />
              </button>
            </div>
            
            <form onSubmit={handleAddItem} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* General Information */}
                <div className="space-y-5">
                  <div className="flex items-center gap-2 pb-2 border-b border-[#f0f4f2]">
                    <Database className="w-4 h-4 text-[#1faa62]" />
                    <h4 className="text-sm font-bold text-[#142e26] uppercase tracking-wider">General Information</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-[#607d74] uppercase tracking-wide">Supplier</label>
                      <div className="relative">
                        <select
                          className="w-full px-4 py-3 bg-[#f8fbf9] border border-[#dce4e0] rounded-xl outline-none appearance-none focus:ring-2 focus:ring-[#1faa62]/20 focus:border-[#1faa62]"
                          value={selectedSupplierId}
                          onChange={e => void handleSupplierSelect(e.target.value)}
                        >
                          <option value="">Select supplier</option>
                          {suppliers.map((supplier) => (
                            <option key={supplier.id} value={supplier.id}>{supplier.supplierName}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8ea59d] pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-[#607d74] uppercase tracking-wide">Category</label>
                      <div className="relative">
                        <select
                          className="w-full px-4 py-3 bg-[#f8fbf9] border border-[#dce4e0] rounded-xl outline-none appearance-none focus:ring-2 focus:ring-[#1faa62]/20 focus:border-[#1faa62]"
                          value={newItem.category}
                          onChange={e => {
                            const newCat = e.target.value;
                            setNewItem({...newItem, category: newCat, unit: UNIT_OPTIONS[newCat]?.[0] || 'Units'});
                          }}
                        >
                          <option>All</option>
                          <option>Medicines</option>
                          <option>Lab Products</option>
                          <option>Medical Equipment</option>
                          <option>Surgical Supplies</option>
                          <option>Patient Care Consumables</option>
                          <option>Cleaning & Sterilization</option>
                          <option>Emergency Supplies</option>
                          <option>Nutrition & Supplements</option>
                          <option>Orthopedic Products</option>
                          <option>Clinic Office Supplies</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8ea59d] pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-[#607d74] uppercase tracking-wide">Product Name</label>
                    {selectedSupplierId ? (
                      <div className="relative">
                        <input
                          required
                          className="w-full px-4 py-3 bg-[#f8fbf9] border border-[#dce4e0] rounded-xl outline-none focus:ring-2 focus:ring-[#1faa62]/20 focus:border-[#1faa62]"
                          value={newItem.itemName}
                          onChange={e => setNewItem({...newItem, itemName: e.target.value})}
                          onFocus={() => setShowSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                          placeholder="Search or select product"
                        />
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8ea59d] pointer-events-none" />
                        {showSuggestions && (
                          <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-[#dce4e0] bg-white py-1 shadow-xl">
                            {supplierProducts
                              .filter(product => (newItem.category === 'All' || !newItem.category || product.category === newItem.category) && 
                                               (!newItem.itemName || product.productName.toLowerCase().includes(newItem.itemName.toLowerCase())))
                              .map((product) => (
                                <button
                                  key={`${product.productName}-${product.category}`}
                                  type="button"
                                  className="w-full px-4 py-2.5 text-left text-sm font-bold text-[#142e26] transition-colors hover:bg-[#f8fbf9]"
                                  onClick={() => {
                                    handleProductSelect(product.productName);
                                    setShowSuggestions(false);
                                  }}
                                >
                                  {product.productName}
                                </button>
                              ))}
                            {supplierProducts.filter(product => (newItem.category === 'All' || !newItem.category || product.category === newItem.category) && 
                                               (!newItem.itemName || product.productName.toLowerCase().includes(newItem.itemName.toLowerCase()))).length === 0 && (
                              <div className="px-4 py-3 text-xs font-bold text-[#607d74]">No product matches</div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <input
                        required
                        type="text"
                        className="w-full px-4 py-3 bg-[#f8fbf9] border border-[#dce4e0] rounded-xl outline-none focus:ring-2 focus:ring-[#1faa62]/20 focus:border-[#1faa62] transition-all"
                        placeholder="e.g. Paracetamol 500mg"
                        value={newItem.itemName}
                        onChange={e => setNewItem({ ...newItem, itemName: e.target.value })}
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-[#607d74] uppercase tracking-wide">Invoice Number</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 bg-[#f8fbf9] border border-[#dce4e0] rounded-xl outline-none focus:ring-2 focus:ring-[#1faa62]/20 focus:border-[#1faa62]"
                        placeholder="Enter invoice number"
                        value={newItem.invoiceNumber}
                        onChange={e => setNewItem({ ...newItem, invoiceNumber: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-[#607d74] uppercase tracking-wide">Payment Status</label>
                      <div className="relative">
                        <select
                          className="w-full px-4 py-3 bg-[#f8fbf9] border border-[#dce4e0] rounded-xl outline-none appearance-none focus:ring-2 focus:ring-[#1faa62]/20 focus:border-[#1faa62]"
                          value={newItem.paymentStatus}
                          onChange={e => setNewItem({ ...newItem, paymentStatus: e.target.value })}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Paid">Paid</option>
                          <option value="Partially Paid">Partially Paid</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8ea59d] pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-[#607d74] uppercase tracking-wide">GST Number</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-[#f8fbf9] border border-[#dce4e0] rounded-xl outline-none focus:ring-2 focus:ring-[#1faa62]/20 focus:border-[#1faa62]"
                      placeholder="Enter GST number"
                      value={newItem.gstNumber}
                      onChange={e => setNewItem({ ...newItem, gstNumber: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-[#607d74] uppercase tracking-wide">Generic Name</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-[#f8fbf9] border border-[#dce4e0] rounded-xl outline-none focus:ring-2 focus:ring-[#1faa62]/20 focus:border-[#1faa62] transition-all"
                      placeholder="e.g. Acetaminophen"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-[#607d74] uppercase tracking-wide">Description</label>
                      <textarea
                        rows={3}
                        className="w-full px-4 py-3 bg-[#f8fbf9] border border-[#dce4e0] rounded-xl outline-none resize-none focus:ring-2 focus:ring-[#1faa62]/20 focus:border-[#1faa62]"
                        placeholder="Additional details about the item..."
                        value={newItem.description}
                        onChange={e => setNewItem({...newItem, description: e.target.value})}
                      />
                    </div>
                    <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">
                      <div className="space-y-2 text-sm text-[#607d74]">
                        <div className="flex items-center justify-between gap-6">
                          <span>Total Product Amount</span>
                          <span className="font-semibold text-[#142e26]">Rs. {productSubtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-6">
                          <span>Tax Amount</span>
                          <span className="font-semibold text-[#142e26]">Rs. {taxAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-6 border-t border-[#eef3f0] pt-2 text-base font-bold text-[#142e26]">
                          <span>Total Amount</span>
                          <span>Rs. {totalAmount.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stock & Details */}
                <div className="space-y-5">
                  <div className="flex items-center gap-2 pb-2 border-b border-[#f0f4f2]">
                    <Activity className="w-4 h-4 text-[#1faa62]" />
                    <h4 className="text-sm font-bold text-[#142e26] uppercase tracking-wider">Stock & Details</h4>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-[#607d74] uppercase tracking-wide">Current Quantity</label>
                      <input
                        type="text"
                        readOnly
                        className="w-full px-4 py-3 bg-[#f8fbf9] border border-[#dce4e0] rounded-xl outline-none text-[#607d74]"
                        value={currentQuantity}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-[#607d74] uppercase tracking-wide">Reorder Level</label>
                      <input
                        type="number"
                        className="w-full px-4 py-3 bg-[#f8fbf9] border border-[#dce4e0] rounded-xl outline-none"
                        value={newItem.reorderLevel}
                        onChange={e => setNewItem({...newItem, reorderLevel: Number(e.target.value)})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-[#607d74] uppercase tracking-wide">Batch No.</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 bg-[#f8fbf9] border border-[#dce4e0] rounded-xl outline-none focus:ring-2 focus:ring-[#1faa62]/20 focus:border-[#1faa62]"
                        placeholder="e.g. BN-2024"
                        value={newItem.batchNo}
                        onChange={e => setNewItem({...newItem, batchNo: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-[#607d74] uppercase tracking-wide">Expiry Date</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8ea59d]" />
                        <input
                          type="date"
                          className="w-full pl-10 pr-4 py-3 bg-[#f8fbf9] border border-[#dce4e0] rounded-xl outline-none focus:ring-2 focus:ring-[#1faa62]/20 focus:border-[#1faa62]"
                          value={newItem.expiryDate}
                          onChange={e => setNewItem({...newItem, expiryDate: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-[#607d74] uppercase tracking-wide">Location / Rack</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8ea59d]" />
                      <input
                        type="text"
                        className="w-full pl-10 pr-4 py-3 bg-[#f8fbf9] border border-[#dce4e0] rounded-xl outline-none"
                        placeholder="e.g. Rack 4, Shelf B"
                        value={newItem.location}
                        onChange={e => setNewItem({...newItem, location: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-[#607d74] uppercase tracking-wide">Unit Price</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8ea59d]" />
                        <input
                          type="number"
                          className="w-full pl-10 pr-4 py-3 bg-[#f8fbf9] border border-[#dce4e0] rounded-xl outline-none"
                          placeholder="0.00"
                          value={newItem.purchasePrice || ''}
                          onChange={e => setNewItem({...newItem, purchasePrice: Number(e.target.value)})}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-[#607d74] uppercase tracking-wide">Tax %</label>
                      <input
                        type="text"
                        readOnly
                        className="w-full px-4 py-3 bg-[#f8fbf9] border border-[#dce4e0] rounded-xl outline-none text-[#607d74]"
                        value={newItem.gstTax}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-[#607d74] uppercase tracking-wide">Total</label>
                    <input
                      type="text"
                      readOnly
                      className="w-full px-4 py-3 bg-[#f8fbf9] border border-[#dce4e0] rounded-xl outline-none text-[#142e26]"
                      value={`Rs. ${totalAmount.toFixed(2)}`}
                    />
                  </div>
                </div>
              </div>
            </form>

            <div className="sticky bottom-0 flex flex-col gap-3 border-t border-[#dce4e0] bg-[#f8fbf9] p-6 sm:flex-row sm:items-end sm:justify-end">
              <button 
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-8 py-3 bg-white border border-[#dce4e0] text-[#607d74] rounded-xl font-bold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddItem}
                className="px-10 py-3 bg-[#1faa62] text-white rounded-xl font-bold hover:bg-[#179353] transition-all shadow-lg active:scale-95"
              >
                Save Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-[#142e26]/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-[#f0f4f2] flex justify-between items-center bg-[#f8fbf9]">
              <div>
                <h2 className="text-2xl font-bold text-[#142e26] tracking-tight">{selectedItem.itemName}</h2>
                <p className="text-[#607d74] text-sm font-medium">SKU: {selectedItem.sku || 'N/A'}</p>
              </div>
              <button 
                onClick={() => setSelectedItem(null)}
                className="p-2 hover:bg-white rounded-xl transition-colors text-[#607d74]"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-8 overflow-y-auto p-5 sm:p-8">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
                <div className="p-5 bg-[#f0f9f4] rounded-2xl border border-[#d1e9db]">
                  <p className="text-xs font-bold text-[#1faa62] uppercase tracking-wide mb-1">Stock Level</p>
                  <p className="text-3xl font-bold text-[#142e26]">{selectedItem.stockQuantity} <span className="text-lg text-[#607d74] font-medium">{selectedItem.stockUnit}</span></p>
                </div>
                <div className="p-5 bg-purple-50 rounded-2xl border border-purple-100">
                  <p className="text-xs font-bold text-purple-600 uppercase tracking-wide mb-1">Category</p>
                  <p className="text-2xl font-bold text-[#142e26]">{selectedItem.category}</p>
                </div>
                <div className="p-5 bg-orange-50 rounded-2xl border border-orange-100">
                  <p className="text-xs font-bold text-orange-600 uppercase tracking-wide mb-1">Batch No</p>
                  <p className="text-2xl font-bold text-[#142e26]">{selectedItem.batchNumber || 'N/A'}</p>
                </div>
              </div>

              {/* Detail Sections */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-bold text-[#142e26] uppercase tracking-widest mb-4 flex items-center gap-2">
                      <div className="w-1 h-4 bg-[#1faa62] rounded-full"></div>
                      Pricing Information
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-[#f8fbf9] rounded-xl">
                        <span className="text-sm text-[#607d74]">Purchase Price</span>
                        <span className="font-bold text-[#142e26]">₹{selectedItem.purchasePrice}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-[#f8fbf9] rounded-xl border border-[#1faa62]/20">
                        <span className="text-sm text-[#607d74]">Selling Price</span>
                        <span className="font-bold text-[#1faa62]">₹{selectedItem.sellingPrice}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-[#f8fbf9] rounded-xl">
                        <span className="text-sm text-[#607d74]">GST Tax</span>
                        <span className="font-bold text-[#142e26]">{selectedItem.gstTax}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-bold text-[#142e26] uppercase tracking-widest mb-4 flex items-center gap-2">
                      <div className="w-1 h-4 bg-orange-500 rounded-full"></div>
                      Inventory Health
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-[#f8fbf9] rounded-xl">
                        <span className="text-sm text-[#607d74]">Expiry Date</span>
                        <span className="font-bold text-orange-600">
                          {selectedItem.expiryDate ? new Date(selectedItem.expiryDate).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-[#f8fbf9] rounded-xl">
                        <span className="text-sm text-[#607d74]">Reorder Level</span>
                        <span className="font-bold text-[#142e26]">{selectedItem.reorderLevel} units</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-[#142e26] uppercase tracking-widest mb-4 flex items-center gap-2">
                      <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                      Storage & Location
                    </h3>
                    <div className="p-4 bg-blue-50/30 rounded-2xl border border-blue-100 space-y-2">
                      <div className="flex items-center gap-3 text-[#142e26]">
                        <MapPin className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-bold">{selectedItem.storageArea || 'Not Assigned'}</span>
                      </div>
                      <p className="text-xs text-[#607d74] pl-7">
                        Rack: {selectedItem.rackShelf || '-'} | Row: {selectedItem.row || '-'} | Col: {selectedItem.column || '-'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-bold text-[#142e26] uppercase tracking-widest mb-4 flex items-center gap-2">
                      <div className="w-1 h-4 bg-gray-400 rounded-full"></div>
                      Additional Notes
                    </h3>
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 min-h-[100px] h-full">
                      <p className="text-sm text-[#607d74] italic leading-relaxed">
                        {selectedItem.notes || 'No additional notes provided for this item.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-[#dce4e0] bg-[#f8fbf9] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <button 
                onClick={() => {
                  setShowRestockModal(selectedItem);
                  setSelectedItem(null);
                }}
                className="px-6 py-3 bg-[#1faa62] text-white rounded-xl font-bold hover:bg-[#179353] transition-all shadow-md active:scale-95 flex items-center gap-2"
              >
                <RefreshCcw className="w-4 h-4" />
                Restock Item
              </button>
              <button 
                onClick={() => setSelectedItem(null)}
                className="px-10 py-3 bg-[#1d3029] text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg active:scale-95"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
