export type UserRole = "ADMIN" | "INVENTORY_MANAGER" | "WAREHOUSE_STAFF";

export type LocationType =
  | "RACK"
  | "SHELF"
  | "BIN"
  | "PALLET"
  | "FLOOR"
  | "INCOMING"
  | "OUTGOING"
  | "PRODUCTION";

export const OperationStatus = {
  DRAFT: "DRAFT",
  WAITING: "WAITING",
  READY: "READY",
  DONE: "DONE",
  CANCELED: "CANCELED",
} as const;

export type OperationStatus = (typeof OperationStatus)[keyof typeof OperationStatus];

export type LedgerTransactionType =
  | "RECEIPT"
  | "DELIVERY"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "ADJUSTMENT";

export type LedgerReferenceType =
  | "RECEIPT"
  | "DELIVERY"
  | "TRANSFER"
  | "ADJUSTMENT";

export type StockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string | null;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface MetricCardData {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  description?: string;
  iconName?: string;
}
