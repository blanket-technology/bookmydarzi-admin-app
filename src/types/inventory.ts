// Mirrors app/schemas/inventory.py. Note PascalCase response keys (unlike
// most other admin schemas) — the backend's InventoryResponse maps directly
// from ORM attribute names.
export interface InventoryItem {
  Id: string;
  Name: string;
  Category?: string | null;
  Quantity: number;
  Unit?: string | null;
  PricePerUnit: number;
}

export interface InventoryCreateRequest {
  name: string;
  category?: string;
  quantity?: number;
  unit?: string;
  price_per_unit?: number;
}

export type InventoryUpdateRequest = Partial<InventoryCreateRequest>;
