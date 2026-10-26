import { useEffect, useMemo, useState } from 'react';
import { Download, Edit3, Plus, Search, Trash2, X } from 'lucide-react';
import { createCustomer, deleteCustomer, updateCustomer } from '../services/shopService';
import {
  type Customer,
  formatCurrency,
  formatTimestamp,
  type MovementType,
  type RepairTicket,
  type StockMovement,
  TICKET_STATUS_LABELS,
} from '../types';

interface CustomersViewProps {
  ownerId: string;
  customers: Customer[];
  tickets: RepairTicket[];
  openNewCustomerSignal: number;
  onInspectTicket: (ticketId: string) => void;
}

export function CustomersView({
  ownerId,
  customers,
  tickets,
  openNewCustomerSignal,
  onInspectTicket,
}: CustomersViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const openCreateModal = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setEmail('');
    setNotes('');
    setFormError(null);
    setShowModal(true);
  };

  useEffect(() => {
    if (openNewCustomerSignal > 0) {
      openCreateModal();
    }
  }, [openNewCustomerSignal]);

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setPhone(c.phone);
    setEmail(c.email);
    setNotes(c.notes);
    setFormError(null);
    setShowModal(true);
  };

  const customerStats = useMemo(() => {
    const map = new Map<string, { count: number; totalCents: number; list: RepairTicket[] }>();
    for (const t of tickets) {
      const entry = map.get(t.customerId) || { count: 0, totalCents: 0, list: [] };
      entry.count += 1;
      if (t.status !== 'cancelled') {
        entry.totalCents += t.laborCents + t.partsTotalCents;
      }
      entry.list.push(t);
      map.set(t.customerId, entry);
    }
    return map;
  }, [tickets]);

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
    );
  }, [customers, searchQuery]);

  const activeCustomer = useMemo(
    () =>
      customers.find((c) => c.id === selectedCustomerId) ||
      filteredCustomers[0] ||
      null,
    [customers, selectedCustomerId, filteredCustomers]
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, { name, phone, email, notes });
      } else {
        const id = await createCustomer(ownerId, { name, phone, email, notes });
        setSelectedCustomerId(id);
      }
      setShowModal(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to save customer.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCustomer(id);
      setConfirmDeleteId(null);
      if (selectedCustomerId === id) setSelectedCustomerId(null);
    } catch {
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customer name, phone, or email..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
          />
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      {filteredCustomers.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-sm font-medium text-slate-900 mb-1">No customer records found</p>
          <p className="text-xs text-slate-500 mb-4">
            Add a walk-in customer or create one directly during ticket intake.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add First Customer
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Customer Directory Table */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                    <th className="py-2.5 px-4">Customer</th>
                    <th className="py-2.5 px-4">Phone &amp; Email</th>
                    <th className="py-2.5 px-4 text-right">Repairs</th>
                    <th className="py-2.5 px-4 text-right">Lifetime Value</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredCustomers.map((c) => {
                    const stats = customerStats.get(c.id) || { count: 0, totalCents: 0, list: [] };
                    const isSelected = activeCustomer?.id === c.id;
                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedCustomerId(c.id)}
                        className={`transition-colors cursor-pointer ${
                          isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-2.5 px-4 font-medium text-slate-900">{c.name}</td>
                        <td className="py-2.5 px-4 text-xs">
                          <div className="font-mono text-slate-800">{c.phone}</div>
                          {c.email && <div className="text-slate-500">{c.email}</div>}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-xs text-slate-700 tabular-nums">
                          {stats.count}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-xs font-medium text-slate-900 tabular-nums">
                          {formatCurrency(stats.totalCents)}
                        </td>
                        <td
                          className="py-2.5 px-4 text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditModal(c)}
                              aria-label={`Edit ${c.name}`}
                              className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            {confirmDeleteId === c.id ? (
                              <button
                                type="button"
                                onClick={() => handleDelete(c.id)}
                                className="px-2 py-1 text-[11px] font-semibold text-white bg-red-600 rounded hover:bg-red-700 cursor-pointer"
                              >
                                Confirm
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(c.id)}
                                aria-label={`Delete ${c.name}`}
                                className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Selected Customer Service History */}
          {activeCustomer && (
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="border-b border-slate-200 pb-4">
                <h3 className="font-display text-base font-bold text-slate-900">
                  {activeCustomer.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-mono">
                  {activeCustomer.phone}
                  {activeCustomer.email ? ` · ${activeCustomer.email}` : ''}
                </p>
                {activeCustomer.notes && (
                  <p className="text-xs text-slate-600 mt-2">{activeCustomer.notes}</p>
                )}
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-900 mb-3">
                  Device Repair History
                </h4>
                {(customerStats.get(activeCustomer.id)?.list || []).length === 0 ? (
                  <p className="text-xs text-slate-500">
                    No repair tickets logged for this customer yet.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                    {(customerStats.get(activeCustomer.id)?.list || []).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => onInspectTicket(t.id)}
                        className="w-full text-left p-3 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 cursor-pointer"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-slate-900 truncate">
                            <span className="font-mono font-semibold mr-2">{t.ticketNumber}</span>
                            {t.deviceBrand} {t.deviceModel}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {TICKET_STATUS_LABELS[t.status]} · {formatTimestamp(t.createdAt)}
                          </div>
                        </div>
                        <span className="font-mono text-xs font-semibold text-slate-900 whitespace-nowrap tabular-nums">
                          {formatCurrency(t.laborCents + t.partsTotalCents)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-slate-900">
                {editingCustomer ? 'Edit Customer Profile' : 'Add Customer Profile'}
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {formError && (
                <div
                  role="alert"
                  className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800"
                >
                  {formError}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  minLength={3}
                  maxLength={30}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  maxLength={120}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Service Notes
                </label>
                <textarea
                  rows={2}
                  maxLength={500}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

interface StockLedgerViewProps {
  movements: StockMovement[];
  onInspectTicket: (ticketId: string) => void;
}

export function StockLedgerView({ movements, onInspectTicket }: StockLedgerViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | MovementType>('all');

  const filteredMovements = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return movements.filter((m) => {
      if (typeFilter !== 'all' && m.type !== typeFilter) return false;
      if (!q) return true;
      return (
        m.partSku.toLowerCase().includes(q) ||
        m.partName.toLowerCase().includes(q) ||
        m.ticketNumber.toLowerCase().includes(q) ||
        m.note.toLowerCase().includes(q)
      );
    });
  }, [movements, searchQuery, typeFilter]);

  const handleExportLedgerCsv = () => {
    const headers = [
      'Timestamp',
      'Movement Type',
      'SKU',
      'Part Name',
      'Ticket Number',
      'Quantity Delta',
      'Unit Cost ($)',
      'Unit Retail ($)',
      'Note',
    ];
    const rows = filteredMovements.map((m) => [
      `"${formatTimestamp(m.createdAt)}"`,
      m.type,
      m.partSku,
      `"${m.partName.replace(/"/g, '""')}"`,
      m.ticketNumber,
      m.quantityDelta,
      (m.unitCostCents / 100).toFixed(2),
      (m.unitPriceCents / 100).toFixed(2),
      `"${m.note.replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `benchflow-stock-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search SKU, component, ticket #, or PO note..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(
              [
                { id: 'all', label: 'All Movements' },
                { id: 'repair_use', label: 'Ticket Allocations' },
                { id: 'restock', label: 'Supplier Restocks' },
                { id: 'adjustment', label: 'Audit Adjustments' },
              ] as Array<{ id: 'all' | MovementType; label: string }>
            ).map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setTypeFilter(btn.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  typeFilter === btn.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportLedgerCsv}
            disabled={filteredMovements.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Download CSV
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filteredMovements.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">
            No stock movement entries match the selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Classification</th>
                  <th className="py-2.5 px-4">SKU &amp; Component</th>
                  <th className="py-2.5 px-4">Ticket / Reference</th>
                  <th className="py-2.5 px-4 text-right">Unit Cost</th>
                  <th className="py-2.5 px-4 text-right">Unit Retail</th>
                  <th className="py-2.5 px-4 text-right">Qty Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredMovements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-4 font-mono text-slate-500 whitespace-nowrap tabular-nums">
                      {formatTimestamp(m.createdAt)}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span
                        className={
                          m.type === 'restock'
                            ? 'text-emerald-700 font-semibold'
                            : m.type === 'repair_use'
                            ? 'text-blue-700 font-semibold'
                            : 'text-slate-700 font-medium'
                        }
                      >
                        {m.type === 'restock'
                          ? 'Supplier Restock'
                          : m.type === 'repair_use'
                          ? 'Ticket Allocation'
                          : 'Audit Adjustment'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-medium text-slate-900">{m.partName}</div>
                      <div className="font-mono text-[11px] text-slate-500">{m.partSku}</div>
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {m.ticketId ? (
                        <button
                          type="button"
                          onClick={() => onInspectTicket(m.ticketId)}
                          className="font-mono font-semibold text-blue-600 hover:underline mr-2 cursor-pointer"
                        >
                          {m.ticketNumber}
                        </button>
                      ) : null}
                      <span>{m.note || '—'}</span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-600 whitespace-nowrap tabular-nums">
                      {formatCurrency(m.unitCostCents)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-900 whitespace-nowrap tabular-nums">
                      {formatCurrency(m.unitPriceCents)}
                    </td>
                    <td
                      className={`py-2.5 px-4 text-right font-mono font-semibold whitespace-nowrap tabular-nums ${
                        m.quantityDelta > 0 ? 'text-emerald-700' : 'text-slate-900'
                      }`}
                    >
                      {m.quantityDelta > 0 ? `+${m.quantityDelta}` : m.quantityDelta}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
