import type { Timestamp } from 'firebase/firestore';

export type PartCategory =
  | 'display'
  | 'battery'
  | 'charging_port'
  | 'camera'
  | 'housing'
  | 'ic_chip'
  | 'adhesive_consumable'
  | 'accessory';

export type IssueCategory =
  | 'screen'
  | 'battery'
  | 'charging_port'
  | 'water_damage'
  | 'camera'
  | 'motherboard'
  | 'software'
  | 'other';

export type TicketPriority = 'standard' | 'urgent' | 'express';

export type TicketStatus =
  | 'intake'
  | 'diagnosing'
  | 'awaiting_parts'
  | 'in_repair'
  | 'testing'
  | 'ready_pickup'
  | 'completed'
  | 'cancelled';

export type MovementType = 'restock' | 'repair_use' | 'adjustment';

export interface Customer {
  id: string;
  ownerId: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface InventoryPart {
  id: string;
  ownerId: string;
  sku: string;
  name: string;
  category: PartCategory;
  compatibleBrand: string;
  compatibleModels: string;
  binLocation: string;
  supplier: string;
  quantity: number;
  minStockLevel: number;
  unitCostCents: number;
  retailPriceCents: number;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface RepairTicket {
  id: string;
  ownerId: string;
  ticketNumber: string;
  customerId: string;
  customerName: string;
  deviceBrand: string;
  deviceModel: string;
  imeiOrSerial: string;
  passcodeOrPattern: string;
  issueCategory: IssueCategory;
  issueDescription: string;
  technicianNotes: string;
  assignedTech: string;
  priority: TicketPriority;
  status: TicketStatus;
  laborCents: number;
  partsTotalCents: number;
  warrantyDays: number;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface StockMovement {
  id: string;
  ownerId: string;
  partId: string;
  partSku: string;
  partName: string;
  ticketId: string;
  ticketNumber: string;
  type: MovementType;
  quantityDelta: number;
  unitCostCents: number;
  unitPriceCents: number;
  note: string;
  createdAt: Timestamp | null;
}

/**
 * Verbatim schema limits & regex patterns synchronized with firebase-blueprint.json and firestore.rules
 */
export const BLUEPRINT_CONSTRAINTS = {
  ID_PATTERN: /^[a-zA-Z0-9_\-]+$/,
  OPTIONAL_ID_PATTERN: /^[a-zA-Z0-9_\-]*$/,
  ID_MAX_LEN: 128,
  CUSTOMER: {
    NAME_MAX: 80,
    PHONE_MIN: 3,
    PHONE_MAX: 30,
    EMAIL_MAX: 120,
    NOTES_MAX: 500,
  },
  PART: {
    SKU_MIN: 2,
    SKU_MAX: 40,
    NAME_MIN: 2,
    NAME_MAX: 120,
    BRAND_MAX: 50,
    MODELS_MAX: 160,
    BIN_MAX: 24,
    SUPPLIER_MAX: 80,
    MAX_QTY: 100000,
    MAX_MIN_STOCK: 10000,
    MAX_CENTS: 10000000,
  },
  TICKET: {
    NUMBER_MIN: 3,
    NUMBER_MAX: 24,
    BRAND_MAX: 40,
    MODEL_MAX: 80,
    IMEI_MAX: 32,
    PASSCODE_MAX: 32,
    DESCRIPTION_MIN: 2,
    DESCRIPTION_MAX: 1000,
    NOTES_MAX: 1000,
    TECH_MAX: 60,
    MAX_CENTS: 10000000,
    MAX_WARRANTY_DAYS: 730,
  },
  MOVEMENT: {
    NOTE_MAX: 300,
    MAX_DELTA: 10000,
  },
} as const;

export const PART_CATEGORY_LABELS: Record<PartCategory, string> = {
  display: 'OLED / LCD Display',
  battery: 'Battery Cell',
  charging_port: 'Charging Port & Flex',
  camera: 'Camera Module',
  housing: 'Back Glass & Frame',
  ic_chip: 'Board IC & Micro-Component',
  adhesive_consumable: 'Adhesive & Consumable',
  accessory: 'Protector & Accessory',
};

export const ISSUE_CATEGORY_LABELS: Record<IssueCategory, string> = {
  screen: 'Cracked / Dead Display',
  battery: 'Battery Drain / Swelling',
  charging_port: 'No Charge / USB-C / Lightning',
  water_damage: 'Liquid / Corrosion',
  camera: 'Camera / FaceID Fault',
  motherboard: 'Board / No Power / Short',
  software: 'OS Restore / Bootloop',
  other: 'General Hardware Diagnostic',
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  intake: 'Checked In',
  diagnosing: 'Bench Diagnostics',
  awaiting_parts: 'Awaiting Parts',
  in_repair: 'In Repair',
  testing: 'Post-Repair QC',
  ready_pickup: 'Ready for Pickup',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  standard: 'Standard',
  urgent: 'Urgent',
  express: 'Same-Day Express',
};

export function sanitizeSlugCode(raw: string, maxLength: number): string {
  return raw
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9_\-]/g, '')
    .slice(0, maxLength);
}

export function clampText(raw: string, maxLength: number): string {
  return raw.trim().slice(0, maxLength);
}

export function clampInt(val: number, min: number, max: number): number {
  if (!Number.isFinite(val)) return min;
  return Math.max(min, Math.min(max, Math.round(val)));
}

export function formatCurrency(cents: number): string {
  const dollars = (cents || 0) / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}

export function formatTimestamp(ts: Timestamp | null | undefined): string {
  if (!ts || typeof ts.toDate !== 'function') return 'Just now';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(ts.toDate());
}

export function timestampToMillis(ts: Timestamp | null | undefined): number {
  if (!ts || typeof ts.toMillis !== 'function') return Date.now();
  return ts.toMillis();
}
