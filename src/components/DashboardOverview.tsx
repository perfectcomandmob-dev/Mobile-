import { useState } from 'react';
import { ArrowUpRight, Plus, Wrench } from 'lucide-react';
import {
  formatCurrency,
  formatTimestamp,
  type InventoryPart,
  PART_CATEGORY_LABELS,
  type RepairTicket,
  type StockMovement,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
} from '../types';

interface DashboardOverviewProps {
  tickets: RepairTicket[];
  parts: InventoryPart[];
  movements: StockMovement[];
  onNavigateTab: (tab: 'tickets' | 'inventory' | 'customers' | 'ledger') => void;
  onInspectTicket: (ticketId: string) => void;
  onOpenNewTicket: () => void;
  onOpenNewPart: () => void;
  onOpenRestockPart: (part: InventoryPart) => void;
  onSeedSampleData: () => Promise<void>;
}

function getStatusColorClass(status: RepairTicket['status']): string {
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

export function DashboardOverview({
  tickets,
  parts,
  movements,
  onNavigateTab,
  onInspectTicket,
  onOpenNewTicket,
  onOpenNewPart,
  onOpenRestockPart,
  onSeedSampleData,
}: DashboardOverviewProps) {
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);

  const activeBenchTickets = tickets.filter(
    (t) =>
      t.status !== 'completed' &&
      t.status !== 'cancelled' &&
      t.status !== 'ready_pickup'
  );
  const urgentActiveCount = activeBenchTickets.filter(
    (t) => t.priority === 'express' || t.priority === 'urgent'
  ).length;

  const readyPickupTickets = tickets.filter((t) => t.status === 'ready_pickup');
  const readyPickupValueCents = readyPickupTickets.reduce(
    (sum, t) => sum + t.laborCents + t.partsTotalCents,
    0
  );

  const lowStockParts = parts.filter((p) => p.quantity <= p.minStockLevel);
  const outOfStockCount = parts.filter((p) => p.quantity === 0).length;
  const totalUnitsOnHand = parts.reduce((sum, p) => sum + p.quantity, 0);

  const completedTickets = tickets.filter((t) => t.status === 'completed');
  const completedRevenueCents = completedTickets.reduce(
    (sum, t) => sum + t.laborCents + t.partsTotalCents,
    0
  );
  const openPipelineCents = tickets
    .filter((t) => t.status !== 'completed' && t.status !== 'cancelled')
    .reduce((sum, t) => sum + t.laborCents + t.partsTotalCents, 0);

  const handleLoadSample = async () => {
    setSeeding(true);
    setSeedError(null);
    try {
      await onSeedSampleData();
    } catch (err) {
      setSeedError(err instanceof Error ? err.message : 'Failed to load sample data.');
    } finally {
      setSeeding(false);
    }
  };

  if (tickets.length === 0 && parts.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center max-w-2xl mx-auto my-8">
        <Wrench className="w-8 h-8 text-slate-400 mx-auto mb-3" />
        <h2 className="font-display text-xl font-bold text-slate-900 mb-2">
          Your repair bench and parts inventory are empty
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed mb-6 max-w-md mx-auto">
          Start by logging your first customer repair ticket or adding spare parts to your catalog,
          or populate realistic mobile repair shop records to explore the workflow immediately.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onOpenNewTicket}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Repair Ticket
          </button>
          <button
            type="button"
            onClick={onOpenNewPart}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Add First Spare Part
          </button>
          <button
            type="button"
            onClick={handleLoadSample}
            disabled={seeding}
            className="px-4 py-2 text-sm font-medium text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {seeding ? 'Populating Shop Records...' : 'Load Sample Shop Data'}
          </button>
        </div>
        {seedError && (
          <p role="alert" className="mt-4 text-xs text-red-700">
            {seedError}
          </p>
        )}
      </div>
    );
  }

  const priorityQueue = tickets
    .filter((t) => t.status !== 'completed' && t.status !== 'cancelled')
    .slice(0, 7);

  return (
    <div className="space-y-8">
      {/* Single-elevation 4-KPI Summary Strip */}
      <section aria-label="Operational metrics">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 bg-white border border-slate-200 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
          <div className="p-5">
            <p className="text-xs font-medium text-slate-500">Active Bench Queue</p>
            <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums mt-1.5">
              {activeBenchTickets.length}
            </p>
            <p className="text-xs text-slate-500 mt-1 tabular-nums">
              {urgentActiveCount} express or urgent SLA
            </p>
          </div>

          <div className="p-5">
            <p className="text-xs font-medium text-slate-500">Ready for Customer Pickup</p>
            <p className="font-mono text-2xl font-semibold text-emerald-700 tabular-nums mt-1.5">
              {readyPickupTickets.length}
            </p>
            <p className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
              {formatCurrency(readyPickupValueCents)} balance due
            </p>
          </div>

          <div className="p-5">
            <p className="text-xs font-medium text-slate-500">Low / Out-of-Stock SKUs</p>
            <p
              className={`font-mono text-2xl font-semibold tabular-nums mt-1.5 ${
                lowStockParts.length > 0 ? 'text-amber-700' : 'text-slate-900'
              }`}
            >
              {lowStockParts.length}
            </p>
            <p className="text-xs text-slate-500 mt-1 tabular-nums">
              {outOfStockCount} depleted · {totalUnitsOnHand} total units on hand
            </p>
          </div>

          <div className="p-5">
            <p className="text-xs font-medium text-slate-500">Collected &amp; Open Pipeline</p>
            <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums mt-1.5">
              {formatCurrency(completedRevenueCents)}
            </p>
            <p className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
              + {formatCurrency(openPipelineCents)} in active work orders
            </p>
          </div>
        </div>
      </section>

      {/* Main Split: Active Bench Queue + Low Stock Reorder Alerts */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Active Bench Queue */}
        <section className="xl:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Active Repair Bench Queue
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Select any ticket to update diagnostics, allocate inventory parts, or print invoice
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('tickets')}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>All Tickets</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {priorityQueue.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-600 mb-3">
                No active handsets on the bench right now.
              </p>
              <button
                type="button"
                onClick={onOpenNewTicket}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer"
              >
                Check In Device
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                    <th className="py-2.5 px-4">Ticket</th>
                    <th className="py-2.5 px-4">Device &amp; Fault</th>
                    <th className="py-2.5 px-4">Customer</th>
                    <th className="py-2.5 px-4">Stage &amp; SLA</th>
                    <th className="py-2.5 px-4 text-right">Estimate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {priorityQueue.map((ticket) => (
                    <tr
                      key={ticket.id}
                      onClick={() => onInspectTicket(ticket.id)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <td className="py-2.5 px-4 font-mono text-xs font-medium text-slate-900 whitespace-nowrap tabular-nums">
                        {ticket.ticketNumber}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="font-medium text-slate-900 truncate max-w-[210px]">
                          {ticket.deviceBrand} {ticket.deviceModel}
                        </div>
                        <div className="text-xs text-slate-500 truncate max-w-[210px]">
                          {ticket.assignedTech} · {ticket.issueCategory.replace('_', ' ')}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-xs text-slate-700 whitespace-nowrap">
                        {ticket.customerName}
                      </td>
                      <td className="py-2.5 px-4 text-xs whitespace-nowrap">
                        <span className={getStatusColorClass(ticket.status)}>
                          {TICKET_STATUS_LABELS[ticket.status]}
                        </span>
                        <span className="text-slate-400 mx-1.5" aria-hidden="true">
                          ·
                        </span>
                        <span
                          className={
                            ticket.priority === 'express'
                              ? 'text-red-700 font-medium'
                              : ticket.priority === 'urgent'
                              ? 'text-amber-700 font-medium'
                              : 'text-slate-500'
                          }
                        >
                          {TICKET_PRIORITY_LABELS[ticket.priority]}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs font-medium text-slate-900 whitespace-nowrap tabular-nums">
                        {formatCurrency(ticket.laborCents + ticket.partsTotalCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Low Stock Reorder Alerts */}
        <section className="xl:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Low-Stock Spare Parts
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                SKUs at or below minimum bin threshold
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('inventory')}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Full Catalog</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {lowStockParts.length === 0 ? (
            <div className="p-8 text-center my-auto">
              <p className="text-sm font-medium text-slate-900 mb-1">All bins above minimum stock</p>
              <p className="text-xs text-slate-500">
                Every spare part SKU currently exceeds its reorder threshold.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                    <th className="py-2.5 px-4">Part &amp; SKU</th>
                    <th className="py-2.5 px-3">Bin</th>
                    <th className="py-2.5 px-3 text-right">Stock / Min</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {lowStockParts.slice(0, 7).map((part) => (
                    <tr key={part.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-4">
                        <div className="font-medium text-slate-900 truncate max-w-[180px]">
                          {part.name}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500">
                          {part.sku} · {PART_CATEGORY_LABELS[part.category]}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                        {part.binLocation}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-xs whitespace-nowrap tabular-nums">
                        <span
                          className={
                            part.quantity === 0
                              ? 'text-red-700 font-semibold'
                              : 'text-amber-700 font-semibold'
                          }
                        >
                          {part.quantity}
                        </span>
                        <span className="text-slate-400"> / {part.minStockLevel}</span>
                      </td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onOpenRestockPart(part)}
                          className="px-2.5 py-1 text-xs font-medium text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Restock
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Recent Stock Ledger Activity */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Recent Parts Movement Ledger
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time log of bench part allocations, supplier restocks, and bin audits
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('ledger')}
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Full Ledger</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {movements.length === 0 ? (
          <div className="p-6 text-xs text-slate-500 text-center">
            No stock movements recorded yet. Restocking a part or allocating a component to a
            repair ticket records an audit entry automatically.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                  <th className="py-2.5 px-4">Time</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4">Component</th>
                  <th className="py-2.5 px-4">Reference / Note</th>
                  <th className="py-2.5 px-4 text-right">Qty Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {movements.slice(0, 5).map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-4 font-mono text-slate-500 whitespace-nowrap tabular-nums">
                      {formatTimestamp(m.createdAt)}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span
                        className={
                          m.type === 'restock'
                            ? 'text-emerald-700 font-medium'
                            : m.type === 'repair_use'
                            ? 'text-blue-700 font-medium'
                            : 'text-slate-700 font-medium'
                        }
                      >
                        {m.type === 'restock'
                          ? 'Supplier Restock'
                          : m.type === 'repair_use'
                          ? 'Ticket Allocation'
                          : 'Stock Adjustment'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="font-medium text-slate-900">{m.partName}</span>
                      <span className="text-slate-400 mx-1.5" aria-hidden="true">
                        ·
                      </span>
                      <span className="font-mono text-slate-500">{m.partSku}</span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 truncate max-w-[280px]">
                      {m.ticketNumber ? `${m.ticketNumber} · ` : ''}
                      {m.note || 'Standard stock update'}
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
      </section>
    </div>
  );
}
