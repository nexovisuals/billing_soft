import { API_BASE_URL } from '../config';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Boxes,
  Plus,
  Search,
  Building2,
  Truck,
  ArrowDownLeft,
  ArrowUpRight,
  X,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit2
} from 'lucide-react';
import { UserSession } from '../types';
import SlideOverDrawer from './common/SlideOverDrawer';
import CustomSelect from './common/CustomSelect';
import CustomUnitSelect from './common/CustomUnitSelect';

interface StockSummaryItem {
  companyId: string;
  companyName: string;
  currentBalance: number;
  lastUpdated: string | null;
  receiptsCount: number;
  challansCount: number;
}

interface RawMaterialReceipt {
  id: string;
  receiptDate: string;
  materialName: string;
  partNumber?: string | null;
  quantity: string | number;
  uom: string;
  challanNumber?: string | null;
  vehicleNumber?: string | null;
  remarks?: string | null;
  company: {
    id: string;
    name: string;
  };
}

interface StockLedgerEntry {
  id: string;
  transactionDate: string;
  movementType: string;
  quantityIn: string | number;
  quantityOut: string | number;
  balance: string | number;
  remarks?: string | null;
  company: {
    name: string;
  };
}

interface StockManagerProps {
  session: UserSession;
}

export default function StockManager({ session }: StockManagerProps) {
  const [activeSubTab, setActiveSubTab] = useState<'receipts' | 'ledger'>('receipts');
  const [summaries, setSummaries] = useState<StockSummaryItem[]>([]);
  const [receipts, setReceipts] = useState<RawMaterialReceipt[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<StockLedgerEntry[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedCompanyBalance, setSelectedCompanyBalance] = useState<number>(0);
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // Modal States
  const [inwardModalOpen, setInwardModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [editingReceiptId, setEditingReceiptId] = useState<string | null>(null);

  // Inward Form State
  const [inwardForm, setInwardForm] = useState({
    companyId: '',
    materialName: '',
    partNumber: '',
    quantity: '',
    uom: '',
    challanNumber: '',
    vehicleNumber: '',
    remarks: '',
  });

  // Adjust Form State
  const [adjustForm, setAdjustForm] = useState({
    companyId: '',
    movementType: 'ISSUED_MACHINING',
    quantityOut: '',
    remarks: '',
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch summaries and companies on mount
  useEffect(() => {
    fetchStockSummary();
    fetchReceipts();
  }, []);

  const fetchStockSummary = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/stock/summary`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const data = await res.json();
      if (res.ok && data.summary) {
        setSummaries(data.summary);
        setCompanies(data.summary.map((s: StockSummaryItem) => ({ id: s.companyId, name: s.companyName })));
        if (data.summary.length > 0 && !selectedCompanyId) {
          setSelectedCompanyId(data.summary[0].companyId);
          fetchLedger(data.summary[0].companyId);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/stock/receipts`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const data = await res.json();
      if (res.ok && data.receipts) {
        setReceipts(data.receipts);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLedger = async (companyId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/stock/ledger?companyId=${companyId}`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const data = await res.json();
      if (res.ok && data.ledger) {
        setLedgerEntries(data.ledger);
        setSelectedCompanyBalance(data.currentBalance || 0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCompanySelectForLedger = (id: string) => {
    setSelectedCompanyId(id);
    fetchLedger(id);
  };

  const openEditReceipt = (rec: RawMaterialReceipt) => {
    setEditingReceiptId(rec.id);
    setInwardForm({
      companyId: rec.company.id,
      materialName: rec.materialName,
      partNumber: rec.partNumber || '',
      quantity: rec.quantity.toString(),
      uom: rec.uom || '',
      challanNumber: rec.challanNumber || '',
      vehicleNumber: rec.vehicleNumber || '',
      remarks: rec.remarks || '',
    });
    setFormError(null);
    setInwardModalOpen(true);
  };

  const handleInwardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inwardForm.companyId || !inwardForm.materialName || !inwardForm.quantity) {
      setFormError('Company, raw material name, and quantity are required.');
      return;
    }

    try {
      setFormError(null);
      const url = editingReceiptId
        ? `${API_BASE_URL}/api/stock/receipts/${editingReceiptId}`
        : `${API_BASE_URL}/api/stock/receipts`;
      const method = editingReceiptId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          ...inwardForm,
          uom: inwardForm.uom || 'kg',
          quantity: parseFloat(inwardForm.quantity),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to record receipt');
      }

      setNotification({
        type: 'success',
        message: editingReceiptId
          ? 'Inward raw material updated successfully!'
          : `Inward raw material recorded! New Balance: ${data.newBalance || ''} kg`,
      });
      setTimeout(() => setNotification(null), 3500);

      setInwardModalOpen(false);
      setEditingReceiptId(null);
      setInwardForm({
        companyId: '',
        materialName: '',
        partNumber: '',
        quantity: '',
        uom: '',
        challanNumber: '',
        vehicleNumber: '',
        remarks: '',
      });
      fetchStockSummary();
      fetchReceipts();
      if (selectedCompanyId) fetchLedger(selectedCompanyId);
    } catch (err: any) {
      setFormError(err.message || 'Operation failed');
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustForm.companyId || !adjustForm.quantityOut) {
      setFormError('Company and outward/scrap quantity are required.');
      return;
    }

    try {
      setFormError(null);
      const res = await fetch(`${API_BASE_URL}/api/stock/movement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          companyId: adjustForm.companyId,
          movementType: adjustForm.movementType,
          quantityIn: 0,
          quantityOut: parseFloat(adjustForm.quantityOut),
          remarks: adjustForm.remarks,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to record movement');
      }

      setNotification({
        type: 'success',
        message: `Stock movement recorded! New Balance: ${data.newBalance} kg`,
      });
      setTimeout(() => setNotification(null), 3500);

      setAdjustModalOpen(false);
      setAdjustForm({
        companyId: selectedCompanyId || '',
        movementType: 'ISSUED_MACHINING',
        quantityOut: '',
        remarks: '',
      });
      fetchStockSummary();
      if (selectedCompanyId) fetchLedger(selectedCompanyId);
    } catch (err: any) {
      setFormError(err.message || 'Operation failed');
    }
  };

  const handleDeleteReceipt = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this inward receipt? The stock ledger balance will be automatically adjusted.')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/stock/receipts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (res.ok) {
        setNotification({ type: 'success', message: 'Inward receipt deleted and ledger reversed' });
        setTimeout(() => setNotification(null), 3000);
        fetchReceipts();
        fetchStockSummary();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete receipt');
      }
    } catch (e: any) {
      alert(e.message || 'Error deleting receipt');
    }
  };

  const totalWorkshopStock = summaries.reduce((acc, s) => acc + s.currentBalance, 0);

  const filteredReceipts = receipts.filter(r =>
    r.company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.challanNumber && r.challanNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-2xl border text-xs font-medium flex items-center justify-between ${
              notification.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600" />
              )}
              <span>{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600 whitespace-nowrap">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Controls & KPI Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-base font-semibold text-slate-900 tracking-tight">Raw Material Inventory & Ledgers</h2>
          <p className="text-xs text-slate-500 font-normal">
            Track customer-owned raw steel receipts, machine shop issues, and company balances
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setFormError(null);
              setAdjustModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-medium transition-colors whitespace-nowrap"
          >
            <ArrowUpRight className="w-4 h-4 text-slate-500" />
            <span>Issue / Scrap</span>
          </button>

          <button
            onClick={() => {
              setEditingReceiptId(null);
              setInwardForm({
                companyId: '',
                materialName: '',
                partNumber: '',
                quantity: '',
                uom: '',
                challanNumber: '',
                vehicleNumber: '',
                remarks: '',
              });
              setFormError(null);
              setInwardModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-slate-300 text-slate-900 text-xs font-semibold hover:bg-slate-50 hover:border-slate-400 active:scale-[0.99] transition-all shadow-2xs whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Record Inward Stock</span>
          </button>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-6 rounded-3xl border border-slate-200 bg-white shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Raw Stock in Workshop</span>
            <span className="w-8 h-8 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700">
              <Boxes className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-semibold text-slate-900 tracking-tight">
              {totalWorkshopStock.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg
            </div>
            <div className="text-xs text-slate-500 font-normal mt-1">Across all registered clients</div>
          </div>
        </div>

        <div className="p-6 rounded-3xl border border-slate-200 bg-white shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Customer Inward Slips</span>
            <span className="w-8 h-8 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700">
              <ArrowDownLeft className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-semibold text-slate-900 tracking-tight">{receipts.length} Receipts</div>
            <div className="text-xs text-slate-500 font-normal mt-1">Logged with customer delivery notes</div>
          </div>
        </div>

        <div className="p-6 rounded-3xl border border-slate-200 bg-white shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Negative Stock Protection</span>
            <span className="w-8 h-8 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-semibold text-xs border border-emerald-200">
              Active
            </span>
          </div>
          <div className="mt-4">
            <div className="text-base font-semibold text-slate-900 tracking-tight">Zero Unauthorized Negatives</div>
            <div className="text-xs text-slate-500 font-normal mt-1">Enforced at database and API levels</div>
          </div>
        </div>
      </div>

      {/* Sub-Tabs: Inward Receipts vs Company Stock Ledger */}
      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
        <button
          onClick={() => setActiveSubTab('receipts')}
          className={`px-4 py-2 rounded-2xl text-xs font-medium transition-all ${
            activeSubTab === 'receipts'
              ? 'bg-slate-100 border border-slate-300 text-slate-900 font-semibold shadow-2xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
          } whitespace-nowrap`}
        >
          Customer Inward Receipts ({receipts.length})
        </button>
        <button
          onClick={() => setActiveSubTab('ledger')}
          className={`px-4 py-2 rounded-2xl text-xs font-medium transition-all ${
            activeSubTab === 'ledger'
              ? 'bg-slate-100 border border-slate-300 text-slate-900 font-semibold shadow-2xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
          } whitespace-nowrap`}
        >
          Company-Wise Stock Ledger
        </button>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* VIEW 1: RAW MATERIAL INWARD RECEIPTS TABLE                   */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeSubTab === 'receipts' && (
        <div className="space-y-4">
          <div className="p-4 rounded-3xl border border-slate-200 bg-white shadow-subtle flex items-center gap-3">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 text-xs w-full sm:w-80 focus-within:border-slate-400 focus-within:bg-white transition-all">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by customer, material, DC no..."
                className="bg-transparent border-none outline-none w-full placeholder:text-slate-400 font-normal"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white shadow-subtle overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-400 font-medium">
                    <th className="py-3.5 px-6 font-medium whitespace-nowrap text-left">RECEIPT DATE</th>
                    <th className="py-3.5 px-4 font-medium whitespace-nowrap text-left">CUSTOMER COMPANY</th>
                    <th className="py-3.5 px-4 font-medium whitespace-nowrap text-left">RAW MATERIAL / GRADE</th>
                    <th className="py-3.5 px-4 font-medium whitespace-nowrap text-left">QUANTITY</th>
                    <th className="py-3.5 px-4 font-medium whitespace-nowrap text-left">CUSTOMER DC NO</th>
                    <th className="py-3.5 px-6 font-medium whitespace-nowrap text-left">VEHICLE / TRANSPORTER</th>
                    {session.role === 'ADMIN' && (
                      <th className="py-3.5 px-4 font-medium whitespace-nowrap text-left">ACTIONS</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 whitespace-nowrap">
                        Loading inward receipts...
                      </td>
                    </tr>
                  ) : filteredReceipts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 whitespace-nowrap">
                        No customer inward receipts found. Click "+ Record Inward Stock" above.
                      </td>
                    </tr>
                  ) : (
                    filteredReceipts.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-4 px-6 text-slate-500 font-normal whitespace-nowrap">
                          {new Date(rec.receiptDate).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-4 px-4 font-semibold text-slate-900 whitespace-nowrap">
                          {rec.company?.name}
                        </td>
                        <td className="py-4 px-4 font-medium text-slate-800 whitespace-nowrap">
                          {rec.materialName}
                          {rec.partNumber && (
                            <span className="text-[11px] text-slate-400 font-mono ml-2">
                              (Part: {rec.partNumber})
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="font-semibold text-slate-900 text-xs">
                            {Number(rec.quantity).toLocaleString('en-IN')} {rec.uom}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                          {rec.challanNumber ? (
                            <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {rec.challanNumber}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">None</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-slate-500 whitespace-nowrap">
                          {rec.vehicleNumber ? (
                            <div className="flex items-center gap-1">
                              <Truck className="w-3.5 h-3.5 text-slate-400" />
                              <span>{rec.vehicleNumber}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">-</span>
                          )}
                        </td>
                        {session.role === 'ADMIN' && (
                          <td className="py-4 px-4 text-left whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => openEditReceipt(rec)}
                                title="Edit Inward Receipt"
                                className="w-7 h-7 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors whitespace-nowrap"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteReceipt(rec.id)}
                                title="Delete Inward Receipt"
                                className="w-7 h-7 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors whitespace-nowrap"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* VIEW 2: COMPANY-WISE STOCK LEDGER                            */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeSubTab === 'ledger' && (
        <div className="space-y-5">
          {/* Company Selector Ribbon */}
          <div className="p-5 rounded-3xl border border-slate-200 bg-white shadow-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="w-56 sm:w-64">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Customer Company Ledger
                </label>
                <CustomSelect
                  value={selectedCompanyId}
                  onChange={(val) => handleCompanySelectForLedger(val)}
                  options={companies.map((c) => ({
                    value: c.id,
                    label: c.name,
                  }))}
                  placeholder="-- Select Company --"
                />
              </div>
            </div>

            <div className="p-3 px-5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-4">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-medium">Available Balance</div>
                <div className="text-lg font-semibold text-slate-900 tracking-tight">
                  {selectedCompanyBalance.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg
                </div>
              </div>
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
          </div>

          {/* Ledger Table */}
          <div className="rounded-3xl border border-slate-200 bg-white shadow-subtle overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-400 font-medium">
                    <th className="py-3.5 px-6 font-medium whitespace-nowrap text-left">DATE</th>
                    <th className="py-3.5 px-4 font-medium whitespace-nowrap text-left">MOVEMENT TYPE</th>
                    <th className="py-3.5 px-4 font-medium whitespace-nowrap text-left">IN (+)</th>
                    <th className="py-3.5 px-4 font-medium whitespace-nowrap text-left">OUT (-)</th>
                    <th className="py-3.5 px-4 font-medium whitespace-nowrap text-left">RUNNING BALANCE</th>
                    <th className="py-3.5 px-6 font-medium whitespace-nowrap text-left">REMARKS / REFERENCE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ledgerEntries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 whitespace-nowrap">
                        No transactions recorded for this company yet.
                      </td>
                    </tr>
                  ) : (
                    ledgerEntries.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-6 text-slate-500 font-normal whitespace-nowrap">
                          {new Date(row.transactionDate).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                              row.movementType === 'INWARD_RECEIPT'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : row.movementType === 'ISSUED_MACHINING'
                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                : row.movementType === 'SCRAP_WASTAGE'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {row.movementType.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-emerald-600 whitespace-nowrap">
                          {Number(row.quantityIn) > 0 ? `+${Number(row.quantityIn)} kg` : '-'}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-rose-600 whitespace-nowrap">
                          {Number(row.quantityOut) > 0 ? `-${Number(row.quantityOut)} kg` : '-'}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                          {Number(row.balance).toLocaleString('en-IN')} kg
                        </td>
                        <td className="py-3.5 px-6 text-slate-500 font-normal whitespace-nowrap">
                          {row.remarks || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between text-xs text-slate-500">
              <span>Showing {ledgerEntries.length} ledger transactions</span>
              <span className="font-medium text-slate-700">Audit-Ready Historical Trail</span>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* MODAL 1: RECORD RAW MATERIAL ARRIVAL SLIDE-OVER DRAWER       */}
      {/* ──────────────────────────────────────────────────────────── */}
      <SlideOverDrawer
        isOpen={inwardModalOpen}
        onClose={() => setInwardModalOpen(false)}
        title={editingReceiptId ? "Edit Inward Material" : "Record Customer Raw Material Arrival"}
        subtitle={editingReceiptId ? "Update receipt and adjust customer stock ledger" : "Adds incoming steel to customer stock ledger"}
        footer={
          <>
            <button
              type="button"
              onClick={() => setInwardModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="inward-form"
              className="px-5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-semibold hover:bg-slate-50 hover:border-slate-400 active:scale-95 transition-all shadow-2xs whitespace-nowrap"
            >
              {editingReceiptId ? 'Update Receipt' : 'Save & Update Stock'}
            </button>
          </>
        }
      >
        {formError && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form id="inward-form" onSubmit={handleInwardSubmit} className="space-y-4">
          {/* Company Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Customer Company *</label>
            <CustomSelect
              value={inwardForm.companyId}
              onChange={(val) => setInwardForm({ ...inwardForm, companyId: val })}
              options={companies.map((c) => ({
                value: c.id,
                label: c.name,
              }))}
              placeholder="-- Select Customer Company --"
            />
          </div>

          {/* Raw Material Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Raw Material / Steel Grade *</label>
            <input
              type="text"
              required
              value={inwardForm.materialName}
              onChange={(e) => setInwardForm({ ...inwardForm, materialName: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 outline-none focus:border-slate-300 font-normal"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Quantity */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Received Quantity (Weight) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={inwardForm.quantity}
                onChange={(e) => setInwardForm({ ...inwardForm, quantity: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 font-normal outline-none focus:border-slate-300"
              />
            </div>

            {/* UOM */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Unit of Measurement</label>
              <CustomUnitSelect
                value={inwardForm.uom}
                onChange={(val) => setInwardForm({ ...inwardForm, uom: val })}
                placeholder="-- Select Unit --"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Customer DC Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Customer Delivery Note / DC No</label>
              <input
                type="text"
                value={inwardForm.challanNumber}
                onChange={(e) => setInwardForm({ ...inwardForm, challanNumber: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 font-mono outline-none focus:border-slate-300"
              />
            </div>

            {/* Vehicle Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Vehicle / Transporter</label>
              <input
                type="text"
                value={inwardForm.vehicleNumber}
                onChange={(e) => setInwardForm({ ...inwardForm, vehicleNumber: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 outline-none focus:border-slate-300"
              />
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Remarks (Optional)</label>
            <input
              type="text"
              value={inwardForm.remarks}
              onChange={(e) => setInwardForm({ ...inwardForm, remarks: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 outline-none focus:border-slate-300"
            />
          </div>
        </form>
      </SlideOverDrawer>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* MODAL 2: ISSUE TO MACHINES / SCRAP ADJUSTMENT SLIDE-OVER     */}
      {/* ──────────────────────────────────────────────────────────── */}
      <SlideOverDrawer
        isOpen={adjustModalOpen}
        onClose={() => setAdjustModalOpen(false)}
        title="Record Stock Outward / Scrap"
        subtitle="Issues raw stock to machining or records scrap"
        footer={
          <>
            <button
              type="button"
              onClick={() => setAdjustModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="adjust-form"
              className="px-5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-semibold hover:bg-slate-50 hover:border-slate-400 active:scale-95 transition-all shadow-2xs whitespace-nowrap"
            >
              Record Movement
            </button>
          </>
        }
      >
        {formError && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form id="adjust-form" onSubmit={handleAdjustSubmit} className="space-y-4">
          {/* Company Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Customer Company *</label>
            <CustomSelect
              value={adjustForm.companyId}
              onChange={(val) => setAdjustForm({ ...adjustForm, companyId: val })}
              options={companies.map((c) => ({
                value: c.id,
                label: c.name,
              }))}
              placeholder="-- Select Customer Company --"
            />
          </div>

          {/* Movement Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Movement Operation *</label>
            <CustomSelect
              value={adjustForm.movementType}
              onChange={(val) => setAdjustForm({ ...adjustForm, movementType: val })}
              options={[
                { value: 'ISSUED_MACHINING', label: 'Issue to Machine Shop (Production)' },
                { value: 'SCRAP_WASTAGE', label: 'Scrap / Machining Wastage' },
                { value: 'RETURNED_RAW', label: 'Return Raw Stock to Customer' },
              ]}
              searchable={false}
            />
          </div>

          {/* Outward Quantity */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Quantity (kg) *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={adjustForm.quantityOut}
              onChange={(e) => setAdjustForm({ ...adjustForm, quantityOut: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 font-semibold outline-none focus:border-slate-300"
            />
            <div className="text-[11px] text-slate-400">
              System verifies that quantity does not exceed current stock.
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Remarks / Reason</label>
            <input
              type="text"
              value={adjustForm.remarks}
              onChange={(e) => setAdjustForm({ ...adjustForm, remarks: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 outline-none focus:border-slate-300"
            />
          </div>
        </form>
      </SlideOverDrawer>
    </div>
  );
}
