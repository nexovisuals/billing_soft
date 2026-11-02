import { API_BASE_URL } from '../config';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  Plus,
  Search,
  Trash2,
  Edit2,
  X,
  CheckCircle2,
  AlertCircle,
  Wrench,
  Zap,
  Tag
} from 'lucide-react';
import { UserSession } from '../types';
import SlideOverDrawer from './common/SlideOverDrawer';
import CustomSelect from './common/CustomSelect';
import CustomUnitSelect from './common/CustomUnitSelect';
import CustomDatePicker from './common/CustomDatePicker';

interface PurchaseItem {
  id: string;
  purchaseDate: string;
  supplierName?: string | null;
  itemName: string;
  category: string;
  quantity: string | number;
  uom: string;
  unitPrice: string | number;
  totalAmount: string | number;
  supplierBillNo?: string | null;
  paymentStatus: string;
  remarks?: string | null;
}

interface OtherExpenseItem {
  id: string;
  expenseDate: string;
  category: string;
  description: string;
  amount: string | number;
  paymentMode?: string | null;
  referenceNo?: string | null;
  remarks?: string | null;
}

interface ExpenseManagerProps {
  session: UserSession;
}

export default function ExpenseManager({ session }: ExpenseManagerProps) {
  const [activeTab, setActiveTab] = useState<'purchases' | 'operating'>('purchases');
  const [purchases, setPurchases] = useState<PurchaseItem[]>([]);
  const [expenses, setExpenses] = useState<OtherExpenseItem[]>([]);
  const [summary, setSummary] = useState({
    totalPurchases: 0,
    totalOperating: 0,
    totalOutflow: 0,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);

  // Modals
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Purchase Form Fields
  const [purSupplier, setPurSupplier] = useState('');
  const [purItem, setPurItem] = useState('');
  const [purCategory, setPurCategory] = useState('Tooling');
  const [purQty, setPurQty] = useState<number | ''>('');
  const [purUom, setPurUom] = useState('pcs');
  const [purPrice, setPurPrice] = useState<number | ''>('');
  const [purBillNo, setPurBillNo] = useState('');
  const [purStatus, setPurStatus] = useState('PAID');
  const [purDate, setPurDate] = useState(new Date().toISOString().split('T')[0]);
  const [purRemarks, setPurRemarks] = useState('');

  // Operating Expense Form Fields
  const [expCategory, setExpCategory] = useState('Electricity (EB)');
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState<number | ''>('');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expMode, setExpMode] = useState('Net Banking');
  const [expRefNo, setExpRefNo] = useState('');
  const [expRemarks, setExpRemarks] = useState('');

  // Delete ID
  const [deleteId, setDeleteId] = useState<{ id: string; type: 'purchase' | 'operating' } | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [purRes, expRes, sumRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/expenses/purchases`, {
          headers: { Authorization: `Bearer ${session.token}` },
        }),
        fetch(`${API_BASE_URL}/api/expenses/operating`, {
          headers: { Authorization: `Bearer ${session.token}` },
        }),
        fetch(`${API_BASE_URL}/api/expenses/summary`, {
          headers: { Authorization: `Bearer ${session.token}` },
        }),
      ]);

      if (purRes.ok) {
        const purData = await purRes.json();
        setPurchases(purData.purchases || []);
      }
      if (expRes.ok) {
        const expData = await expRes.json();
        setExpenses(expData.expenses || []);
      }
      if (sumRes.ok) {
        const sumData = await sumRes.json();
        setSummary(sumData);
      }
    } catch (err) {
      console.error('Failed to load expenses data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [session.token]);

  const openEditPurchase = (p: PurchaseItem) => {
    setEditingPurchaseId(p.id);
    setPurSupplier(p.supplierName || '');
    setPurItem(p.itemName);
    setPurCategory(p.category);
    setPurQty(Number(p.quantity));
    setPurUom(p.uom);
    setPurPrice(Number(p.unitPrice));
    setPurBillNo(p.supplierBillNo || '');
    setPurStatus(p.paymentStatus || 'PAID');
    setPurDate(p.purchaseDate ? p.purchaseDate.split('T')[0] : new Date().toISOString().split('T')[0]);
    setPurRemarks(p.remarks || '');
    setFormError(null);
    setPurchaseModalOpen(true);
  };

  const openEditExpense = (e: OtherExpenseItem) => {
    setEditingExpenseId(e.id);
    setExpCategory(e.category);
    setExpDesc(e.description);
    setExpAmount(Number(e.amount));
    setExpDate(e.expenseDate ? e.expenseDate.split('T')[0] : new Date().toISOString().split('T')[0]);
    setExpMode(e.paymentMode || 'Net Banking');
    setExpRefNo(e.referenceNo || '');
    setExpRemarks(e.remarks || '');
    setFormError(null);
    setExpenseModalOpen(true);
  };

  // Submit Purchase
  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!purItem.trim()) {
      setFormError('Item name is required');
      return;
    }
    if (!purQty || purQty <= 0 || !purPrice || purPrice < 0) {
      setFormError('Valid quantity and price are required');
      return;
    }

    try {
      setLoading(true);
      const computedTotal = Math.round(Number(purQty) * Number(purPrice) * 100) / 100;
      const url = editingPurchaseId
        ? `${API_BASE_URL}/api/expenses/purchases/${editingPurchaseId}`
        : `${API_BASE_URL}/api/expenses/purchases`;
      const method = editingPurchaseId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          supplierName: purSupplier || undefined,
          itemName: purItem,
          category: purCategory,
          quantity: Number(purQty),
          uom: purUom,
          unitPrice: Number(purPrice),
          totalAmount: computedTotal,
          supplierBillNo: purBillNo || undefined,
          paymentStatus: purStatus,
          purchaseDate: purDate,
          remarks: purRemarks || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save purchase');
      }

      setNotification({
        type: 'success',
        message: data.message || `Purchase of ${purItem} saved successfully`,
      });
      setPurchaseModalOpen(false);
      setEditingPurchaseId(null);
      // Reset
      setPurItem('');
      setPurSupplier('');
      setPurPrice('');
      setPurBillNo('');
      setPurRemarks('');
      fetchData();
    } catch (err: any) {
      setFormError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Submit Operating Expense
  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!expDesc.trim()) {
      setFormError('Expense description is required');
      return;
    }
    if (!expAmount || expAmount <= 0) {
      setFormError('Valid expense amount is required');
      return;
    }

    try {
      setLoading(true);
      const url = editingExpenseId
        ? `${API_BASE_URL}/api/expenses/operating/${editingExpenseId}`
        : `${API_BASE_URL}/api/expenses/operating`;
      const method = editingExpenseId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          category: expCategory,
          description: expDesc,
          amount: Number(expAmount),
          expenseDate: expDate,
          paymentMode: expMode,
          referenceNo: expRefNo || undefined,
          remarks: expRemarks || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save expense');
      }

      setNotification({
        type: 'success',
        message: data.message || `Expense saved successfully`,
      });
      setExpenseModalOpen(false);
      setEditingExpenseId(null);
      setExpDesc('');
      setExpAmount('');
      setExpRefNo('');
      setExpRemarks('');
      fetchData();
    } catch (err: any) {
      setFormError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Delete item
  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      setLoading(true);
      const endpoint =
        deleteId.type === 'purchase'
          ? `${API_BASE_URL}/api/expenses/purchases/${deleteId.id}`
          : `${API_BASE_URL}/api/expenses/operating/${deleteId.id}`;

      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.token}` },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete record');
      }

      setNotification({
        type: 'success',
        message: data.message || 'Record deleted successfully',
      });
      setDeleteId(null);
      fetchData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to delete record',
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter lists
  const filteredPurchases = purchases.filter(p => {
    const matchesSearch =
      p.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.supplierName && p.supplierName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.supplierBillNo && p.supplierBillNo.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory =
      categoryFilter === 'ALL' || p.category.toLowerCase() === categoryFilter.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  const filteredExpenses = expenses.filter(e => {
    const matchesSearch =
      e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.referenceNo && e.referenceNo.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory =
      categoryFilter === 'ALL' || e.category.toLowerCase() === categoryFilter.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-2xl flex items-center justify-between border ${
              notification.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="p-1 hover:bg-slate-200/50 rounded-lg whitespace-nowrap"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Cash Outflow
            </span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-semibold text-slate-900 tracking-tight">
              ₹{summary.totalOutflow.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
            <span className="text-xs text-slate-500 ml-2">total expenditure</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Tooling & Spares Purchases
            </span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-semibold text-slate-900 tracking-tight">
              ₹{summary.totalPurchases.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
            <span className="text-xs text-slate-500 ml-2">inserts, oil, spares</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Monthly Utilities & Admin
            </span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-semibold text-slate-900 tracking-tight">
              ₹{summary.totalOperating.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
            <span className="text-xs text-slate-500 ml-2">electricity, rent, repairs</span>
          </div>
        </div>
      </div>

      {/* Sub-Tabs Switcher & Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Module Switcher Tabs */}
        <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-100 border border-slate-200/80">
          <button
            onClick={() => {
              setActiveTab('purchases');
              setCategoryFilter('ALL');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'purchases'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-950'
            } whitespace-nowrap`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Workshop Purchases & Tooling</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('operating');
              setCategoryFilter('ALL');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'operating'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-950'
            } whitespace-nowrap`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Operating Expenses & Utilities</span>
          </button>
        </div>

        {/* Search & Action Buttons */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search ${activeTab === 'purchases' ? 'tools, spares, supplier...' : 'expenses, EB, rent...'}`}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-2xl bg-white border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-300 shadow-sm"
            />
          </div>

          {(session.role === 'ADMIN' || session.role === 'STAFF') && (
            activeTab === 'purchases' ? (
              <button
                onClick={() => {
                  setEditingPurchaseId(null);
                  setPurItem('');
                  setPurSupplier('');
                  setPurPrice('');
                  setPurBillNo('');
                  setPurRemarks('');
                  setFormError(null);
                  setPurchaseModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-slate-300 text-slate-900 text-xs font-semibold hover:bg-slate-50 hover:border-slate-400 transition-all shadow-2xs whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Add Tooling / Spare Purchase</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setEditingExpenseId(null);
                  setExpDesc('');
                  setExpAmount('');
                  setExpRefNo('');
                  setExpRemarks('');
                  setFormError(null);
                  setExpenseModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-slate-300 text-slate-900 text-xs font-semibold hover:bg-slate-50 hover:border-slate-400 transition-all shadow-2xs whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Record Utility Expense</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Content View 1: Purchases Table */}
      {activeTab === 'purchases' ? (
        <div className="bg-white border border-slate-200/80 rounded-3xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 whitespace-nowrap text-left">Date</th>
                  <th className="py-3.5 px-4 whitespace-nowrap text-left">Item & Tool Description</th>
                  <th className="py-3.5 px-4 whitespace-nowrap text-left">Category</th>
                  <th className="py-3.5 px-4 whitespace-nowrap text-left">Supplier & Bill No</th>
                  <th className="py-3.5 px-4 text-left whitespace-nowrap">Quantity</th>
                  <th className="py-3.5 px-4 text-left whitespace-nowrap">Unit Price</th>
                  <th className="py-3.5 px-4 text-left whitespace-nowrap">Total Amount (₹)</th>
                  <th className="py-3.5 px-4 text-left whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 whitespace-nowrap">
                      Loading workshop purchases...
                    </td>
                  </tr>
                ) : filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 whitespace-nowrap">
                      <Wrench className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      No workshop tooling or spares purchases found. Click "+ Add Tooling / Spare Purchase" to log workshop supplies.
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 text-slate-600 font-medium whitespace-nowrap">
                        {new Date(p.purchaseDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        {p.itemName}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          <Tag className="w-3 h-3 text-slate-500" />
                          <span>{p.category}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-900">{p.supplierName || 'Local Supplier'}</div>
                        {p.supplierBillNo && (
                          <div className="text-[10px] text-slate-500 font-mono">
                            Bill #{p.supplierBillNo}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-left font-medium text-slate-800 whitespace-nowrap">
                        {parseFloat(p.quantity.toString())} {p.uom}
                      </td>
                      <td className="py-3 px-4 text-left text-slate-600 whitespace-nowrap">
                        ₹{parseFloat(p.unitPrice.toString()).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-left font-semibold text-slate-950 text-xs whitespace-nowrap">
                        ₹{parseFloat(p.totalAmount.toString()).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-left whitespace-nowrap">
                        {session.role === 'ADMIN' ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditPurchase(p)}
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors whitespace-nowrap"
                              title="Edit Purchase"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteId({ id: p.id, type: 'purchase' })}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors whitespace-nowrap"
                              title="Delete Purchase"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">View Only</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Content View 2: Operating Expenses Table */
        <div className="bg-white border border-slate-200/80 rounded-3xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 whitespace-nowrap text-left">Date</th>
                  <th className="py-3.5 px-4 whitespace-nowrap text-left">Expense Category</th>
                  <th className="py-3.5 px-4 whitespace-nowrap text-left">Description</th>
                  <th className="py-3.5 px-4 whitespace-nowrap text-left">Payment Mode</th>
                  <th className="py-3.5 px-4 whitespace-nowrap text-left">Ref / Receipt No</th>
                  <th className="py-3.5 px-4 text-left whitespace-nowrap">Amount (₹)</th>
                  <th className="py-3.5 px-4 text-left whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 whitespace-nowrap">
                      Loading utility expenses...
                    </td>
                  </tr>
                ) : filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 whitespace-nowrap">
                      <Zap className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      No operating expenses recorded yet. Click "+ Record Utility Expense" to track EB bills, workshop rent, and maintenance.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map(e => (
                    <tr key={e.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 text-slate-600 font-medium whitespace-nowrap">
                        {new Date(e.expenseDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-800 border border-slate-200">
                          {e.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">
                        {e.description}
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {e.paymentMode || 'Net Banking'}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {e.referenceNo || '—'}
                      </td>
                      <td className="py-3 px-4 text-left font-semibold text-slate-950 text-xs whitespace-nowrap">
                        ₹{parseFloat(e.amount.toString()).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-left whitespace-nowrap">
                        {session.role === 'ADMIN' ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditExpense(e)}
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors whitespace-nowrap"
                              title="Edit Expense"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteId({ id: e.id, type: 'operating' })}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors whitespace-nowrap"
                              title="Delete Expense"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">View Only</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slide-Over Drawer: Add Workshop Purchase */}
      <SlideOverDrawer
        isOpen={purchaseModalOpen}
        onClose={() => setPurchaseModalOpen(false)}
        title={editingPurchaseId ? "Edit Tooling / Spare Purchase" : "Add Tooling / Spare Purchase"}
        subtitle="Record carbide inserts, cutting oil, spares, and hardware"
        footer={
          <>
            <button
              type="button"
              onClick={() => setPurchaseModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="purchase-form"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-semibold hover:bg-slate-50 hover:border-slate-400 disabled:opacity-50 active:scale-95 transition-all shadow-2xs whitespace-nowrap"
            >
              {loading ? 'Recording...' : 'Record Purchase'}
            </button>
          </>
        }
      >
        {formError && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{formError}</span>
          </div>
        )}

        <form id="purchase-form" onSubmit={handlePurchaseSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Item / Tool Name *
            </label>
            <input
              type="text"
              required
              value={purItem}
              onChange={(e) => setPurItem(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:border-slate-300 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Category *
              </label>
              <CustomSelect
                value={purCategory}
                onChange={(val) => setPurCategory(val)}
                options={[
                  { value: 'Tooling', label: 'Tooling (Inserts, Cutters)' },
                  { value: 'Coolant/Oil', label: 'Coolant / Hydraulic Oil' },
                  { value: 'Spares', label: 'Machine Spares' },
                  { value: 'Consumables', label: 'Consumables & Grinding' },
                  { value: 'Hardware', label: 'Hardware & Fasteners' },
                ]}
                searchable={false}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Supplier Name
              </label>
              <input
                type="text"
                value={purSupplier}
                onChange={(e) => setPurSupplier(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:border-slate-300 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Quantity *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={purQty}
                onChange={(e) => setPurQty(parseFloat(e.target.value) || '')}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:border-slate-300 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Unit (UOM)
              </label>
              <CustomUnitSelect
                value={purUom}
                onChange={(val) => setPurUom(val)}
                placeholder="-- Select Unit --"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Unit Price (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={purPrice}
                onChange={(e) => setPurPrice(parseFloat(e.target.value) || '')}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:border-slate-300 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Supplier Bill No
              </label>
              <input
                type="text"
                value={purBillNo}
                onChange={(e) => setPurBillNo(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 font-mono focus:border-slate-300 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Payment Status
              </label>
              <CustomSelect
                value={purStatus}
                onChange={(val) => setPurStatus(val)}
                options={[
                  { value: 'PAID', label: 'Paid' },
                  { value: 'PENDING', label: 'Pending / Due' },
                ]}
                searchable={false}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Purchase Date *
              </label>
              <CustomDatePicker
                value={purDate}
                onChange={setPurDate}
                required
              />
            </div>
          </div>

          {purQty && purPrice ? (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between font-medium">
              <span className="text-slate-600">Total Purchase Value:</span>
              <span className="font-semibold text-slate-950">
                ₹{(Number(purQty) * Number(purPrice)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          ) : null}
        </form>
      </SlideOverDrawer>

      {/* Slide-Over Drawer: Record Operating Expense */}
      <SlideOverDrawer
        isOpen={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        title={editingExpenseId ? "Edit Utility Expense" : "Record Operating Utility Expense"}
        subtitle="Log electricity bills, workshop rent, repairs, and overheads"
        footer={
          <>
            <button
              type="button"
              onClick={() => setExpenseModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="expense-form"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-semibold hover:bg-slate-50 hover:border-slate-400 disabled:opacity-50 active:scale-95 transition-all shadow-2xs whitespace-nowrap"
            >
              {loading ? 'Recording...' : 'Record Expense'}
            </button>
          </>
        }
      >
        {formError && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{formError}</span>
          </div>
        )}

        <form id="expense-form" onSubmit={handleExpenseSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Expense Category *
              </label>
              <CustomSelect
                value={expCategory}
                onChange={(val) => setExpCategory(val)}
                options={[
                  { value: 'Electricity (EB)', label: 'Electricity (EB Power)' },
                  { value: 'Workshop Rent', label: 'Workshop Rent' },
                  { value: 'Machine Maintenance', label: 'Machine Maintenance / Repairs' },
                  { value: 'Transport/Diesel', label: 'Transport & Diesel' },
                  { value: 'Tea & Refreshments', label: 'Staff Welfare & Tea' },
                  { value: 'Office & Admin', label: 'Office & Administration' },
                ]}
                searchable={false}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Amount (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                value={expAmount}
                onChange={(e) => setExpAmount(parseFloat(e.target.value) || '')}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-900 focus:border-slate-300 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Description / Purpose *
            </label>
            <input
              type="text"
              required
              value={expDesc}
              onChange={(e) => setExpDesc(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:border-slate-300 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Date *
              </label>
              <CustomDatePicker
                value={expDate}
                onChange={setExpDate}
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Payment Mode
              </label>
              <CustomSelect
                value={expMode}
                onChange={(val) => setExpMode(val)}
                options={[
                  { value: 'Net Banking', label: 'Net Banking' },
                  { value: 'UPI', label: 'UPI / GPay' },
                  { value: 'Cash', label: 'Cash' },
                  { value: 'Cheque', label: 'Cheque' },
                ]}
                searchable={false}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Ref / Receipt No
              </label>
              <input
                type="text"
                value={expRefNo}
                onChange={(e) => setExpRefNo(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 font-mono focus:border-slate-300 outline-none"
              />
            </div>
          </div>
        </form>
      </SlideOverDrawer>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 w-full max-w-sm space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-600">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">Delete Record?</h3>
                  <p className="text-xs text-slate-500">This outflow record will be removed permanently.</p>
                </div>
              </div>

              <div className="flex items-center justify-start gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteId(null)}
                  className="px-4 py-2 rounded-2xl bg-white border border-slate-200 text-xs font-medium text-slate-600 hover:text-slate-900 whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 rounded-2xl bg-rose-600 text-white text-xs font-medium hover:bg-rose-700 transition-colors whitespace-nowrap"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
