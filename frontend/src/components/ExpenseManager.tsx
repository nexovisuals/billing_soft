import { API_BASE_URL } from '../config';
import React, { useState, useEffect, useMemo } from 'react';
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
import CustomUnitSelect, { saveCustomUnit } from './common/CustomUnitSelect';
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
  pageMode?: 'purchases' | 'operating';
  defaultSubTab?: 'purchases' | 'operating';
}

const STORAGE_KEY_CUSTOM_PURCHASE_CATS = 'svt_custom_purchase_categories';
const STORAGE_KEY_CUSTOM_EXPENSE_CATS = 'svt_custom_expense_categories';

export const getSavedCustomPurchaseCategories = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_PURCHASE_CATS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveCustomPurchaseCategory = (cat: string) => {
  if (!cat || !cat.trim()) return;
  const clean = cat.trim();
  const defaults = ['Tooling', 'Oil & Coolant', 'Machine Spares', 'Consumables', 'Hardware', 'Others'];
  if (defaults.some(d => d.toLowerCase() === clean.toLowerCase())) return;
  try {
    const existing = getSavedCustomPurchaseCategories();
    if (!existing.some(c => c.toLowerCase() === clean.toLowerCase())) {
      const updated = [...existing, clean];
      localStorage.setItem(STORAGE_KEY_CUSTOM_PURCHASE_CATS, JSON.stringify(updated));
    }
  } catch (e) {
    console.error('Failed to save custom purchase category', e);
  }
};

export const getSavedCustomExpenseCategories = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_EXPENSE_CATS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveCustomExpenseCategory = (cat: string) => {
  if (!cat || !cat.trim()) return;
  const clean = cat.trim();
  const defaults = ['Electricity (EB)', 'Workshop Rent', 'Machine Maintenance', 'Transport & Diesel', 'Staff Welfare & Tea', 'Office & Admin', 'Others'];
  if (defaults.some(d => d.toLowerCase() === clean.toLowerCase())) return;
  try {
    const existing = getSavedCustomExpenseCategories();
    if (!existing.some(c => c.toLowerCase() === clean.toLowerCase())) {
      const updated = [...existing, clean];
      localStorage.setItem(STORAGE_KEY_CUSTOM_EXPENSE_CATS, JSON.stringify(updated));
    }
  } catch (e) {
    console.error('Failed to save custom expense category', e);
  }
};

const DEFAULT_PURCHASE_CATEGORIES = [
  { value: 'Tooling', label: 'Tooling' },
  { value: 'Oil & Coolant', label: 'Oil & Coolant' },
  { value: 'Machine Spares', label: 'Machine Spares' },
  { value: 'Consumables', label: 'Consumables' },
  { value: 'Hardware', label: 'Hardware' },
];

const DEFAULT_EXPENSE_CATEGORIES = [
  { value: 'Electricity (EB)', label: 'Electricity (EB)' },
  { value: 'Workshop Rent', label: 'Workshop Rent' },
  { value: 'Machine Maintenance', label: 'Machine Maintenance' },
  { value: 'Transport & Diesel', label: 'Transport & Diesel' },
  { value: 'Staff Welfare & Tea', label: 'Staff Welfare & Tea' },
  { value: 'Office & Admin', label: 'Office & Admin' },
];

export default function ExpenseManager({ session, pageMode, defaultSubTab }: ExpenseManagerProps) {
  const activeTab = pageMode || defaultSubTab || 'purchases';
  const [purchases, setPurchases] = useState<PurchaseItem[]>([]);
  const [expenses, setExpenses] = useState<OtherExpenseItem[]>([]);
  const [summary, setSummary] = useState({
    totalPurchases: 0,
    totalOperating: 0,
    totalOutflow: 0,
  });

  const [savedPurCategories, setSavedPurCategories] = useState<string[]>(() => getSavedCustomPurchaseCategories());
  const [savedExpCategories, setSavedExpCategories] = useState<string[]>(() => getSavedCustomExpenseCategories());

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, _setCategoryFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);

  // Modals
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Multi-item form state for Purchases
  interface PurchaseFormItem {
    id: string;
    itemName: string;
    category: string;
    isCustomCategory: boolean;
    supplierName: string;
    quantity: number | '';
    uom: string;
    unitPrice: number | '';
    supplierBillNo: string;
    paymentStatus: string;
    purchaseDate: string;
    remarks: string;
  }

  // Multi-item form state for Operating Expenses
  interface ExpenseFormItem {
    id: string;
    category: string;
    isCustomCategory: boolean;
    amount: number | '';
    description: string;
    expenseDate: string;
    paymentMode: string;
    referenceNo: string;
    remarks: string;
  }

  const createDefaultPurchaseItem = (seed?: Partial<PurchaseFormItem>): PurchaseFormItem => ({
    id: `pur-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    itemName: '',
    category: '',
    isCustomCategory: false,
    supplierName: seed?.supplierName || '',
    quantity: '',
    uom: '',
    unitPrice: '',
    supplierBillNo: seed?.supplierBillNo || '',
    paymentStatus: seed?.paymentStatus || 'PAID',
    purchaseDate: seed?.purchaseDate || new Date().toISOString().split('T')[0],
    remarks: '',
  });

  const createDefaultExpenseItem = (seed?: Partial<ExpenseFormItem>): ExpenseFormItem => ({
    id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    category: '',
    isCustomCategory: false,
    amount: '',
    description: '',
    expenseDate: seed?.expenseDate || new Date().toISOString().split('T')[0],
    paymentMode: seed?.paymentMode || '',
    referenceNo: '',
    remarks: '',
  });

  const [purchaseItems, setPurchaseItems] = useState<PurchaseFormItem[]>([createDefaultPurchaseItem()]);
  const [expenseItems, setExpenseItems] = useState<ExpenseFormItem[]>([createDefaultExpenseItem()]);

  const addPurchaseRow = () => {
    const last = purchaseItems[purchaseItems.length - 1];
    setPurchaseItems((prev) => [...prev, createDefaultPurchaseItem(last)]);
  };

  const removePurchaseRow = (index: number) => {
    if (purchaseItems.length <= 1) return;
    setPurchaseItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updatePurchaseField = (index: number, field: keyof PurchaseFormItem, val: any) => {
    setPurchaseItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const addExpenseRow = () => {
    const last = expenseItems[expenseItems.length - 1];
    setExpenseItems((prev) => [...prev, createDefaultExpenseItem(last)]);
  };

  const removeExpenseRow = (index: number) => {
    if (expenseItems.length <= 1) return;
    setExpenseItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateExpenseField = (index: number, field: keyof ExpenseFormItem, val: any) => {
    setExpenseItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

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

  const purchaseCategoryOptions = useMemo(() => {
    const customSet = new Set<string>(savedPurCategories);
    purchases.forEach((p) => {
      if (p.category && !DEFAULT_PURCHASE_CATEGORIES.some((d) => d.value.toLowerCase() === p.category.toLowerCase())) {
        customSet.add(p.category);
      }
    });
    const customList = Array.from(customSet).map((c) => ({ value: c, label: c }));
    return [...DEFAULT_PURCHASE_CATEGORIES, ...customList, { value: 'OTHERS', label: 'Others' }];
  }, [savedPurCategories, purchases]);

  const expenseCategoryOptions = useMemo(() => {
    const customSet = new Set<string>(savedExpCategories);
    expenses.forEach((e) => {
      if (e.category && !DEFAULT_EXPENSE_CATEGORIES.some((d) => d.value.toLowerCase() === e.category.toLowerCase())) {
        customSet.add(e.category);
      }
    });
    const customList = Array.from(customSet).map((c) => ({ value: c, label: c }));
    return [...DEFAULT_EXPENSE_CATEGORIES, ...customList, { value: 'OTHERS', label: 'Others' }];
  }, [savedExpCategories, expenses]);

  const openEditPurchase = (p: PurchaseItem) => {
    setEditingPurchaseId(p.id);
    const isCustomPur = !DEFAULT_PURCHASE_CATEGORIES.some((c) => c.value.toLowerCase() === (p.category || '').toLowerCase()) &&
      !savedPurCategories.some((c) => c.toLowerCase() === (p.category || '').toLowerCase());
    setPurchaseItems([
      {
        id: p.id,
        itemName: p.itemName,
        category: p.category,
        isCustomCategory: isCustomPur,
        supplierName: p.supplierName || '',
        quantity: Number(p.quantity),
        uom: p.uom || '',
        unitPrice: Number(p.unitPrice),
        supplierBillNo: p.supplierBillNo || '',
        paymentStatus: p.paymentStatus || 'PAID',
        purchaseDate: p.purchaseDate ? p.purchaseDate.split('T')[0] : new Date().toISOString().split('T')[0],
        remarks: p.remarks || '',
      }
    ]);
    setFormError(null);
    setPurchaseModalOpen(true);
  };

  const openEditExpense = (e: OtherExpenseItem) => {
    setEditingExpenseId(e.id);
    const isCustomExp = !DEFAULT_EXPENSE_CATEGORIES.some((c) => c.value.toLowerCase() === (e.category || '').toLowerCase()) &&
      !savedExpCategories.some((c) => c.toLowerCase() === (e.category || '').toLowerCase());
    setExpenseItems([
      {
        id: e.id,
        category: e.category,
        isCustomCategory: isCustomExp,
        amount: Number(e.amount),
        description: e.description,
        expenseDate: e.expenseDate ? e.expenseDate.split('T')[0] : new Date().toISOString().split('T')[0],
        paymentMode: e.paymentMode || '',
        referenceNo: e.referenceNo || '',
        remarks: e.remarks || '',
      }
    ]);
    setFormError(null);
    setExpenseModalOpen(true);
  };

  // Submit Purchases
  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validate each item
    for (let i = 0; i < purchaseItems.length; i++) {
      const it = purchaseItems[i];
      const prefix = purchaseItems.length > 1 ? `Purchase #${i + 1}: ` : '';
      if (!it.itemName.trim()) {
        setFormError(`${prefix}Item name is required`);
        return;
      }
      if (!it.category.trim()) {
        setFormError(`${prefix}Please select or specify a category`);
        return;
      }
      if (!it.quantity || Number(it.quantity) <= 0 || it.unitPrice === '' || Number(it.unitPrice) < 0) {
        setFormError(`${prefix}Valid quantity (> 0) and price (≥ 0) are required`);
        return;
      }
      if (!it.uom.trim()) {
        setFormError(`${prefix}Please select a unit of measurement`);
        return;
      }
    }

    try {
      setLoading(true);

      if (editingPurchaseId) {
        const item = purchaseItems[0];
        const computedTotal = Math.round(Number(item.quantity) * Number(item.unitPrice) * 100) / 100;
        const res = await fetch(`${API_BASE_URL}/api/expenses/purchases/${editingPurchaseId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.token}`,
          },
          body: JSON.stringify({
            supplierName: item.supplierName || undefined,
            itemName: item.itemName,
            category: item.category,
            quantity: Number(item.quantity),
            uom: item.uom,
            unitPrice: Number(item.unitPrice),
            totalAmount: computedTotal,
            supplierBillNo: item.supplierBillNo || undefined,
            paymentStatus: item.paymentStatus,
            purchaseDate: item.purchaseDate,
            remarks: item.remarks || undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save purchase');

        if (item.category) saveCustomPurchaseCategory(item.category);
        if (item.uom) saveCustomUnit(item.uom);

        setNotification({
          type: 'success',
          message: data.message || `Purchase updated successfully`,
        });
      } else {
        for (const item of purchaseItems) {
          const computedTotal = Math.round(Number(item.quantity) * Number(item.unitPrice) * 100) / 100;
          const res = await fetch(`${API_BASE_URL}/api/expenses/purchases`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.token}`,
            },
            body: JSON.stringify({
              supplierName: item.supplierName || undefined,
              itemName: item.itemName,
              category: item.category,
              quantity: Number(item.quantity),
              uom: item.uom,
              unitPrice: Number(item.unitPrice),
              totalAmount: computedTotal,
              supplierBillNo: item.supplierBillNo || undefined,
              paymentStatus: item.paymentStatus,
              purchaseDate: item.purchaseDate,
              remarks: item.remarks || undefined,
            }),
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to save purchase');

          if (item.category) saveCustomPurchaseCategory(item.category);
          if (item.uom) saveCustomUnit(item.uom);
        }

        setNotification({
          type: 'success',
          message: `${purchaseItems.length} purchase ${purchaseItems.length === 1 ? 'item' : 'items'} recorded successfully`,
        });
      }

      setSavedPurCategories(getSavedCustomPurchaseCategories());
      setPurchaseModalOpen(false);
      setEditingPurchaseId(null);
      setPurchaseItems([createDefaultPurchaseItem()]);
      fetchData();
    } catch (err: any) {
      setFormError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Submit Operating Expenses
  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validate each item
    for (let i = 0; i < expenseItems.length; i++) {
      const it = expenseItems[i];
      const prefix = expenseItems.length > 1 ? `Expense #${i + 1}: ` : '';
      if (!it.category.trim()) {
        setFormError(`${prefix}Please select or specify an expense category`);
        return;
      }
      if (!it.description.trim()) {
        setFormError(`${prefix}Expense description is required`);
        return;
      }
      if (!it.amount || Number(it.amount) <= 0) {
        setFormError(`${prefix}Valid expense amount (> 0) is required`);
        return;
      }
    }

    try {
      setLoading(true);

      if (editingExpenseId) {
        const item = expenseItems[0];
        const res = await fetch(`${API_BASE_URL}/api/expenses/operating/${editingExpenseId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.token}`,
          },
          body: JSON.stringify({
            category: item.category,
            description: item.description,
            amount: Number(item.amount),
            expenseDate: item.expenseDate,
            paymentMode: item.paymentMode || undefined,
            referenceNo: item.referenceNo || undefined,
            remarks: item.remarks || undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save expense');

        if (item.category) saveCustomExpenseCategory(item.category);

        setNotification({
          type: 'success',
          message: data.message || `Expense updated successfully`,
        });
      } else {
        for (const item of expenseItems) {
          const res = await fetch(`${API_BASE_URL}/api/expenses/operating`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.token}`,
            },
            body: JSON.stringify({
              category: item.category,
              description: item.description,
              amount: Number(item.amount),
              expenseDate: item.expenseDate,
              paymentMode: item.paymentMode || undefined,
              referenceNo: item.referenceNo || undefined,
              remarks: item.remarks || undefined,
            }),
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to save expense');

          if (item.category) saveCustomExpenseCategory(item.category);
        }

        setNotification({
          type: 'success',
          message: `${expenseItems.length} ${expenseItems.length === 1 ? 'expense' : 'expenses'} recorded successfully`,
        });
      }

      setSavedExpCategories(getSavedCustomExpenseCategories());
      setExpenseModalOpen(false);
      setEditingExpenseId(null);
      setExpenseItems([createDefaultExpenseItem()]);
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

  const totalPurchaseValue = useMemo(() => {
    return purchaseItems.reduce((acc, it) => {
      if (it.quantity && it.unitPrice) {
        return acc + (Number(it.quantity) * Number(it.unitPrice));
      }
      return acc;
    }, 0);
  }, [purchaseItems]);

  const totalExpenseValue = useMemo(() => {
    return expenseItems.reduce((acc, it) => {
      if (it.amount) {
        return acc + Number(it.amount);
      }
      return acc;
    }, 0);
  }, [expenseItems]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-2xl flex items-center justify-between border ${notification.type === 'success'
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
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="p-3.5 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
              Total Purchases
            </span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800 shrink-0">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <span className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">
              ₹{summary.totalPurchases.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
            <span className="text-[10px] sm:text-xs text-slate-500 ml-1.5 sm:ml-2">tools, oil, spares</span>
          </div>
        </div>

        <div className="p-3.5 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
              Total Other Expenses
            </span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800 shrink-0">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <span className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">
              ₹{summary.totalOperating.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
            <span className="text-[10px] sm:text-xs text-slate-500 ml-1.5 sm:ml-2">power, rent, upkeep</span>
          </div>
        </div>
      </div>

      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={activeTab === 'purchases' ? 'Search item, supplier, bill...' : 'Search expenses, electricity, rent...'}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-300 shadow-sm"
          />
        </div>

        {(session.role === 'ADMIN' || session.role === 'STAFF') && (
          activeTab === 'purchases' ? (
            <button
              onClick={() => {
                setEditingPurchaseId(null);
                setPurchaseItems([createDefaultPurchaseItem()]);
                setFormError(null);
                setPurchaseModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-slate-300 text-slate-900 text-xs font-semibold hover:bg-slate-50 hover:border-slate-400 transition-all shadow-2xs whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Add Purchase</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setEditingExpenseId(null);
                setExpenseItems([createDefaultExpenseItem()]);
                setFormError(null);
                setExpenseModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-slate-300 text-slate-900 text-xs font-semibold hover:bg-slate-50 hover:border-slate-400 transition-all shadow-2xs whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Add Expense</span>
            </button>
          )
        )}
      </div>

      {/* Content View 1: Purchases Table */}
      {activeTab === 'purchases' ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl shadow-card overflow-hidden w-full max-w-full">
          <div className="overflow-x-auto w-full max-w-full">
            <table className="w-full min-w-[700px] text-left text-xs text-slate-700">
              <thead className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 whitespace-nowrap text-left">Date</th>
                  <th className="py-3.5 px-4 whitespace-nowrap text-left">Item Name</th>
                  <th className="py-3.5 px-4 whitespace-nowrap text-left">Category</th>
                  <th className="py-3.5 px-4 whitespace-nowrap text-left">Supplier</th>
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
                      Loading purchases...
                    </td>
                  </tr>
                ) : filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 whitespace-nowrap">
                      <Wrench className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      No purchases found. Click "+ Add Purchase" to record new items.
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
        <div className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl shadow-card overflow-hidden w-full max-w-full">
          <div className="overflow-x-auto w-full max-w-full">
            <table className="w-full min-w-[700px] text-left text-xs text-slate-700">
              <thead className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 whitespace-nowrap text-left">Date</th>
                  <th className="py-3.5 px-4 whitespace-nowrap text-left">Category</th>
                  <th className="py-3.5 px-4 whitespace-nowrap text-left">Description</th>
                  <th className="py-3.5 px-4 whitespace-nowrap text-left">Payment Mode</th>
                  <th className="py-3.5 px-4 whitespace-nowrap text-left">Bill Number</th>
                  <th className="py-3.5 px-4 text-left whitespace-nowrap">Amount (₹)</th>
                  <th className="py-3.5 px-4 text-left whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 whitespace-nowrap">
                      Loading expenses...
                    </td>
                  </tr>
                ) : filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 whitespace-nowrap">
                      <Zap className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      No expenses found. Click "+ Add Expense" to record new expenses.
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
        title={editingPurchaseId ? "Edit Purchase" : "Add Purchase"}
        subtitle="Record cutting inserts, oil, spares, and hardware"
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
              {loading
                ? 'Recording...'
                : editingPurchaseId
                ? 'Update Purchase'
                : purchaseItems.length > 1
                ? `Record ${purchaseItems.length} Purchases`
                : 'Record Purchase'}
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
          {purchaseItems.map((item, index) => (
            <div
              key={item.id}
              className={`p-4 rounded-2xl bg-white border ${
                purchaseItems.length > 1
                  ? 'border-slate-200/90 shadow-2xs space-y-3.5 bg-slate-50/20'
                  : 'border-slate-100 space-y-3.5'
              }`}
            >
              {purchaseItems.length > 1 && (
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Purchase Item #{index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removePurchaseRow(index)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Remove Item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WNMG 080408 Inserts, Castrol Coolant..."
                  value={item.itemName}
                  onChange={(e) => updatePurchaseField(index, 'itemName', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:border-slate-300 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Category *
                  </label>
                  {item.isCustomCategory ? (
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        required
                        autoFocus
                        placeholder="Enter custom category..."
                        value={item.category}
                        onChange={(e) => updatePurchaseField(index, 'category', e.target.value)}
                        className="w-full pl-3.5 pr-9 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:border-slate-300 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          updatePurchaseField(index, 'isCustomCategory', false);
                          updatePurchaseField(index, 'category', '');
                        }}
                        title="Cancel and choose from list"
                        className="absolute right-2 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <CustomSelect
                      value={item.category}
                      onChange={(val) => {
                        if (val === 'OTHERS') {
                          updatePurchaseField(index, 'isCustomCategory', true);
                          updatePurchaseField(index, 'category', '');
                        } else {
                          updatePurchaseField(index, 'category', val);
                        }
                      }}
                      options={purchaseCategoryOptions}
                      placeholder="-- Select Category --"
                      searchable={false}
                    />
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Supplier Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Tools India, Local Spares..."
                    value={item.supplierName}
                    onChange={(e) => updatePurchaseField(index, 'supplierName', e.target.value)}
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
                    placeholder="0"
                    value={item.quantity}
                    onChange={(e) => updatePurchaseField(index, 'quantity', parseFloat(e.target.value) || '')}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:border-slate-300 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Unit *
                  </label>
                  <CustomUnitSelect
                    value={item.uom}
                    onChange={(val) => updatePurchaseField(index, 'uom', val)}
                    placeholder="-- Select Unit --"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Unit Price *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="₹ 0.00"
                    value={item.unitPrice}
                    onChange={(e) => updatePurchaseField(index, 'unitPrice', parseFloat(e.target.value) || '')}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:border-slate-300 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Bill Number
                  </label>
                  <input
                    type="text"
                    placeholder="Bill #"
                    value={item.supplierBillNo}
                    onChange={(e) => updatePurchaseField(index, 'supplierBillNo', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 font-mono focus:border-slate-300 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Payment Status *
                  </label>
                  <CustomSelect
                    value={item.paymentStatus}
                    onChange={(val) => updatePurchaseField(index, 'paymentStatus', val)}
                    options={[
                      { value: 'PAID', label: 'Paid' },
                      { value: 'PENDING', label: 'Pending' },
                    ]}
                    searchable={false}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Purchase Date *
                  </label>
                  <CustomDatePicker
                    value={item.purchaseDate}
                    onChange={(val) => updatePurchaseField(index, 'purchaseDate', val)}
                    required
                  />
                </div>
              </div>

              {item.quantity && item.unitPrice ? (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between text-xs font-medium">
                  <span className="text-slate-500">Item Subtotal:</span>
                  <span className="font-semibold text-slate-900">
                    ₹{(Number(item.quantity) * Number(item.unitPrice)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ) : null}
            </div>
          ))}

          {!editingPurchaseId && (
            <button
              type="button"
              onClick={addPurchaseRow}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-slate-200 hover:border-slate-400 bg-slate-50/60 hover:bg-slate-50 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-all active:scale-[0.99]"
            >
              <Plus className="w-4 h-4 text-slate-500" />
              <span>+ Add Another Purchase</span>
            </button>
          )}

          {totalPurchaseValue > 0 && (
            <div className="p-3.5 rounded-xl bg-slate-100/70 border border-slate-200 flex justify-between font-medium">
              <span className="text-slate-700 font-semibold">
                {purchaseItems.length > 1 ? `Grand Total (${purchaseItems.length} items):` : 'Total Purchase Value:'}
              </span>
              <span className="font-bold text-slate-950 text-sm">
                ₹{totalPurchaseValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </form>
      </SlideOverDrawer>

      {/* Slide-Over Drawer: Record Operating Expense */}
      <SlideOverDrawer
        isOpen={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        title={editingExpenseId ? "Edit Expense" : "Add Expense"}
        subtitle="Record electricity, workshop rent, repairs, and overheads"
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
              {loading
                ? 'Recording...'
                : editingExpenseId
                ? 'Update Expense'
                : expenseItems.length > 1
                ? `Record ${expenseItems.length} Expenses`
                : 'Record Expense'}
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
          {expenseItems.map((item, index) => (
            <div
              key={item.id}
              className={`p-4 rounded-2xl bg-white border ${
                expenseItems.length > 1
                  ? 'border-slate-200/90 shadow-2xs space-y-3.5 bg-slate-50/20'
                  : 'border-slate-100 space-y-3.5'
              }`}
            >
              {expenseItems.length > 1 && (
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Expense Item #{index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeExpenseRow(index)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Remove Expense"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Category *
                  </label>
                  {item.isCustomCategory ? (
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        required
                        autoFocus
                        placeholder="Enter custom expense category..."
                        value={item.category}
                        onChange={(e) => updateExpenseField(index, 'category', e.target.value)}
                        className="w-full pl-3.5 pr-9 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:border-slate-300 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          updateExpenseField(index, 'isCustomCategory', false);
                          updateExpenseField(index, 'category', '');
                        }}
                        title="Cancel and choose from list"
                        className="absolute right-2 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <CustomSelect
                      value={item.category}
                      onChange={(val) => {
                        if (val === 'OTHERS') {
                          updateExpenseField(index, 'isCustomCategory', true);
                          updateExpenseField(index, 'category', '');
                        } else {
                          updateExpenseField(index, 'category', val);
                        }
                      }}
                      options={expenseCategoryOptions}
                      placeholder="-- Select Category --"
                      searchable={false}
                    />
                  )}
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
                    placeholder="₹ 0.00"
                    value={item.amount}
                    onChange={(e) => updateExpenseField(index, 'amount', parseFloat(e.target.value) || '')}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-900 focus:border-slate-300 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. October EB meter bill, lathe lubrication..."
                  value={item.description}
                  onChange={(e) => updateExpenseField(index, 'description', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:border-slate-300 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Date *
                  </label>
                  <CustomDatePicker
                    value={item.expenseDate}
                    onChange={(val) => updateExpenseField(index, 'expenseDate', val)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Payment Mode
                  </label>
                  <CustomSelect
                    value={item.paymentMode}
                    onChange={(val) => updateExpenseField(index, 'paymentMode', val)}
                    options={[
                      { value: 'Net Banking', label: 'Net Banking' },
                      { value: 'UPI', label: 'UPI' },
                      { value: 'Cash', label: 'Cash' },
                      { value: 'Cheque', label: 'Cheque' },
                    ]}
                    placeholder="-- Select Payment Mode --"
                    searchable={false}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Ref / Receipt No
                  </label>
                  <input
                    type="text"
                    placeholder="Receipt / UTR #"
                    value={item.referenceNo}
                    onChange={(e) => updateExpenseField(index, 'referenceNo', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 font-mono focus:border-slate-300 outline-none"
                  />
                </div>
              </div>
            </div>
          ))}

          {!editingExpenseId && (
            <button
              type="button"
              onClick={addExpenseRow}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-slate-200 hover:border-slate-400 bg-slate-50/60 hover:bg-slate-50 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-all active:scale-[0.99]"
            >
              <Plus className="w-4 h-4 text-slate-500" />
              <span>+ Add Another Expense</span>
            </button>
          )}

          {totalExpenseValue > 0 && (
            <div className="p-3.5 rounded-xl bg-slate-100/70 border border-slate-200 flex justify-between font-medium">
              <span className="text-slate-700 font-semibold">
                {expenseItems.length > 1 ? `Grand Total (${expenseItems.length} expenses):` : 'Total Expense Amount:'}
              </span>
              <span className="font-bold text-slate-950 text-sm">
                ₹{totalExpenseValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
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
