import { AppDataSource } from '../../../config/data-source';
import { AppError } from '../../../common/errors/app-error';
import { PurchaseOrder } from '../../../entities/purchase-order.entity';
import { PurchaseOrderItem } from '../../../entities/purchase-order-item.entity';
import { SupplierInvoice } from '../../../entities/supplier-invoice.entity';
import { Supplier } from '../../../entities/supplier.entity';
import { DoctorAccessService } from './doctor-access.service';

type SupplierFilters = {
  search?: string;
  status?: string;
  category?: string;
  city?: string;
  state?: string;
};

const money = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const dateOnly = (date: Date): string => date.toISOString().slice(0, 10);

export class SupplierService {
  private readonly supplierRepository = AppDataSource.getRepository(Supplier);
  private readonly poRepository = AppDataSource.getRepository(PurchaseOrder);
  private readonly poItemRepository = AppDataSource.getRepository(PurchaseOrderItem);
  private readonly invoiceRepository = AppDataSource.getRepository(SupplierInvoice);
  private readonly accessService = new DoctorAccessService();

  private async getClinicId(currentDoctorId?: string): Promise<string | null> {
    const accessState = await this.accessService.getAccessState(currentDoctorId);
    return accessState.clinicId ?? currentDoctorId ?? null;
  }

  private scopedWhere(clinicId: string | null) {
    return clinicId ? { clinicId } : {};
  }

  private async nextCode(prefix: string, repository: { count: (options?: any) => Promise<number> }, clinicId: string | null): Promise<string> {
    const count = await repository.count({ where: this.scopedWhere(clinicId) });
    return `${prefix}-${String(count + 1).padStart(3, '0')}`;
  }

  private async nextSupplierCode(clinicId: string | null): Promise<string> {
    const suppliers = await this.supplierRepository.find({
      where: this.scopedWhere(clinicId),
      select: ['supplierCode'],
    });
    const nextNumber = suppliers.reduce((max, supplier) => {
      const match = supplier.supplierCode.match(/^SUP-(\d+)$/i);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0) + 1;
    return `SUP-${String(nextNumber).padStart(3, '0')}`;
  }

  private mapSupplier(supplier: Supplier) {
    return {
      id: supplier.id,
      supplierCode: supplier.supplierCode,
      supplierName: supplier.supplierName,
      companyName: supplier.companyName,
      category: supplier.category,
      licenseNumber: supplier.licenseNumber,
      contactPerson: supplier.contactPerson,
      phone: supplier.phone,
      email: supplier.email,
      alternatePhone: supplier.alternatePhone,
      addressLine1: supplier.addressLine1,
      city: supplier.city,
      state: supplier.state,
      country: supplier.country,
      pincode: supplier.pincode,
      status: supplier.status,
      rating: money(supplier.rating),
      createdAt: supplier.createdAt.toISOString(),
      updatedAt: supplier.updatedAt.toISOString(),
    };
  }

  private mapPo(po: PurchaseOrder) {
    return {
      id: po.id,
      poNumber: po.poNumber,
      supplierId: po.supplierId,
      supplierName: po.supplierName,
      orderDate: String(po.orderDate),
      gstNumber: po.gstNumber,
      subtotal: money(po.subtotal),
      tax: money(po.tax),
      total: money(po.total),
      status: po.status,
      createdAt: po.createdAt.toISOString(),
    };
  }

  private mapInvoice(invoice: SupplierInvoice) {
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      supplierId: invoice.supplierId,
      supplierName: invoice.supplierName,
      poId: invoice.poId,
      poNumber: invoice.poNumber,
      invoiceDate: String(invoice.invoiceDate),
      dueDate: String(invoice.dueDate),
      amount: money(invoice.amount),
      paidAmount: money(invoice.paidAmount),
      balance: money(invoice.balance),
      status: invoice.status,
    };
  }

  private async ensureSeedData(clinicId: string | null): Promise<void> {
    const existing = await this.supplierRepository.count({ where: this.scopedWhere(clinicId) });
    if (existing > 0) return;

    const today = new Date();
    const suppliers = this.supplierRepository.create([
      {
        supplierCode: 'SUP-001',
        supplierName: 'MedicoCare Ltd.',
        companyName: 'MedicoCare Ltd.',
        category: 'Medicine',
        licenseNumber: 'DL-MED-2042',
        contactPerson: 'Ravi Kumar',
        phone: '9876543210',
        email: 'info@medicocare.example',
        alternatePhone: '9823456780',
        addressLine1: '123, Medical Market',
        city: 'New Delhi',
        state: 'Delhi',
        country: 'India',
        pincode: '110002',
        status: 'Active',
        rating: '4.8',
        clinicId,
      },
      {
        supplierCode: 'SUP-002',
        supplierName: 'HealthPlus Supplies',
        companyName: 'HealthPlus Supplies',
        category: 'Surgical',
        contactPerson: 'Sandeep Verma',
        phone: '9812345678',
        email: 'orders@healthplus.example',
        city: 'Mumbai',
        state: 'Maharashtra',
        status: 'Active',
        rating: '4.6',
        clinicId,
      },
      {
        supplierCode: 'SUP-003',
        supplierName: 'LabTech Solutions',
        companyName: 'LabTech Solutions',
        category: 'Lab Supplies',
        contactPerson: 'Anil Kumar',
        phone: '9871122334',
        email: 'support@labtech.example',
        city: 'Bengaluru',
        state: 'Karnataka',
        status: 'Active',
        rating: '4.5',
        clinicId,
      },
      {
        supplierCode: 'SUP-004',
        supplierName: 'MediSupply India',
        companyName: 'MediSupply India',
        category: 'Equipment',
        contactPerson: 'Ramesh Gupta',
        phone: '9876677889',
        email: 'sales@medisupply.example',
        city: 'Chennai',
        state: 'Tamil Nadu',
        status: 'Inactive',
        rating: '4.3',
        clinicId,
      },
    ]);

    const savedSuppliers = await this.supplierRepository.save(suppliers);
    const [first, second, third, fourth] = savedSuppliers;
    const poPayloads = [
      { supplier: first!, total: 65000, status: 'Confirmed', offset: -3 },
      { supplier: second!, total: 23000, status: 'Partially Delivered', offset: -4 },
      { supplier: third!, total: 12500, status: 'Draft', offset: -5 },
      { supplier: fourth!, total: 88000, status: 'Delivered', offset: -6 },
    ];

    for (const [index, poPayload] of poPayloads.entries()) {
      const orderDate = new Date(today);
      orderDate.setDate(today.getDate() + poPayload.offset);
      const po = await this.poRepository.save(this.poRepository.create({
        poNumber: `PO-2024-${String(index + 125).padStart(3, '0')}`,
        supplierId: poPayload.supplier.id,
        supplierName: poPayload.supplier.supplierName,
        orderDate: dateOnly(orderDate),
        gstNumber: null,
        subtotal: poPayload.total.toFixed(2),
        tax: '0.00',
        total: poPayload.total.toFixed(2),
        status: poPayload.status,
        clinicId,
      }));

      await this.poItemRepository.save(this.poItemRepository.create({
        poId: po.id,
        productName: index % 2 === 0 ? 'Paracetamol 650mg' : 'Surgical Gloves',
        category: poPayload.supplier.category,
        quantity: index % 2 === 0 ? 100 : 20,
        unitPrice: index % 2 === 0 ? '45.00' : '250.00',
        tax: '0.00',
        total: poPayload.total.toFixed(2),
      }));

      const paidAmount = index === 2 ? 0 : poPayload.total;
      await this.invoiceRepository.save(this.invoiceRepository.create({
        invoiceNumber: `INV-2024-${String(index + 91).padStart(3, '0')}`,
        supplierId: poPayload.supplier.id,
        supplierName: poPayload.supplier.supplierName,
        poId: po.id,
        poNumber: po.poNumber,
        invoiceDate: dateOnly(orderDate),
        dueDate: dateOnly(orderDate),
        amount: poPayload.total.toFixed(2),
        paidAmount: paidAmount.toFixed(2),
        balance: (poPayload.total - paidAmount).toFixed(2),
        status: paidAmount >= poPayload.total ? 'Paid' : index === 2 ? 'Overdue' : 'Pending',
        clinicId,
      }));
    }

  }

  async getDashboard(currentDoctorId?: string) {
    const clinicId = await this.getClinicId(currentDoctorId);
    await this.ensureSeedData(clinicId);

    const [suppliers, orders, invoices] = await Promise.all([
      this.supplierRepository.find({ where: this.scopedWhere(clinicId), order: { supplierName: 'ASC' } }),
      this.poRepository.find({ where: this.scopedWhere(clinicId), order: { orderDate: 'DESC' } }),
      this.invoiceRepository.find({ where: this.scopedWhere(clinicId) }),
    ]);

    const monthlyPurchaseAmount = orders.reduce((sum, order) => sum + money(order.total), 0);
    const topSupplier = suppliers
      .map((supplier) => ({
        supplierName: supplier.supplierName,
        totalOrders: orders.filter((order) => order.supplierId === supplier.id).length,
        rating: money(supplier.rating),
      }))
      .sort((left, right) => right.totalOrders - left.totalOrders)[0] ?? null;

    const orderStatusOverview = ['Draft', 'Confirmed', 'Delivered', 'Cancelled'].map((status) => ({
      status,
      count: orders.filter((order) => order.status === status).length,
    }));

    const paymentOverview = ['Paid', 'Pending', 'Overdue'].map((status) => ({
      status,
      amount: invoices.filter((invoice) => invoice.status === status).reduce((sum, invoice) => sum + money(invoice.balance || invoice.amount), 0),
      count: invoices.filter((invoice) => invoice.status === status).length,
    }));

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const purchaseTrend = months.map((month, index) => ({
      month,
      purchaseAmount: Math.round((monthlyPurchaseAmount / Math.max(months.length, 1)) * (0.65 + index * 0.11)),
      ordersCount: Math.max(1, Math.round(orders.length * (0.4 + index * 0.12))),
    }));

    return {
      summary: {
        totalSuppliers: suppliers.length,
        activeSuppliers: suppliers.filter((supplier) => supplier.status === 'Active').length,
        pendingOrders: orders.filter((order) => ['Draft', 'Confirmed'].includes(order.status)).length,
        pendingPayments: invoices.reduce((sum, invoice) => sum + money(invoice.balance), 0),
        monthlyPurchaseAmount,
        topSupplier: topSupplier?.supplierName ?? '-',
      },
      purchaseTrend,
      orderStatusOverview,
      paymentOverview,
      recentPurchaseOrders: orders.slice(0, 5).map(this.mapPo),
      topSuppliers: suppliers
        .map((supplier) => ({
          supplierName: supplier.supplierName,
          totalOrders: orders.filter((order) => order.supplierId === supplier.id).length,
          rating: money(supplier.rating),
        }))
        .sort((left, right) => right.totalOrders - left.totalOrders)
        .slice(0, 5),
    };
  }

  async listSuppliers(currentDoctorId?: string, filters: SupplierFilters = {}) {
    const clinicId = await this.getClinicId(currentDoctorId);
    await this.ensureSeedData(clinicId);
    const suppliers = await this.supplierRepository.find({
      where: this.scopedWhere(clinicId),
      order: { createdAt: 'DESC' },
    });

    const search = filters.search?.toLowerCase().trim();
    const items = suppliers.filter((supplier) => {
      if (search && ![supplier.supplierCode, supplier.supplierName, supplier.companyName, supplier.contactPerson, supplier.phone]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search))) return false;
      if (filters.status && filters.status !== 'All' && supplier.status !== filters.status) return false;
      if (filters.category && filters.category !== 'All' && supplier.category !== filters.category) return false;
      if (filters.city && supplier.city !== filters.city) return false;
      if (filters.state && supplier.state !== filters.state) return false;
      return true;
    });

    return { total: items.length, items: items.map((supplier) => this.mapSupplier(supplier)) };
  }

  async createSupplier(currentDoctorId: string | undefined, payload: any) {
    const clinicId = await this.getClinicId(currentDoctorId);
    const supplierName = String(payload.supplierName ?? '').trim();
    if (!supplierName) throw new AppError('Supplier name is required', 400);

    const supplier = this.supplierRepository.create({
      supplierCode: await this.nextSupplierCode(clinicId),
      supplierName,
      companyName: String(payload.companyName ?? supplierName).trim(),
      category: String(payload.category ?? 'Medicine').trim(),
      licenseNumber: payload.licenseNumber?.trim() || null,
      contactPerson: payload.contactPerson?.trim() || null,
      phone: payload.phone?.trim() || null,
      email: payload.email?.trim() || null,
      alternatePhone: payload.alternatePhone?.trim() || null,
      addressLine1: payload.addressLine1?.trim() || null,
      city: payload.city?.trim() || null,
      state: payload.state?.trim() || null,
      country: payload.country?.trim() || 'India',
      pincode: payload.pincode?.trim() || null,
      status: payload.status || 'Active',
      rating: money(payload.rating || 4.5).toFixed(1),
      clinicId,
    });

    const saved = await this.supplierRepository.save(supplier);
    return this.mapSupplier(saved);
  }

  async getSupplier(currentDoctorId: string | undefined, supplierId: string) {
    const clinicId = await this.getClinicId(currentDoctorId);
    const supplier = await this.supplierRepository.findOne({
      where: clinicId ? { id: supplierId, clinicId } : { id: supplierId },
    });
    if (!supplier) throw new AppError('Supplier not found', 404);

    const [orders, invoices] = await Promise.all([
      this.poRepository.find({ where: clinicId ? { supplierId, clinicId } : { supplierId }, order: { orderDate: 'DESC' } }),
      this.invoiceRepository.find({ where: clinicId ? { supplierId, clinicId } : { supplierId }, order: { invoiceDate: 'DESC' } }),
    ]);
    const items = await this.poItemRepository.find({ where: orders.length ? orders.map((order) => ({ poId: order.id })) : { poId: '__none__' } as any });

    return {
      supplier: this.mapSupplier(supplier),
      stats: {
        totalOrders: orders.length,
        totalPurchaseAmount: orders.reduce((sum, order) => sum + money(order.total), 0),
        pendingPayment: invoices.reduce((sum, invoice) => sum + money(invoice.balance), 0),
      },
      productsSupplied: items.slice(0, 8).map((item) => ({
        productName: item.productName,
        category: item.category,
        unitPrice: money(item.unitPrice),
        stockAvailability: 'Available',
      })),
      purchaseOrders: orders.map((order) => this.mapPo(order)),
      invoices: invoices.map((invoice) => this.mapInvoice(invoice)),
      documents: [
        { name: 'Drug License', fileName: 'Drug License.pdf' },
        { name: 'Agreement Copy', fileName: 'Agreement.pdf' },
      ],
    };
  }

  async updateSupplier(currentDoctorId: string | undefined, supplierId: string, payload: any) {
    const clinicId = await this.getClinicId(currentDoctorId);
    const supplier = await this.supplierRepository.findOne({ where: clinicId ? { id: supplierId, clinicId } : { id: supplierId } });
    if (!supplier) throw new AppError('Supplier not found', 404);
    Object.assign(supplier, {
      ...payload,
      rating: payload.rating !== undefined ? money(payload.rating).toFixed(1) : supplier.rating,
    });
    return this.mapSupplier(await this.supplierRepository.save(supplier));
  }

  async deleteSupplier(currentDoctorId: string | undefined, supplierId: string) {
    const clinicId = await this.getClinicId(currentDoctorId);
    const supplier = await this.supplierRepository.findOne({ where: clinicId ? { id: supplierId, clinicId } : { id: supplierId } });
    if (!supplier) throw new AppError('Supplier not found', 404);
    await this.supplierRepository.remove(supplier);
    return { message: 'Supplier deleted successfully' };
  }

  async listPurchaseOrders(currentDoctorId?: string) {
    const clinicId = await this.getClinicId(currentDoctorId);
    await this.ensureSeedData(clinicId);
    const orders = await this.poRepository.find({ where: this.scopedWhere(clinicId), order: { orderDate: 'DESC' } });
    return { total: orders.length, items: orders.map((order) => this.mapPo(order)) };
  }

  async createPurchaseOrder(currentDoctorId: string | undefined, payload: any) {
    const clinicId = await this.getClinicId(currentDoctorId);
    const supplier = await this.supplierRepository.findOne({ where: clinicId ? { id: payload.supplierId, clinicId } : { id: payload.supplierId } });
    if (!supplier) throw new AppError('Supplier not found', 404);

    const items = Array.isArray(payload.items) && payload.items.length > 0 ? payload.items : [];
    const calculatedItems = items.map((item: any) => {
      const quantity = money(item.quantity || 1);
      const unitPrice = money(item.unitPrice);
      const taxRate = money(item.tax);
      const base = quantity * unitPrice;
      const taxAmount = (base * taxRate) / 100;
      return { ...item, quantity, unitPrice, tax: taxRate, total: Math.max(0, base + taxAmount) };
    });
    const subtotal = calculatedItems.reduce((sum: number, item: any) => sum + item.quantity * item.unitPrice, 0);
    const tax = calculatedItems.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice * item.tax) / 100, 0);
    const total = subtotal + tax;

    const order = await this.poRepository.save(this.poRepository.create({
      poNumber: await this.nextCode('PO-2026', this.poRepository, clinicId),
      supplierId: supplier.id,
      supplierName: supplier.supplierName,
      orderDate: payload.orderDate || dateOnly(new Date()),
      gstNumber: payload.gstNumber?.trim() || null,
      subtotal: subtotal.toFixed(2),
      tax: tax.toFixed(2),
      total: total.toFixed(2),
      status: payload.status || 'Draft',
      clinicId,
    }));

    await this.poItemRepository.save(calculatedItems.map((item: any) => this.poItemRepository.create({
      poId: order.id,
      productName: String(item.productName || 'Product'),
      category: String(item.category || supplier.category),
      quantity: item.quantity,
      unitPrice: item.unitPrice.toFixed(2),
      tax: item.tax.toFixed(2),
      total: item.total.toFixed(2),
    })));

    if (order.status !== 'Draft') {
      await this.invoiceRepository.save(this.invoiceRepository.create({
        invoiceNumber: await this.nextCode('INV-2026', this.invoiceRepository, clinicId),
        supplierId: supplier.id,
        supplierName: supplier.supplierName,
        poId: order.id,
        poNumber: order.poNumber,
        invoiceDate: order.orderDate,
        dueDate: order.orderDate,
        amount: order.total,
        paidAmount: '0.00',
        balance: order.total,
        status: 'Pending',
        clinicId,
      }));
    }

    return this.mapPo(order);
  }

  async listInvoices(currentDoctorId?: string) {
    const clinicId = await this.getClinicId(currentDoctorId);
    await this.ensureSeedData(clinicId);
    const invoices = await this.invoiceRepository.find({ where: this.scopedWhere(clinicId), order: { invoiceDate: 'DESC' } });
    return { total: invoices.length, items: invoices.map((invoice) => this.mapInvoice(invoice)) };
  }

  async recordPayment(currentDoctorId: string | undefined, invoiceId: string, amount: number) {
    const clinicId = await this.getClinicId(currentDoctorId);
    const invoice = await this.invoiceRepository.findOne({ where: clinicId ? { id: invoiceId, clinicId } : { id: invoiceId } });
    if (!invoice) throw new AppError('Invoice not found', 404);
    const paidAmount = money(invoice.paidAmount) + money(amount);
    const balance = Math.max(0, money(invoice.amount) - paidAmount);
    invoice.paidAmount = paidAmount.toFixed(2);
    invoice.balance = balance.toFixed(2);
    invoice.status = balance === 0 ? 'Paid' : paidAmount > 0 ? 'Partially Paid' : 'Pending';
    return this.mapInvoice(await this.invoiceRepository.save(invoice));
  }

}

export const supplierService = new SupplierService();
