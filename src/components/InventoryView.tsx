import { useEffect, useMemo, useState } from 'react';
import { Download, Edit3, PackagePlus, Plus, Search, Trash2, X } from 'lucide-react';
import {
  adjustPartStock,
  createInventoryPart,
  deleteInventoryPart,
  updateInventoryPart,
} from '../services/shopService';
import {
  formatCurrency,
  type InventoryPart,
  PART_CATEGORY_LABELS,
  type PartCategory,
} from '../types';
import { ResilientImage } from './ResilientImage';
import partOledImg from '../assets/images/part_oled_display_1792963671208.jpg';
import partBatteryImg from '../assets/images/part_battery_pack_1792963672393.jpg';
import partCameraImg from '../assets/images/part_camera_module_1792963672455.jpg';

interface InventoryViewProps {
  ownerId: string;
  parts: InventoryPart[];
  openNewPartSignal: number;
  restockTargetPart: InventoryPart | null;
  onClearRestockTarget: () => void;
}

type StockHealthFilter = 'all' | 'low' | 'out';

export function InventoryView({
  ownerId,
  parts,
  openNewPartSignal,
  restockTargetPart,
  onClearRestockTarget,
}: InventoryViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | PartCategory>('all');
  const [stockFilter, setStockFilter] = useState<StockHealthFilter>('all');

  // Add / Edit Part Modal
  const [showPartModal, setShowPartModal] = useState(false);
  const [editingPart, setEditingPart] = useState<InventoryPart | null>(null);
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<PartCategory>('display');
  const [compatibleBrand, setCompatibleBrand] = useState('Apple');
  const [compatibleModels, setCompatibleModels] = useState('');
  const [binLocation, setBinLocation] = useState('');
  const [supplier, setSupplier] = useState('');
  const [quantity, setQuantity] = useState('5');
  const [minStockLevel, setMinStockLevel] = useState('3');
  const [unitCostDollars, setUnitCostDollars] = useState('45.00');
  const [retailPriceDollars, setRetailPriceDollars] = useState('95.00');
  const [partSaving, setPartSaving] = useState(false);
  const [partError, setPartError] = useState<string | null>(null);

  // Restock / Audit Adjustment Modal
  const [stockModalPart, setStockModalPart] = useState<InventoryPart | null>(null);
  const [stockMode, setStockMode] = useState<'restock' | 'adjustment'>('restock');
  const [stockDelta, setStockDelta] = useState('5');
  const [stockNote, setStockNote] = useState('');
  const [stockSaving, setStockSaving] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);

  const [confirmDeletePartId, setConfirmDeletePartId] = useState<string | null>(null);

  const openCreatePartModal = () => {
    setEditingPart(null);
    setSku('');
    setName('');
    setCategory('display');
    setCompatibleBrand('Apple');
    setCompatibleModels('');
    setBinLocation('A-01');
    setSupplier('MobileSentrix');
    setQuantity('5');
    setMinStockLevel('3');
    setUnitCostDollars('85.00');
    setRetailPriceDollars('169.00');
    setPartError(null);
    setShowPartModal(true);
  };

  useEffect(() => {
    if (openNewPartSignal > 0) {
      openCreatePartModal();
    }
  }, [openNewPartSignal]);

  useEffect(() => {
    if (restockTargetPart) {
      setStockModalPart(restockTargetPart);
      setStockMode('restock');
      setStockDelta('5');
      setStockNote('');
      setStockError(null);
      onClearRestockTarget();
    }
  }, [restockTargetPart, onClearRestockTarget]);

  const openEditPartModal = (part: InventoryPart) => {
    setEditingPart(part);
    setSku(part.sku);
    setName(part.name);
    setCategory(part.category);
    setCompatibleBrand(part.compatibleBrand);
    setCompatibleModels(part.compatibleModels);
    setBinLocation(part.binLocation);
    setSupplier(part.supplier);
    setQuantity(String(part.quantity));
    setMinStockLevel(String(part.minStockLevel));
    setUnitCostDollars((part.unitCostCents / 100).toFixed(2));
    setRetailPriceDollars((part.retailPriceCents / 100).toFixed(2));
    setPartError(null);
    setShowPartModal(true);
  };

  const openStockAdjustmentModal = (part: InventoryPart) => {
    setStockModalPart(part);
    setStockMode('restock');
    setStockDelta('5');
    setStockNote('');
    setStockError(null);
  };

  const filteredParts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return parts.filter((p) => {
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
      if (stockFilter === 'low' && p.quantity > p.minStockLevel) return false;
      if (stockFilter === 'out' && p.quantity !== 0) return false;

      if (!q) return true;
      return (
        p.sku.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.compatibleBrand.toLowerCase().includes(q) ||
        p.compatibleModels.toLowerCase().includes(q) ||
        p.binLocation.toLowerCase().includes(q) ||
        p.supplier.toLowerCase().includes(q)
      );
    });
  }, [parts, searchQuery, categoryFilter, stockFilter]);

  const valuationMetrics = useMemo(() => {
    let totalUnits = 0;
    let wholesaleCents = 0;
    let retailCents = 0;
    let lowCount = 0;
    for (const p of parts) {
      totalUnits += p.quantity;
      wholesaleCents += p.quantity * p.unitCostCents;
      retailCents += p.quantity * p.retailPriceCents;
      if (p.quantity <= p.minStockLevel) lowCount += 1;
    }
    return { totalUnits, wholesaleCents, retailCents, lowCount };
  }, [parts]);

  const handleSavePartForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setPartSaving(true);
    setPartError(null);

    try {
      const unitCostCents = Math.max(0, Math.round((parseFloat(unitCostDollars) || 0) * 100));
      const retailPriceCents = Math.max(
        0,
        Math.round((parseFloat(retailPriceDollars) || 0) * 100)
      );
      const minStock = Math.max(0, parseInt(minStockLevel, 10) || 0);

      if (editingPart) {
        await updateInventoryPart(editingPart.id, {
          sku,
          name,
          category,
          compatibleBrand,
          compatibleModels,
          binLocation,
          supplier,
          minStockLevel: minStock,
          unitCostCents,
          retailPriceCents,
        });
      } else {
        await createInventoryPart(ownerId, {
          sku,
          name,
          category,
          compatibleBrand,
          compatibleModels,
          binLocation,
          supplier,
          quantity: Math.max(0, parseInt(quantity, 10) || 0),
          minStockLevel: minStock,
          unitCostCents,
          retailPriceCents,
        });
      }
      setShowPartModal(false);
    } catch (err) {
      setPartError(err instanceof Error ? err.message : 'Unable to save inventory part.');
    } finally {
      setPartSaving(false);
    }
  };

  const handleCommitStockMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockModalPart) return;
    setStockSaving(true);
    setStockError(null);

    try {
      const parsedDelta = parseInt(stockDelta, 10) || 0;
      await adjustPartStock(ownerId, stockModalPart, stockMode, parsedDelta, stockNote);
      setStockModalPart(null);
    } catch (err) {
      setStockError(err instanceof Error ? err.message : 'Failed to adjust stock.');
    } finally {
      setStockSaving(false);
    }
  };

  const handleDeletePart = async (partId: string) => {
    try {
      await deleteInventoryPart(partId);
      setConfirmDeletePartId(null);
    } catch {
      setConfirmDeletePartId(null);
    }
  };

  const handleExportInventoryCsv = () => {
    const headers = [
      'SKU',
      'Name',
      'Category',
      'Brand',
      'Compatible Models',
      'Bin',
      'Supplier',
      'Quantity',
      'Min Stock',
      'Unit Cost ($)',
      'Retail Price ($)',
      'Stock Cost Value ($)',
    ];
    const rows = filteredParts.map((p) => [
      p.sku,
      `"${p.name.replace(/"/g, '""')}"`,
      p.category,
      `"${p.compatibleBrand}"`,
      `"${p.compatibleModels.replace(/"/g, '""')}"`,
      p.binLocation,
      `"${p.supplier.replace(/"/g, '""')}"`,
      p.quantity,
      p.minStockLevel,
      (p.unitCostCents / 100).toFixed(2),
      (p.retailPriceCents / 100).toFixed(2),
      ((p.quantity * p.unitCostCents) / 100).toFixed(2),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `benchflow-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Valuation & Category Quick-Select Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 bg-white border border-slate-200 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
          <div className="p-4 flex flex-col justify-center">
            <p className="text-xs text-slate-500">Catalog SKUs</p>
            <p className="font-mono text-xl font-semibold text-slate-900 tabular-nums mt-1">
              {parts.length}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
              {valuationMetrics.totalUnits} total units
            </p>
          </div>
          <div className="p-4 flex flex-col justify-center">
            <p className="text-xs text-slate-500">Wholesale Value</p>
            <p className="font-mono text-xl font-semibold text-slate-900 tabular-nums mt-1">
              {formatCurrency(valuationMetrics.wholesaleCents)}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">At landed cost</p>
          </div>
          <div className="p-4 flex flex-col justify-center">
            <p className="text-xs text-slate-500">Retail Value</p>
            <p className="font-mono text-xl font-semibold text-slate-900 tabular-nums mt-1">
              {formatCurrency(valuationMetrics.retailCents)}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Bench billable</p>
          </div>
          <div className="p-4 flex flex-col justify-center">
            <p className="text-xs text-slate-500">Reorder Alerts</p>
            <p
              className={`font-mono text-xl font-semibold tabular-nums mt-1 ${
                valuationMetrics.lowCount > 0 ? 'text-amber-700' : 'text-emerald-700'
              }`}
            >
              {valuationMetrics.lowCount}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">At or below min</p>
          </div>
        </div>

        {/* Visual Component Quick-Filter Cards */}
        <div className="lg:col-span-5 grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() =>
              setCategoryFilter((prev) => (prev === 'display' ? 'all' : 'display'))
            }
            className={`group text-left rounded-xl overflow-hidden border transition-colors cursor-pointer bg-white ${
              categoryFilter === 'display' ? 'border-blue-600' : 'border-slate-200'
            }`}
          >
            <div className="h-16 w-full overflow-hidden bg-slate-100">
              <ResilientImage
                src={partOledImg}
                alt="OLED display assemblies"
                fallbackLabel="Displays"
              />
            </div>
            <div className="p-2.5">
              <p className="text-xs font-semibold text-slate-900 truncate">Displays</p>
              <p className="text-[11px] text-slate-500 font-mono tabular-nums">
                {parts.filter((p) => p.category === 'display').length} SKUs
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              setCategoryFilter((prev) => (prev === 'battery' ? 'all' : 'battery'))
            }
            className={`group text-left rounded-xl overflow-hidden border transition-colors cursor-pointer bg-white ${
              categoryFilter === 'battery' ? 'border-blue-600' : 'border-slate-200'
            }`}
          >
            <div className="h-16 w-full overflow-hidden bg-slate-100">
              <ResilientImage
                src={partBatteryImg}
                alt="Replacement battery cells"
                fallbackLabel="Batteries"
              />
            </div>
            <div className="p-2.5">
              <p className="text-xs font-semibold text-slate-900 truncate">Batteries</p>
              <p className="text-[11px] text-slate-500 font-mono tabular-nums">
                {parts.filter((p) => p.category === 'battery').length} SKUs
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              setCategoryFilter((prev) => (prev === 'camera' ? 'all' : 'camera'))
            }
            className={`group text-left rounded-xl overflow-hidden border transition-colors cursor-pointer bg-white ${
              categoryFilter === 'camera' ? 'border-blue-600' : 'border-slate-200'
            }`}
          >
            <div className="h-16 w-full overflow-hidden bg-slate-100">
              <ResilientImage
                src={partCameraImg}
                alt="Camera and charging flex modules"
                fallbackLabel="Cameras"
              />
            </div>
            <div className="p-2.5">
              <p className="text-xs font-semibold text-slate-900 truncate">Cameras</p>
              <p className="text-[11px] text-slate-500 font-mono tabular-nums">
                {parts.filter((p) => p.category === 'camera').length} SKUs
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search SKU, part name, model (A2848), bin, supplier..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as 'all' | PartCategory)}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg"
          >
            <option value="all">All Categories</option>
            {(Object.keys(PART_CATEGORY_LABELS) as PartCategory[]).map((cat) => (
              <option key={cat} value={cat}>
                {PART_CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(
              [
                { id: 'all', label: 'All Stock' },
                { id: 'low', label: 'Low Stock' },
                { id: 'out', label: 'Out of Stock' },
              ] as Array<{ id: StockHealthFilter; label: string }>
            ).map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setStockFilter(btn.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  stockFilter === btn.id
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
            onClick={handleExportInventoryCsv}
            disabled={filteredParts.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Download CSV
          </button>
        </div>
      </div>

      {/* High-Density Inventory Data Grid */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filteredParts.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-slate-900 mb-1">
              No spare parts match your filter
            </p>
            <p className="text-xs text-slate-500 mb-4">
              Clear active filters or register a new replacement part SKU.
            </p>
            <button
              type="button"
              onClick={openCreatePartModal}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Spare Part
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                  <th className="py-2.5 px-4">SKU &amp; Bin</th>
                  <th className="py-2.5 px-4">Component &amp; Compatibility</th>
                  <th className="py-2.5 px-4">Category &amp; Supplier</th>
                  <th className="py-2.5 px-4 text-right">Cost</th>
                  <th className="py-2.5 px-4 text-right">Retail</th>
                  <th className="py-2.5 px-4 text-right">On Hand</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredParts.map((part) => {
                  const isOut = part.quantity === 0;
                  const isLow = !isOut && part.quantity <= part.minStockLevel;
                  return (
                    <tr key={part.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <div className="font-mono text-xs font-semibold text-slate-900">
                          {part.sku}
                        </div>
                        <div className="font-mono text-[11px] text-slate-500">
                          Bin {part.binLocation}
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="font-medium text-slate-900">{part.name}</div>
                        <div className="text-xs text-slate-500">
                          {part.compatibleBrand} · {part.compatibleModels}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                        <div className="text-slate-800">{PART_CATEGORY_LABELS[part.category]}</div>
                        <div className="text-slate-500">{part.supplier || 'Direct'}</div>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs text-slate-600 whitespace-nowrap tabular-nums">
                        {formatCurrency(part.unitCostCents)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-xs font-medium text-slate-900 whitespace-nowrap tabular-nums">
                        {formatCurrency(part.retailPriceCents)}
                      </td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <div
                          className={`font-mono text-xs font-semibold tabular-nums ${
                            isOut
                              ? 'text-red-700'
                              : isLow
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                          }`}
                        >
                          {part.quantity}{' '}
                          <span className="font-normal text-slate-400">
                            / {part.minStockLevel} min
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {isOut ? 'Out of stock' : isLow ? 'Reorder needed' : 'Nominal'}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openStockAdjustmentModal(part)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                          >
                            <PackagePlus className="w-3.5 h-3.5" />
                            Stock
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditPartModal(part)}
                            aria-label={`Edit ${part.name}`}
                            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {confirmDeletePartId === part.id ? (
                            <button
                              type="button"
                              onClick={() => handleDeletePart(part.id)}
                              className="px-2 py-1 text-[11px] font-semibold text-white bg-red-600 rounded hover:bg-red-700 cursor-pointer"
                            >
                              Confirm
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeletePartId(part.id)}
                              aria-label={`Delete ${part.name}`}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-slate-100 cursor-pointer"
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
        )}
      </div>

      {/* Add / Edit Spare Part Modal */}
      {showPartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl max-w-xl w-full overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-slate-900">
                {editingPart ? `Edit Part ${editingPart.sku}` : 'Add Spare Part SKU'}
              </h2>
              <button
                type="button"
                onClick={() => setShowPartModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePartForm} className="p-6 space-y-4">
              {partError && (
                <div
                  role="alert"
                  className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800"
                >
                  {partError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">SKU *</label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={40}
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="APL-IP15P-OLED"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as PartCategory)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg"
                  >
                    {(Object.keys(PART_CATEGORY_LABELS) as PartCategory[]).map((cat) => (
                      <option key={cat} value={cat}>
                        {PART_CATEGORY_LABELS[cat]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Bin / Drawer *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={24}
                    value={binLocation}
                    onChange={(e) => setBinLocation(e.target.value)}
                    placeholder="A-01"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Component Name *
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={120}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="iPhone 15 Pro 120Hz Soft OLED Display Assembly"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Compatible Brand *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={50}
                    value={compatibleBrand}
                    onChange={(e) => setCompatibleBrand(e.target.value)}
                    placeholder="Apple"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Compatible Models / Board IDs *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={160}
                    value={compatibleModels}
                    onChange={(e) => setCompatibleModels(e.target.value)}
                    placeholder="iPhone 15 Pro (A2848, A3101)"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {!editingPart && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Opening Qty
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100000"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg tabular-nums"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Min Reorder
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10000"
                    value={minStockLevel}
                    onChange={(e) => setMinStockLevel(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Unit Cost ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100000"
                    value={unitCostDollars}
                    onChange={(e) => setUnitCostDollars(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Retail Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100000"
                    value={retailPriceDollars}
                    onChange={(e) => setRetailPriceDollars(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Primary Supplier
                </label>
                <input
                  type="text"
                  maxLength={80}
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="MobileSentrix, InjuredGadgets, iFixit Pro..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowPartModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={partSaving}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
                >
                  {partSaving ? 'Saving...' : editingPart ? 'Save Part Details' : 'Register SKU'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restock / Audit Adjustment Modal */}
      {stockModalPart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900">
                  Update Bin Stock
                </h2>
                <p className="font-mono text-xs text-slate-500 mt-0.5">
                  {stockModalPart.sku} · Bin {stockModalPart.binLocation}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStockModalPart(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCommitStockMovement} className="p-6 space-y-4">
              {stockError && (
                <div
                  role="alert"
                  className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800"
                >
                  {stockError}
                </div>
              )}

              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    setStockMode('restock');
                    if ((parseInt(stockDelta, 10) || 0) <= 0) setStockDelta('5');
                  }}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    stockMode === 'restock'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600'
                  }`}
                >
                  Receive Restock (+)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStockMode('adjustment');
                    setStockDelta('-1');
                  }}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    stockMode === 'adjustment'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600'
                  }`}
                >
                  Audit Adjustment (+/-)
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 items-center bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs">
                <div>
                  <span className="text-slate-500 block">Current On Hand</span>
                  <span className="font-mono text-base font-semibold text-slate-900 tabular-nums">
                    {stockModalPart.quantity}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Resulting Stock</span>
                  <span className="font-mono text-base font-semibold text-blue-700 tabular-nums">
                    {stockModalPart.quantity + (parseInt(stockDelta, 10) || 0)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {stockMode === 'restock'
                    ? 'Units Received *'
                    : 'Signed Quantity Delta (e.g. -1 or +2) *'}
                </label>
                <input
                  type="number"
                  required
                  min={stockMode === 'restock' ? 1 : -10000}
                  max={10000}
                  value={stockDelta}
                  onChange={(e) => setStockDelta(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  PO Reference or Audit Note
                </label>
                <input
                  type="text"
                  maxLength={300}
                  value={stockNote}
                  onChange={(e) => setStockNote(e.target.value)}
                  placeholder={
                    stockMode === 'restock'
                      ? 'PO #4821 — MobileSentrix shipment'
                      : 'Damaged flex during bench test'
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setStockModalPart(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={stockSaving}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
                >
                  {stockSaving ? 'Recording...' : 'Commit Stock Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
