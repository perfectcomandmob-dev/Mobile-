import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { ResilientImage } from './ResilientImage';
import heroWorkbenchImg from '../assets/images/hero_repair_workbench_1792963670017.jpg';
import partOledImg from '../assets/images/part_oled_display_1792963671208.jpg';
import partBatteryImg from '../assets/images/part_battery_pack_1792963672393.jpg';
import partCameraImg from '../assets/images/part_camera_module_1792963672455.jpg';

interface LandingSignInProps {
  onSignIn: () => Promise<void>;
}

export function LandingSignIn({ onSignIn }: LandingSignInProps) {
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleTriggerSignIn = async () => {
    setSigningIn(true);
    setAuthError(null);
    try {
      await onSignIn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to complete sign-in.';
      if (!msg.includes('auth/popup-closed-by-user')) {
        setAuthError(msg);
      }
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-6 py-4">
          <a
            href="#top"
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            BenchFlow
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a
              href="#workbench"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Workbench
            </a>
            <a
              href="#inventory"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Parts Inventory
            </a>
            <a
              href="#workflow"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Workflow
            </a>
            <a
              href="#ledger"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Stock Ledger
            </a>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={handleTriggerSignIn}
              disabled={signingIn}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {signingIn ? 'Connecting...' : 'Sign in with Google'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main id="top" className="flex-1">
        {/* Hero Split */}
        <section id="workbench" className="max-w-7xl mx-auto px-6 pt-12 pb-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center py-4">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                <span>Mobile Repair Shop Management</span>
                <span aria-hidden="true">·</span>
                <span>Atomic Parts Inventory</span>
                <span aria-hidden="true">·</span>
                <span>Service Invoicing</span>
              </div>

              <h1
                className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-[1.12] mb-5 max-w-xl"
                style={{ textWrap: 'balance' } as React.CSSProperties}
              >
                Run every repair bench and spare part bin from one ledger.
              </h1>

              <p className="text-base text-slate-600 leading-relaxed mb-8 max-w-xl">
                Check in customer handsets with IMEI and diagnostic notes, allocate OLED assemblies
                and batteries directly from bin stock onto open tickets, and track low-stock reorder
                thresholds in real time.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={handleTriggerSignIn}
                  disabled={signingIn}
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>{signingIn ? 'Opening Google Sign-In...' : 'Open Repair Workspace'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <a
                  href="#workflow"
                  className="px-4 py-3 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
                >
                  Inspect Bench Workflow
                </a>
              </div>

              {authError && (
                <p role="alert" className="mt-4 text-xs text-red-700">
                  Sign-in notice: {authError}
                </p>
              )}
            </div>

            <div className="lg:col-span-6">
              <div className="relative h-full min-h-[320px] rounded-xl overflow-hidden border border-slate-200 bg-slate-900">
                <ResilientImage
                  src={heroWorkbenchImg}
                  alt="Precision mobile phone microsoldering and diagnostic repair workbench"
                  fallbackLabel="ESD Microsoldering & Diagnostic Workbench"
                  className="w-full h-full lg:h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-5">
                  <p className="text-xs text-slate-200">
                    Bench Intake · TrueTone / Board Diagnostics · ESD Bin Stock Sync
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Full-width 4-column operational proof strip below hero split */}
          <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
            <div className="p-5">
              <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">8 Stages</p>
              <p className="text-xs text-slate-500 mt-1">
                Intake through Post-Repair QC &amp; Pickup
              </p>
            </div>
            <div className="p-5">
              <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">1-Batch</p>
              <p className="text-xs text-slate-500 mt-1">
                Atomic part deduction &amp; ticket cost sync
              </p>
            </div>
            <div className="p-5">
              <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">SKU + Bin</p>
              <p className="text-xs text-slate-500 mt-1">
                Drawer location, cost &amp; retail margin tracking
              </p>
            </div>
            <div className="p-5">
              <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">100% Audit</p>
              <p className="text-xs text-slate-500 mt-1">
                Immutable restock, adjustment &amp; repair ledger
              </p>
            </div>
          </div>
        </section>

        {/* Hardware Parts Inventory Section */}
        <section id="inventory" className="border-t border-slate-200 bg-white py-14">
          <div className="max-w-7xl mx-auto px-6">
            <div className="max-w-2xl mb-10">
              <p className="text-xs text-slate-500 mb-2">
                Component Catalog · Wholesale vs. Retail Margin · Reorder Thresholds
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Purpose-built inventory for mobile replacement components
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex flex-col">
                <div className="aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 mb-4 bg-slate-100">
                  <ResilientImage
                    src={partOledImg}
                    alt="Smartphone OLED replacement display assembly with flex cables"
                    fallbackLabel="OLED & AMOLED Display Assemblies"
                  />
                </div>
                <h3 className="font-display text-base font-semibold text-slate-900">
                  OLED &amp; Service Pack Displays
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Soft OLED · Refurbished OEM · Frame Assemblies
                </p>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Track model board compatibility (A2848, SM-S928U), supplier grading, and bin drawer
                  slots so technicians pull the exact screen on the first pass.
                </p>
              </div>

              <div className="flex flex-col">
                <div className="aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 mb-4 bg-slate-100">
                  <ResilientImage
                    src={partBatteryImg}
                    alt="Smartphone lithium-ion replacement battery pack with board flex connector"
                    fallbackLabel="High-Cycle Li-Ion Battery Cells"
                  />
                </div>
                <h3 className="font-display text-base font-semibold text-slate-900">
                  High-Cycle Cells &amp; Seals
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Zero-Cycle Cells · BMS Flex · IP68 Frame Adhesives
                </p>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Set minimum stock thresholds on fast-moving battery SKUs to surface reorder alerts
                  before walk-in express queues stall.
                </p>
              </div>

              <div className="flex flex-col">
                <div className="aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 mb-4 bg-slate-100">
                  <ResilientImage
                    src={partCameraImg}
                    alt="Smartphone rear camera module and USB-C charging port flex assembly"
                    fallbackLabel="Camera Modules, Charging Ports & Board ICs"
                  />
                </div>
                <h3 className="font-display text-base font-semibold text-slate-900">
                  Cameras, Daughterboards &amp; ICs
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  OIS Camera Arrays · USB-C Sub-PBA · Tristar / PMIC Chips
                </p>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Log micro-components down to ESD tray coordinates and link every consumed part to a
                  specific customer IMEI and warranty window.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Mechanism-to-Outcome Workflow */}
        <section id="workflow" className="border-t border-slate-200 bg-slate-50 py-14">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="font-display text-2xl font-bold text-slate-900 tracking-tight mb-8">
              Closed-loop bench to inventory workflow
            </h2>
            <div
              id="ledger"
              className="grid grid-cols-1 md:grid-cols-3 gap-8 border-t border-slate-200 pt-8"
            >
              <div>
                <p className="font-mono text-xs text-slate-500 mb-2">01. Device Intake</p>
                <h3 className="font-display text-base font-semibold text-slate-900 mb-2">
                  Structured IMEI &amp; Fault Check-In
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Record customer contact details in isolated records, capture unlock notes, assign a
                  bench technician, and quote labor upfront.
                </p>
              </div>
              <div>
                <p className="font-mono text-xs text-slate-500 mb-2">02. Atomic Part Allocation</p>
                <h3 className="font-display text-base font-semibold text-slate-900 mb-2">
                  Instant Stock Deduction &amp; Ticket Pricing
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Allocating a replacement screen deducts bin stock, updates the ticket parts total,
                  and writes an immutable ledger entry in a single database batch.
                </p>
              </div>
              <div>
                <p className="font-mono text-xs text-slate-500 mb-2">03. QC &amp; Finalization</p>
                <h3 className="font-display text-base font-semibold text-slate-900 mb-2">
                  Printable Service Sheet &amp; Terminal Lock
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Generate a clean customer invoice with warranty terms and lock completed tickets
                  against accidental post-pickup edits.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t border-slate-200 py-6">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <span>BenchFlow Repair &amp; Inventory Management</span>
          <button
            type="button"
            onClick={handleTriggerSignIn}
            className="text-slate-700 hover:text-slate-900 font-medium underline underline-offset-4 cursor-pointer"
          >
            Sign in to shop workspace
          </button>
        </div>
      </footer>
    </div>
  );
}
