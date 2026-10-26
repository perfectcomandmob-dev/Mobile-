# Security Specification — BenchFlow Repair & Inventory

## 1. Data Invariants & Master Source of Truth

1. **Zero-Trust Default Deny**: Every path under `/databases/{database}/documents` defaults to `allow read, write: if false;`.
2. **Verified Identity Gate**: Every operation requires an authenticated user with `request.auth != null && request.auth.token.email_verified == true`. Unverified email tokens (including spoofed admin emails) are unconditionally rejected.
3. **PII Isolation (`/customers/{customerId}`)**: Customer phone numbers and email addresses reside exclusively in `/customers/{customerId}`. Reads (`get` and `list`) are strictly restricted to `resource.data.ownerId == request.auth.uid` (plus `isAdmin()` on single-doc `get`), preventing cross-tenant PII leaks.
4. **Path Variable Hardening**: Every single-document target operation (`get`, `create`, `update`, `delete`) validates its path ID via `isValidId(id)` (`size <= 128`, regex `^[a-zA-Z0-9_\-]+$`). `list` operations never call `isValidId` or `get()`/`exists()`.
5. **Relational Consistency (`/tickets/{ticketId}`)**:
   - A `RepairTicket` cannot be created unless `/customers/$(incoming().customerId)` exists and belongs to `request.auth.uid`.
   - New tickets cannot skip intake/bench workflow directly into terminal states (`completed` or `cancelled`) and must start with `partsTotalCents == 0`.
   - Once a ticket reaches a terminal state (`completed` or `cancelled`), all standard updates are locked; only `isAdmin()` can execute bounded state-correction actions.
6. **Atomic Stock Ledger (`/stockMovements/{movementId}`)**:
   - `StockMovement` is an append-only immutable ledger (`allow update: if false;`).
   - Creating a `StockMovement` requires `/inventoryParts/$(incoming().partId)` to exist, belong to `request.auth.uid`, be updated in the **same atomic batch** (`getAfter(...).data.updatedAt == request.time`), and satisfy exact conservation of stock: `getAfter(part).data.quantity == get(part).data.quantity + incoming().quantityDelta`.
   - When `type == 'repair_use'`, `quantityDelta` must be negative, `ticketId` must reference an open ticket owned by `request.auth.uid`, and that ticket must also be atomically updated in the same batch (`getAfter(ticket).data.updatedAt == request.time`).
7. **Temporal & Ownership Immutability**: `createdAt == request.time` on `create`, `updatedAt == request.time` on `update`, and `ownerId` / `createdAt` can never mutate on `update`.

---

## 2. The "Dirty Dozen" Adversarial Payloads

| # | Attack Vector | Target Path & Op | Malicious Payload / Context | Expected Defense Gate |
| :- | :------------ | :--------------- | :-------------------------- | :-------------------- |
| 1 | **Identity Spoofing** | `CREATE /customers/cust_1` | `auth.uid = "attacker"`, `payload.ownerId = "victim_uid"` | Rejected by `incoming().ownerId == request.auth.uid` |
| 2 | **Unverified Admin Email Spoof** | `UPDATE /tickets/tkt_closed` | `auth.email = "rajeshparas2@gmail.com"`, `email_verified = false` | Rejected by `isVerified()` (`email_verified == true`) |
| 3 | **Shadow Field Injection** | `CREATE /inventoryParts/part_1` | Valid `InventoryPart` + `"isVerifiedVendor": true` | Rejected by `data.keys().hasOnly([...])` in `isValidInventoryPart` |
| 4 | **Update-Gap Value Poisoning** | `UPDATE /inventoryParts/part_1` | `affectedKeys = ['quantity', 'updatedAt']`, `quantity = -500` | Rejected by `isValidInventoryPart(incoming())` wrapping `allow update` |
| 5 | **Terminal State Bypass** | `UPDATE /tickets/tkt_done` | `existing.status = "completed"`, non-admin tries changing `laborCents = 0` | Rejected by `existing().status != 'completed' && existing().status != 'cancelled'` |
| 6 | **State Shortcutting on Create** | `CREATE /tickets/tkt_skip` | `status = "completed"`, `partsTotalCents = 99900` on initial create | Rejected by `incoming().status in ['intake', 'diagnosing', 'awaiting_parts', 'in_repair'] && incoming().partsTotalCents == 0` |
| 7 | **Orphaned Ticket Creation** | `CREATE /tickets/tkt_orphan` | `customerId = "non_existent_customer"` | Rejected by `exists(.../customers/$(incoming().customerId))` & owner match |
| 8 | **Desynchronized Stock Ledger** | `CREATE /stockMovements/mov_1` | Logs `quantityDelta = -2` without updating `inventoryParts` in batch | Rejected by `getAfter(part).data.quantity == get(part).data.quantity + incoming().quantityDelta` |
| 9 | **PII Cross-Tenant Read** | `GET /customers/victim_cust` | Authenticated user `"attacker"` reads another shop's customer PII | Rejected by `existing().ownerId == request.auth.uid` |
| 10 | **Unbounded String / DoW Attack** | `CREATE /tickets/tkt_1` | `issueDescription` = 50,000-byte string | Rejected by `data.issueDescription.size() <= 1000` |
| 11 | **Path ID Poisoning** | `CREATE /customers/bad$id!@#` | Document ID contains illegal characters or >128 chars | Rejected by `isValidId(customerId)` |
| 12 | **Self-Assigned Admin Escalation** | `CREATE /admins/attacker_uid` | `{ role: "admin", createdAt: request.time }` | Rejected by `/admins/{adminId}` `allow create, update, delete: if false;` |

---

## 3. Phase 5 Red Team Conflict Report

- **Collection `/customers/{customerId}`**:
  - *Identity Spoofing*: Blocked (`incoming().ownerId == request.auth.uid` on create; `incoming().ownerId == existing().ownerId` on update).
  - *PII Blanket Test*: Passed (`get` and `list` require `existing().ownerId == request.auth.uid`, never blanket `isSignedIn()`).
  - *Value Poisoning*: Blocked (`isValidCustomer(incoming())` wraps `allow update`).
- **Collection `/inventoryParts/{partId}`**:
  - *Shadow Update*: Blocked (`hasOnly` in both `isValidInventoryPart` and `affectedKeys()`).
  - *Resource Poisoning*: Blocked (strict `.size()` bounds on every string and range bounds on every `int`).
  - *Query Trust Test*: Passed (`allow list` enforces `existing().ownerId == request.auth.uid` with zero `get()`/`exists()` calls).
- **Collection `/tickets/{ticketId}`**:
  - *State Shortcutting*: Blocked on create (must enter intake/bench states with `partsTotalCents == 0`) and locked on terminal states (`completed`, `cancelled`).
  - *Orphaned Writes*: Blocked via `exists()` + `get()` ownership check on `/customers/$(incoming().customerId)`.
- **Collection `/stockMovements/{movementId}`**:
  - *Atomicity / Sync Vulnerability*: Blocked via `getAfter()` timestamp and exact delta verification against `/inventoryParts/$(incoming().partId)` and `/tickets/$(incoming().ticketId)`.
  - *Ledger Tampering*: Blocked (`allow update: if false;`).
- **Collection `/admins/{adminId}`**:
  - *Privilege Escalation*: Blocked (`allow create, update, delete: if false;`).
