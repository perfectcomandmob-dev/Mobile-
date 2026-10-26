import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Download,
  FileText,
  Lock,
  PackagePlus,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  allocatePartToTicket,
  createCustomer,
  createRepairTicket,
  deleteTicketRecord,
  reopenTerminalTicketAsAdmin,
  updateRepairTicketDetails,
  updateTicketBenchState,
} from '../services/shopService';
import {
  type Customer,
  formatCurrency,
  formatTimestamp,
  type InventoryPart,
  ISSUE_CATEGORY_LABELS,
  type IssueCategory,
  type RepairTicket,
  type StockMovement,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  type TicketPriority,
  type TicketStatus,
} from '../types';

interface TicketsViewProps {
  ownerId: string;
  isAdminUser: boolean;
  tickets: RepairTicket[];
  customers: Customer[];
  parts: InventoryPart[];
  movements: StockMovement[];
  selectedTicketId: string | null;
  onSelectTicket: (ticketId: string | null) => void;
  openNewModalSignal: number;
}

type FilterBucket = 'all' | 'active' | 'awaiting_parts' | 'ready_pickup' | 'completed' | 'cancelled';

function statusTextClass(status: TicketStatus): string {
  switch (status) {
    case 'ready_pickup':
    case 'completed':
      return 'text-emerald-700 font-semibold';
    case 'awaiting_parts':
      return 'text-amber-700 font-semibold';
    case 'cancelled':
      return 'text-red-700 font-medium';
    case 'in_repair':
    case 'testing':
      return 'text-blue-700 font-medium';
    default:
      return 'text-slate-700 font-medium';
  }
}

export function TicketsView({
  ownerId,
  isAdminUser,
  tickets,
  customers,
  parts,
  movements,
  selectedTicketId,
  onSelectTicket,
  openNewModalSignal,
}: TicketsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterBucket>('all');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingTicket, setEditingTicket] = useState<RepairTicket | null>(null);

  // Form Modal State
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');

  const [ticketNumber, setTicketNumber] = useState('');
  const [deviceBrand, setDeviceBrand] = useState('Apple');
  const [deviceModel, setDeviceModel] = useState('');
  const [imeiOrSerial, setImeiOrSerial] = useState('');
  const [passcodeOrPattern, setPasscodeOrPattern] = useState('');
  const [issueCategory, setIssueCategory] = useState<IssueCategory>('screen');
  const [issueDescription, setIssueDescription] = useState('');
  const [technicianNotes, setTechnicianNotes] = useState('');
  const [assignedTech, setAssignedTech] = useState('Marcus Chen');
  const [priority, setPriority] = useState<TicketPriority>('standard');
  const [initialStatus, setInitialStatus] = useState<
    'intake' | 'diagnosing' | 'awaiting_parts' | 'in_repair'
  >('intake');
  const [laborDollars, setLaborDollars] = useState('65.00');
  const [warrantyDays, setWarrantyDays] = useState('90');
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Inspector Drawer State
  const selectedTicket = useMemo(
    () => tickets.find((t) => t.id === selectedTicketId) || null,
    [tickets, selectedTicketId]
  );

  const [benchStatus, setBenchStatus] = useState<TicketStatus>('intake');
  const [benchNotes, setBenchNotes] = useState('');
  const [benchTech, setBenchTech] = useState('');
  const [benchPriority, setBenchPriority] = useState<TicketPriority>('standard');
  const [confirmTerminalStatus, setConfirmTerminalStatus] = useState(false);
  const [benchSaving, setBenchSaving] = useState(false);
  const [benchFeedback, setBenchFeedback] = useState<string | null>(null);
  const [benchError, setBenchError] = useState<string | null>(null);

  // Part Allocation State
  const [allocPartId, setAllocPartId] = useState('');
  const [allocQty, setAllocQty] = useState('1');
  const [allocNote, setAllocNote] = useState('');
  const [allocSaving, setAllocSaving] = useState(false);
  const [invoiceMode, setInvoiceMode] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const nextTicketCode = useMemo(() => {
    let maxNum = 1000;
    for (const t of tickets) {
      const match = t.ticketNumber.match(/(\d+)/);
      if (match) {
        const parsed = parseInt(match[1], 10);
        if (parsed > maxNum) maxNum = parsed;
      }
    }
    return `TKT-${maxNum + 1}`;
  }, [tickets]);

  const openCreateModal = () => {
    setEditingTicket(null);
    setTicketNumber(nextTicketCode);
    setCustomerMode(customers.length > 0 ? 'existing' : 'new');
    setSelectedCustomerId(customers[0]?.id || '');
    setNewCustomerName('');
    setNewCustomerPhone('');
    setNewCustomerEmail('');
    setDeviceBrand('Apple');
    setDeviceModel('');
    setImeiOrSerial('');
    setPasscodeOrPattern('');
    setIssueCategory('screen');
    setIssueDescription('');
    setTechnicianNotes('');
    setAssignedTech('Marcus Chen');
    setPriority('standard');
    setInitialStatus('intake');
    setLaborDollars('65.00');
    setWarrantyDays('90');
    setFormError(null);
    setShowFormModal(true);
  };

  useEffect(() => {
    if (openNewModalSignal > 0) {
      openCreateModal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openNewModalSignal]);

  useEffect(() => {
    if (selectedTicket) {
      setBenchStatus(selectedTicket.status);
      setBenchNotes(selectedTicket.technicianNotes);
      setBenchTech(selectedTicket.assignedTech);
      setBenchPriority(selectedTicket.priority);
      setConfirmTerminalStatus(false);
      setBenchFeedback(null);
      setBenchError(null);
      setInvoiceMode(false);
      setConfirmDeleteId(null);
    }
  }, [selectedTicket]);

  const openEditModal = (ticket: RepairTicket) => {
    setEditingTicket(ticket);
    setTicketNumber(ticket.ticketNumber);
    setCustomerMode('existing');
    setSelectedCustomerId(ticket.customerId);
    setDeviceBrand(ticket.deviceBrand);
    setDeviceModel(ticket.deviceModel);
    setImeiOrSerial(ticket.imeiOrSerial);
    setPasscodeOrPattern(ticket.passcodeOrPattern);
    setIssueCategory(ticket.issueCategory);
    setIssueDescription(ticket.issueDescription);
    setTechnicianNotes(ticket.technicianNotes);
    setAssignedTech(ticket.assignedTech);
    setPriority(ticket.priority);
    setLaborDollars((ticket.laborCents / 100).toFixed(2));
    setWarrantyDays(String(ticket.warrantyDays));
    setFormError(null);
    setShowFormModal(true);
  };

  const customerMap = useMemo(() => {
    const map = new Map<string, Customer>();
    for (const c of customers) map.set(c.id, c);
    return map;
  }, [customers]);

  const filteredTickets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tickets.filter((t) => {
      if (statusFilter === 'active') {
        if (t.status === 'completed' || t.status === 'cancelled' || t.status === 'ready_pickup') {
          return false;
        }
      } else if (statusFilter !== 'all' && t.status !== statusFilter) {
        return false;
      }

      if (!q) return true;
      return (
        t.ticketNumber.toLowerCase().includes(q) ||
        t.customerName.toLowerCase().includes(q) ||
        t.deviceBrand.toLowerCase().includes(q) ||
        t.deviceModel.toLowerCase().includes(q) ||
        t.imeiOrSerial.toLowerCase().includes(q) ||
        t.assignedTech.toLowerCase().includes(q)
      );
    });
  }, [tickets, searchQuery, statusFilter]);

  const availableParts = useMemo(
    () => parts.filter((p) => p.quantity > 0),
    [parts]
  );

  useEffect(() => {
    if (!allocPartId && availableParts.length > 0) {
      setAllocPartId(availableParts[0].id);
    }
  }, [availableParts, allocPartId]);

  const ticketMovements = useMemo(() => {
    if (!selectedTicket) return [];
    return movements.filter((m) => m.ticketId === selectedTicket.id);
  }, [movements, selectedTicket]);

  const handleSubmitTicketForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSaving(true);
    setFormError(null);

    try {
      const laborCents = Math.max(0, Math.round((parseFloat(laborDollars) || 0) * 100));
      const warranty = Math.max(0, parseInt(warrantyDays, 10) || 0);

      if (editingTicket) {
        await updateRepairTicketDetails(editingTicket.id, {
          customerName: editingTicket.customerName,
          deviceBrand,
          deviceModel,
          imeiOrSerial,
          passcodeOrPattern,
          issueCategory,
          issueDescription,
          technicianNotes,
          assignedTech,
          priority,
          laborCents,
          warrantyDays: warranty,
          status: editingTicket.status,
        });
        setShowFormModal(false);
      } else {
        let custId = selectedCustomerId;
        let custName = customerMap.get(selectedCustomerId)?.name || '';

        if (customerMode === 'new') {
          custId = await createCustomer(ownerId, {
            name: newCustomerName,
            phone: newCustomerPhone,
            email: newCustomerEmail,
            notes: '',
          });
          custName = newCustomerName.trim();
        }

        const createdId = await createRepairTicket(ownerId, {
          ticketNumber,
          customerId: custId,
          customerName: custName,
          deviceBrand,
          deviceModel,
          imeiOrSerial,
          passcodeOrPattern,
          issueCategory,
          issueDescription,
          technicianNotes,
          assignedTech,
          priority,
          status: initialStatus,
          laborCents,
          warrantyDays: warranty,
        });

        setShowFormModal(false);
        onSelectTicket(createdId);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to save repair ticket.');
    } finally {
      setFormSaving(false);
    }
  };

  const handleSaveBenchUpdate = async () => {
    if (!selectedTicket) return;
    const isMovingToTerminal =
      (benchStatus === 'completed' || benchStatus === 'cancelled') &&
      selectedTicket.status !== benchStatus;

    if (isMovingToTerminal && !confirmTerminalStatus) {
      setConfirmTerminalStatus(true);
      return;
    }

    setBenchSaving(true);
    setBenchError(null);
    setBenchFeedback(null);
    try {
      await updateTicketBenchState(selectedTicket.id, {
        status: benchStatus,
        technicianNotes: benchNotes,
        assignedTech: benchTech,
        priority: benchPriority,
      });
      setConfirmTerminalStatus(false);
      setBenchFeedback('Bench status and notes saved.');
    } catch (err) {
      setBenchError(err instanceof Error ? err.message : 'Failed to update ticket.');
    } finally {
      setBenchSaving(false);
    }
  };

  const handleAllocatePart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    const part = parts.find((p) => p.id === allocPartId);
    if (!part) {
      setBenchError('Please select an in-stock spare part.');
      return;
    }

    setAllocSaving(true);
    setBenchError(null);
    setBenchFeedback(null);
    try {
      await allocatePartToTicket(
        ownerId,
        selectedTicket,
        part,
        parseInt(allocQty, 10) || 1,
        allocNote
      );
      setAllocQty('1');
      setAllocNote('');
      setBenchFeedback(`Allocated ${part.sku} and updated ticket parts total.`);
    } catch (err) {
      setBenchError(err instanceof Error ? err.message : 'Failed to allocate spare part.');
    } finally {
      setAllocSaving(false);
    }
  };

  const handleAdminReopen = async () => {
    if (!selectedTicket) return;
    setBenchSaving(true);
    setBenchError(null);
    try {
      await reopenTerminalTicketAsAdmin(selectedTicket.id);
      setBenchFeedback('Ticket reopened to In Repair.');
    } catch (err) {
      setBenchError(err instanceof Error ? err.message : 'Unable to reopen ticket.');
    } finally {
      setBenchSaving(false);
    }
  };

  const handleDeleteCancelled = async (ticketId: string) => {
    setBenchSaving(true);
    setBenchError(null);
    try {
      await deleteTicketRecord(ticketId);
      onSelectTicket(null);
    } catch (err) {
      setBenchError(err instanceof Error ? err.message : 'Unable to delete ticket.');
    } finally {
      setBenchSaving(false);
    }
  };

  const handleExportTicketsCsv = () => {
    const headers = [
      'Ticket Number',
      'Customer',
      'Device',
      'IMEI/Serial',
      'Issue Category',
      'Technician',
      'Priority',
      'Status',
      'Labor ($)',
      'Parts ($)',
      'Total ($)',
    ];
    const rows = filteredTickets.map((t) => [
      t.ticketNumber,
      `"${t.customerName.replace(/"/g, '""')}"`,
      `"${`${t.deviceBrand} ${t.deviceModel}`.replace(/"/g, '""')}"`,
      `"${t.imeiOrSerial}"`,
      t.issueCategory,
      `"${t.assignedTech}"`,
      t.priority,
      t.status,
      (t.laborCents / 100).toFixed(2),
      (t.partsTotalCents / 100).toFixed(2),
      ((t.laborCents + t.partsTotalCents) / 100).toFixed(2),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `benchflow-tickets-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const isTerminal =
    selectedTicket?.status === 'completed' || selectedTicket?.status === 'cancelled';
  const selectedCustomer = selectedTicket
    ? customerMap.get(selectedTicket.customerId)
    : undefined;

  return (
    <div className="space-y-6">
      {/* Toolbar: Search + Segmented Status Filter + Export */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ticket #, customer, model, IMEI, tech..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'active', label: 'Active Bench' },
                { id: 'awaiting_parts', label: 'Awaiting Parts' },
                { id: 'ready_pickup', label: 'Ready Pickup' },
                { id: 'completed', label: 'Completed' },
                { id: 'cancelled', label: 'Cancelled' },
              ] as Array<{ id: FilterBucket; label: string }>
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportTicketsCsv}
            disabled={filteredTickets.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Download CSV
          </button>
        </div>
      </div>

      {/* High-Density Tickets Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filteredTickets.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-slate-900 mb-1">
              No repair tickets match the current filter
            </p>
            <p className="text-xs text-slate-500 mb-4">
              Adjust your search terms or check in a new customer device.
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              New Repair Ticket
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                  <th className="py-2.5 px-4">Ticket</th>
                  <th className="py-2.5 px-4">Device &amp; Serial</th>
                  <th className="py-2.5 px-4">Customer</th>
                  <th className="py-2.5 px-4">Fault &amp; Tech</th>
                  <th className="py-2.5 px-4">Stage &amp; SLA</th>
                  <th className="py-2.5 px-4 text-right">Parts</th>
                  <th className="py-2.5 px-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredTickets.map((t) => {
                  const isSelected = t.id === selectedTicketId;
                  return (
                    <tr
                      key={t.id}
                      onClick={() => onSelectTicket(t.id)}
                      className={`transition-colors cursor-pointer ${
                        isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2.5 px-4 font-mono text-xs font-semibold text-slate-900 whitespace-nowrap tabular-nums">
                        {t.ticketNumber}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="font-medium text-slate-900">
                          {t.deviceBrand} {t.deviceModel}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500 tabular-nums">
                          {t.imeiOrSerial || 'No IMEI logged'}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-xs text-slate-700 whitespace-nowrap">
                        <div>{t.customerName}</div>
                        <div className="text-slate-400 font-mono text-[11px]">
                          {customerMap.get(t.customerId)?.phone || ''}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-xs text-slate-600">
                        <div className="text-slate-800">{ISSUE_CATEGORY_LABELS[t.issueCategory]}</div>
                        <div className="text-slate-500">Tech: {t.assignedTech}</div>
                      </td>
                      <td className="py-2.5 px-4 text-xs whitespace-nowrap">
                        <span className={statusTextClass(t.status)}>
                          {TICKET_STATUS_LABELS[t.status]}
                        </span>
                        <span className="text-slate-400 mx-1.5" aria-hidden="true">
                          ·
                        </span>
                        <span
                          className={
                            t.priority === 'express'
                              ? 'text-red-700 font-medium'
                              : t.priority === 'urgent'
                              ? 'text-amber-700 font-medium'
                              : 'text-slate-500'
                          }
                        >
                          {TICKET_PRIORITY_LABELS[t.priority]}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs text-slate-600 whitespace-nowrap tabular-nums">
                        {formatCurrency(t.partsTotalCents)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs font-semibold text-slate-900 whitespace-nowrap tabular-nums">
                        {formatCurrency(t.laborCents + t.partsTotalCents)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ticket Detail & Inventory Allocation Drawer */}
      {selectedTicket && (
        <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/30 backdrop-blur-[1px]">
          <div className="w-full max-w-2xl bg-white h-full border-l border-slate-200 flex flex-col overflow-hidden">
            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 no-print">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-mono font-semibold text-slate-900">
                    {selectedTicket.ticketNumber}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className={statusTextClass(selectedTicket.status)}>
                    {TICKET_STATUS_LABELS[selectedTicket.status]}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Updated {formatTimestamp(selectedTicket.updatedAt)}</span>
                </div>
                <h2 className="font-display text-lg font-bold text-slate-900 truncate mt-0.5">
                  {selectedTicket.deviceBrand} {selectedTicket.deviceModel} —{' '}
                  {selectedTicket.customerName}
                </h2>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setInvoiceMode((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  {invoiceMode ? 'Bench View' : 'Service Sheet'}
                </button>
                {!isTerminal && (
                  <button
                    type="button"
                    onClick={() => openEditModal(selectedTicket)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Edit Intake
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onSelectTicket(null)}
                  aria-label="Close ticket inspector"
                  className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Invoice / Service Order Mode */}
            {invoiceMode ? (
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="flex items-center justify-between no-print">
                  <p className="text-xs text-slate-500">
                    Customer-ready intake &amp; repair invoice summary
                  </p>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print Service Order
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl p-6 space-y-6 bg-white">
                  <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                    <div>
                      <h3 className="font-display text-xl font-bold text-slate-900">
                        BenchFlow Repair Service Order
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Mobile Hardware Diagnostics &amp; Component Replacement
                      </p>
                    </div>
                    <div className="text-right font-mono text-xs tabular-nums">
                      <p className="font-semibold text-slate-900">{selectedTicket.ticketNumber}</p>
                      <p className="text-slate-500">{formatTimestamp(selectedTicket.createdAt)}</p>
                      <p className="text-slate-700 mt-0.5">
                        {TICKET_STATUS_LABELS[selectedTicket.status]}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 text-xs">
                    <div>
                      <p className="font-semibold text-slate-900 mb-1">Customer</p>
                      <p className="text-slate-700">{selectedTicket.customerName}</p>
                      {selectedCustomer?.phone && (
                        <p className="text-slate-600 font-mono">{selectedCustomer.phone}</p>
                      )}
                      {selectedCustomer?.email && (
                        <p className="text-slate-600">{selectedCustomer.email}</p>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 mb-1">Device &amp; Coverage</p>
                      <p className="text-slate-700">
                        {selectedTicket.deviceBrand} {selectedTicket.deviceModel}
                      </p>
                      <p className="text-slate-600 font-mono">
                        IMEI/SN: {selectedTicket.imeiOrSerial || 'Not provided'}
                      </p>
                      <p className="text-slate-600">
                        Warranty: {selectedTicket.warrantyDays} days parts &amp; labor
                      </p>
                    </div>
                  </div>

                  <div className="text-xs space-y-2 border-t border-slate-200 pt-4">
                    <p className="font-semibold text-slate-900">
                      Reported Fault ({ISSUE_CATEGORY_LABELS[selectedTicket.issueCategory]})
                    </p>
                    <p className="text-slate-600 leading-relaxed">
                      {selectedTicket.issueDescription}
                    </p>
                    {selectedTicket.technicianNotes && (
                      <>
                        <p className="font-semibold text-slate-900 pt-2">
                          Bench Findings ({selectedTicket.assignedTech})
                        </p>
                        <p className="text-slate-600 leading-relaxed">
                          {selectedTicket.technicianNotes}
                        </p>
                      </>
                    )}
                  </div>

                  <div className="border-t border-slate-200 pt-4">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="py-2">Line Item</th>
                          <th className="py-2 text-right">Qty</th>
                          <th className="py-2 text-right">Unit</th>
                          <th className="py-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {ticketMovements.map((m) => {
                          const qty = Math.abs(m.quantityDelta);
                          return (
                            <tr key={m.id}>
                              <td className="py-2 text-slate-800">
                                {m.partName}{' '}
                                <span className="font-mono text-slate-400">({m.partSku})</span>
                              </td>
                              <td className="py-2 text-right font-mono tabular-nums">{qty}</td>
                              <td className="py-2 text-right font-mono tabular-nums">
                                {formatCurrency(m.unitPriceCents)}
                              </td>
                              <td className="py-2 text-right font-mono tabular-nums">
                                {formatCurrency(qty * m.unitPriceCents)}
                              </td>
                            </tr>
                          );
                        })}
                        <tr>
                          <td className="py-2 text-slate-800">
                            Bench Diagnostics &amp; Repair Labor
                          </td>
                          <td className="py-2 text-right font-mono tabular-nums">1</td>
                          <td className="py-2 text-right font-mono tabular-nums">
                            {formatCurrency(selectedTicket.laborCents)}
                          </td>
                          <td className="py-2 text-right font-mono tabular-nums">
                            {formatCurrency(selectedTicket.laborCents)}
                          </td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-slate-300 font-semibold text-slate-900 text-sm">
                          <td colSpan={3} className="pt-3 text-right pr-4">
                            Total Balance
                          </td>
                          <td className="pt-3 text-right font-mono tabular-nums">
                            {formatCurrency(
                              selectedTicket.laborCents + selectedTicket.partsTotalCents
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              /* Interactive Bench Inspector Mode */
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {benchFeedback && (
                  <div className="px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{benchFeedback}</span>
                  </div>
                )}
                {benchError && (
                  <div
                    role="alert"
                    className="px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800"
                  >
                    {benchError}
                  </div>
                )}

                {/* Terminal Lock Banner */}
                {isTerminal && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <Lock className="w-4 h-4 text-slate-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-slate-900">
                          Finalized Ticket ({TICKET_STATUS_LABELS[selectedTicket.status]})
                        </p>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Completed and cancelled repair orders are locked to preserve invoice and
                          stock ledger integrity.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isAdminUser && (
                        <button
                          type="button"
                          onClick={handleAdminReopen}
                          disabled={benchSaving}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Reopen
                        </button>
                      )}
                      {(selectedTicket.status === 'cancelled' || isAdminUser) && (
                        confirmDeleteId === selectedTicket.id ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteCancelled(selectedTicket.id)}
                            disabled={benchSaving}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 cursor-pointer"
                          >
                            Confirm Delete
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(selectedTicket.id)}
                            className="p-1.5 text-slate-500 hover:text-red-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                            title="Delete cancelled ticket"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Intake Summary Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pb-5 border-b border-slate-200 text-xs">
                  <div>
                    <p className="text-slate-500">Customer Contact</p>
                    <p className="font-medium text-slate-900 mt-0.5">
                      {selectedTicket.customerName}
                    </p>
                    <p className="font-mono text-slate-600">
                      {selectedCustomer?.phone || 'No phone on file'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">IMEI / Serial &amp; Lock</p>
                    <p className="font-mono font-medium text-slate-900 mt-0.5 tabular-nums">
                      {selectedTicket.imeiOrSerial || '—'}
                    </p>
                    <p className="text-slate-600">
                      Unlock: {selectedTicket.passcodeOrPattern || 'None'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Quote Breakdown</p>
                    <p className="font-mono font-semibold text-slate-900 mt-0.5 tabular-nums">
                      {formatCurrency(selectedTicket.laborCents + selectedTicket.partsTotalCents)}
                    </p>
                    <p className="font-mono text-slate-500 tabular-nums">
                      Labor {formatCurrency(selectedTicket.laborCents)} · Parts{' '}
                      {formatCurrency(selectedTicket.partsTotalCents)}
                    </p>
                  </div>
                </div>

                {/* Reported Fault */}
                <div className="text-xs">
                  <p className="font-semibold text-slate-900 mb-1">
                    Intake Condition &amp; Fault ({ISSUE_CATEGORY_LABELS[selectedTicket.issueCategory]})
                  </p>
                  <p className="text-slate-600 leading-relaxed">{selectedTicket.issueDescription}</p>
                </div>

                {/* Bench Status & Diagnostics Update */}
                <div className="border-t border-slate-200 pt-5 space-y-4">
                  <h3 className="font-display text-sm font-semibold text-slate-900">
                    Bench Workflow &amp; Diagnostics
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Workflow Stage
                      </label>
                      <select
                        value={benchStatus}
                        disabled={isTerminal}
                        onChange={(e) => {
                          setBenchStatus(e.target.value as TicketStatus);
                          setConfirmTerminalStatus(false);
                        }}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg disabled:bg-slate-50"
                      >
                        {(Object.keys(TICKET_STATUS_LABELS) as TicketStatus[]).map((st) => (
                          <option key={st} value={st}>
                            {TICKET_STATUS_LABELS[st]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Priority SLA
                      </label>
                      <select
                        value={benchPriority}
                        disabled={isTerminal}
                        onChange={(e) => setBenchPriority(e.target.value as TicketPriority)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg disabled:bg-slate-50"
                      >
                        {(Object.keys(TICKET_PRIORITY_LABELS) as TicketPriority[]).map((pr) => (
                          <option key={pr} value={pr}>
                            {TICKET_PRIORITY_LABELS[pr]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Assigned Tech
                      </label>
                      <input
                        type="text"
                        value={benchTech}
                        disabled={isTerminal}
                        maxLength={60}
                        onChange={(e) => setBenchTech(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg disabled:bg-slate-50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Technician Bench &amp; QC Notes
                    </label>
                    <textarea
                      rows={3}
                      value={benchNotes}
                      disabled={isTerminal}
                      maxLength={1000}
                      onChange={(e) => setBenchNotes(e.target.value)}
                      placeholder="Log diode readings, TrueTone transfer, waterproof seal check..."
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg disabled:bg-slate-50"
                    />
                  </div>

                  {!isTerminal && (
                    <div className="flex items-center justify-end gap-3">
                      {confirmTerminalStatus && (
                        <span className="text-xs text-amber-700 font-medium">
                          Marking {TICKET_STATUS_LABELS[benchStatus]} locks further edits. Click
                          again to confirm.
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={handleSaveBenchUpdate}
                        disabled={benchSaving}
                        className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60 transition-colors cursor-pointer"
                      >
                        {benchSaving
                          ? 'Saving...'
                          : confirmTerminalStatus
                          ? `Confirm ${TICKET_STATUS_LABELS[benchStatus]}`
                          : 'Save Bench Update'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Spare Parts Allocation Section */}
                <div className="border-t border-slate-200 pt-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-sm font-semibold text-slate-900">
                      Installed Parts from Inventory
                    </h3>
                    <span className="font-mono text-xs text-slate-500 tabular-nums">
                      Parts Total: {formatCurrency(selectedTicket.partsTotalCents)}
                    </span>
                  </div>

                  {ticketMovements.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      No inventory components allocated to this repair yet.
                    </p>
                  ) : (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                            <th className="py-2 px-3">Component</th>
                            <th className="py-2 px-3 text-right">Qty</th>
                            <th className="py-2 px-3 text-right">Retail</th>
                            <th className="py-2 px-3 text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {ticketMovements.map((m) => {
                            const qty = Math.abs(m.quantityDelta);
                            return (
                              <tr key={m.id}>
                                <td className="py-2 px-3">
                                  <div className="font-medium text-slate-900">{m.partName}</div>
                                  <div className="font-mono text-[11px] text-slate-500">
                                    {m.partSku}
                                  </div>
                                </td>
                                <td className="py-2 px-3 text-right font-mono tabular-nums">
                                  {qty}
                                </td>
                                <td className="py-2 px-3 text-right font-mono tabular-nums">
                                  {formatCurrency(m.unitPriceCents)}
                                </td>
                                <td className="py-2 px-3 text-right font-mono font-medium text-slate-900 tabular-nums">
                                  {formatCurrency(qty * m.unitPriceCents)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {!isTerminal && (
                    <form
                      onSubmit={handleAllocatePart}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3"
                    >
                      <p className="text-xs font-semibold text-slate-900">
                        Allocate Component from Bin Stock
                      </p>
                      {availableParts.length === 0 ? (
                        <p className="text-xs text-amber-700">
                          No spare parts currently have positive stock. Add or restock parts in the
                          Inventory tab first.
                        </p>
                      ) : (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <div className="sm:col-span-3">
                              <label className="block text-[11px] text-slate-600 mb-1">
                                In-Stock Spare Part
                              </label>
                              <select
                                value={allocPartId}
                                onChange={(e) => setAllocPartId(e.target.value)}
                                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                              >
                                {availableParts.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    [{p.binLocation}] {p.name} ({p.quantity} in stock ·{' '}
                                    {formatCurrency(p.retailPriceCents)})
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[11px] text-slate-600 mb-1">Qty</label>
                              <input
                                type="number"
                                min={1}
                                max={20}
                                value={allocQty}
                                onChange={(e) => setAllocQty(e.target.value)}
                                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg tabular-nums"
                              />
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <input
                              type="text"
                              value={allocNote}
                              maxLength={300}
                              onChange={(e) => setAllocNote(e.target.value)}
                              placeholder="Optional bench note (e.g. serial lot or adhesive used)"
                              className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                            />
                            <button
                              type="submit"
                              disabled={allocSaving}
                              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              <PackagePlus className="w-3.5 h-3.5" />
                              {allocSaving ? 'Allocating...' : 'Allocate & Deduct'}
                            </button>
                          </div>
                        </>
                      )}
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create / Edit Ticket Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-slate-900">
                {editingTicket
                  ? `Edit Repair Ticket ${editingTicket.ticketNumber}`
                  : 'New Mobile Repair Intake'}
              </h2>
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitTicketForm} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
              {formError && (
                <div
                  role="alert"
                  className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800"
                >
                  {formError}
                </div>
              )}

              {/* Customer Section (Only on Create) */}
              {!editingTicket && (
                <div className="space-y-3 pb-4 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900">Customer Record</span>
                    {customers.length > 0 && (
                      <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-md">
                        <button
                          type="button"
                          onClick={() => setCustomerMode('existing')}
                          className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                            customerMode === 'existing'
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600'
                          }`}
                        >
                          Existing Customer
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomerMode('new')}
                          className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                            customerMode === 'new'
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600'
                          }`}
                        >
                          New Walk-In
                        </button>
                      </div>
                    )}
                  </div>

                  {customerMode === 'existing' && customers.length > 0 ? (
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                    >
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} — {c.phone}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-slate-600 mb-1">Full Name *</label>
                        <input
                          type="text"
                          required
                          maxLength={80}
                          value={newCustomerName}
                          onChange={(e) => setNewCustomerName(e.target.value)}
                          placeholder="Jordan Vance"
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-600 mb-1">Phone Number *</label>
                        <input
                          type="tel"
                          required
                          minLength={3}
                          maxLength={30}
                          value={newCustomerPhone}
                          onChange={(e) => setNewCustomerPhone(e.target.value)}
                          placeholder="(415) 555-0148"
                          className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-600 mb-1">Email (Optional)</label>
                        <input
                          type="email"
                          maxLength={120}
                          value={newCustomerEmail}
                          onChange={(e) => setNewCustomerEmail(e.target.value)}
                          placeholder="jordan@example.com"
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Device & Ticket Identification */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Ticket Code *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingTicket)}
                    maxLength={24}
                    value={ticketNumber}
                    onChange={(e) => setTicketNumber(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg disabled:bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Device Brand *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={40}
                    value={deviceBrand}
                    onChange={(e) => setDeviceBrand(e.target.value)}
                    placeholder="Apple, Samsung, Google..."
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Handset Model *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={80}
                    value={deviceModel}
                    onChange={(e) => setDeviceModel(e.target.value)}
                    placeholder="iPhone 15 Pro Max"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    IMEI / Serial Number
                  </label>
                  <input
                    type="text"
                    maxLength={32}
                    value={imeiOrSerial}
                    onChange={(e) => setImeiOrSerial(e.target.value)}
                    placeholder="35489110..."
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Diagnostic Unlock / Passcode
                  </label>
                  <input
                    type="text"
                    maxLength={32}
                    value={passcodeOrPattern}
                    onChange={(e) => setPasscodeOrPattern(e.target.value)}
                    placeholder="Pin or Maintenance Mode"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Fault Category *
                  </label>
                  <select
                    value={issueCategory}
                    onChange={(e) => setIssueCategory(e.target.value as IssueCategory)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                  >
                    {(Object.keys(ISSUE_CATEGORY_LABELS) as IssueCategory[]).map((cat) => (
                      <option key={cat} value={cat}>
                        {ISSUE_CATEGORY_LABELS[cat]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Reported Symptoms &amp; Intake Condition *
                </label>
                <textarea
                  rows={2}
                  required
                  minLength={2}
                  maxLength={1000}
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  placeholder="Describe fault, frame dents, liquid indicator state, FaceID/TouchID check..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Assigned Tech *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={60}
                    value={assignedTech}
                    onChange={(e) => setAssignedTech(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TicketPriority)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                  >
                    {(Object.keys(TICKET_PRIORITY_LABELS) as TicketPriority[]).map((pr) => (
                      <option key={pr} value={pr}>
                        {TICKET_PRIORITY_LABELS[pr]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Labor Fee ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100000"
                    value={laborDollars}
                    onChange={(e) => setLaborDollars(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Warranty (Days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="730"
                    value={warrantyDays}
                    onChange={(e) => setWarrantyDays(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg tabular-nums"
                  />
                </div>
              </div>

              {!editingTicket && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Initial Bench Stage
                  </label>
                  <select
                    value={initialStatus}
                    onChange={(e) =>
                      setInitialStatus(
                        e.target.value as 'intake' | 'diagnosing' | 'awaiting_parts' | 'in_repair'
                      )
                    }
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                  >
                    <option value="intake">Checked In</option>
                    <option value="diagnosing">Bench Diagnostics</option>
                    <option value="awaiting_parts">Awaiting Parts</option>
                    <option value="in_repair">In Repair</option>
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSaving}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
                >
                  {formSaving
                    ? 'Saving...'
                    : editingTicket
                    ? 'Save Changes'
                    : 'Create Repair Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
