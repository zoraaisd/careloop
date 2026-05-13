import type { InventoryItem, SupplierSummary } from './types';

export const UNASSIGNED_SUPPLIER_NAME = 'Unassigned Supplier';

export const buildSupplierSummaries = (
  inventory: InventoryItem[],
  search: string,
): SupplierSummary[] => {
  const grouped = new Map<string, SupplierSummary>();

  inventory.forEach((item) => {
    const supplierName = item.vendor?.trim() || UNASSIGNED_SUPPLIER_NAME;
    const existing = grouped.get(supplierName);
    const estimatedPurchaseValue = item.purchasePrice * item.stockQuantity;

    if (existing) {
      existing.itemCount += 1;
      existing.totalStock += item.stockQuantity;
      existing.estimatedPurchaseValue += estimatedPurchaseValue;
      if (!existing.lastUpdatedAt || new Date(item.updatedAt) > new Date(existing.lastUpdatedAt)) {
        existing.lastUpdatedAt = item.updatedAt;
      }
      return;
    }

    grouped.set(supplierName, {
      name: supplierName,
      itemCount: 1,
      totalStock: item.stockQuantity,
      estimatedPurchaseValue,
      lastUpdatedAt: item.updatedAt,
    });
  });

  return Array.from(grouped.values())
    .filter((supplier) => supplier.name.toLowerCase().includes(search.toLowerCase()))
    .sort((left, right) => right.itemCount - left.itemCount);
};
