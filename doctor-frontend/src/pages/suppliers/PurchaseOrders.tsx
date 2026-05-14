import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Save, Search, X, Upload, Download, FileSpreadsheet, Trash2, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
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
          orders={filteredOrders}
          onNewPurchase={(nextSupplierId) => void openPurchase({ supplierId: nextSupplierId })}
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
