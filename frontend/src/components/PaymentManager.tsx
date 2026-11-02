import { API_BASE_URL } from '../config';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  Plus,
  Search,
  Trash2,
  Edit2,
  X,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Receipt,
  FileCheck
} from 'lucide-react';
import { UserSession } from '../types';
import SlideOverDrawer from './common/SlideOverDrawer';
import CustomSelect from './common/CustomSelect';
import CustomDatePicker from './common/CustomDatePicker';

interface PaymentItem {
  id: string;
  paymentDate: string;
  companyId: string;
  invoiceId?: string | null;
  amount: string | number;
  paymentMode: string;
  referenceNo?: string | null;
  remarks?: string | null;
  company: {
    id: string;
    name: string;
    gstin?: string | null;
  };
  invoice?: {
    id: string;
    invoiceNumber: string;
    totalAmount: string | number;
    balanceDue: string | number;
    status: string;
  } | null;
}

interface CompanyOption {
  id: string;
  name: string;
  gstin?: string | null;
}

interface CustomerInvoiceOption {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: string | number;
  paidAmount: string | number;
  balanceDue: string | number;
  status: string;
}

interface PaymentManagerProps {
  session: UserSession;
}

export default function PaymentManager({ session }: PaymentManagerProps) {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [summary, setSummary] = useState({
    totalCollected: 0,
    totalTransactions: 0,
    thisMonthCollected: 0,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [modeFilter, setModeFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form Fields
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [customerInvoices, setCustomerInvoices] = useState<CustomerInvoiceOption[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState('NEFT/RTGS');
  const [referenceNo, setReferenceNo] = useState('');
  const [remarks, setRemarks] = useState('');

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [payRes, compRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/payments`, {
          headers: { Authorization: `Bearer ${session.token}` },
        }),
        fetch(`${API_BASE_URL}/api/companies`, {
          headers: { Authorization: `Bearer ${session.token}` },
        }),
      ]);

      if (payRes.ok) {
        const payData = await payRes.json();
        setPayments(payData.payments || []);
        if (payData.summary) {
          setSummary(payData.summary);
        }
      }

      if (compRes.ok) {
        const compData = await compRes.json();
        setCompanies(compData.companies || []);
      }
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [session.token]);

  // When company is chosen, fetch their pending invoices
  const handleCompanySelect = async (companyId: string) => {
    setSelectedCompanyId(companyId);
    setSelectedInvoiceId('');
    setCustomerInvoices([]);
    if (!companyId) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/invoices?companyId=${companyId}`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const pending = (data.invoices || []).filter(
          (inv: any) => inv.status !== 'CANCELLED' && inv.status !== 'PAID'
        );
        setCustomerInvoices(pending);
      }
    } catch (err) {
      console.error('Failed to fetch company invoices:', err);
    }
  };

  // Open modal
  const handleOpenModal = () => {
    setEditingPaymentId(null);
    setSelectedCompanyId('');
    setSelectedInvoiceId('');
    setCustomerInvoices([]);
    setAmount('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentMode('NEFT/RTGS');
    setReferenceNo('');
    setRemarks('');
    setFormError(null);
    setModalOpen(true);
  };

  const openEditPayment = async (pay: PaymentItem) => {
    setEditingPaymentId(pay.id);
    await handleCompanySelect(pay.companyId);
    setSelectedInvoiceId(pay.invoiceId || '');
    setAmount(Number(pay.amount));
    setPaymentDate(pay.paymentDate ? pay.paymentDate.split('T')[0] : new Date().toISOString().split('T')[0]);
    setPaymentMode(pay.paymentMode || 'NEFT/RTGS');
    setReferenceNo(pay.referenceNo || '');
    setRemarks(pay.remarks || '');
    setFormError(null);
    setModalOpen(true);
  };

  // When an invoice is selected, auto-fill the balance due amount
  const handleInvoiceSelect = (invId: string) => {
    setSelectedInvoiceId(invId);
    if (!invId) return;
    const inv = customerInvoices.find(i => i.id === invId);
    if (inv) {
      setAmount(parseFloat(inv.balanceDue.toString()));
    }
  };

  // Submit payment
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedCompanyId) {
      setFormError('Please select a customer company');
      return;
    }
    if (!amount || amount <= 0) {
      setFormError('Payment amount must be greater than zero');
      return;
    }

    try {
      setLoading(true);
      const url = editingPaymentId
        ? `${API_BASE_URL}/api/payments/${editingPaymentId}`
        : `${API_BASE_URL}/api/payments`;
      const method = editingPaymentId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          companyId: selectedCompanyId,
          invoiceId: selectedInvoiceId || undefined,
          amount: Number(amount),
          paymentDate,
          paymentMode,
          referenceNo: referenceNo || undefined,
          remarks: remarks || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save payment');
      }

      setNotification({
        type: 'success',
        message: data.message || `Payment saved successfully`,
      });
      setModalOpen(false);
      setEditingPaymentId(null);
      fetchData();
    } catch (err: any) {
      setFormError(err.message || 'An error occurred while saving payment');
    } finally {
      setLoading(false);
    }
  };

  // Delete payment
  const handleDeletePayment = async (id: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/payments/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.token}` },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reverse payment');
      }

      setNotification({
        type: 'success',
        message: data.message || 'Payment reversed successfully',
      });
      setDeleteId(null);
      fetchData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to reverse payment',
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter payments
  const filteredPayments = payments.filter(pay => {
    const matchesSearch =
      pay.company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (pay.referenceNo && pay.referenceNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (pay.invoice?.invoiceNumber && pay.invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      pay.paymentMode.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesMode =
      modeFilter === 'ALL' || pay.paymentMode.toLowerCase().includes(modeFilter.toLowerCase());

    return matchesSearch && matchesMode;
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
              Total Inward Collections
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-semibold text-slate-900 tracking-tight">
              ₹{summary.totalCollected.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
            <span className="text-xs text-slate-500 ml-2">all-time realized</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Collections (This Month)
            </span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-semibold text-slate-900 tracking-tight">
              ₹{summary.thisMonthCollected.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
            <span className="text-xs text-slate-500 ml-2">current cycle</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Receipts Recorded
            </span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-semibold text-slate-900 tracking-tight">
              {summary.totalTransactions}
            </span>
            <span className="text-xs text-slate-500 ml-2">transactions</span>
          </div>
        </div>
      </div>

      {/* Control Bar: Filters, Search, and Action Button */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Mode Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200/80 overflow-x-auto">
          {(['ALL', 'NEFT', 'UPI', 'CHEQUE', 'CASH'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setModeFilter(mode)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                modeFilter === mode
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {mode === 'ALL'
                ? 'All Modes'
                : mode === 'NEFT'
                ? 'NEFT / RTGS'
                : mode === 'UPI'
                ? 'UPI / GPay'
                : mode === 'CHEQUE'
                ? 'Cheque'
                : 'Cash'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search company, UTR, invoice..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-2xl bg-white border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-300 shadow-sm"
            />
          </div>

          {/* Record Payment Button */}
          {(session.role === 'ADMIN' || session.role === 'STAFF') && (
            <button
              onClick={handleOpenModal}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-slate-300 text-slate-900 text-xs font-semibold hover:bg-slate-50 hover:border-slate-400 transition-all shadow-2xs whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Record Customer Payment</span>
            </button>
          )}
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white border border-slate-200/80 rounded-3xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4 whitespace-nowrap text-left">Date</th>
                <th className="py-3.5 px-4 whitespace-nowrap text-left">Customer Company</th>
                <th className="py-3.5 px-4 whitespace-nowrap text-left">Linked Invoice</th>
                <th className="py-3.5 px-4 whitespace-nowrap text-left">Payment Mode</th>
                <th className="py-3.5 px-4 whitespace-nowrap text-left">UTR / Reference No</th>
                <th className="py-3.5 px-4 text-left whitespace-nowrap">Amount (₹)</th>
                <th className="py-3.5 px-4 text-left whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 whitespace-nowrap">
                    Loading payments ledger...
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 whitespace-nowrap">
                    <CreditCard className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No customer payments recorded yet. Click "+ Record Customer Payment" to log bank remittances.
                  </td>
                </tr>
              ) : (
                filteredPayments.map(pay => (
                  <tr key={pay.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 text-slate-600 font-medium whitespace-nowrap">
                      {new Date(pay.paymentDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">{pay.company.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        GSTIN: {pay.company.gstin || 'Unregistered'}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {pay.invoice ? (
                        <div>
                          <div className="font-medium text-slate-900">{pay.invoice.invoiceNumber}</div>
                          <div className="text-[10px] text-slate-500">
                            Inv Total: ₹{parseFloat(pay.invoice.totalAmount.toString()).toLocaleString('en-IN')}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">On-Account Advance</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {pay.paymentMode}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      {pay.referenceNo || '—'}
                    </td>
                    <td className="py-3 px-4 text-left font-semibold text-emerald-700 text-xs whitespace-nowrap">
                      +₹{parseFloat(pay.amount.toString()).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-left whitespace-nowrap">
                      {session.role === 'ADMIN' ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditPayment(pay)}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors whitespace-nowrap"
                            title="Edit Payment"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteId(pay.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors whitespace-nowrap"
                            title="Reverse Payment"
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

      {/* Record Payment Slide-Over Drawer */}
      <SlideOverDrawer
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingPaymentId ? "Edit Customer Payment" : "Record Customer Payment"}
        subtitle="Log bank transfer, UPI, or cheque payment against invoices"
        footer={
          <>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="payment-form"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-semibold hover:bg-slate-50 hover:border-slate-400 disabled:opacity-50 active:scale-95 transition-all shadow-2xs whitespace-nowrap"
            >
              {loading ? 'Saving...' : editingPaymentId ? 'Update Payment Receipt' : 'Record Payment Receipt'}
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

        <form id="payment-form" onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Select Customer */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Customer Company *
            </label>
            <CustomSelect
              value={selectedCompanyId}
              onChange={(val) => handleCompanySelect(val)}
              options={companies.map((c) => ({
                value: c.id,
                label: c.name,
              }))}
              placeholder="-- Choose Customer --"
            />
          </div>

          {/* Select Invoice */}
          {selectedCompanyId && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Link to Pending Invoice (Optional / On-Account)
              </label>
              <CustomSelect
                value={selectedInvoiceId}
                onChange={(val) => handleInvoiceSelect(val)}
                options={[
                  { value: '', label: '-- General / On-Account Payment --' },
                  ...customerInvoices.map((inv) => ({
                    value: inv.id,
                    label: `${inv.invoiceNumber} (Total: ₹${parseFloat(inv.totalAmount.toString()).toLocaleString('en-IN')})`,
                    sublabel: `Balance Due: ₹${parseFloat(inv.balanceDue.toString()).toLocaleString('en-IN')}`,
                  })),
                ]}
                placeholder="-- General / On-Account Payment --"
              />
            </div>
          )}

          {/* Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Amount (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || '')}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-900 focus:border-slate-300 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Payment Date *
              </label>
              <CustomDatePicker
                value={paymentDate}
                onChange={setPaymentDate}
                required
              />
            </div>
          </div>

          {/* Payment Mode & Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Payment Mode *
              </label>
              <CustomSelect
                value={paymentMode}
                onChange={(val) => setPaymentMode(val)}
                options={[
                  { value: 'NEFT/RTGS', label: 'NEFT / RTGS' },
                  { value: 'UPI', label: 'UPI / Google Pay' },
                  { value: 'Cheque', label: 'Cheque' },
                  { value: 'Cash', label: 'Cash' },
                  { value: 'IMPS', label: 'IMPS' },
                ]}
                searchable={false}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                UTR / Cheque / Ref No
              </label>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 font-mono focus:border-slate-300 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Remarks / Bank Notes
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:border-slate-300 outline-none"
            />
          </div>
        </form>
      </SlideOverDrawer>

      {/* Delete / Reversal Confirmation */}
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
                  <h3 className="font-semibold text-slate-900 text-sm">Reverse Payment?</h3>
                  <p className="text-xs text-slate-500">Invoice balance will be restored automatically.</p>
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
                  onClick={() => handleDeletePayment(deleteId)}
                  className="px-4 py-2 rounded-2xl bg-rose-600 text-white text-xs font-medium hover:bg-rose-700 transition-colors whitespace-nowrap"
                >
                  Confirm Reversal
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

