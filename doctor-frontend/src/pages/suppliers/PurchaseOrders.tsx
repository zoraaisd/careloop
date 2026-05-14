import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Save, Search, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supplierApi } from './supplierApi';
import type { PurchaseOrder, Supplier, SupplierDetailsResponse } from './types';
import { formatCurrency, formatDate } from './format';

type SupplierProduct = SupplierDetailsResponse['productsSupplied'][number];

type OrderItem = {
  rowId: string;
  mode: 'existing' | 'new';
  inventoryItemId: string;
  productName: string;
  category: string;
  unit: string;
  quantity: number | '';
  unitPrice: number;
  tax: number;
  batchNumber: string;
  batchMonth: string;
  batchYear: string;
  expiryDate: string;
};

const paymentStatuses = ['Pending', 'Paid', 'Partially Paid'];
const orderRank = (order: PurchaseOrder) => new Date(order.createdAt || order.orderDate).getTime();
const normalizeKey = (value: string | null | undefined) => (value || '').trim().toLowerCase();
const getProductOptionLabel = (product: SupplierProduct) => `${product.productName}${product.unit ? ` (${product.unit})` : ''}`;
const createRowId = () => `purchase-item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const numericValue = (value: number | '') => (value === '' ? 0 : value);
const batchMonths = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const currentYear = new Date().getFullYear();
const batchYears = Array.from({ length: 16 }, (_, index) => currentYear - 2 + index);

const createEmptyItem = (category = 'Medicine'): OrderItem => ({
  rowId: createRowId(),
  mode: 'new',
  inventoryItemId: '',
  productName: '',
  category,
  unit: 'Units',
  quantity: 1,
  unitPrice: 0,
  tax: 5,
  batchNumber: '',
  batchMonth: '',
  batchYear: '',
  expiryDate: '',
});

const createEmptyExistingItem = (category = 'Medicine'): OrderItem => ({
  ...createEmptyItem(category),
  mode: 'existing',
  unitPrice: 0,
  tax: 5,
});

const parseBatchValue = (value: string) => {
  if (!value) {
    return { month: '', year: '' };
  }

  const [year, month] = value.split('-');
  return {
    month: month ? String(Number(month)) : '',
    year: year || '',
  };
};

const buildBatchValue = (month: string, year: string) => {
  if (!month || !year) {
    return '';
  }

  return `${year}-${month.padStart(2, '0')}`;
};

const PurchaseOrders: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const prefillHandledRef = useRef(false);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [lockedSupplierId, setLockedSupplierId] = useState('');
  const [poDate, setPoDate] = useState(new Date().toISOString().slice(0, 10));
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('Pending');
  const [gstNumber, setGstNumber] = useState('');
  const [items, setItems] = useState<OrderItem[]>([createEmptyItem()]);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [supplierProductsBySupplier, setSupplierProductsBySupplier] = useState<Record<string, SupplierProduct[]>>({});

  const selectedSupplierCategory = useMemo(
    () => suppliers.find((supplier) => supplier.id === supplierId)?.category || 'Medicine',
    [supplierId, suppliers],
  );

  const supplierProducts = supplierProductsBySupplier[supplierId] || [];

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

  const loadSupplierProducts = async (nextSupplierId: string) => {
    if (!nextSupplierId) {
      return [];
    }

    if (supplierProductsBySupplier[nextSupplierId]) {
      return supplierProductsBySupplier[nextSupplierId];
    }

    const response = await supplierApi.details(nextSupplierId);
    setSupplierProductsBySupplier((current) => ({
      ...current,
      [nextSupplierId]: response.productsSupplied,
    }));
    return response.productsSupplied;
  };

  useEffect(() => {
    void Promise.all([loadOrders(), loadSuppliers()]);
  }, []);

  useEffect(() => {
    const prefillSupplierId = searchParams.get('supplierId');
    if (!prefillSupplierId || prefillHandledRef.current || suppliers.length === 0) {
      return;
    }

    prefillHandledRef.current = true;
    void openPurchase({
      supplierId: prefillSupplierId,
      productId: searchParams.get('productId') || '',
    });
  }, [searchParams, suppliers]);

  const resetForm = (nextSupplierId?: string) => {
    const resolvedSupplierId = nextSupplierId || suppliers[0]?.id || '';
    const resolvedCategory = suppliers.find((supplier) => supplier.id === resolvedSupplierId)?.category || 'Medicine';
    setSupplierId(resolvedSupplierId);
    setLockedSupplierId('');
    setPoDate(new Date().toISOString().slice(0, 10));
    setInvoiceNumber('');
    setPaymentStatus('Pending');
    setGstNumber('');
    setItems([createEmptyItem(resolvedCategory)]);
  };

  const fillItemFromProduct = (product: SupplierProduct): OrderItem => {
    const parsedBatch = parseBatchValue(product.batchNumber || '');
    return {
      rowId: createRowId(),
      mode: 'existing',
      inventoryItemId: product.inventoryItemId || '',
      productName: product.productName,
      category: product.category,
      unit: product.unit || 'Units',
      quantity: 1,
      unitPrice: product.lastPurchasePrice || 0,
      tax: 5,
      batchNumber: product.batchNumber || '',
      batchMonth: parsedBatch.month,
      batchYear: parsedBatch.year,
      expiryDate: product.expiryDate || '',
    };
  };

  const openPurchase = async (options?: { supplierId?: string; productId?: string }) => {
    let availableSuppliers = suppliers;
    if (availableSuppliers.length === 0) {
      availableSuppliers = await loadSuppliers();
    }

    const resolvedSupplierId = options?.supplierId || availableSuppliers[0]?.id || '';
    const resolvedCategory = availableSuppliers.find((supplier) => supplier.id === resolvedSupplierId)?.category || 'Medicine';

    setSupplierId(resolvedSupplierId);
    setLockedSupplierId(options?.supplierId ? resolvedSupplierId : '');
    setPoDate(new Date().toISOString().slice(0, 10));
    setInvoiceNumber('');
    setPaymentStatus('Pending');
    setGstNumber('');
    setItems([createEmptyItem(resolvedCategory)]);
    setShowForm(true);

    try {
      const products = await loadSupplierProducts(resolvedSupplierId);
      const prefilledProduct = options?.productId
        ? products.find((product) => product.inventoryItemId === options.productId)
        : null;

      if (prefilledProduct) {
        setItems([fillItemFromProduct(prefilledProduct)]);
      }
    } catch (error) {
      console.error('Failed to load supplier products', error);
    }
  };

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + numericValue(item.quantity) * item.unitPrice, 0);
    const tax = items.reduce((sum, item) => sum + (numericValue(item.quantity) * item.unitPrice * item.tax) / 100, 0);
    return { subtotal, tax, grandTotal: subtotal + tax };
  }, [items]);

  const groupedOrders = useMemo(() => {
    const supplierMap = new Map<string, PurchaseOrder>();

    orders.forEach((order) => {
      const existing = supplierMap.get(order.supplierId);
      if (!existing || orderRank(order) >= orderRank(existing)) {
        supplierMap.set(order.supplierId, order);
      }
    });

    return Array.from(supplierMap.values()).sort((left, right) => orderRank(right) - orderRank(left));
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return groupedOrders;
    }

    return groupedOrders.filter((order) =>
      [order.poNumber, order.invoiceNumber, order.supplierName, order.orderDate]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword)),
    );
  }, [groupedOrders, search]);

  const updateItem = (index: number, patch: Partial<OrderItem>) => {
    setItems((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  };

  const updateBatchPart = (index: number, part: 'month' | 'year', value: string) => {
    const currentItem = items[index];
    const nextMonth = part === 'month' ? value : currentItem?.batchMonth || '';
    const nextYear = part === 'year' ? value : currentItem?.batchYear || '';

    updateItem(index, {
      batchMonth: nextMonth,
      batchYear: nextYear,
      batchNumber: buildBatchValue(nextMonth, nextYear),
    });
  };

  const applyExistingProductBySearch = (index: number, searchValue: string) => {
    const normalizedSearch = normalizeKey(searchValue);
    const exactLabelMatch = supplierProducts.find((candidate) => normalizeKey(getProductOptionLabel(candidate)) === normalizedSearch);
    const exactNameMatch = supplierProducts.find((candidate) => normalizeKey(candidate.productName) === normalizedSearch);
    const startsWithNameMatch = supplierProducts.find((candidate) => normalizeKey(candidate.productName).startsWith(normalizedSearch));
    const product = exactLabelMatch ?? exactNameMatch ?? startsWithNameMatch;
    if (!product) {
      const currentItem = items[index];
      updateItem(index, {
        ...createEmptyExistingItem(selectedSupplierCategory),
        rowId: currentItem?.rowId || createRowId(),
        productName: searchValue,
        unit: currentItem?.unit || 'Units',
        quantity: currentItem?.quantity || 1,
        batchNumber: currentItem?.batchNumber || '',
        batchMonth: currentItem?.batchMonth || '',
        batchYear: currentItem?.batchYear || '',
        expiryDate: currentItem?.expiryDate || '',
      });
      return;
    }

    updateItem(index, {
      ...fillItemFromProduct(product),
      rowId: items[index]?.rowId || createRowId(),
    });
  };

  const handleSupplierChange = async (nextSupplierId: string) => {
    const nextCategory = suppliers.find((supplier) => supplier.id === nextSupplierId)?.category || 'Medicine';
    setSupplierId(nextSupplierId);
    await loadSupplierProducts(nextSupplierId);
    setItems([createEmptyItem(nextCategory)]);
  };

  const resolveExistingProduct = (item: OrderItem) => {
    const normalizedProductName = normalizeKey(item.productName);
    return supplierProducts.find((product) =>
      normalizeKey(product.productName) === normalizedProductName
      || normalizeKey(getProductOptionLabel(product)) === normalizedProductName
      || normalizeKey(product.productName).startsWith(normalizedProductName),
    ) || null;
  };

  const getDuplicateProduct = (item: OrderItem) => {
    if (item.mode !== 'new') {
      return null;
    }

    return supplierProducts.find((product) => {
      const sameSku = false;
      const sameNameAndUnit = normalizeKey(item.productName) === normalizeKey(product.productName);

      return sameSku || sameNameAndUnit;
    }) || null;
  };

  const addItem = () => {
    setItems((current) => [...current, createEmptyItem(selectedSupplierCategory)]);
  };

  const removeItem = (index: number) => {
    setItems((current) => (current.length === 1 ? current : current.filter((_, itemIndex) => itemIndex !== index)));
  };

  const saveOrder = async () => {
    if (!supplierId || saving) return;
    if (!invoiceNumber.trim()) {
      window.alert('Please enter invoice number');
      return;
    }

    const normalizedItems = [...items];
    for (let index = 0; index < normalizedItems.length; index += 1) {
      const item = normalizedItems[index];
      if (item.mode === 'existing') {
        const resolvedProduct = resolveExistingProduct(item);

        if (!resolvedProduct) {
          window.alert(`Please search and select an existing product for item ${index + 1}`);
          return;
        }

        normalizedItems[index] = {
          ...item,
          inventoryItemId: resolvedProduct.inventoryItemId || '',
          productName: resolvedProduct.productName,
          category: resolvedProduct.category,
          unit: resolvedProduct.unit || item.unit || 'Units',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          batchNumber: item.batchNumber,
          batchMonth: item.batchMonth,
          batchYear: item.batchYear,
          expiryDate: item.expiryDate,
        };
      }

      if (!item.productName.trim()) {
        window.alert(`Please enter product name for item ${index + 1}`);
        return;
      }

      if (numericValue(item.quantity) <= 0) {
        window.alert(`Please enter a valid quantity for item ${index + 1}`);
        return;
      }

      const duplicate = getDuplicateProduct(item);
      if (duplicate) {
        const shouldRestock = window.confirm(
          `This product already exists for ${suppliers.find((supplier) => supplier.id === supplierId)?.supplierName || 'this supplier'}. Do you want to restock it instead?`,
        );

        if (!shouldRestock) {
          return;
        }

        normalizedItems[index] = {
          ...fillItemFromProduct(duplicate),
          quantity: numericValue(item.quantity),
          unitPrice: item.unitPrice,
          batchNumber: item.batchNumber,
          batchMonth: item.batchMonth,
          batchYear: item.batchYear,
          expiryDate: item.expiryDate,
        };
      }
    }

    setSaving(true);
    try {
      await supplierApi.createPurchaseOrder({
        supplierId,
        orderDate: poDate,
        invoiceNumber: invoiceNumber.trim(),
        paymentStatus,
        gstNumber,
        status: 'Confirmed',
        items: normalizedItems.map((item) => ({
          inventoryItemId: item.mode === 'existing' ? item.inventoryItemId : undefined,
          productName: item.productName.trim(),
          category: item.category.trim(),
          unit: item.unit.trim() || 'Units',
          quantity: numericValue(item.quantity),
          unitPrice: item.unitPrice,
          sellingPrice: item.unitPrice,
          reorderLevel: 0,
          batchNumber: item.batchNumber.trim() || undefined,
          expiryDate: item.expiryDate || undefined,
        })),
      });

      setShowForm(false);
      resetForm();
      setSearchParams({});
      await Promise.all([loadOrders(), loadSuppliers()]);
    } catch (error: any) {
      const message = error?.response?.data?.message
        || error?.response?.data?.debug?.message
        || error?.message
        || 'Failed to save purchase entry';
      window.alert(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 [&_button]:cursor-pointer [&_a]:cursor-pointer">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#142e26]">Purchase Entry</h1>
          <p className="text-sm text-[#607d74]">Add a product for the first time or restock an existing product.</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <label className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8ea59d]" />
            <input
              className="w-full rounded-lg border border-[#dce4e0] bg-white py-2 pl-10 pr-4 text-sm outline-none focus:border-[#16924d]"
              placeholder="Search supplier, invoice, entry..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#16924d] px-4 py-2 text-sm font-semibold text-white sm:w-auto"
            onClick={() => void openPurchase()}
          >
            <Plus className="h-4 w-4" /> Create Entry
          </button>
        </div>
      </div>

      {showForm ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-[#142e26]/35 p-4 pt-10">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-2xl border border-[#dce4e0] bg-white p-4 shadow-2xl sm:p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-[#142e26]">{items.some((item) => item.mode === 'existing') ? 'Restock / Purchase Entry' : 'Add New Product Purchase'}</h2>
                <p className="text-sm text-[#607d74]">Select existing product to restock or switch to new product mode to create it once.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                  setSearchParams({});
                }}
                className="rounded p-2 hover:bg-[#eef3f0]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="space-y-1">
                <span className="text-xs font-bold text-[#607d74]">Supplier Name</span>
                {lockedSupplierId ? (
                  <input
                    className="w-full rounded-lg border border-[#dce4e0] bg-[#f8fbf9] px-3 py-2 text-sm text-[#607d74]"
                    value={suppliers.find((supplier) => supplier.id === supplierId)?.supplierName || ''}
                    readOnly
                  />
                ) : (
                  <select className="w-full rounded-lg border border-[#dce4e0] px-3 py-2 text-sm" value={supplierId} onChange={(event) => void handleSupplierChange(event.target.value)}>
                    {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.supplierName}</option>)}
                  </select>
                )}
              </label>
              <label className="space-y-1">
                <span className="text-xs font-bold text-[#607d74]">Invoice Number</span>
                <input className="w-full rounded-lg border border-[#dce4e0] px-3 py-2 text-sm" value={invoiceNumber} onChange={(event) => setInvoiceNumber(event.target.value)} placeholder="Enter invoice number" />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-bold text-[#607d74]">Purchase Date</span>
                <input className="w-full rounded-lg border border-[#dce4e0] px-3 py-2 text-sm" type="date" value={poDate} onChange={(event) => setPoDate(event.target.value)} />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-bold text-[#607d74]">Payment Status</span>
                <select className="w-full rounded-lg border border-[#dce4e0] px-3 py-2 text-sm" value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)}>
                  {paymentStatuses.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-xs font-bold text-[#607d74]">GST Number</span>
                <input className="w-full rounded-lg border border-[#dce4e0] px-3 py-2 text-sm" value={gstNumber} onChange={(event) => setGstNumber(event.target.value)} />
              </label>
            </div>

            <div className="mt-5 space-y-4">
              {items.map((item, index) => {
                const duplicate = getDuplicateProduct(item);
                const selectedProduct = supplierProducts.find((product) => product.inventoryItemId === item.inventoryItemId) || null;
                const lineTotal = numericValue(item.quantity) * item.unitPrice * (1 + item.tax / 100);
                return (
                  <div key={item.rowId} className="rounded-xl border border-[#dce4e0] bg-[#fbfdfc] p-4">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold text-[#142e26]">Item {index + 1}</p>
                        <p className="text-xs text-[#607d74]">{item.mode === 'existing' ? 'Restock Product' : 'Add New Product'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className={`rounded-lg px-3 py-2 text-xs font-bold ${item.mode === 'existing' ? 'bg-[#16924d] text-white' : 'bg-[#eef3f0] text-[#607d74]'}`}
                          onClick={() => {
                            updateItem(index, createEmptyExistingItem(selectedSupplierCategory));
                          }}
                        >
                          Restock Existing
                        </button>
                        <button
                          type="button"
                          className={`rounded-lg px-3 py-2 text-xs font-bold ${item.mode === 'new' ? 'bg-[#16924d] text-white' : 'bg-[#eef3f0] text-[#607d74]'}`}
                          onClick={() => updateItem(index, { ...createEmptyItem(selectedSupplierCategory), quantity: item.quantity, unitPrice: item.unitPrice })}
                        >
                          Add New Product
                        </button>
                        {items.length > 1 ? (
                          <button type="button" className="rounded-lg border border-[#dce4e0] px-3 py-2 text-xs font-bold text-[#607d74]" onClick={() => removeItem(index)}>
                            Remove
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div className={`grid gap-4 ${item.mode === 'new' ? 'md:grid-cols-6' : 'md:grid-cols-6'}`}>
                      {item.mode === 'existing' ? (
                        <>
                        <label className="space-y-1">
                          <span className="text-xs font-bold uppercase text-[#607d74]">Product Name</span>
                          <input
                            list={`supplier-products-${index}`}
                            className="w-full rounded-lg border border-[#dce4e0] px-3 py-2 text-sm"
                            value={selectedProduct ? getProductOptionLabel(selectedProduct) : item.productName}
                            onChange={(event) => applyExistingProductBySearch(index, event.target.value)}
                            placeholder="Select product"
                          />
                          <datalist id={`supplier-products-${index}`}>
                            {supplierProducts.map((product) => (
                              <option key={product.inventoryItemId || `${product.productName}-${product.unit}`} value={getProductOptionLabel(product)} />
                            ))}
                          </datalist>
                        </label>
                        <label className="space-y-1">
                          <span className="text-xs font-bold uppercase text-[#607d74]">Category</span>
                          <input
                            className="w-full rounded-lg border border-[#dce4e0] bg-[#f8fbf9] px-3 py-2 text-sm text-[#607d74]"
                            value={item.category}
                            readOnly
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-xs font-bold uppercase text-[#607d74]">Current Quantity</span>
                          <input
                            className="w-full rounded-lg border border-[#dce4e0] bg-[#f8fbf9] px-3 py-2 text-sm text-[#607d74]"
                            value={selectedProduct?.currentStock ?? 0}
                            readOnly
                          />
                        </label>
                          <label className="space-y-1">
                            <span className="text-xs font-bold uppercase text-[#607d74]">Restock Quantity</span>
                            <input className="w-full rounded-lg border border-[#dce4e0] px-3 py-2 text-sm" type="number" min={1} value={item.quantity} onChange={(event) => updateItem(index, { quantity: event.target.value === '' ? '' : Number(event.target.value) })} />
                          </label>
                        <label className="space-y-1">
                          <span className="text-xs font-bold uppercase text-[#607d74]">Unit Price</span>
                          <input
                            className="w-full rounded-lg border border-[#dce4e0] px-3 py-2 text-sm"
                            type="number"
                            min={0}
                            value={item.unitPrice}
                            onChange={(event) => updateItem(index, { unitPrice: Number(event.target.value) || 0 })}
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-xs font-bold uppercase text-[#607d74]">Tax %</span>
                          <input
                            className="w-full rounded-lg border border-[#dce4e0] bg-[#f8fbf9] px-3 py-2 text-sm text-[#607d74]"
                            type="number"
                            value={item.tax}
                            readOnly
                          />
                        </label>
                        <div className="md:col-span-6 grid gap-4 md:grid-cols-3">
                          <label className="space-y-1 md:col-start-3">
                            <span className="text-xs font-bold text-[#607d74]">Expiry Date</span>
                            <input className="w-full rounded-lg border border-[#dce4e0] px-3 py-2 text-sm" type="date" value={item.expiryDate} onChange={(event) => updateItem(index, { expiryDate: event.target.value })} />
                          </label>
                        </div>
                        </>
                        ) : (
                          <>
                          <label className="space-y-1">
                            <span className="text-xs font-bold uppercase text-[#607d74]">Product Name</span>
                            <input
                              className="w-full rounded-lg border border-[#dce4e0] px-3 py-2 text-sm"
                              value={item.productName}
                              onChange={(event) => updateItem(index, { productName: event.target.value })}
                            />
                          </label>
                          <label className="space-y-1">
                            <span className="text-xs font-bold uppercase text-[#607d74]">Category</span>
                            <input
                              className="w-full rounded-lg border border-[#dce4e0] bg-[#f8fbf9] px-3 py-2 text-sm text-[#607d74]"
                              value={item.category}
                              readOnly
                            />
                          </label>
                            <label className="space-y-1">
                              <span className="text-xs font-bold uppercase text-[#607d74]">Quantity</span>
                              <input className="w-full rounded-lg border border-[#dce4e0] px-3 py-2 text-sm" type="number" min={1} value={item.quantity} onChange={(event) => updateItem(index, { quantity: event.target.value === '' ? '' : Number(event.target.value) })} />
                            </label>
                          <label className="space-y-1">
                            <span className="text-xs font-bold uppercase text-[#607d74]">Unit Price</span>
                            <input className="w-full rounded-lg border border-[#dce4e0] px-3 py-2 text-sm" type="number" min={0} value={item.unitPrice} onChange={(event) => updateItem(index, { unitPrice: Number(event.target.value) || 0 })} />
                          </label>
                          <label className="space-y-1">
                            <span className="text-xs font-bold uppercase text-[#607d74]">Tax %</span>
                            <input
                              className="w-full rounded-lg border border-[#dce4e0] bg-[#f8fbf9] px-3 py-2 text-sm text-[#607d74]"
                              type="number"
                              value={item.tax}
                              readOnly
                            />
                          </label>
                          <div className="space-y-1">
                            <span className="text-xs font-bold uppercase text-[#607d74]">Total</span>
                            <div className="rounded-lg px-3 py-2 text-sm font-semibold text-[#142e26]">{formatCurrency(lineTotal)}</div>
                          </div>
                          <label className="space-y-1 md:col-span-2">
                            <span className="text-xs font-bold text-[#607d74]">Batch</span>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <input
                                list={`batch-months-${index}`}
                                className="w-full rounded-lg border border-[#dce4e0] px-3 py-2 text-sm"
                                value={item.batchMonth ? batchMonths[Number(item.batchMonth) - 1] || '' : ''}
                                onChange={(event) => {
                                  const matchedMonthIndex = batchMonths.findIndex((month) => month.toLowerCase() === event.target.value.trim().toLowerCase());
                                  updateBatchPart(index, 'month', matchedMonthIndex >= 0 ? String(matchedMonthIndex + 1) : '');
                                }}
                                placeholder="Search month"
                              />
                              <datalist id={`batch-months-${index}`}>
                                {batchMonths.map((month) => (
                                  <option key={month} value={month} />
                                ))}
                              </datalist>
                              <input
                                list={`batch-years-${index}`}
                                className="w-full rounded-lg border border-[#dce4e0] px-3 py-2 text-sm"
                                value={item.batchYear}
                                onChange={(event) => {
                                  const nextYear = event.target.value.trim();
                                  updateBatchPart(index, 'year', batchYears.some((year) => String(year) === nextYear) ? nextYear : '');
                                }}
                                placeholder="Search year"
                              />
                              <datalist id={`batch-years-${index}`}>
                                {batchYears.map((year) => (
                                  <option key={year} value={String(year)} />
                                ))}
                              </datalist>
                            </div>
                          </label>
                          <label className="space-y-1 md:col-span-2">
                            <span className="text-xs font-bold text-[#607d74]">Expiry Date</span>
                            <input className="w-full rounded-lg border border-[#dce4e0] px-3 py-2 text-sm" type="date" value={item.expiryDate} onChange={(event) => updateItem(index, { expiryDate: event.target.value })} />
                          </label>
                          </>
                      )}

                    </div>

                    {duplicate ? (
                      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        This product already exists. Save will switch it to restock for <span className="font-semibold">{duplicate.productName}</span>.
                      </div>
                    ) : null}

                    <div className="mt-3 flex justify-end text-sm font-semibold text-[#142e26]">
                      Line Total: {formatCurrency(lineTotal)}
                    </div>
                  </div>
                );
              })}
            </div>

            <button type="button" className="mt-4 rounded-lg bg-[#ecf8f1] px-4 py-2 text-sm font-bold text-[#13804e]" onClick={addItem}>
              + Add Item
            </button>

            <div className="mt-5 flex justify-end">
              <div className="w-full max-w-xs rounded-lg bg-[#f8fbf9] p-4 text-sm">
                <Row label="Total Product Amount" value={formatCurrency(totals.subtotal)} />
                <Row label="Tax Amount" value={formatCurrency(totals.tax)} />
                <Row label="Total Amount" value={formatCurrency(totals.grandTotal)} strong />
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="rounded-lg border border-[#dce4e0] px-4 py-2 text-sm font-semibold"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                  setSearchParams({});
                }}
              >
                Cancel
              </button>
              <button type="button" className="inline-flex items-center gap-2 rounded-lg bg-[#16924d] px-4 py-2 text-sm font-semibold text-white" onClick={() => void saveOrder()} disabled={saving}>
                <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Purchase'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="rounded-lg border border-[#dce4e0] bg-white shadow-sm">
        <Table
          orders={filteredOrders}
          onNewPurchase={(nextSupplierId) => void openPurchase({ supplierId: nextSupplierId })}
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
            <tr key={order.id} className="hover:bg-[#f8fbf9]" onClick={() => onOpenHistory(order.supplierId)}>
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
