import api from '@/services/api';
import type {
  PurchaseOrder,
  Supplier,
  SupplierDashboard,
  SupplierDetailsResponse,
  SupplierInvoice,
} from './types';

type ListResponse<T> = {
  total: number;
  items: T[];
};

export const supplierApi = {
  dashboard: async () => (await api.get<SupplierDashboard>('/doctor/suppliers/dashboard')).data,
  list: async (params?: Record<string, string>) => (await api.get<ListResponse<Supplier>>('/doctor/suppliers', { params })).data,
  create: async (payload: Partial<Supplier>) => (await api.post<Supplier>('/doctor/suppliers', payload)).data,
  update: async (supplierId: string, payload: Partial<Supplier>) => (await api.patch<Supplier>(`/doctor/suppliers/${supplierId}`, payload)).data,
  deactivate: async (supplierId: string) => (await api.patch<Supplier>(`/doctor/suppliers/${supplierId}/deactivate`)).data,
  delete: async (supplierId: string) => (await api.delete(`/doctor/suppliers/${supplierId}`)).data,
  details: async (supplierId: string) => (await api.get<SupplierDetailsResponse>(`/doctor/suppliers/${supplierId}`)).data,
  purchaseOrders: async () => (await api.get<ListResponse<PurchaseOrder>>('/doctor/suppliers/purchase-orders')).data,
  createPurchaseOrder: async (payload: unknown) => (await api.post<PurchaseOrder>('/doctor/suppliers/purchase-orders', payload)).data,
  updatePurchaseOrderPaymentStatus: async (orderId: string, paymentStatus: string) =>
    (await api.patch<PurchaseOrder>(`/doctor/suppliers/purchase-orders/${orderId}/payment-status`, { paymentStatus })).data,
  invoices: async () => (await api.get<ListResponse<SupplierInvoice>>('/doctor/suppliers/invoices')).data,
  recordPayment: async (invoiceId: string, amount: number) =>
    (await api.post<SupplierInvoice>(`/doctor/suppliers/invoices/${invoiceId}/payments`, { amount })).data,
};
