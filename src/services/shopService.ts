import {
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  BLUEPRINT_CONSTRAINTS,
  clampInt,
  clampText,
  type Customer,
  type InventoryPart,
  type IssueCategory,
  type PartCategory,
  type RepairTicket,
  sanitizeSlugCode,
  type TicketPriority,
  type TicketStatus,
} from '../types';

export interface CustomerInput {
  name: string;
  phone: string;
  email: string;
  notes: string;
}

export async function createCustomer(ownerId: string, input: CustomerInput): Promise<string> {
  const ref = doc(collection(db, 'customers'));
  const name = clampText(input.name, BLUEPRINT_CONSTRAINTS.CUSTOMER.NAME_MAX);
  const phone = clampText(input.phone, BLUEPRINT_CONSTRAINTS.CUSTOMER.PHONE_MAX);
  const email = clampText(input.email, BLUEPRINT_CONSTRAINTS.CUSTOMER.EMAIL_MAX);
  const notes = clampText(input.notes, BLUEPRINT_CONSTRAINTS.CUSTOMER.NOTES_MAX);

  if (name.length < 1) throw new Error('Customer name is required.');
  if (phone.length < BLUEPRINT_CONSTRAINTS.CUSTOMER.PHONE_MIN) {
    throw new Error('Valid customer phone number (at least 3 characters) is required.');
  }

  try {
    await setDoc(ref, {
      ownerId,
      name,
      phone,
      email,
      notes,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  } catch (error) {
    return handleFirestoreError(error, OperationType.CREATE, `customers/${ref.id}`);
  }
}

export async function updateCustomer(customerId: string, input: CustomerInput): Promise<void> {
  const name = clampText(input.name, BLUEPRINT_CONSTRAINTS.CUSTOMER.NAME_MAX);
  const phone = clampText(input.phone, BLUEPRINT_CONSTRAINTS.CUSTOMER.PHONE_MAX);
  const email = clampText(input.email, BLUEPRINT_CONSTRAINTS.CUSTOMER.EMAIL_MAX);
  const notes = clampText(input.notes, BLUEPRINT_CONSTRAINTS.CUSTOMER.NOTES_MAX);

  if (name.length < 1) throw new Error('Customer name is required.');
  if (phone.length < BLUEPRINT_CONSTRAINTS.CUSTOMER.PHONE_MIN) {
    throw new Error('Valid customer phone number is required.');
  }

  try {
    await updateDoc(doc(db, 'customers', customerId), {
      name,
      phone,
      email,
      notes,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `customers/${customerId}`);
  }
}

export async function deleteCustomer(customerId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'customers', customerId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `customers/${customerId}`);
  }
}

export interface InventoryPartInput {
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
}

export async function createInventoryPart(
  ownerId: string,
  input: InventoryPartInput
): Promise<string> {
  const ref = doc(collection(db, 'inventoryParts'));
  const sku = sanitizeSlugCode(input.sku.toUpperCase(), BLUEPRINT_CONSTRAINTS.PART.SKU_MAX);
  const name = clampText(input.name, BLUEPRINT_CONSTRAINTS.PART.NAME_MAX);
  const compatibleBrand = clampText(input.compatibleBrand, BLUEPRINT_CONSTRAINTS.PART.BRAND_MAX);
  const compatibleModels = clampText(input.compatibleModels, BLUEPRINT_CONSTRAINTS.PART.MODELS_MAX);
  const binLocation = clampText(input.binLocation, BLUEPRINT_CONSTRAINTS.PART.BIN_MAX);
  const supplier = clampText(input.supplier, BLUEPRINT_CONSTRAINTS.PART.SUPPLIER_MAX);

  if (sku.length < BLUEPRINT_CONSTRAINTS.PART.SKU_MIN) {
    throw new Error('SKU must be at least 2 alphanumeric characters.');
  }
  if (name.length < BLUEPRINT_CONSTRAINTS.PART.NAME_MIN) {
    throw new Error('Part name must be at least 2 characters.');
  }
  if (!compatibleBrand || !compatibleModels || !binLocation) {
    throw new Error('Brand, compatible models, and bin location are required.');
  }

  const quantity = clampInt(input.quantity, 0, BLUEPRINT_CONSTRAINTS.PART.MAX_QTY);
  const minStockLevel = clampInt(input.minStockLevel, 0, BLUEPRINT_CONSTRAINTS.PART.MAX_MIN_STOCK);
  const unitCostCents = clampInt(input.unitCostCents, 0, BLUEPRINT_CONSTRAINTS.PART.MAX_CENTS);
  const retailPriceCents = clampInt(input.retailPriceCents, 0, BLUEPRINT_CONSTRAINTS.PART.MAX_CENTS);

  try {
    await setDoc(ref, {
      ownerId,
      sku,
      name,
      category: input.category,
      compatibleBrand,
      compatibleModels,
      binLocation,
      supplier,
      quantity,
      minStockLevel,
      unitCostCents,
      retailPriceCents,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  } catch (error) {
    return handleFirestoreError(error, OperationType.CREATE, `inventoryParts/${ref.id}`);
  }
}

export async function updateInventoryPart(
  partId: string,
  input: Omit<InventoryPartInput, 'quantity'>
): Promise<void> {
  const sku = sanitizeSlugCode(input.sku.toUpperCase(), BLUEPRINT_CONSTRAINTS.PART.SKU_MAX);
  const name = clampText(input.name, BLUEPRINT_CONSTRAINTS.PART.NAME_MAX);
  const compatibleBrand = clampText(input.compatibleBrand, BLUEPRINT_CONSTRAINTS.PART.BRAND_MAX);
  const compatibleModels = clampText(input.compatibleModels, BLUEPRINT_CONSTRAINTS.PART.MODELS_MAX);
  const binLocation = clampText(input.binLocation, BLUEPRINT_CONSTRAINTS.PART.BIN_MAX);
  const supplier = clampText(input.supplier, BLUEPRINT_CONSTRAINTS.PART.SUPPLIER_MAX);

  if (sku.length < BLUEPRINT_CONSTRAINTS.PART.SKU_MIN) {
    throw new Error('SKU must be at least 2 alphanumeric characters.');
  }
  if (name.length < BLUEPRINT_CONSTRAINTS.PART.NAME_MIN) {
    throw new Error('Part name must be at least 2 characters.');
  }

  try {
    await updateDoc(doc(db, 'inventoryParts', partId), {
      sku,
      name,
      category: input.category,
      compatibleBrand,
      compatibleModels,
      binLocation,
      supplier,
      minStockLevel: clampInt(input.minStockLevel, 0, BLUEPRINT_CONSTRAINTS.PART.MAX_MIN_STOCK),
      unitCostCents: clampInt(input.unitCostCents, 0, BLUEPRINT_CONSTRAINTS.PART.MAX_CENTS),
      retailPriceCents: clampInt(input.retailPriceCents, 0, BLUEPRINT_CONSTRAINTS.PART.MAX_CENTS),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `inventoryParts/${partId}`);
  }
}

export async function deleteInventoryPart(partId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'inventoryParts', partId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `inventoryParts/${partId}`);
  }
}

export async function adjustPartStock(
  ownerId: string,
  part: InventoryPart,
  mode: 'restock' | 'adjustment',
  quantityDelta: number,
  note: string
): Promise<void> {
  const delta = clampInt(
    quantityDelta,
    -BLUEPRINT_CONSTRAINTS.MOVEMENT.MAX_DELTA,
    BLUEPRINT_CONSTRAINTS.MOVEMENT.MAX_DELTA
  );
  if (delta === 0) {
    throw new Error('Stock change quantity cannot be zero.');
  }
  if (mode === 'restock' && delta <= 0) {
    throw new Error('Restock quantity must be greater than zero.');
  }
  const nextQuantity = part.quantity + delta;
  if (nextQuantity < 0 || nextQuantity > BLUEPRINT_CONSTRAINTS.PART.MAX_QTY) {
    throw new Error(`Resulting stock (${nextQuantity}) is out of bounds.`);
  }

  const batch = writeBatch(db);
  const partRef = doc(db, 'inventoryParts', part.id);
  const movRef = doc(collection(db, 'stockMovements'));

  batch.update(partRef, {
    quantity: nextQuantity,
    updatedAt: serverTimestamp(),
  });

  batch.set(movRef, {
    ownerId,
    partId: part.id,
    partSku: part.sku,
    partName: part.name,
    ticketId: '',
    ticketNumber: '',
    type: mode,
    quantityDelta: delta,
    unitCostCents: part.unitCostCents,
    unitPriceCents: part.retailPriceCents,
    note: clampText(note, BLUEPRINT_CONSTRAINTS.MOVEMENT.NOTE_MAX),
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `stockMovements/${movRef.id}`);
  }
}

export interface CreateTicketInput {
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
  status: 'intake' | 'diagnosing' | 'awaiting_parts' | 'in_repair';
  laborCents: number;
  warrantyDays: number;
}

export async function createRepairTicket(
  ownerId: string,
  input: CreateTicketInput
): Promise<string> {
  const ref = doc(collection(db, 'tickets'));
  const ticketNumber = sanitizeSlugCode(
    input.ticketNumber.toUpperCase(),
    BLUEPRINT_CONSTRAINTS.TICKET.NUMBER_MAX
  );
  const customerName = clampText(input.customerName, BLUEPRINT_CONSTRAINTS.CUSTOMER.NAME_MAX);
  const deviceBrand = clampText(input.deviceBrand, BLUEPRINT_CONSTRAINTS.TICKET.BRAND_MAX);
  const deviceModel = clampText(input.deviceModel, BLUEPRINT_CONSTRAINTS.TICKET.MODEL_MAX);
  const issueDescription = clampText(
    input.issueDescription,
    BLUEPRINT_CONSTRAINTS.TICKET.DESCRIPTION_MAX
  );
  const assignedTech = clampText(
    input.assignedTech || 'Unassigned',
    BLUEPRINT_CONSTRAINTS.TICKET.TECH_MAX
  );

  if (ticketNumber.length < BLUEPRINT_CONSTRAINTS.TICKET.NUMBER_MIN) {
    throw new Error('Ticket number is invalid.');
  }
  if (!input.customerId || !customerName) {
    throw new Error('Customer selection is required.');
  }
  if (!deviceBrand || !deviceModel) {
    throw new Error('Device brand and model are required.');
  }
  if (issueDescription.length < BLUEPRINT_CONSTRAINTS.TICKET.DESCRIPTION_MIN) {
    throw new Error('Please describe the reported fault (at least 2 characters).');
  }

  try {
    await setDoc(ref, {
      ownerId,
      ticketNumber,
      customerId: input.customerId,
      customerName,
      deviceBrand,
      deviceModel,
      imeiOrSerial: clampText(input.imeiOrSerial, BLUEPRINT_CONSTRAINTS.TICKET.IMEI_MAX),
      passcodeOrPattern: clampText(
        input.passcodeOrPattern,
        BLUEPRINT_CONSTRAINTS.TICKET.PASSCODE_MAX
      ),
      issueCategory: input.issueCategory,
      issueDescription,
      technicianNotes: clampText(input.technicianNotes, BLUEPRINT_CONSTRAINTS.TICKET.NOTES_MAX),
      assignedTech,
      priority: input.priority,
      status: input.status,
      laborCents: clampInt(input.laborCents, 0, BLUEPRINT_CONSTRAINTS.TICKET.MAX_CENTS),
      partsTotalCents: 0,
      warrantyDays: clampInt(
        input.warrantyDays,
        0,
        BLUEPRINT_CONSTRAINTS.TICKET.MAX_WARRANTY_DAYS
      ),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  } catch (error) {
    return handleFirestoreError(error, OperationType.CREATE, `tickets/${ref.id}`);
  }
}

export async function updateTicketBenchState(
  ticketId: string,
  payload: {
    status: TicketStatus;
    technicianNotes: string;
    assignedTech: string;
    priority: TicketPriority;
  }
): Promise<void> {
  try {
    await updateDoc(doc(db, 'tickets', ticketId), {
      status: payload.status,
      technicianNotes: clampText(payload.technicianNotes, BLUEPRINT_CONSTRAINTS.TICKET.NOTES_MAX),
      assignedTech: clampText(
        payload.assignedTech || 'Unassigned',
        BLUEPRINT_CONSTRAINTS.TICKET.TECH_MAX
      ),
      priority: payload.priority,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `tickets/${ticketId}`);
  }
}

export async function updateRepairTicketDetails(
  ticketId: string,
  payload: {
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
    laborCents: number;
    warrantyDays: number;
    status: TicketStatus;
  }
): Promise<void> {
  try {
    await updateDoc(doc(db, 'tickets', ticketId), {
      customerName: clampText(payload.customerName, BLUEPRINT_CONSTRAINTS.CUSTOMER.NAME_MAX),
      deviceBrand: clampText(payload.deviceBrand, BLUEPRINT_CONSTRAINTS.TICKET.BRAND_MAX),
      deviceModel: clampText(payload.deviceModel, BLUEPRINT_CONSTRAINTS.TICKET.MODEL_MAX),
      imeiOrSerial: clampText(payload.imeiOrSerial, BLUEPRINT_CONSTRAINTS.TICKET.IMEI_MAX),
      passcodeOrPattern: clampText(
        payload.passcodeOrPattern,
        BLUEPRINT_CONSTRAINTS.TICKET.PASSCODE_MAX
      ),
      issueCategory: payload.issueCategory,
      issueDescription: clampText(
        payload.issueDescription,
        BLUEPRINT_CONSTRAINTS.TICKET.DESCRIPTION_MAX
      ),
      technicianNotes: clampText(payload.technicianNotes, BLUEPRINT_CONSTRAINTS.TICKET.NOTES_MAX),
      assignedTech: clampText(
        payload.assignedTech || 'Unassigned',
        BLUEPRINT_CONSTRAINTS.TICKET.TECH_MAX
      ),
      priority: payload.priority,
      laborCents: clampInt(payload.laborCents, 0, BLUEPRINT_CONSTRAINTS.TICKET.MAX_CENTS),
      warrantyDays: clampInt(
        payload.warrantyDays,
        0,
        BLUEPRINT_CONSTRAINTS.TICKET.MAX_WARRANTY_DAYS
      ),
      status: payload.status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `tickets/${ticketId}`);
  }
}

export async function allocatePartToTicket(
  ownerId: string,
  ticket: RepairTicket,
  part: InventoryPart,
  quantity: number,
  note: string
): Promise<void> {
  if (ticket.status === 'completed' || ticket.status === 'cancelled') {
    throw new Error('Cannot allocate parts to a closed ticket.');
  }
  const qty = clampInt(quantity, 1, 100);
  if (part.quantity < qty) {
    throw new Error(`Insufficient stock for ${part.sku}. Only ${part.quantity} available.`);
  }

  const nextPartQty = part.quantity - qty;
  const addedRetailCents = qty * part.retailPriceCents;
  const nextPartsTotalCents = clampInt(
    ticket.partsTotalCents + addedRetailCents,
    0,
    BLUEPRINT_CONSTRAINTS.TICKET.MAX_CENTS
  );

  const batch = writeBatch(db);
  const partRef = doc(db, 'inventoryParts', part.id);
  const ticketRef = doc(db, 'tickets', ticket.id);
  const movRef = doc(collection(db, 'stockMovements'));

  batch.update(partRef, {
    quantity: nextPartQty,
    updatedAt: serverTimestamp(),
  });

  batch.update(ticketRef, {
    partsTotalCents: nextPartsTotalCents,
    status: ticket.status === 'awaiting_parts' ? 'in_repair' : ticket.status,
    updatedAt: serverTimestamp(),
  });

  batch.set(movRef, {
    ownerId,
    partId: part.id,
    partSku: part.sku,
    partName: part.name,
    ticketId: ticket.id,
    ticketNumber: ticket.ticketNumber,
    type: 'repair_use',
    quantityDelta: -qty,
    unitCostCents: part.unitCostCents,
    unitPriceCents: part.retailPriceCents,
    note: clampText(
      note || `Installed on ${ticket.deviceBrand} ${ticket.deviceModel}`,
      BLUEPRINT_CONSTRAINTS.MOVEMENT.NOTE_MAX
    ),
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `stockMovements/${movRef.id}`);
  }
}

export async function reopenTerminalTicketAsAdmin(ticketId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'tickets', ticketId), {
      status: 'in_repair',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `tickets/${ticketId}`);
  }
}

export async function deleteTicketRecord(ticketId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'tickets', ticketId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `tickets/${ticketId}`);
  }
}

/**
 * Populates realistic mobile repair shop customers, spare parts inventory,
 * repair tickets, and atomic stock allocations in sequential rule-compliant batches.
 */
export async function seedSampleShopData(ownerId: string): Promise<void> {
  // Batch 1: Customers + Spare Parts Inventory
  const batch1 = writeBatch(db);

  const cust1Ref = doc(collection(db, 'customers'));
  const cust2Ref = doc(collection(db, 'customers'));
  const cust3Ref = doc(collection(db, 'customers'));
  const cust4Ref = doc(collection(db, 'customers'));

  const customersSeed: Array<{ ref: typeof cust1Ref; data: CustomerInput }> = [
    {
      ref: cust1Ref,
      data: {
        name: 'Elena Rostova',
        phone: '(415) 890-3412',
        email: 'elena.rostova@example.com',
        notes: 'Prefers SMS pickup alert; business handset.',
      },
    },
    {
      ref: cust2Ref,
      data: {
        name: 'Devon Brooks',
        phone: '(415) 612-9084',
        email: 'devon.b@example.com',
        notes: 'AppleCare expired; requested OEM-grade soft OLED.',
      },
    },
    {
      ref: cust3Ref,
      data: {
        name: 'Sonia Patel',
        phone: '(650) 443-1920',
        email: 'sonia.patel@example.com',
        notes: 'Repeat customer — repaired iPad Air previously.',
      },
    },
    {
      ref: cust4Ref,
      data: {
        name: 'Liam Gallagher',
        phone: '(510) 774-2281',
        email: '',
        notes: 'Walk-in express repair.',
      },
    },
  ];

  for (const c of customersSeed) {
    batch1.set(c.ref, {
      ownerId,
      ...c.data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  const part1Ref = doc(collection(db, 'inventoryParts'));
  const part2Ref = doc(collection(db, 'inventoryParts'));
  const part3Ref = doc(collection(db, 'inventoryParts'));
  const part4Ref = doc(collection(db, 'inventoryParts'));
  const part5Ref = doc(collection(db, 'inventoryParts'));
  const part6Ref = doc(collection(db, 'inventoryParts'));

  const partsSeed: Array<{ ref: typeof part1Ref; data: InventoryPartInput }> = [
    {
      ref: part1Ref,
      data: {
        sku: 'APL-IP15P-OLED',
        name: 'iPhone 15 Pro 120Hz Soft OLED Display Assembly',
        category: 'display',
        compatibleBrand: 'Apple',
        compatibleModels: 'iPhone 15 Pro (A2848, A3101)',
        binLocation: 'A-01',
        supplier: 'MobileSentrix',
        quantity: 6,
        minStockLevel: 3,
        unitCostCents: 14800,
        retailPriceCents: 24900,
      },
    },
    {
      ref: part2Ref,
      data: {
        sku: 'SAM-S24U-OCTA',
        name: 'Galaxy S24 Ultra Service Pack AMOLED + Frame',
        category: 'display',
        compatibleBrand: 'Samsung',
        compatibleModels: 'SM-S928U / SM-S928B',
        binLocation: 'A-04',
        supplier: 'InjuredGadgets',
        quantity: 2,
        minStockLevel: 3,
        unitCostCents: 21500,
        retailPriceCents: 32900,
      },
    },
    {
      ref: part3Ref,
      data: {
        sku: 'APL-IP14P-BATT',
        name: 'iPhone 14 Pro High-Cycle Li-Ion Battery (3200mAh)',
        category: 'battery',
        compatibleBrand: 'Apple',
        compatibleModels: 'iPhone 14 Pro (A2650)',
        binLocation: 'B-02',
        supplier: 'iFixit Pro',
        quantity: 11,
        minStockLevel: 5,
        unitCostCents: 2400,
        retailPriceCents: 6900,
      },
    },
    {
      ref: part4Ref,
      data: {
        sku: 'GGL-PX8P-USBC',
        name: 'Pixel 8 Pro USB-C Charging Port Daughterboard',
        category: 'charging_port',
        compatibleBrand: 'Google',
        compatibleModels: 'Pixel 8 Pro (GC3VE)',
        binLocation: 'C-07',
        supplier: 'MobileSentrix',
        quantity: 1,
        minStockLevel: 4,
        unitCostCents: 1850,
        retailPriceCents: 5500,
      },
    },
    {
      ref: part5Ref,
      data: {
        sku: 'APL-IP15P-CAM3X',
        name: 'iPhone 15 Pro Rear Triple Camera OIS Module',
        category: 'camera',
        compatibleBrand: 'Apple',
        compatibleModels: 'iPhone 15 Pro (A2848)',
        binLocation: 'D-01',
        supplier: 'InjuredGadgets',
        quantity: 3,
        minStockLevel: 2,
        unitCostCents: 9800,
        retailPriceCents: 16900,
      },
    },
    {
      ref: part6Ref,
      data: {
        sku: 'IC-CD3217B12-ACE',
        name: 'CD3217B12 USB-C Tristar / Hydra Controller IC',
        category: 'ic_chip',
        compatibleBrand: 'Apple',
        compatibleModels: 'MacBook / iPad Pro / USB-C Logic Boards',
        binLocation: 'ESD-12',
        supplier: 'Mouser Direct',
        quantity: 0,
        minStockLevel: 5,
        unitCostCents: 950,
        retailPriceCents: 3500,
      },
    },
  ];

  for (const p of partsSeed) {
    batch1.set(p.ref, {
      ownerId,
      ...p.data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch1.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'seed/batch1');
  }

  // Batch 2: Active Repair Tickets (created in intake/bench states per state-shortcutting guard)
  const batch2 = writeBatch(db);
  const tkt1Ref = doc(collection(db, 'tickets'));
  const tkt2Ref = doc(collection(db, 'tickets'));
  const tkt3Ref = doc(collection(db, 'tickets'));
  const tkt4Ref = doc(collection(db, 'tickets'));

  batch2.set(tkt1Ref, {
    ownerId,
    ticketNumber: 'TKT-1041',
    customerId: cust2Ref.id,
    customerName: 'Devon Brooks',
    deviceBrand: 'Apple',
    deviceModel: 'iPhone 15 Pro',
    imeiOrSerial: '354891104829104',
    passcodeOrPattern: 'Customer Present',
    issueCategory: 'screen',
    issueDescription: 'Shattered front glass with green vertical OLED line; FaceID operational.',
    technicianNotes: 'TrueTone EEPROM backed up; transferring proximity flex.',
    assignedTech: 'Marcus Chen',
    priority: 'express',
    status: 'in_repair',
    laborCents: 6500,
    partsTotalCents: 0,
    warrantyDays: 90,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch2.set(tkt2Ref, {
    ownerId,
    ticketNumber: 'TKT-1042',
    customerId: cust1Ref.id,
    customerName: 'Elena Rostova',
    deviceBrand: 'Samsung',
    deviceModel: 'Galaxy S24 Ultra',
    imeiOrSerial: '359012847109283',
    passcodeOrPattern: 'Maintenance Mode',
    issueCategory: 'water_damage',
    issueDescription: 'Submerged in saltwater; intermittent USB-C moisture alert and dim display.',
    technicianNotes: 'Ultrasonic board bath complete; inspecting sub-PBA flex corrosion.',
    assignedTech: 'Priya Nair',
    priority: 'urgent',
    status: 'diagnosing',
    laborCents: 9500,
    partsTotalCents: 0,
    warrantyDays: 60,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch2.set(tkt3Ref, {
    ownerId,
    ticketNumber: 'TKT-1043',
    customerId: cust3Ref.id,
    customerName: 'Sonia Patel',
    deviceBrand: 'Apple',
    deviceModel: 'iPhone 14 Pro',
    imeiOrSerial: '351190482716450',
    passcodeOrPattern: '884219',
    issueCategory: 'battery',
    issueDescription: 'Battery health degraded to 74%; unexpected shutdowns under camera load.',
    technicianNotes: 'Replaced cell and resealed IP68 perimeter gasket; passed 2A charge test.',
    assignedTech: 'Marcus Chen',
    priority: 'standard',
    status: 'in_repair',
    laborCents: 4500,
    partsTotalCents: 0,
    warrantyDays: 180,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch2.set(tkt4Ref, {
    ownerId,
    ticketNumber: 'TKT-1044',
    customerId: cust4Ref.id,
    customerName: 'Liam Gallagher',
    deviceBrand: 'Google',
    deviceModel: 'Pixel 8 Pro',
    imeiOrSerial: '357829104491822',
    passcodeOrPattern: 'None',
    issueCategory: 'charging_port',
    issueDescription: 'Loose USB-C receptacle; only charges when cable held at angle.',
    technicianNotes: 'Confirmed worn center tongue pins; awaiting bench slot.',
    assignedTech: 'Priya Nair',
    priority: 'standard',
    status: 'awaiting_parts',
    laborCents: 5000,
    partsTotalCents: 0,
    warrantyDays: 90,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  try {
    await batch2.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'seed/batch2');
  }

  // Batch 3: Atomic part allocations onto TKT-1041 (OLED) & TKT-1043 (Battery -> Ready for Pickup)
  const batch3 = writeBatch(db);
  const mov1Ref = doc(collection(db, 'stockMovements'));
  const mov2Ref = doc(collection(db, 'stockMovements'));

  batch3.update(part1Ref, {
    quantity: 5,
    updatedAt: serverTimestamp(),
  });
  batch3.update(tkt1Ref, {
    partsTotalCents: 24900,
    status: 'testing',
    updatedAt: serverTimestamp(),
  });
  batch3.set(mov1Ref, {
    ownerId,
    partId: part1Ref.id,
    partSku: 'APL-IP15P-OLED',
    partName: 'iPhone 15 Pro 120Hz Soft OLED Display Assembly',
    ticketId: tkt1Ref.id,
    ticketNumber: 'TKT-1041',
    type: 'repair_use',
    quantityDelta: -1,
    unitCostCents: 14800,
    unitPriceCents: 24900,
    note: 'Allocated OEM Soft OLED to TKT-1041',
    createdAt: serverTimestamp(),
  });

  batch3.update(part3Ref, {
    quantity: 10,
    updatedAt: serverTimestamp(),
  });
  batch3.update(tkt3Ref, {
    partsTotalCents: 6900,
    status: 'ready_pickup',
    updatedAt: serverTimestamp(),
  });
  batch3.set(mov2Ref, {
    ownerId,
    partId: part3Ref.id,
    partSku: 'APL-IP14P-BATT',
    partName: 'iPhone 14 Pro High-Cycle Li-Ion Battery (3200mAh)',
    ticketId: tkt3Ref.id,
    ticketNumber: 'TKT-1043',
    type: 'repair_use',
    quantityDelta: -1,
    unitCostCents: 2400,
    unitPriceCents: 6900,
    note: 'Installed battery cell & waterproof seal on TKT-1043',
    createdAt: serverTimestamp(),
  });

  try {
    await batch3.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'seed/batch3');
  }
}
