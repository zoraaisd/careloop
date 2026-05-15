import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Save, Search, X, Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supplierApi } from './supplierApi';
import type { PurchaseOrder, Supplier, SupplierDetailsResponse } from './types';
import { notifySuccess } from '@/services/api';

type SupplierProduct = SupplierDetailsResponse['productsSupplied'][number];

type OrderItem = {
  rowId: string;
  mode: 'existing' | 'new';
  inventoryItemId: string;
  productName: string;
  category: string;
  unit: string;
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

const orderRank = (order: PurchaseOrder) => new Date(order.createdAt || order.orderDate).getTime();
const normalizeKey = (value: string | null | undefined) => (value || '').trim().toLowerCase();
const createRowId = () => `purchase-item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const inventoryCategories = [
  'Medicines',
  'Lab Products',
  'Medical Equipment',
  'Surgical Supplies',
  'Patient Care Consumables',
  'Cleaning & Sterilization',
  'Emergency Supplies',
  'Nutrition & Supplements',
  'Orthopedic Products',
  'Clinic Office Supplies'
];

const productCatalogByCategory: Record<string, string[]> = {
  'Medicines': [
    'Dolo 650',
    'Crocin',
    'Calpol',
    'Paracetamol',
    'Combiflam',
    'Aceclo Plus',
    'Zerodol',
    'Voveran',
    'Ultracet',
    'Azithromycin',
    'Amoxicillin',
    'Augmentin',
    'Cefixime',
    'Ceftriaxone',
    'Doxycycline',
    'Ciprofloxacin',
    'Ofloxacin',
    'Metrogyl',
    'Benadryl',
    'Ascoril',
    'Alex Syrup',
    'Corex',
    'Sinarest',
    'Cetirizine',
    'Levocetirizine',
    'Montek LC',
    'Metformin',
    'Glycomet',
    'Glimepiride',
    'Januvia',
    'Insulin',
    'Human Mixtard',
    'Telmisartan',
    'Amlodipine',
    'Atenolol',
    'Ecosprin',
    'Clopidogrel',
    'Atorvastatin',
    'Pantoprazole',
    'Pan 40',
    'Omez',
    'Rantac',
    'Gelusil',
    'Digene',
    'Becosules',
    'Shelcal',
    'Limcee',
    'Zincovit',
    'Neurobion',
    'Livogen',
    'Vitamin C',
    'Candid Cream',
    'Betnovate',
    'Soframycin',
    'Burnol',
    'Silverex',
    'Refresh Tears',
    'Ciplox Eye Drops',
    'Otrivin Nasal Drops',
    'Earwel Ear Drops',
    'Calpol Syrup',
    'Zinc Syrup',
    'P250 Syrup',
    'Junior Horlicks',
    'Adrenaline Injection',
    'Atropine Injection',
    'Avil Injection',
    'Dexona Injection',
    'Covaxin',
    'Covishield',
    'Hepatitis B Vaccine',
    'BCG Vaccine',
    'Polio Vaccine',
    'TT Vaccine',
    'Normal Saline',
    'DNS',
    'RL Fluid',
    'Dextrose',
    'Asthalin Inhaler',
    'Budecort',
    'Foracort',
    'Duolin',
    'Liv52',
    'Dabur Honitus',
    'Chyawanprash',
    'Tulsi Syrup',
    'Neem Capsules',
  ],
  'Surgical Supplies': [
    'Surgical Gloves',
    'Examination Gloves',
    'Sterile Gloves',
    'Surgical Mask',
    'N95 Masks',
    'Surgical Cap',
    'Shoe Cover',
    'Syringe',
    'Insulin Syringe',
    'Needle',
    'IV Cannula',
    'IV Set',
    'Scalp Vein Set',
    'Cotton Roll',
    'Gauze Piece',
    'Bandage Roll',
    'Crepe Bandage',
    'Adhesive Tape',
    'Micropore Tape',
    'Sutures',
    'Surgical Blades',
    'Scalpel Handle',
    'Dressing Pad',
    'Surgical Drapes',
    'Kidney Tray',
    'Forceps',
    'Scissors',
    'Artery Forceps',
    'Sponge Holding Forceps',
    'Needle Holder',
    'Retractor',
    'Speculum',
    'Catgut',
    'Silk Sutures',
    'Stapler Remover',
    'Disposable Surgical Kit',
    'OT Sheet',
    'Biohazard Waste Bag',
  ],
  'Patient Care Consumables': [
    'IV Set',
    'IV Cannula',
    'Syringe',
    'Catheter',
    'Foley Catheter',
    'Ryles Tube',
    'Feeding Tube',
    'Urine Bag',
    'Colostomy Bag',
    'Oxygen Mask',
    'Nebulizer Mask',
    'Face Mask',
    'Adult Diaper',
    'Underpad',
    'Bed Protector Sheet',
    'Surgical Cotton',
    'Gauze Roll',
    'Disposable Gloves',
    'Patient Gown',
    'Bed Sheet',
    'Pillow Cover',
    'Hot Water Bag',
    'Ice Gel Pack',
    'Tongue Depressor',
    'Specimen Cup',
    'Disposable Apron',
    'ECG Electrodes',
    'Pulse Oximeter Probe',
    'Air Bed',
  ],
  'Cleaning & Sterilization': [
    'Hand Sanitizer',
    'Surface Disinfectant',
    'Floor Cleaner',
    'Phenyl',
    'Bleaching Powder',
    'Alcohol Swab',
    'Spirit Solution',
    'Surgical Spirit',
    'Sterile Pouch',
    'Sterilization Roll',
    'Autoclave Tape',
    'Autoclave Indicator',
    'Biohazard Bag',
    'Yellow Waste Bag',
    'Red Waste Bag',
    'Sharp Container',
    'Needle Destroyer',
    'UV Sterilizer',
    'Autoclave Machine',
    'Cleaning Brush',
    'Disposable Mop',
    'Sterile Gloves',
    'Sterile Drapes',
    'Disinfectant Spray',
    'Liquid Soap',
    'Tissue Roll',
    'Biomedical Waste Bin',
  ],
  'Emergency Supplies': [
    'First Aid Kit',
    'Defibrillator',
    'Ventilator',
    'Ambu Bag',
    'Oxygen Cylinder',
    'Oxygen Mask',
    'CPR Mask',
    'Emergency Trolley',
    'Suction Machine',
    'Spine Board',
    'Cervical Collar',
    'Splint',
    'Trauma Dressing',
    'Burn Dressing',
    'Emergency Blanket',
    'Tourniquet',
    'Adrenaline Injection',
    'Atropine Injection',
    'Dexona Injection',
    'IV Fluids',
    'Emergency Syringe',
    'Airway Tube',
    'Laryngoscope',
    'ET Tube',
    'Portable Monitor',
    'Glucose Injection',
  ],
  'Nutrition & Supplements': [
    'Protein Powder',
    'Whey Protein',
    'Pediatric Nutrition Powder',
    'Glucose Powder',
    'Calcium Powder',
    'Iron Supplement',
    'Multivitamin Tablets',
    'Zinc Tablets',
    'Vitamin C Tablets',
    'Fish Oil Capsule',
    'Energy Drink Powder',
    'Electrolyte Powder',
    'ORS Sachet',
    'Nutrition Shake',
    'Diabetic Nutrition Powder',
    'Weight Gain Powder',
    'Liver Tonic',
    'Iron Tonic',
    'Pediatric Tonic',
    'Herbal Tonic',
  ],
  'Orthopedic Products': [
    'Knee Cap',
    'Knee Brace',
    'Elbow Support',
    'Wrist Support',
    'Ankle Support',
    'Cervical Collar',
    'Lumbar Belt',
    'Back Support Belt',
    'Shoulder Immobilizer',
    'Arm Sling',
    'Walker',
    'Crutches',
    'Wheelchair',
    'Walking Stick',
    'Finger Splint',
    'Leg Splint',
    'Traction Kit',
    'Orthopedic Pillow',
    'Hot & Cold Pack',
    'Orthopedic Mattress',
    'Posture Corrector',
    'Heel Pad',
    'Silicon Insole',
  ],
  'Clinic Office Supplies': [
    'Prescription Pad',
    'Patient File',
    'Medical Record File',
    'Billing Roll',
    'Printer Paper',
    'Printer Ink',
    'Barcode Sticker',
    'Patient ID Band',
    'Appointment Register',
    'Receipt Book',
    'Office Pen',
    'Marker Pen',
    'Stapler',
    'Punch Machine',
    'Clipboard',
    'Name Board',
    'Token Display System',
    'Calling Bell',
    'Queue Token Roll',
    'Desktop Computer',
    'Keyboard',
    'Mouse',
    'Barcode Scanner',
    'Thermal Printer',
    'WiFi Router',
    'Attendance Register',
    'Calculator',
    'Office Chair',
    'Reception Desk',
    'Storage Cabinet',
  ],
  'Lab Products': [
    'Blood Collection Tube',
    'EDTA Tube',
    'Plain Tube',
    'Citrate Tube',
    'Fluoride Tube',
    'Serum Separator Tube',
    'Urine Container',
    'Stool Container',
    'Sputum Container',
    'Sample Collection Container',
    'Microscope Slide',
    'Cover Slip',
    'Test Tube',
    'Centrifuge Tube',
    'Pipette',
    'Micropipette',
    'Pipette Tips',
    'Glass Beaker',
    'Measuring Cylinder',
    'Conical Flask',
    'Test Tube Rack',
    'Centrifuge Machine',
    'Microscope',
    'Hemoglobin Meter',
    'Glucometer',
    'Glucose Strips',
    'Lancets',
    'Rapid Test Kit',
    'COVID Test Kit',
    'Dengue Test Kit',
    'Malaria Test Kit',
    'HIV Test Kit',
    'Pregnancy Test Kit',
    'Blood Grouping Kit',
    'Urine Test Strip',
    'Cholesterol Test Kit',
    'HbA1c Test Kit',
    'Thyroid Test Kit',
    'Liver Function Test Kit',
    'Kidney Function Test Kit',
    'Biochemistry Reagent',
    'Hematology Reagent',
    'Urine Reagent',
    'Staining Solution',
    'Culture Media',
    'Agar Plates',
    'Cotton Swab',
    'Sterile Swab Stick',
    'Syringe Filter',
    'Lab Gloves',
    'Lab Mask',
    'Biohazard Bag',
    'Specimen Transport Box',
    'Ice Pack',
    'Barcode Label Stickers',
    'Lab Printer Roll',
    'Vacutainer Needle',
    'Tourniquet',
    'Alcohol Swab',
    'Slide Staining Rack',
    'Immersion Oil',
    'pH Paper',
    'Distilled Water',
    'Lab Disinfectant',
    'Autoclave Indicator Tape',
    'PCR Tube',
    'PCR Kit',
    'Elisa Kit',
    'Elisa Plate',
    'Cryovial Tube',
    'Freezer Storage Box',
  ],
  'Medical Equipment': [
    'BP Apparatus',
    'Digital BP Monitor',
    'Thermometer',
    'Infrared Thermometer',
    'Pulse Oximeter',
    'Glucometer',
    'ECG Machine',
    'EEG Machine',
    'Ultrasound Machine',
    'X-Ray Machine',
    'CT Scan Machine',
    'MRI Scanner',
    'Nebulizer',
    'Oxygen Concentrator',
    'Oxygen Cylinder',
    'Ventilator',
    'Suction Machine',
    'Defibrillator',
    'Infusion Pump',
    'Syringe Pump',
    'Patient Monitor',
    'Fetal Monitor',
    'Weighing Scale',
    'Baby Weighing Machine',
    'Height Measuring Scale',
    'Examination Light',
    'Operation Table',
    'Examination Couch',
    'Wheelchair',
    'Stretcher',
    'Walker',
    'Hospital Bed',
    'ICU Bed',
    'Bedside Locker',
    'Crash Cart',
    'Autoclave Machine',
    'Sterilizer Machine',
    'Dental Chair',
    'Microscope',
    'Centrifuge Machine',
    'ECG Electrodes',
    'OT Light',
    'CPAP Machine',
    'BiPAP Machine',
    'Spirometer',
    'Endoscope',
    'Colposcope',
    'Dermatoscope',
    'Otoscope',
    'Ophthalmoscope',
  ],
};

const getCatalogProducts = (category: string) => {
  const normalizedCategory = category.trim();
  if (!normalizedCategory) {
    return [];
  }

  return productCatalogByCategory[normalizedCategory] || [];
};

const createEmptyItem = (category = ''): OrderItem => ({
  rowId: createRowId(),
  mode: 'new',
  inventoryItemId: '',
  productName: '',
  category,
  unit: 'Units',
});

const PurchaseOrders: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const prefillHandledRef = useRef(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [lockedSupplierId, setLockedSupplierId] = useState('');
  const [poDate, setPoDate] = useState(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<OrderItem[]>([createEmptyItem()]);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [supplierProductsBySupplier, setSupplierProductsBySupplier] = useState<Record<string, SupplierProduct[]>>({});
  const [importing, setImporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [showSuggestions, setShowSuggestions] = useState<{ index: number; field: 'productName' | 'category' } | null>(null);


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
    setSupplierId(resolvedSupplierId);
    setLockedSupplierId('');
    setPoDate(new Date().toISOString().slice(0, 10));
    setItems([createEmptyItem()]);
  };

  const fillItemFromProduct = (product: SupplierProduct): OrderItem => {
    return {
      rowId: createRowId(),
      mode: 'existing',
      inventoryItemId: product.inventoryItemId || '',
      productName: product.productName,
      category: product.category,
      unit: product.unit || 'Units',
    };
  };

  const openPurchase = async (options?: { supplierId?: string; productId?: string }) => {
    let availableSuppliers = suppliers;
    if (availableSuppliers.length === 0) {
      availableSuppliers = await loadSuppliers();
    }

    const resolvedSupplierId = options?.supplierId || availableSuppliers[0]?.id || '';

    setSupplierId(resolvedSupplierId);
    setLockedSupplierId(options?.supplierId ? resolvedSupplierId : '');
    setPoDate(new Date().toISOString().slice(0, 10));
    setItems([createEmptyItem()]);
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
      [order.poNumber, order.supplierName, order.orderDate]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword)),
    );
  }, [groupedOrders, search]);

  const updateItem = (index: number, patch: Partial<OrderItem>) => {
    setItems((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  };

  const handleSupplierChange = async (nextSupplierId: string) => {
    setSupplierId(nextSupplierId);
    await loadSupplierProducts(nextSupplierId);
    setItems([createEmptyItem()]);
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
    setItems((current) => [...current, createEmptyItem()]);
  };

  const removeItem = (index: number) => {
    setItems((current) => (current.length === 1 ? current : current.filter((_, itemIndex) => itemIndex !== index)));
  };

  const saveOrder = async () => {
    if (!supplierId || saving) return;
    setSaving(true);
    try {
      await supplierApi.createPurchaseOrder({
        supplierId,
        orderDate: poDate,
        items,
        status: 'Confirmed',
      });
      setShowForm(false);
      resetForm();
      await Promise.all([loadOrders(), loadSuppliers()]);
      notifySuccess('Purchase entry saved successfully.');
    } finally {
      setSaving(false);
    }
  };

  const handleImportFiles = async (acceptedFiles: File[]) => {
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
  };

  const handleConfirmImport = () => {
    if (!importPreview) return;
    setItems((current) => {
      // Remove empty row if it's the only one
      const baseItems = current.length === 1 && !current[0]!.productName ? [] : current;
      return [...baseItems, ...importPreview.items];
    });
    setImportPreview(null);
    setShowImportModal(false);
    notifySuccess('Products imported successfully.');
  };

  return (
    <div className="space-y-5 [&_button]:cursor-pointer [&_a]:cursor-pointer">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#142e26]">Purchase Entry</h1>
          <p className="text-sm text-[#607d74]">Create a supplier purchase entry and add products.</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <label className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8ea59d]" />
            <input
              className="w-full rounded-lg border border-[#dce4e0] bg-white py-2 pl-10 pr-4 text-sm outline-none focus:border-[#16924d]"
              placeholder="Search supplier or entry..."
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
                <h2 className="font-bold text-[#142e26]">Add New Product Purchase</h2>
                <p className="text-sm text-[#607d74]">Choose a supplier and add the products for this purchase entry.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                  setSearchParams({});
                }}
                className="rounded p-2 hover:bg-[#eef3f0]"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-bold text-[#607d74]">Supplier Name</span>
                {lockedSupplierId ? (
                  <input
                    className="w-full rounded-lg border border-[#dce4e0] bg-[#f8fbf9] px-3 py-2 text-sm text-[#607d74]"
                    value={suppliers.find((supplier) => supplier.id === supplierId)?.supplierName || ''}
                    readOnly
                  />
                ) : (
                  <select className="w-full rounded-lg border border-[#dce4e0] px-3 py-2 text-sm" value={supplierId} onChange={(event) => handleSupplierChange(event.target.value)}>
                    {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.supplierName}</option>)}
                  </select>
                )}
              </label>
              <label className="space-y-1"><span className="text-xs font-bold text-[#607d74]">Purchase Date</span><input className="w-full rounded-lg border border-[#dce4e0] px-3 py-2 text-sm" type="date" value={poDate} onChange={(event) => setPoDate(event.target.value)} /></label>
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
                const categoryProducts = getCatalogProducts(item.category);
                return (
                  <div key={item.rowId} className="rounded-xl border border-[#dce4e0] bg-[#fbfdfc] p-4">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold text-[#142e26]">Item {index + 1}</p>
                        <p className="text-xs text-[#607d74]">Add New Product</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {items.length > 1 ? (
                          <button type="button" className="rounded-lg border border-[#dce4e0] px-3 py-2 text-xs font-bold text-[#607d74]" onClick={() => removeItem(index)} title="Remove item">
                            Remove
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                          <label className="relative space-y-1">
                            <span className="text-xs font-bold uppercase text-[#607d74]">Product Name</span>
                            <input
                              className="w-full rounded-lg border border-[#dce4e0] px-3 py-2 text-sm"
                              value={item.productName}
                              onChange={(event) => updateItem(index, { productName: event.target.value })}
                              onFocus={() => setShowSuggestions({ index, field: 'productName' })}
                              onBlur={() => setTimeout(() => setShowSuggestions(null), 200)}
                              placeholder="Select or type product name"
                            />
                            {showSuggestions?.index === index && showSuggestions.field === 'productName' && (
                              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-[#dce4e0] bg-white py-1 shadow-xl custom-scrollbar">
                                {categoryProducts
                                  .filter((name) => !item.productName || name.toLowerCase().includes(item.productName.toLowerCase()))
                                  .map((productName) => (
                                    <button
                                      key={`${item.category}-${productName}`}
                                      type="button"
                                      className="w-full px-4 py-2.5 text-left text-sm font-bold text-[#142e26] transition-colors hover:bg-[#f8fbf9]"
                                      onClick={() => {
                                        updateItem(index, { productName });
                                        setShowSuggestions(null);
                                      }}
                                    >
                                      {productName}
                                    </button>
                                  ))}
                                {categoryProducts.filter((name) => !item.productName || name.toLowerCase().includes(item.productName.toLowerCase())).length === 0 && (
                                  <div className="px-4 py-3 text-xs font-bold text-[#607d74]">No catalog matches</div>
                                )}
                              </div>
                            )}
                          </label>
                          <label className="relative space-y-1">
                            <span className="text-xs font-bold uppercase text-[#607d74]">Category</span>
                            <input
                              className="w-full rounded-lg border border-[#dce4e0] px-3 py-2 text-sm"
                              value={item.category}
                              onChange={(event) => updateItem(index, { category: event.target.value })}
                              onFocus={() => setShowSuggestions({ index, field: 'category' })}
                              onBlur={() => setTimeout(() => setShowSuggestions(null), 200)}
                              placeholder="Select category"
                            />
                            {showSuggestions?.index === index && showSuggestions.field === 'category' && (
                              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-[#dce4e0] bg-white py-1 shadow-xl custom-scrollbar">
                                {inventoryCategories
                                  .filter((cat) => !item.category || cat.toLowerCase().includes(item.category.toLowerCase()))
                                  .map((cat) => (
                                    <button
                                      key={cat}
                                      type="button"
                                      className="w-full px-4 py-2.5 text-left text-sm font-bold text-[#142e26] transition-colors hover:bg-[#f8fbf9]"
                                      onClick={() => {
                                        updateItem(index, { category: cat });
                                        setShowSuggestions(null);
                                      }}
                                    >
                                      {cat}
                                    </button>
                                  ))}
                                {inventoryCategories.filter((cat) => !item.category || cat.toLowerCase().includes(item.category.toLowerCase())).length === 0 && (
                                  <div className="px-4 py-3 text-xs font-bold text-[#607d74]">No category matches</div>
                                )}
                              </div>
                            )}
                          </label>
                    </div>

                    {duplicate ? (
                      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        This product already exists in inventory.
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <button type="button" className="mt-4 rounded-lg bg-[#ecf8f1] px-4 py-2 text-sm font-bold text-[#13804e]" onClick={addItem}>
              + Add Item
            </button>
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
              <button onClick={() => { setShowImportModal(false); setImportPreview(null); }} className="rounded-full p-2 hover:bg-gray-100" title="Close">
                <X className="h-6 w-6 text-[#607d74]" />
              </button>
            </div>

            <div className="p-6">
              {!importPreview ? (
                <div
                  className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#dce4e0] p-12 transition-all hover:border-[#16924d] hover:bg-[#f8fbf9]"
                  onClick={() => importInputRef.current?.click()}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      importInputRef.current?.click();
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <input
                    ref={importInputRef}
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    type="file"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void handleImportFiles([file]);
                      }
                      event.target.value = '';
                    }}
                  />
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
                        <tr>{['Product', 'Category', 'Unit'].map(c => <th key={c} className="px-4 py-3">{c}</th>)}</tr>
                      </thead>
                      <tbody className="divide-y divide-[#eef3f0]">
                        {importPreview.items.map((item, i) => (
                          <tr key={i}>
                            <td className="px-4 py-3 font-medium">{item.productName}</td>
                            <td className="px-4 py-3">{item.category}</td>
                            <td className="px-4 py-3">{item.unit || 'Units'}</td>
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
            <div className="rounded-lg bg-[#f8fbf9] px-3 py-2"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#607d74]">Purchase Date</p><p className="mt-1 font-medium">{order.orderDate}</p></div>
            <div className="rounded-lg bg-[#f8fbf9] px-3 py-2"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#607d74]">Products</p><p className="mt-1 font-medium">{order.productNames || '-'}</p></div>
          </div>
          <button type="button" className="mt-4 text-sm font-semibold text-[#13804e]" onClick={() => onOpenHistory(order.supplierId)}>Open History</button>
        </div>
      ))}
    </div>
    <div className="hidden overflow-x-auto xl:block">
      <table className="w-full text-left text-sm">
        <thead className="bg-[#f8fbf9] text-xs uppercase text-[#607d74]"><tr>{['Entry Number', 'Supplier Name', 'Purchase Date', 'Products', 'Actions'].map((column) => <th className="px-4 py-3" key={column}>{column}</th>)}</tr></thead>
        <tbody className="divide-y divide-[#eef3f0]">
          {orders.map((order) => (
            <tr key={order.id} className="hover:bg-[#f8fbf9]" onClick={() => onOpenHistory(order.supplierId)}>
              <td className="px-4 py-3 font-semibold text-[#13804e]">{order.poNumber}</td>
              <td className="px-4 py-3 font-semibold text-[#13804e]">{order.supplierName}</td>
              <td className="px-4 py-3">{order.orderDate}</td>
              <td className="px-4 py-3">{order.productNames || '-'}</td>
              <td className="px-4 py-3">
                <button type="button" className="inline-flex items-center gap-2 rounded-lg bg-[#ecf8f1] px-3 py-2 text-xs font-bold text-[#13804e]" onClick={(event) => { event.stopPropagation(); onNewPurchase(order.supplierId); }} title="New Purchase">
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
