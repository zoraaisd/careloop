export type Supplier = {
  id: string;
  supplierCode: string;
  supplierName: string;
  companyName: string | null;
  category: string;
  licenseNumber: string | null;
  licenseDocumentName?: string | null;
  licenseDocumentUrl?: string | null;
  idProofDocumentName?: string | null;
  idProofDocumentUrl?: string | null;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  alternatePhone: string | null;
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
  status: 'Active' | 'Inactive' | string;
  rating: number;
};

export type PurchaseOrder = {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber: string | null;
  orderDate: string;
  paymentStatus: string;
  gstNumber: string | null;
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  createdAt: string;
  productNames?: string;
  items?: Array<{
    id?: string;
    productName: string;
    category: string;
    quantity: number;
    unitPrice: number;
    tax: number;
    total: number;
  }>;
};

export type SupplierInvoice = {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  poId: string | null;
  poNumber: string | null;
  invoiceDate: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  balance: number;
  status: string;
};

export type SupplierDashboard = {
  summary: {
    totalSuppliers: number;
    activeSuppliers: number;
    pendingOrders: number;
    pendingPayments: number;
    monthlyPurchaseAmount: number;
    topSupplier: string;
  };
  purchaseTrend: Array<{ month: string; purchaseAmount: number; ordersCount: number }>;
  orderStatusOverview: Array<{ status: string; count: number }>;
  paymentOverview: Array<{ status: string; amount: number; count: number }>;
  recentPurchaseOrders: PurchaseOrder[];
  topSuppliers: Array<{ supplierName: string; totalOrders: number; rating: number }>;
};

export type SupplierDetailsResponse = {
  supplier: Supplier;
  stats: {
    totalOrders: number;
    totalPurchaseAmount: number;
    pendingPayment: number;
  };
  productsSupplied: Array<{
    productName: string;
    category: string;
    unitPrice: number;
    stockAvailability: string;
  }>;
  purchaseOrders: PurchaseOrder[];
  invoices: SupplierInvoice[];
  documents: Array<{ name: string; fileName: string; fileUrl: string }>;
};
