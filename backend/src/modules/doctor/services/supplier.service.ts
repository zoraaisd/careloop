import { In } from 'typeorm';
import ExcelJS from 'exceljs';

import { AppDataSource } from '../../../config/data-source';
import { AppError } from '../../../common/errors/app-error';
import { PurchaseOrder } from '../../../entities/purchase-order.entity';
import { PurchaseOrderItem } from '../../../entities/purchase-order-item.entity';
import { SupplierInvoice } from '../../../entities/supplier-invoice.entity';
import { Supplier } from '../../../entities/supplier.entity';
import { InventoryItem } from '../../../entities/inventory-item.entity';
import { DoctorAccessService } from './doctor-access.service';
import { FileStorageService } from '../../files/services/file-storage.service';

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
const normalizeText = (value: unknown): string => String(value ?? '').trim();
const normalizeKey = (value: unknown): string => normalizeText(value).toLowerCase();

export class SupplierService {
  private readonly supplierRepository = AppDataSource.getRepository(Supplier);
  private readonly poRepository = AppDataSource.getRepository(PurchaseOrder);
  private readonly poItemRepository = AppDataSource.getRepository(PurchaseOrderItem);
  private readonly invoiceRepository = AppDataSource.getRepository(SupplierInvoice);
  private readonly inventoryRepository = AppDataSource.getRepository(InventoryItem);
  private readonly accessService = new DoctorAccessService();
  private readonly fileStorageService = new FileStorageService();

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

  private mapPoItem(item: PurchaseOrderItem) {
    return {
      id: item.id,
      inventoryItemId: item.inventoryItemId,
      productName: item.productName,
      category: item.category,
      sku: item.sku,
      unit: item.unit,
    };
  }

  private async findMatchingInventoryItem(params: {
    clinicId: string | null;
    inventoryItemId?: string | null;
    sku?: string | null;
    productName: string;
    supplierName: string;
    unit?: string | null;
  }): Promise<InventoryItem | null> {
    if (params.inventoryItemId) {
      return this.inventoryRepository.findOne({
        where: params.clinicId
          ? { id: params.inventoryItemId, clinicId: params.clinicId }
          : { id: params.inventoryItemId },
      });
    }

    const sku = normalizeText(params.sku);
    if (sku) {
      const skuMatch = await this.inventoryRepository.findOne({
        where: params.clinicId ? { sku, clinicId: params.clinicId } : { sku },
      });
      if (skuMatch) {
        return skuMatch;
      }
    }

    const candidates = await this.inventoryRepository.find({
      where: params.clinicId
        ? { clinicId: params.clinicId, vendor: params.supplierName }
        : { vendor: params.supplierName },
    });

    const productNameKey = normalizeKey(params.productName);
    const unitKey = normalizeKey(params.unit);
    return candidates.find((candidate) => {
      if (normalizeKey(candidate.itemName) !== productNameKey) {
        return false;
      }

      if (!unitKey) {
        return true;
      }

      return normalizeKey(candidate.unit) === unitKey;
    }) ?? null;
  }

  private async upsertInventoryFromPurchase(params: {
    clinicId: string | null;
    supplier: Supplier;
    item: any;
  }): Promise<InventoryItem> {
    const productName = normalizeText(params.item.productName);
    const unit = normalizeText(params.item.unit) || 'Units';
    const existingItem = await this.findMatchingInventoryItem({
      clinicId: params.clinicId,
      inventoryItemId: params.item.inventoryItemId,
      sku: params.item.sku,
      productName,
      supplierName: params.supplier.supplierName,
      unit,
    });

    if (existingItem) {
      existingItem.vendor = params.supplier.supplierName;
      existingItem.category = normalizeText(params.item.category) || existingItem.category;
      existingItem.sku = normalizeText(params.item.sku) || existingItem.sku;
      existingItem.unit = unit;
      return this.inventoryRepository.save(existingItem);
    }

    return this.inventoryRepository.save(this.inventoryRepository.create({
      itemName: productName,
      sku: normalizeText(params.item.sku) || null,
      medicineType: null,
      category: normalizeText(params.item.category) || params.supplier.category,
      unit,
      strengthComposition: null,
      barcodeQrCode: null,
      storageType: null,
      prescriptionRequired: false,
      gstTax: 0,
      purchasePrice: '0.00',
      unitCost: '0.00',
      sellingPrice: '0.00',
      quantity: 0,
      minimumStockLevel: 0,
      reorderLevel: 0,
      isActive: true,
      storageArea: null,
      rackShelf: null,
      row: null,
      column: null,
      boxBinNumber: null,
      slotPosition: null,
      notes: `Created from supplier purchase ${params.supplier.supplierName}`,
      vendor: params.supplier.supplierName,
      batchNumber: null,
      expiryDate: null,
      clinicId: params.clinicId,
    }));
  }

  private mapSupplier(supplier: Supplier) {
    return {
      id: supplier.id,
      supplierCode: supplier.supplierCode,
      supplierName: supplier.supplierName,
      companyName: supplier.companyName,
      category: supplier.category,
      licenseNumber: supplier.licenseNumber,
      licenseDocumentName: supplier.licenseDocumentName,
      licenseDocumentUrl: supplier.licenseDocumentUrl,
      idProofDocumentName: supplier.idProofDocumentName,
      idProofDocumentUrl: supplier.idProofDocumentUrl,
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

  private async saveSupplierDocument(params: {
    currentFileId?: string | null;
    dataUrl?: string | null;
    fileName?: string | null;
  }) {
    const normalizedDataUrl = String(params.dataUrl ?? '').trim();
    const normalizedFileName = String(params.fileName ?? '').trim();

    if (!normalizedDataUrl || !normalizedFileName) {
      return null;
    }

    if (params.currentFileId) {
      await this.fileStorageService.deleteFile(params.currentFileId);
    }

    const storedFile = await this.fileStorageService.saveDataUrl({
      fileName: normalizedFileName,
      dataUrl: normalizedDataUrl,
    });

    return {
      fileId: storedFile.id,
      fileUrl: this.fileStorageService.buildFileUrl(storedFile.id),
      fileName: storedFile.fileName,
    };
  }

  private mapPo(po: PurchaseOrder, items: PurchaseOrderItem[] = []) {
    const normalizedItems = items.map((item) => this.mapPoItem(item));
    return {
      id: po.id,
      poNumber: po.poNumber,
      supplierId: po.supplierId,
      supplierName: po.supplierName,
      orderDate: String(po.orderDate),
      status: po.status,
      createdAt: po.createdAt.toISOString(),
      productNames: normalizedItems.map((item) => item.productName.trim()).filter(Boolean).join(', '),
      items: normalizedItems,
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

  async getDashboard(currentDoctorId?: string) {
    const clinicId = await this.getClinicId(currentDoctorId);

    const [suppliers, orders, invoices] = await Promise.all([
      this.supplierRepository.find({ where: this.scopedWhere(clinicId), order: { supplierName: 'ASC' } }),
      this.poRepository.find({ where: this.scopedWhere(clinicId), order: { orderDate: 'DESC' } }),
      this.invoiceRepository.find({ where: this.scopedWhere(clinicId) }),
    ]);

    const monthlyPurchaseAmount = 0;
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

    const paymentOverview = ['Paid', 'Pending', 'Partially Paid'].map((status) => ({
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
      recentPurchaseOrders: orders.slice(0, 5).map((order) => this.mapPo(order)),
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
    const [licenseDocument, idProofDocument] = await Promise.all([
      this.saveSupplierDocument({
        dataUrl: payload.licenseDocumentDataUrl,
        fileName: payload.licenseDocumentFileName,
      }),
      this.saveSupplierDocument({
        dataUrl: payload.idProofDocumentDataUrl,
        fileName: payload.idProofDocumentFileName,
      }),
    ]);

    const supplier = this.supplierRepository.create({
      supplierCode: await this.nextSupplierCode(clinicId),
      supplierName,
      companyName: String(payload.companyName ?? supplierName).trim(),
      category: String(payload.category ?? 'Medicine').trim(),
      licenseNumber: payload.licenseNumber?.trim() || null,
      licenseDocumentName: licenseDocument?.fileName ?? null,
      licenseDocumentFileId: licenseDocument?.fileId ?? null,
      licenseDocumentUrl: licenseDocument?.fileUrl ?? null,
      idProofDocumentName: idProofDocument?.fileName ?? null,
      idProofDocumentFileId: idProofDocument?.fileId ?? null,
      idProofDocumentUrl: idProofDocument?.fileUrl ?? null,
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
    const inventoryItems = await this.inventoryRepository.find({
      where: clinicId ? { clinicId, vendor: supplier.supplierName } : { vendor: supplier.supplierName },
      order: { updatedAt: 'DESC' },
    });
    const items = await this.poItemRepository.find({
      where: orders.length ? { poId: In(orders.map((order) => order.id)) } : { poId: '__none__' },
    });

    const itemsByPo = new Map<string, PurchaseOrderItem[]>();
    items.forEach((item) => {
      const current = itemsByPo.get(item.poId) ?? [];
      current.push(item);
      itemsByPo.set(item.poId, current);
    });

    const ordersById = new Map(orders.map((order) => [order.id, order]));
    const productSummaryMap = new Map<string, {
      inventoryItemId: string | null;
      productName: string;
      category: string;
      sku: string | null;
      unit: string | null;
      currentStock: number;
      lastPurchaseDate: string | null;
      lastPurchasePrice: number;
      totalPurchased: number;
      reorderLevel: number;
      sellingPrice: number;
      batchNumber: string | null;
      expiryDate: string | null;
    }>();

    inventoryItems.forEach((inventoryItem) => {
      const key = inventoryItem.id;
      productSummaryMap.set(key, {
        inventoryItemId: inventoryItem.id,
        productName: inventoryItem.itemName,
        category: inventoryItem.category,
        sku: inventoryItem.sku,
        unit: inventoryItem.unit,
        currentStock: inventoryItem.quantity,
        lastPurchaseDate: null,
        lastPurchasePrice: 0,
        totalPurchased: 0,
        reorderLevel: inventoryItem.reorderLevel,
        sellingPrice: 0,
        batchNumber: null,
        expiryDate: null,
      });
    });

    items.forEach((item) => {
      const order = ordersById.get(item.poId);
      const matchedInventoryItem = item.inventoryItemId
        ? inventoryItems.find((inventoryItem) => inventoryItem.id === item.inventoryItemId)
        : inventoryItems.find((inventoryItem) =>
            normalizeKey(inventoryItem.itemName) === normalizeKey(item.productName)
            && normalizeKey(inventoryItem.unit) === normalizeKey(item.unit),
          );
      const fallbackKey = `${normalizeKey(item.productName)}__${normalizeKey(item.unit)}__${normalizeKey(supplier.supplierName)}`;
      const resolvedInventoryItemId = matchedInventoryItem?.id ?? item.inventoryItemId ?? null;
      const key = resolvedInventoryItemId ?? fallbackKey;
      const current = productSummaryMap.get(key) ?? {
        inventoryItemId: resolvedInventoryItemId,
        productName: item.productName,
        category: item.category,
        sku: item.sku ?? matchedInventoryItem?.sku ?? null,
        unit: item.unit ?? matchedInventoryItem?.unit ?? null,
        currentStock: matchedInventoryItem?.quantity ?? 0,
        lastPurchaseDate: null,
        lastPurchasePrice: 0,
        totalPurchased: 0,
        reorderLevel: matchedInventoryItem?.reorderLevel ?? 0,
        sellingPrice: 0,
        batchNumber: null,
        expiryDate: null,
      };

      current.totalPurchased += 0;
      if (!current.lastPurchaseDate || (order && new Date(String(order.orderDate)).getTime() >= new Date(current.lastPurchaseDate).getTime())) {
        current.lastPurchaseDate = order ? String(order.orderDate) : current.lastPurchaseDate;
        current.lastPurchasePrice = 0;
      }

      productSummaryMap.set(key, current);
    });

    return {
      supplier: this.mapSupplier(supplier),
      stats: {
        totalOrders: orders.length,
        totalPurchaseAmount: 0,
        pendingPayment: invoices.reduce((sum, invoice) => sum + money(invoice.balance), 0),
      },
      productsSupplied: Array.from(productSummaryMap.values())
        .sort((left, right) => {
          const leftDate = left.lastPurchaseDate ? new Date(left.lastPurchaseDate).getTime() : 0;
          const rightDate = right.lastPurchaseDate ? new Date(right.lastPurchaseDate).getTime() : 0;
          return rightDate - leftDate;
        }),
      purchaseOrders: orders.map((order) => this.mapPo(order, itemsByPo.get(order.id) ?? [])),
      invoices: invoices.map((invoice) => this.mapInvoice(invoice)),
      documents: [
        supplier.licenseDocumentUrl
          ? {
              name: 'License',
              fileName: supplier.licenseDocumentName ?? 'License',
              fileUrl: supplier.licenseDocumentUrl,
            }
          : null,
        supplier.idProofDocumentUrl
          ? {
              name: 'ID Proof',
              fileName: supplier.idProofDocumentName ?? 'ID Proof',
              fileUrl: supplier.idProofDocumentUrl,
            }
          : null,
      ].filter(Boolean),
    };
  }

  async updateSupplier(currentDoctorId: string | undefined, supplierId: string, payload: any) {
    const clinicId = await this.getClinicId(currentDoctorId);
    const supplier = await this.supplierRepository.findOne({ where: clinicId ? { id: supplierId, clinicId } : { id: supplierId } });
    if (!supplier) throw new AppError('Supplier not found', 404);
    const [licenseDocument, idProofDocument] = await Promise.all([
      this.saveSupplierDocument({
        currentFileId: supplier.licenseDocumentFileId,
        dataUrl: payload.licenseDocumentDataUrl,
        fileName: payload.licenseDocumentFileName,
      }),
      this.saveSupplierDocument({
        currentFileId: supplier.idProofDocumentFileId,
        dataUrl: payload.idProofDocumentDataUrl,
        fileName: payload.idProofDocumentFileName,
      }),
    ]);
    Object.assign(supplier, {
      ...payload,
      rating: payload.rating !== undefined ? money(payload.rating).toFixed(1) : supplier.rating,
      licenseDocumentName: licenseDocument?.fileName ?? supplier.licenseDocumentName,
      licenseDocumentFileId: licenseDocument?.fileId ?? supplier.licenseDocumentFileId,
      licenseDocumentUrl: licenseDocument?.fileUrl ?? supplier.licenseDocumentUrl,
      idProofDocumentName: idProofDocument?.fileName ?? supplier.idProofDocumentName,
      idProofDocumentFileId: idProofDocument?.fileId ?? supplier.idProofDocumentFileId,
      idProofDocumentUrl: idProofDocument?.fileUrl ?? supplier.idProofDocumentUrl,
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
    const orders = await this.poRepository.find({ where: this.scopedWhere(clinicId), order: { orderDate: 'DESC' } });
    const poItems = await this.poItemRepository.find({
      where: orders.length ? { poId: In(orders.map((order) => order.id)) } : { poId: '__none__' },
    });

    const itemsByPo = new Map<string, PurchaseOrderItem[]>();
    poItems.forEach((item) => {
      const current = itemsByPo.get(item.poId) ?? [];
      current.push(item);
      itemsByPo.set(item.poId, current);
    });

    return { total: orders.length, items: orders.map((order) => this.mapPo(order, itemsByPo.get(order.id) ?? [])) };
  }

  async createPurchaseOrder(currentDoctorId: string | undefined, payload: any) {
    const clinicId = await this.getClinicId(currentDoctorId);
    const supplier = await this.supplierRepository.findOne({ where: clinicId ? { id: payload.supplierId, clinicId } : { id: payload.supplierId } });
    if (!supplier) throw new AppError('Supplier not found', 404);

    const items = Array.isArray(payload.items) && payload.items.length > 0 ? payload.items : [];
    const calculatedItems = [];
    for (const item of items) {
      const productName = normalizeText(item.productName);
      if (!productName) {
        throw new AppError('Product name is required for each purchase item', 400);
      }

      const unit = normalizeText(item.unit) || 'Units';
      const existingInventoryItem = await this.findMatchingInventoryItem({
        clinicId,
        inventoryItemId: item.inventoryItemId,
        sku: item.sku,
        productName,
        supplierName: supplier.supplierName,
        unit,
      });

      calculatedItems.push({
        ...item,
        inventoryItemId: existingInventoryItem?.id ?? null,
        productName,
        category: normalizeText(item.category) || supplier.category,
        sku: normalizeText(item.sku) || existingInventoryItem?.sku || null,
        unit,
      });
    }

    const order = await this.poRepository.save(this.poRepository.create({
      poNumber: await this.nextCode('PO-2026', this.poRepository, clinicId),
      supplierId: supplier.id,
      supplierName: supplier.supplierName,
      orderDate: payload.orderDate || dateOnly(new Date()),
      status: payload.status || 'Draft',
      clinicId,
    }));

    await this.poItemRepository.save(calculatedItems.map((item: any) => this.poItemRepository.create({
      poId: order.id,
      inventoryItemId: item.inventoryItemId || null,
      productName: String(item.productName || 'Product'),
      category: String(item.category || supplier.category),
      sku: item.sku || null,
      unit: item.unit || null,
      supplierId: supplier.id,
    })));

    return this.mapPo(order, calculatedItems);
  }

  async updatePurchaseOrderPaymentStatus(currentDoctorId: string | undefined, orderId: string, paymentStatusInput: string) {
    void currentDoctorId;
    void orderId;
    void paymentStatusInput;
    throw new AppError('Payment status updates are no longer supported', 400);
  }

  async listInvoices(currentDoctorId?: string) {
    const clinicId = await this.getClinicId(currentDoctorId);
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

  async importProducts(currentDoctorId: string | undefined, buffer: Buffer, supplierId: string) {
    const clinicId = await this.getClinicId(currentDoctorId);
    const supplier = await this.supplierRepository.findOne({ where: clinicId ? { id: supplierId, clinicId } : { id: supplierId } });
    if (!supplier) throw new AppError('Supplier not found', 404);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) throw new AppError('Excel sheet is empty', 400);

    const items: any[] = [];
    const errors: string[] = [];

    worksheet.eachRow((row: any, rowNumber: number) => {
      if (rowNumber === 1) return; // Skip header

      const productName = row.getCell(1).text?.trim();
      const category = row.getCell(2).text?.trim() || supplier.category;
      const unit = row.getCell(3).text?.trim() || 'Units';

      const rowErrors: string[] = [];
      if (!productName) rowErrors.push('Product Name is required');

      if (rowErrors.length > 0) {
        errors.push(`Row ${rowNumber}: ${rowErrors.join(', ')}`);
      } else {
        items.push({
          productName,
          category,
          unit,
        });
      }
    });

    return {
      items,
      summary: {
        totalRows: items.length + errors.length,
        importedCount: items.length,
        errorCount: errors.length,
      },
      errors,
    };
  }

  async getImportTemplate() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Products');

    worksheet.columns = [
      { header: 'Product Name', key: 'productName', width: 30 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Unit', key: 'unit', width: 16 },
    ];

    worksheet.addRow({
      productName: 'Surgical Gloves',
      category: 'Surgical',
      unit: 'Units',
    });

    worksheet.addRow({
      productName: 'Syringe 5ml',
      category: 'Medicine',
      unit: 'Units',
    });

    return await workbook.xlsx.writeBuffer();
  }
}

export const supplierService = new SupplierService();
