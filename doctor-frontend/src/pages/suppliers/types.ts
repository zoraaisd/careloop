export type InventoryItem = {
  inventoryItemId: string;
  itemName: string;
  vendor: string | null;
  purchasePrice: number;
  stockQuantity: number;
  updatedAt: string;
};

export type InventoryResponse = {
  items: InventoryItem[];
};

export type SupplierSummary = {
  name: string;
  itemCount: number;
  totalStock: number;
  estimatedPurchaseValue: number;
  lastUpdatedAt: string | null;
};
