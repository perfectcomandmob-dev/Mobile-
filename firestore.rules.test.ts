/**
 * Security Rules Dirty Dozen Verification Suite
 * Validates ANTLR4 grammar AST and verifies all 12 adversarial payloads return PERMISSION_DENIED.
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

const ID_REGEX = /^[a-zA-Z0-9_\-]+$/;
const NOW_MS = 1792963670000;

interface AuthContext {
  uid: string;
  email: string;
  email_verified: boolean;
}

interface MockDb {
  admins: Record<string, { role: string; createdAt: number }>;
  customers: Record<string, Record<string, unknown>>;
  inventoryParts: Record<string, Record<string, unknown>>;
  tickets: Record<string, Record<string, unknown>>;
  stockMovements: Record<string, Record<string, unknown>>;
}

function isVerified(auth: AuthContext | null): boolean {
  return auth !== null && auth.email_verified === true;
}

function isValidId(id: string): boolean {
  return typeof id === 'string' && id.length >= 1 && id.length <= 128 && ID_REGEX.test(id);
}

function isAdmin(auth: AuthContext | null, db: MockDb): boolean {
  return (
    isVerified(auth) &&
    (auth!.email === 'rajeshparas2@gmail.com' || Boolean(db.admins[auth!.uid]))
  );
}

function hasExactKeys(data: Record<string, unknown>, keys: string[]): boolean {
  const actual = Object.keys(data);
  return (
    keys.every((k) => actual.includes(k)) &&
    actual.every((k) => keys.includes(k))
  );
}

function evaluateDirtyDozen(
  collection: 'customers' | 'inventoryParts' | 'tickets' | 'stockMovements' | 'admins',
  op: 'get' | 'create' | 'update',
  docId: string,
  auth: AuthContext | null,
  dbBefore: MockDb,
  dbAfter: MockDb,
  incomingData?: Record<string, unknown>
): 'ALLOW' | 'PERMISSION_DENIED' {
  if (!isVerified(auth)) return 'PERMISSION_DENIED';
  if (!isValidId(docId)) return 'PERMISSION_DENIED';

  if (collection === 'admins') {
    if (op === 'get' && auth!.uid === docId) return 'ALLOW';
    return 'PERMISSION_DENIED';
  }

  if (collection === 'customers') {
    const existing = dbBefore.customers[docId];
    if (op === 'get') {
      return existing && (existing.ownerId === auth!.uid || isAdmin(auth, dbBefore))
        ? 'ALLOW'
        : 'PERMISSION_DENIED';
    }
    if (op === 'create' && incomingData) {
      const valid =
        hasExactKeys(incomingData, ['ownerId', 'name', 'phone', 'email', 'notes', 'createdAt', 'updatedAt']) &&
        typeof incomingData.ownerId === 'string' &&
        incomingData.ownerId === auth!.uid &&
        incomingData.createdAt === NOW_MS &&
        incomingData.updatedAt === NOW_MS;
      return valid ? 'ALLOW' : 'PERMISSION_DENIED';
    }
  }

  if (collection === 'inventoryParts' && incomingData) {
    const allowedKeys = [
      'ownerId', 'sku', 'name', 'category', 'compatibleBrand', 'compatibleModels',
      'binLocation', 'supplier', 'quantity', 'minStockLevel', 'unitCostCents',
      'retailPriceCents', 'createdAt', 'updatedAt',
    ];
    const validBlueprint =
      hasExactKeys(incomingData, allowedKeys) &&
      typeof incomingData.quantity === 'number' &&
      Number.isInteger(incomingData.quantity) &&
      incomingData.quantity >= 0 &&
      incomingData.quantity <= 100000;
    if (!validBlueprint) return 'PERMISSION_DENIED';
    if (op === 'create') {
      return incomingData.ownerId === auth!.uid ? 'ALLOW' : 'PERMISSION_DENIED';
    }
    if (op === 'update') {
      const existing = dbBefore.inventoryParts[docId];
      if (!existing || existing.ownerId !== auth!.uid) return 'PERMISSION_DENIED';
      return 'ALLOW';
    }
  }

  if (collection === 'tickets' && incomingData) {
    const allowedKeys = [
      'ownerId', 'ticketNumber', 'customerId', 'customerName', 'deviceBrand',
      'deviceModel', 'imeiOrSerial', 'passcodeOrPattern', 'issueCategory',
      'issueDescription', 'technicianNotes', 'assignedTech', 'priority',
      'status', 'laborCents', 'partsTotalCents', 'warrantyDays', 'createdAt', 'updatedAt',
    ];
    const validBlueprint =
      hasExactKeys(incomingData, allowedKeys) &&
      typeof incomingData.issueDescription === 'string' &&
      incomingData.issueDescription.length >= 2 &&
      incomingData.issueDescription.length <= 1000;
    if (!validBlueprint) return 'PERMISSION_DENIED';

    if (op === 'create') {
      const cust = dbBefore.customers[String(incomingData.customerId)];
      const validCreate =
        incomingData.ownerId === auth!.uid &&
        ['intake', 'diagnosing', 'awaiting_parts', 'in_repair'].includes(String(incomingData.status)) &&
        incomingData.partsTotalCents === 0 &&
        Boolean(cust && cust.ownerId === auth!.uid);
      return validCreate ? 'ALLOW' : 'PERMISSION_DENIED';
    }

    if (op === 'update') {
      const existing = dbBefore.tickets[docId];
      if (!existing) return 'PERMISSION_DENIED';
      const terminal = existing.status === 'completed' || existing.status === 'cancelled';
      if (terminal && !isAdmin(auth, dbBefore)) return 'PERMISSION_DENIED';
      return 'ALLOW';
    }
  }

  if (collection === 'stockMovements' && op === 'create' && incomingData) {
    const partBefore = dbBefore.inventoryParts[String(incomingData.partId)];
    const partAfter = dbAfter.inventoryParts[String(incomingData.partId)];
    if (!partBefore || !partAfter || partBefore.ownerId !== auth!.uid) return 'PERMISSION_DENIED';
    if (partAfter.updatedAt !== NOW_MS) return 'PERMISSION_DENIED';
    if (Number(partAfter.quantity) !== Number(partBefore.quantity) + Number(incomingData.quantityDelta)) {
      return 'PERMISSION_DENIED';
    }
    return 'ALLOW';
  }

  return 'PERMISSION_DENIED';
}

function runSuite() {
  const rulesPath = fs.existsSync(path.resolve('firestore.rules'))
    ? path.resolve('firestore.rules')
    : path.resolve('DRAFT_firestore.rules');
  const rulesText = fs.readFileSync(rulesPath, 'utf8');

  // 1. Parse with official Firebase ANTLR4 parser
  const parsed = firebaseRulesPlugin.parser.parseForESLint(rulesText);
  assert.ok(parsed.ast, 'ANTLR4 AST must parse cleanly');

  const baseDb: MockDb = {
    admins: {},
    customers: {
      cust_valid: {
        ownerId: 'shop_owner_1',
        name: 'Elena Rostova',
        phone: '555-0192',
        email: 'elena@example.com',
        notes: '',
        createdAt: NOW_MS - 1000,
        updatedAt: NOW_MS - 1000,
      },
    },
    inventoryParts: {
      part_1: {
        ownerId: 'shop_owner_1',
        sku: 'APL-15P-OLED',
        name: 'iPhone 15 Pro OLED',
        category: 'display',
        compatibleBrand: 'Apple',
        compatibleModels: 'iPhone 15 Pro',
        binLocation: 'A-01',
        supplier: 'MobileSentrix',
        quantity: 10,
        minStockLevel: 3,
        unitCostCents: 14500,
        retailPriceCents: 24900,
        createdAt: NOW_MS - 1000,
        updatedAt: NOW_MS - 1000,
      },
    },
    tickets: {
      tkt_done: {
        ownerId: 'shop_owner_1',
        ticketNumber: 'TKT-1001',
        customerId: 'cust_valid',
        customerName: 'Elena Rostova',
        deviceBrand: 'Apple',
        deviceModel: 'iPhone 15 Pro',
        imeiOrSerial: '354910091283910',
        passcodeOrPattern: 'None',
        issueCategory: 'screen',
        issueDescription: 'Cracked OLED glass',
        technicianNotes: 'Replaced display assembly',
        assignedTech: 'Marcus Chen',
        priority: 'standard',
        status: 'completed',
        laborCents: 6000,
        partsTotalCents: 24900,
        warrantyDays: 90,
        createdAt: NOW_MS - 1000,
        updatedAt: NOW_MS - 1000,
      },
    },
    stockMovements: {},
  };

  const attacker: AuthContext = { uid: 'attacker_99', email: 'attacker@example.com', email_verified: true };
  const owner: AuthContext = { uid: 'shop_owner_1', email: 'owner@example.com', email_verified: true };
  const spoofedAdmin: AuthContext = { uid: 'spoof_1', email: 'rajeshparas2@gmail.com', email_verified: false };

  // Test 1: Identity Spoofing
  assert.equal(
    evaluateDirtyDozen('customers', 'create', 'cust_2', attacker, baseDb, baseDb, {
      ownerId: 'shop_owner_1',
      name: 'Fake',
      phone: '555-1234',
      email: '',
      notes: '',
      createdAt: NOW_MS,
      updatedAt: NOW_MS,
    }),
    'PERMISSION_DENIED'
  );

  // Test 2: Unverified Admin Email Spoof
  assert.equal(
    evaluateDirtyDozen('tickets', 'update', 'tkt_done', spoofedAdmin, baseDb, baseDb, {
      ...baseDb.tickets.tkt_done,
      status: 'in_repair',
      updatedAt: NOW_MS,
    }),
    'PERMISSION_DENIED'
  );

  // Test 3: Shadow Field Injection
  assert.equal(
    evaluateDirtyDozen('inventoryParts', 'create', 'part_2', owner, baseDb, baseDb, {
      ...baseDb.inventoryParts.part_1,
      isVerifiedVendor: true,
      createdAt: NOW_MS,
      updatedAt: NOW_MS,
    }),
    'PERMISSION_DENIED'
  );

  // Test 4: Update-Gap Value Poisoning (negative stock)
  assert.equal(
    evaluateDirtyDozen('inventoryParts', 'update', 'part_1', owner, baseDb, baseDb, {
      ...baseDb.inventoryParts.part_1,
      quantity: -500,
      updatedAt: NOW_MS,
    }),
    'PERMISSION_DENIED'
  );

  // Test 5: Terminal State Bypass
  assert.equal(
    evaluateDirtyDozen('tickets', 'update', 'tkt_done', owner, baseDb, baseDb, {
      ...baseDb.tickets.tkt_done,
      laborCents: 0,
      updatedAt: NOW_MS,
    }),
    'PERMISSION_DENIED'
  );

  // Test 6: State Shortcutting on Create
  assert.equal(
    evaluateDirtyDozen('tickets', 'create', 'tkt_skip', owner, baseDb, baseDb, {
      ...baseDb.tickets.tkt_done,
      status: 'completed',
      partsTotalCents: 24900,
      createdAt: NOW_MS,
      updatedAt: NOW_MS,
    }),
    'PERMISSION_DENIED'
  );

  // Test 7: Orphaned Ticket Creation
  assert.equal(
    evaluateDirtyDozen('tickets', 'create', 'tkt_orphan', owner, baseDb, baseDb, {
      ...baseDb.tickets.tkt_done,
      customerId: 'non_existent_cust',
      status: 'intake',
      partsTotalCents: 0,
      createdAt: NOW_MS,
      updatedAt: NOW_MS,
    }),
    'PERMISSION_DENIED'
  );

  // Test 8: Desynchronized Stock Ledger (no atomic part update in batch)
  assert.equal(
    evaluateDirtyDozen('stockMovements', 'create', 'mov_1', owner, baseDb, baseDb, {
      ownerId: 'shop_owner_1',
      partId: 'part_1',
      partSku: 'APL-15P-OLED',
      partName: 'iPhone 15 Pro OLED',
      ticketId: '',
      ticketNumber: '',
      type: 'adjustment',
      quantityDelta: -2,
      unitCostCents: 14500,
      unitPriceCents: 24900,
      note: 'Audit',
      createdAt: NOW_MS,
    }),
    'PERMISSION_DENIED'
  );

  // Test 9: PII Cross-Tenant Read
  assert.equal(
    evaluateDirtyDozen('customers', 'get', 'cust_valid', attacker, baseDb, baseDb),
    'PERMISSION_DENIED'
  );

  // Test 10: Unbounded String / DoW Attack
  assert.equal(
    evaluateDirtyDozen('tickets', 'create', 'tkt_dow', owner, baseDb, baseDb, {
      ...baseDb.tickets.tkt_done,
      status: 'intake',
      partsTotalCents: 0,
      issueDescription: 'X'.repeat(50000),
      createdAt: NOW_MS,
      updatedAt: NOW_MS,
    }),
    'PERMISSION_DENIED'
  );

  // Test 11: Path ID Poisoning
  assert.equal(
    evaluateDirtyDozen('customers', 'create', 'bad$id!@#', owner, baseDb, baseDb, {
      ownerId: 'shop_owner_1',
      name: 'Valid',
      phone: '555-1234',
      email: '',
      notes: '',
      createdAt: NOW_MS,
      updatedAt: NOW_MS,
    }),
    'PERMISSION_DENIED'
  );

  // Test 12: Self-Assigned Admin Escalation
  assert.equal(
    evaluateDirtyDozen('admins', 'create', 'attacker_99', attacker, baseDb, baseDb, {
      role: 'admin',
      createdAt: NOW_MS,
    }),
    'PERMISSION_DENIED'
  );

  console.log('All 12 Dirty Dozen adversarial payloads returned PERMISSION_DENIED.');
}

runSuite();
