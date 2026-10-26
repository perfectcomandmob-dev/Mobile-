/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import {
  Boxes,
  ClipboardList,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Users,
  X,
} from 'lucide-react';
import {
  auth,
  BOOTSTRAPPED_ADMIN_EMAIL,
  db,
  handleFirestoreError,
  OperationType,
  signInWithGooglePopup,
  signOutUser,
} from './firebase';
import {
  type Customer,
  type InventoryPart,
  type RepairTicket,
  type StockMovement,
  timestampToMillis,
} from './types';
import { seedSampleShopData } from './services/shopService';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LandingSignIn } from './components/LandingSignIn';
import { DashboardOverview } from './components/DashboardOverview';
import { TicketsView } from './components/TicketsView';
import { InventoryView } from './components/InventoryView';
import { CustomersView, StockLedgerView } from './components/CustomersLedgerView';

type WorkspaceTab = 'overview' | 'tickets' | 'inventory' | 'customers' | 'ledger';

const TAB_LABELS: Record<WorkspaceTab, string> = {
  overview: 'Shop Overview',
  tickets: 'Repair Queue',
  inventory: 'Parts Inventory',
  customers: 'Customers',
  ledger: 'Stock Ledger',
};

function BenchFlowWorkspace() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Real-time Firestore collections
  const [ticketsRaw, setTicketsRaw] = useState<RepairTicket[]>([]);
  const [partsRaw, setPartsRaw] = useState<InventoryPart[]>([]);
  const [customersRaw, setCustomersRaw] = useState<Customer[]>([]);
  const [movementsRaw, setMovementsRaw] = useState<StockMovement[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [listenerError, setListenerError] = useState<Error | null>(null);

  // Cross-view triggers
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [newTicketSignal, setNewTicketSignal] = useState(0);
  const [newPartSignal, setNewPartSignal] = useState(0);
  const [newCustomerSignal, setNewCustomerSignal] = useState(0);
  const [restockTargetPart, setRestockTargetPart] = useState<InventoryPart | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
      if (!firebaseUser) {
        setTicketsRaw([]);
        setPartsRaw([]);
        setCustomersRaw([]);
        setMovementsRaw([]);
        setDataLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authReady || !user) return;

    setDataLoading(true);
    let readyCount = 0;
    const markReady = () => {
      readyCount += 1;
      if (readyCount >= 4) {
        setDataLoading(false);
      }
    };

    const ticketsQuery = query(collection(db, 'tickets'), where('ownerId', '==', user.uid));
    const unsubTickets = onSnapshot(
      ticketsQuery,
      (snap) => {
        setTicketsRaw(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<RepairTicket, 'id'>) }))
        );
        markReady();
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'tickets');
        } catch (thrown) {
          setListenerError(thrown as Error);
        }
      }
    );

    const partsQuery = query(collection(db, 'inventoryParts'), where('ownerId', '==', user.uid));
    const unsubParts = onSnapshot(
      partsQuery,
      (snap) => {
        setPartsRaw(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<InventoryPart, 'id'>) }))
        );
        markReady();
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'inventoryParts');
        } catch (thrown) {
          setListenerError(thrown as Error);
        }
      }
    );

    const customersQuery = query(collection(db, 'customers'), where('ownerId', '==', user.uid));
    const unsubCustomers = onSnapshot(
      customersQuery,
      (snap) => {
        setCustomersRaw(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Customer, 'id'>) }))
        );
        markReady();
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'customers');
        } catch (thrown) {
          setListenerError(thrown as Error);
        }
      }
    );

    const movementsQuery = query(
      collection(db, 'stockMovements'),
      where('ownerId', '==', user.uid)
    );
    const unsubMovements = onSnapshot(
      movementsQuery,
      (snap) => {
        setMovementsRaw(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<StockMovement, 'id'>) }))
        );
        markReady();
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'stockMovements');
        } catch (thrown) {
          setListenerError(thrown as Error);
        }
      }
    );

    return () => {
      unsubTickets();
      unsubParts();
      unsubCustomers();
      unsubMovements();
    };
  }, [authReady, user]);

  const tickets = useMemo(
    () =>
      [...ticketsRaw].sort(
        (a, b) => timestampToMillis(b.updatedAt) - timestampToMillis(a.updatedAt)
      ),
    [ticketsRaw]
  );

  const parts = useMemo(
    () => [...partsRaw].sort((a, b) => a.sku.localeCompare(b.sku)),
    [partsRaw]
  );

  const customers = useMemo(
    () =>
      [...customersRaw].sort(
        (a, b) => timestampToMillis(b.createdAt) - timestampToMillis(a.createdAt)
      ),
    [customersRaw]
  );

  const movements = useMemo(
    () =>
      [...movementsRaw].sort(
        (a, b) => timestampToMillis(b.createdAt) - timestampToMillis(a.createdAt)
      ),
    [movementsRaw]
  );

  // Throw listener error after hooks so ErrorBoundary catches structured FirestoreErrorInfo
  if (listenerError) {
    throw listenerError;
  }

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-sm font-medium text-slate-500">Loading workspace...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <LandingSignIn
        onSignIn={async () => {
          await signInWithGooglePopup();
        }}
      />
    );
  }

  const isAdminUser = Boolean(
    user.emailVerified && user.email === BOOTSTRAPPED_ADMIN_EMAIL
  );

  const lowStockCount = parts.filter((p) => p.quantity <= p.minStockLevel).length;
  const openQueueCount = tickets.filter(
    (t) => t.status !== 'completed' && t.status !== 'cancelled'
  ).length;

  const triggerPrimaryCta = () => {
    if (activeTab === 'inventory') {
      setNewPartSignal((n) => n + 1);
    } else if (activeTab === 'customers') {
      setNewCustomerSignal((n) => n + 1);
    } else {
      setActiveTab('tickets');
      setNewTicketSignal((n) => n + 1);
    }
  };

  const primaryCtaLabel =
    activeTab === 'inventory'
      ? 'Add Spare Part'
      : activeTab === 'customers'
      ? 'Add Customer'
      : 'New Repair Ticket';

  const handleInspectTicketFromAnywhere = (ticketId: string) => {
    setActiveTab('tickets');
    setSelectedTicketId(ticketId);
  };

  const navItems: Array<{
    id: WorkspaceTab;
    label: string;
    icon: typeof LayoutDashboard;
    count?: number;
  }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'tickets', label: 'Repair Queue', icon: ClipboardList, count: openQueueCount },
    { id: 'inventory', label: 'Parts Inventory', icon: Boxes, count: lowStockCount || undefined },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'ledger', label: 'Stock Ledger', icon: History },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Desktop Sidebar (256px width) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 bg-slate-900 text-slate-300 border-r border-slate-800 no-print">
        <div className="h-16 px-5 flex items-center border-b border-slate-800">
          <span className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap">
            BenchFlow
          </span>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  active
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span className="flex items-center gap-3 whitespace-nowrap">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </span>
                {typeof item.count === 'number' && item.count > 0 && (
                  <span className="font-mono text-xs text-slate-400 tabular-nums">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-medium text-white truncate">
                {user.displayName || 'Shop Operator'}
              </p>
              <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
            </div>
            <button
              type="button"
              onClick={() => signOutUser()}
              aria-label="Sign out"
              title="Sign out"
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-64 max-w-[80vw] bg-slate-900 text-slate-300 flex flex-col h-full z-10">
            <div className="h-14 px-5 flex items-center justify-between border-b border-slate-800">
              <span className="font-display text-base font-bold text-white">BenchFlow</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer ${
                      active ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </span>
                    {typeof item.count === 'number' && item.count > 0 && (
                      <span className="font-mono text-xs text-slate-400 tabular-nums">
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-300 truncate">{user.email}</span>
              <button
                type="button"
                onClick={() => signOutUser()}
                className="text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Sign out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* SaaS Top Bar Contract: Contextual Breadcrumbs Left + 1 Primary Action Right */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-6 sticky top-0 z-20 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm truncate">
              <span className="text-slate-500 hidden sm:inline whitespace-nowrap">BenchFlow</span>
              <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
                /
              </span>
              <span className="font-display font-semibold text-slate-900 whitespace-nowrap">
                {TAB_LABELS[activeTab]}
              </span>
            </div>
          </div>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={triggerPrimaryCta}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{primaryCtaLabel}</span>
            </button>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {dataLoading ? (
            <div className="space-y-6" aria-busy="true" aria-label="Loading shop data">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 bg-white border border-slate-200 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
                {[0, 1, 2, 3].map((idx) => (
                  <div key={idx} className="p-5 space-y-2">
                    <div className="h-3 w-28 bg-slate-100 rounded animate-pulse" />
                    <div className="h-7 w-16 bg-slate-200 rounded animate-pulse" />
                    <div className="h-3 w-36 bg-slate-100 rounded animate-pulse" />
                  </div>
                ))}
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
                {[0, 1, 2, 3, 4].map((row) => (
                  <div key={row} className="h-9 bg-slate-100 rounded animate-pulse" />
                ))}
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <DashboardOverview
                  tickets={tickets}
                  parts={parts}
                  movements={movements}
                  onNavigateTab={(t) => setActiveTab(t)}
                  onInspectTicket={handleInspectTicketFromAnywhere}
                  onOpenNewTicket={() => {
                    setActiveTab('tickets');
                    setNewTicketSignal((n) => n + 1);
                  }}
                  onOpenNewPart={() => {
                    setActiveTab('inventory');
                    setNewPartSignal((n) => n + 1);
                  }}
                  onOpenRestockPart={(part) => {
                    setActiveTab('inventory');
                    setRestockTargetPart(part);
                  }}
                  onSeedSampleData={() => seedSampleShopData(user.uid)}
                />
              )}

              {activeTab === 'tickets' && (
                <TicketsView
                  ownerId={user.uid}
                  isAdminUser={isAdminUser}
                  tickets={tickets}
                  customers={customers}
                  parts={parts}
                  movements={movements}
                  selectedTicketId={selectedTicketId}
                  onSelectTicket={setSelectedTicketId}
                  openNewModalSignal={newTicketSignal}
                />
              )}

              {activeTab === 'inventory' && (
                <InventoryView
                  ownerId={user.uid}
                  parts={parts}
                  openNewPartSignal={newPartSignal}
                  restockTargetPart={restockTargetPart}
                  onClearRestockTarget={() => setRestockTargetPart(null)}
                />
              )}

              {activeTab === 'customers' && (
                <CustomersView
                  ownerId={user.uid}
                  customers={customers}
                  tickets={tickets}
                  openNewCustomerSignal={newCustomerSignal}
                  onInspectTicket={handleInspectTicketFromAnywhere}
                />
              )}

              {activeTab === 'ledger' && (
                <StockLedgerView
                  movements={movements}
                  onInspectTicket={handleInspectTicketFromAnywhere}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BenchFlowWorkspace />
    </ErrorBoundary>
  );
}
