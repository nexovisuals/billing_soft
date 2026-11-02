import { API_BASE_URL } from '../config';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Plus,
  Search,
  Printer,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  ChevronRight,
  TrendingUp,
  IndianRupee,
  AlertTriangle,
  Edit2,
  Trash2
} from 'lucide-react';
import { UserSession } from '../types';
import InvoicePrintView, { InvoiceData } from './InvoicePrintView';
import SlideOverDrawer from './common/SlideOverDrawer';
import CustomSelect from './common/CustomSelect';
import CustomDatePicker from './common/CustomDatePicker';

interface PendingDCItem {
  id: string;
  materialId?: string | null;
  description: string;
  drawingNumber?: string | null;
  partNumber?: string | null;
  quantity: string | number;
  uom: string;
  material?: {
    id: string;
    productName: string;
    defaultRate?: string | number | null;
    hsnSacCode?: string | null;
  } | null;
}

interface PendingDC {
  id: string;
  dcNumber: number;
  dcDate: string;
  yourOrderNo?: string | null;
  yourOrderDate?: string | null;
  items: PendingDCItem[];
}

interface InvoiceListItem extends InvoiceData {
  company: {
    name: string;
    address: string;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
    gstin?: string | null;
    phone?: string | null;
  };
  _count?: {
    items: number;
    challans: number;
    payments: number;
  };
}

interface InvoiceManagerProps {
  session: UserSession;
}

export default function InvoiceManager({ session }: InvoiceManagerProps) {
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [companies, setCompanies] = useState<Array<{ id: string; name: string; address: string; gstin?: string | null; state?: string | null }>>([]);
  const [metrics, setMetrics] = useState({
    totalInvoices: 0,
    unpaidInvoices: 0,
    totalInvoicedAmount: 0,
    totalCollectedAmount: 0,
    totalOutstandingDue: 0,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED'>('ALL');
  const [loading, setLoading] = useState(false);

  // Print view state
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<InvoiceData | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1); // 1: Select Customer & DCs; 2: Rates & Tax Review
  const [formError, setFormError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Generator State
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [pendingDCs, setPendingDCs] = useState<PendingDC[]>([]);
  const [loadingDCs, setLoadingDCs] = useState(false);
  const [selectedDcIds, setSelectedDcIds] = useState<string[]>([]);
  
  // Invoice Details Form
  const [nextInvoiceNum, setNextInvoiceNum] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [billingMonth, setBillingMonth] = useState('');
  const [buyersOrderNo, setBuyersOrderNo] = useState('');
  const [buyersOrderDate, setBuyersOrderDate] = useState('');
  const [remarks, setRemarks] = useState('');

  // Billable Line Items
  interface DraftInvoiceItem {
    materialId?: string | null;
    description: string;
    partNumber?: string | null;
    hsnSacCode: string;
    quantity: number;
    rate: number;
    uom: string;
    gstRate: number;
    amount: number;
  }
  const [draftItems, setDraftItems] = useState<DraftInvoiceItem[]>([]);

  // Cancel invoice modal state
  const [cancelModalInvoice, setCancelModalInvoice] = useState<InvoiceListItem | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Edit invoice drawer state
  const [editingInvoice, setEditingInvoice] = useState<InvoiceListItem | null>(null);
  const [editOrderNo, setEditOrderNo] = useState('');
  const [editOrderDate, setEditOrderDate] = useState('');
  const [editRemarks, setEditRemarks] = useState('');
  const [editInvoiceDrawer, setEditInvoiceDrawer] = useState(false);

  const openEditInvoice = (inv: InvoiceListItem) => {
    setEditingInvoice(inv);
    setEditOrderNo(inv.buyersOrderNo || '');
    setEditOrderDate(inv.buyersOrderDate ? inv.buyersOrderDate.split('T')[0] : '');
    setEditRemarks(inv.remarks || '');
    setFormError(null);
    setEditInvoiceDrawer(true);
  };

  const handleUpdateInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/invoices/${editingInvoice.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          buyersOrderNo: editOrderNo,
          buyersOrderDate: editOrderDate || null,
          remarks: editRemarks,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update invoice');
      setNotification({ type: 'success', message: 'Invoice updated successfully' });
      setTimeout(() => setNotification(null), 3500);
      setEditInvoiceDrawer(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvoice = async (inv: InvoiceListItem) => {
    if (!window.confirm(`Are you sure you want to delete Invoice ${inv.invoiceNumber}? Linked Delivery Challans will be restored to Pending Invoicing.`)) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/invoices/${inv.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete invoice');
      setNotification({ type: 'success', message: data.message || 'Invoice deleted successfully' });
      setTimeout(() => setNotification(null), 3500);
      fetchData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to delete invoice' });
      setTimeout(() => setNotification(null), 3500);
    } finally {
      setLoading(false);
    }
  };

  // Fetch initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [invRes, compRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/invoices`, {
          headers: { Authorization: `Bearer ${session.token}` },
        }),
        fetch(`${API_BASE_URL}/api/companies`, {
          headers: { Authorization: `Bearer ${session.token}` },
        }),
      ]);

      if (invRes.ok) {
        const invData = await invRes.json();
        setInvoices(invData.invoices || []);
        if (invData.metrics) {
          setMetrics(invData.metrics);
        }
      }

      if (compRes.ok) {
        const compData = await compRes.json();
        setCompanies(compData.companies || []);
      }
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [session.token]);

  // When company is chosen in modal, fetch its pending DCs
  const handleCompanySelect = async (companyId: string) => {
    setSelectedCompanyId(companyId);
    setSelectedDcIds([]);
    setPendingDCs([]);
    setDraftItems([]);
    if (!companyId) return;

    try {
      setLoadingDCs(true);
      const res = await fetch(`${API_BASE_URL}/api/invoices/pending-dcs?companyId=${companyId}`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPendingDCs(data.pendingDCs || []);
        // Automatically select all pending DCs by default for convenience
        const allIds = (data.pendingDCs || []).map((dc: PendingDC) => dc.id);
        setSelectedDcIds(allIds);
      }
    } catch (err) {
      console.error('Failed to fetch pending DCs:', err);
    } finally {
      setLoadingDCs(false);
    }
  };

  // Open Generate Invoice Modal
  const handleOpenModal = async () => {
    setFormError(null);
    setStep(1);
    setSelectedCompanyId('');
    setPendingDCs([]);
    setSelectedDcIds([]);
    setDraftItems([]);
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setBillingMonth('');
    setBuyersOrderNo('');
    setBuyersOrderDate('');
    setRemarks('');

    // Fetch next invoice number
    try {
      const res = await fetch(`${API_BASE_URL}/api/invoices/next-number`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNextInvoiceNum(data.nextInvoiceNumber);
      }
    } catch (err) {
      console.error('Error fetching next invoice number:', err);
    }

    setModalOpen(true);
  };

  // Toggle selection of a DC
  const toggleDcSelection = (id: string) => {
    setSelectedDcIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Move from Step 1 to Step 2 (Compile draft items from selected DCs)
  const proceedToRatesReview = () => {
    if (!selectedCompanyId) {
      setFormError('Please select a customer company');
      return;
    }
    if (selectedDcIds.length === 0) {
      setFormError('Please select at least one Delivery Challan to invoice');
      return;
    }

    // Filter selected DCs
    const chosenDCs = pendingDCs.filter(dc => selectedDcIds.includes(dc.id));

    // Auto-fill Buyer's order details if available
    const firstWithOrder = chosenDCs.find(dc => dc.yourOrderNo);
    if (firstWithOrder) {
      setBuyersOrderNo(firstWithOrder.yourOrderNo || '');
      if (firstWithOrder.yourOrderDate) {
        setBuyersOrderDate(firstWithOrder.yourOrderDate.split('T')[0]);
      }
    }

    // Group items by partNumber or materialId
    const itemMap = new Map<string, DraftInvoiceItem>();

    chosenDCs.forEach(dc => {
      dc.items.forEach(it => {
        const key = it.partNumber || it.description;
        const qty = parseFloat(it.quantity.toString() || '0');
        const defaultRate = it.material?.defaultRate ? parseFloat(it.material.defaultRate.toString()) : 75.0;

        if (itemMap.has(key)) {
          const existing = itemMap.get(key)!;
          existing.quantity += qty;
          existing.amount = Math.round(existing.quantity * existing.rate * 100) / 100;
        } else {
          itemMap.set(key, {
            materialId: it.materialId || null,
            description: it.description,
            partNumber: it.partNumber || null,
            hsnSacCode: it.material?.hsnSacCode || '998898',
            quantity: qty,
            rate: defaultRate,
            uom: it.uom || 'nos',
            gstRate: 18.0,
            amount: Math.round(qty * defaultRate * 100) / 100,
          });
        }
      });
    });

    setDraftItems(Array.from(itemMap.values()));
    setFormError(null);
    setStep(2);
  };

  // Update item rate
  const updateItemRate = (index: number, newRate: number) => {
    const updated = [...draftItems];
    updated[index].rate = newRate;
    updated[index].amount = Math.round(updated[index].quantity * newRate * 100) / 100;
    setDraftItems(updated);
  };

  // Selected company object
  const currentCompany = companies.find(c => c.id === selectedCompanyId);
  const isIntraState = !currentCompany?.gstin || currentCompany.gstin.startsWith('33');

  // Compute live taxes
  const totalTaxable = draftItems.reduce((sum, item) => sum + item.amount, 0);
  const cgstAmount = isIntraState ? Math.round(totalTaxable * 0.09 * 100) / 100 : 0;
  const sgstAmount = isIntraState ? Math.round(totalTaxable * 0.09 * 100) / 100 : 0;
  const igstAmount = !isIntraState ? Math.round(totalTaxable * 0.18 * 100) / 100 : 0;
  const preRound = totalTaxable + cgstAmount + sgstAmount + igstAmount;
  const grandTotal = Math.round(preRound);
  const roundOff = Math.round((grandTotal - preRound) * 100) / 100;

  // Submit Invoice Generation
  const handleSubmitInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (draftItems.length === 0) {
      setFormError('Cannot create an invoice with no line items');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        companyId: selectedCompanyId,
        invoiceNumber: nextInvoiceNum || undefined,
        invoiceDate,
        billingMonth: billingMonth || undefined,
        buyersOrderNo: buyersOrderNo || undefined,
        buyersOrderDate: buyersOrderDate || undefined,
        challanIds: selectedDcIds,
        items: draftItems,
        remarks: remarks || undefined,
      };

      const res = await fetch(`${API_BASE_URL}/api/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create tax invoice');
      }

      setNotification({
        type: 'success',
        message: `Tax Invoice ${data.invoice.invoiceNumber} created and ${selectedDcIds.length} DCs invoiced!`,
      });
      setModalOpen(false);
      fetchData();

      // Open print view immediately for user convenience
      setSelectedInvoiceForPrint(data.invoice);
    } catch (err: any) {
      setFormError(err.message || 'An error occurred during invoice generation');
    } finally {
      setLoading(false);
    }
  };

  // View & Print invoice
  const handleViewInvoice = async (invoiceId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/invoices/${invoiceId}`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedInvoiceForPrint({
          ...data.invoice,
          amountInWords: data.amountInWords,
          taxInWords: data.taxInWords,
        });
      }
    } catch (err) {
      console.error('Failed to fetch invoice details for printing:', err);
    }
  };

  // Cancel invoice action
  const handleConfirmCancel = async () => {
    if (!cancelModalInvoice) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/invoices/${cancelModalInvoice.id}/cancel`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ reason: cancelReason }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to cancel invoice');
      }

      setNotification({
        type: 'success',
        message: data.message || `Invoice ${cancelModalInvoice.invoiceNumber} cancelled successfully`,
      });
      setCancelModalInvoice(null);
      setCancelReason('');
      fetchData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to cancel invoice',
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter invoices
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.dispatchChallanRef && inv.dispatchChallanRef.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (inv.buyersOrderNo && inv.buyersOrderNo.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === 'ALL' || inv.status === statusFilter;

    return matchesSearch && matchesStatus;
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

      {/* Top Banner & KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Invoices
            </span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-semibold text-slate-900 tracking-tight">
              {metrics.totalInvoices}
            </span>
            <span className="text-xs text-slate-500 ml-2">billed records</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Invoiced (₹)
            </span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-semibold text-slate-900 tracking-tight">
              ₹{metrics.totalInvoicedAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
            <span className="text-xs text-slate-500 ml-2">gross billing</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Outstanding Due
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-semibold text-slate-900 tracking-tight">
              ₹{metrics.totalOutstandingDue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
            <span className="text-xs text-amber-700 font-medium ml-2">
              {metrics.unpaidInvoices} pending
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Collected Amount
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-semibold text-slate-900 tracking-tight">
              ₹{metrics.totalCollectedAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
            <span className="text-xs text-emerald-700 font-medium ml-2">realized</span>
          </div>
        </div>
      </div>

      {/* Control Bar: Filters, Search, and Action Button */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Status Filter Ribbon */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200/80 overflow-x-auto">
          {(['ALL', 'UNPAID', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'] as const).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {status === 'ALL'
                ? 'All Invoices'
                : status === 'UNPAID'
                ? 'Unpaid'
                : status === 'PARTIALLY_PAID'
                ? 'Partial'
                : status === 'PAID'
                ? 'Paid'
                : 'Cancelled'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search invoice, company, DC..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-2xl bg-white border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-300 shadow-sm"
            />
          </div>

          {/* Generate Tax Invoice Button */}
          {(session.role === 'ADMIN' || session.role === 'STAFF') && (
            <button
              onClick={handleOpenModal}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-slate-300 text-slate-900 text-xs font-semibold hover:bg-slate-50 hover:border-slate-400 transition-all shadow-2xs whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Generate Tax Invoice</span>
            </button>
          )}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white border border-slate-200/80 rounded-3xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4 whitespace-nowrap text-left">Invoice No.</th>
                <th className="py-3.5 px-4 whitespace-nowrap text-left">Date</th>
                <th className="py-3.5 px-4 whitespace-nowrap text-left">Customer Company</th>
                <th className="py-3.5 px-4 whitespace-nowrap text-left">Delivery Challan Ref</th>
                <th className="py-3.5 px-4 text-left whitespace-nowrap">Taxable Value</th>
                <th className="py-3.5 px-4 text-left whitespace-nowrap">Grand Total (₹)</th>
                <th className="py-3.5 px-4 text-left whitespace-nowrap">Status</th>
                <th className="py-3.5 px-4 text-left whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 whitespace-nowrap">
                    Loading invoices...
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 whitespace-nowrap">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No tax invoices match your criteria. Click "+ Generate Tax Invoice" to bill your customer dispatches.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-950 whitespace-nowrap">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium whitespace-nowrap">
                      {new Date(inv.invoiceDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-medium text-slate-900">{inv.company.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        GSTIN: {inv.company.gstin || 'Unregistered'}
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-[11px] text-slate-600 font-mono whitespace-nowrap" title={inv.dispatchChallanRef || ''}>
                      {inv.dispatchChallanRef || 'Direct Invoicing'}
                    </td>
                    <td className="py-3 px-4 text-left font-medium text-slate-800 whitespace-nowrap">
                      ₹{parseFloat(inv.taxableValue.toString()).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-left font-semibold text-slate-950 whitespace-nowrap">
                      ₹{parseFloat(inv.totalAmount.toString()).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-left whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${
                          inv.status === 'PAID'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : inv.status === 'PARTIALLY_PAID'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : inv.status === 'CANCELLED'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {inv.status === 'PAID'
                          ? 'Paid'
                          : inv.status === 'PARTIALLY_PAID'
                          ? 'Partially Paid'
                          : inv.status === 'CANCELLED'
                          ? 'Cancelled'
                          : 'Unpaid Due'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-left whitespace-nowrap">
                      <div className="flex items-center justify-start gap-1.5">
                        <button
                          onClick={() => handleViewInvoice(inv.id)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors whitespace-nowrap"
                          title="Print / View Invoice"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>View & Print</span>
                        </button>
                        {session.role === 'ADMIN' && (
                          <>
                            <button
                              onClick={() => openEditInvoice(inv)}
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors whitespace-nowrap"
                              title="Edit Invoice Details"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {inv.status !== 'CANCELLED' && inv.status !== 'PAID' && (
                              <button
                                onClick={() => {
                                  setCancelModalInvoice(inv);
                                  setCancelReason('');
                                }}
                                className="p-1 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors whitespace-nowrap"
                                title="Cancel Invoice"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteInvoice(inv)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors whitespace-nowrap"
                              title="Delete Invoice"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Multi-Month Consolidated Invoice Generator Slide-Over Drawer */}
      <SlideOverDrawer
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Consolidated GST Tax Invoice Generator"
        subtitle={
          step === 1
            ? 'Step 1: Select Customer & Multiple Delivery Challans'
            : 'Step 2: Review Machining Rates & Real-Time GST Apportionment'
        }
        widthClass="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl"
        footer={
          step === 1 ? (
            <>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedCompanyId || selectedDcIds.length === 0}
                onClick={proceedToRatesReview}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-semibold hover:bg-slate-50 hover:border-slate-400 disabled:opacity-40 active:scale-95 transition-all shadow-2xs whitespace-nowrap"
              >
                <span>Proceed to Rates & Tax Review ({selectedDcIds.length} DCs)</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap"
              >
                Back to DCs
              </button>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading || draftItems.length === 0}
                onClick={handleSubmitInvoice}
                className="px-5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-semibold hover:bg-slate-50 hover:border-slate-400 active:scale-95 disabled:opacity-50 transition-all shadow-2xs whitespace-nowrap"
              >
                {loading ? 'Generating Tax Invoice...' : 'Confirm & Generate Tax Invoice'}
              </button>
            </>
          )
        }
      >
        <div className="space-y-5">
          {formError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          {step === 1 ? (
            /* Step 1: Select Customer & Pick DCs */
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Select Customer Company *
                </label>
                <CustomSelect
                  value={selectedCompanyId}
                  onChange={(val) => handleCompanySelect(val)}
                  options={companies.map((c) => ({
                    value: c.id,
                    label: c.name,
                    sublabel: c.gstin ? `GSTIN: ${c.gstin}` : 'No GSTIN registered',
                  }))}
                  placeholder="-- Choose Customer to Bill --"
                />
              </div>

                    {selectedCompanyId && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            <Layers className="w-4 h-4 text-slate-500" />
                            <span>Select Pending Delivery Challans (Multi-Month Supported)</span>
                          </label>
                          {pendingDCs.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                if (selectedDcIds.length === pendingDCs.length) {
                                  setSelectedDcIds([]);
                                } else {
                                  setSelectedDcIds(pendingDCs.map(dc => dc.id));
                                }
                              }}
                              className="text-xs font-medium text-slate-600 hover:text-slate-950 underline whitespace-nowrap"
                            >
                              {selectedDcIds.length === pendingDCs.length ? 'Deselect All' : 'Select All'}
                            </button>
                          )}
                        </div>

                        {loadingDCs ? (
                          <div className="p-8 text-center text-slate-400 text-xs">
                            Searching customer delivery challans...
                          </div>
                        ) : pendingDCs.length === 0 ? (
                          <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 text-center text-xs text-amber-800">
                            No uninvoiced Delivery Challans found for this customer.
                            Please create a Delivery Challan first under the <strong>Delivery Challans</strong> module.
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                            {pendingDCs.map(dc => {
                              const isSelected = selectedDcIds.includes(dc.id);
                              return (
                                <div
                                  key={dc.id}
                                  onClick={() => toggleDcSelection(dc.id)}
                                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                                    isSelected
                                      ? 'bg-slate-100 text-slate-900 border-slate-400 font-semibold shadow-2xs'
                                      : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => {}} // handled by parent div
                                      className="rounded text-slate-900 focus:ring-0 cursor-pointer"
                                    />
                                    <div>
                                      <div className="font-semibold text-xs flex items-center gap-2">
                                        <span>DC #{dc.dcNumber}</span>
                                        <span className={`text-[10px] font-normal px-2 py-0.5 rounded-full ${isSelected ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-600'}`}>
                                          {new Date(dc.dcDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </span>
                                      </div>
                                      <div className="text-[11px] text-slate-500 mt-0.5">
                                        {dc.items.map(it => `${it.description} (${it.quantity} ${it.uom})`).join(', ')}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="text-right text-[11px]">
                                    {dc.yourOrderNo && (
                                      <div className="font-mono text-slate-500">
                                        PO: {dc.yourOrderNo}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Step 2: Rates & Tax Review */
                  <form onSubmit={handleSubmitInvoice} className="space-y-5">
                    {/* Invoice Metadata Header Row */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Invoice Number *
                        </label>
                        <input
                          type="text"
                          required
                          value={nextInvoiceNum}
                          onChange={e => setNextInvoiceNum(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Invoice Date *
                        </label>
                        <CustomDatePicker
                          value={invoiceDate}
                          onChange={setInvoiceDate}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Buyer's Order No.
                        </label>
                        <input
                          type="text"
                          value={buyersOrderNo}
                          onChange={e => setBuyersOrderNo(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Billing Month
                        </label>
                        <input
                          type="text"
                          value={billingMonth}
                          onChange={e => setBillingMonth(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900"
                        />
                      </div>
                    </div>

                    {/* Consolidated Items Table */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                        Consolidated Dispatched Parts & Rates
                      </label>
                      <div className="border border-slate-200 rounded-2xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-500 text-[11px] font-medium border-b border-slate-200">
                            <tr>
                              <th className="py-2.5 px-3 whitespace-nowrap text-left">Description & Part No</th>
                              <th className="py-2.5 px-2 text-left w-20 whitespace-nowrap">SAC</th>
                              <th className="py-2.5 px-2 text-left w-24 whitespace-nowrap">Quantity</th>
                              <th className="py-2.5 px-2 text-left w-28 whitespace-nowrap">Rate (₹)</th>
                              <th className="py-2.5 px-3 text-left w-32 whitespace-nowrap">Line Amount (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {draftItems.map((item, idx) => (
                              <tr key={idx}>
                                <td className="py-2.5 px-3 whitespace-nowrap">
                                  <div className="font-semibold text-slate-900">{item.description}</div>
                                  {item.partNumber && (
                                    <div className="text-[10px] text-slate-500 font-mono">
                                      Part: {item.partNumber}
                                    </div>
                                  )}
                                </td>
                                <td className="py-2.5 px-2 text-left text-slate-600 font-mono whitespace-nowrap">
                                  {item.hsnSacCode}
                                </td>
                                <td className="py-2.5 px-2 text-left font-medium text-slate-900 whitespace-nowrap">
                                  {item.quantity.toLocaleString('en-IN')} {item.uom}
                                </td>
                                <td className="py-2.5 px-2 text-left whitespace-nowrap">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={item.rate}
                                    onChange={e => updateItemRate(idx, parseFloat(e.target.value) || 0)}
                                    className="w-24 px-2 py-1 rounded-lg border border-slate-200 text-right text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-300"
                                  />
                                </td>
                                <td className="py-2.5 px-3 text-left font-semibold text-slate-950 whitespace-nowrap">
                                  ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Real-Time Tax Breakdown Box */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Total Taxable Machining Value:</span>
                        <span className="font-semibold text-slate-900">₹{totalTaxable.toFixed(2)}</span>
                      </div>
                      {isIntraState ? (
                        <>
                          <div className="flex justify-between text-slate-600">
                            <span>Central Tax (CGST 9.0%):</span>
                            <span className="font-medium text-slate-900">₹{cgstAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span>State Tax (SGST 9.0%):</span>
                            <span className="font-medium text-slate-900">₹{sgstAmount.toFixed(2)}</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between text-slate-600">
                          <span>Integrated Tax (IGST 18.0%):</span>
                          <span className="font-medium text-slate-900">₹{igstAmount.toFixed(2)}</span>
                        </div>
                      )}
                      {roundOff !== 0 && (
                        <div className="flex justify-between text-slate-500 text-[11px]">
                          <span>Round Off:</span>
                          <span>{roundOff > 0 ? '+' : ''}{roundOff.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-semibold text-slate-950">
                        <span>Invoice Total Amount:</span>
                        <span className="text-base">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </form>
                )}
              </div>
      </SlideOverDrawer>

      {/* Cancel Invoice Confirmation Modal */}
      <AnimatePresence>
        {cancelModalInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 w-full max-w-md space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-600">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">
                    Cancel Invoice {cancelModalInvoice.invoiceNumber}?
                  </h3>
                  <p className="text-xs text-slate-500">
                    Linked Delivery Challans will safely revert to "Pending Invoicing".
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Reason for Cancellation *
                </label>
                <textarea
                  rows={3}
                  required
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-300"
                />
              </div>

              <div className="flex items-center justify-start gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelModalInvoice(null)}
                  className="px-4 py-2 rounded-2xl bg-white border border-slate-200 text-xs font-medium text-slate-600 hover:text-slate-900 whitespace-nowrap"
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  disabled={loading || !cancelReason.trim()}
                  onClick={handleConfirmCancel}
                  className="px-4 py-2 rounded-2xl bg-rose-600 text-white text-xs font-medium hover:bg-rose-700 disabled:opacity-40 transition-colors whitespace-nowrap"
                >
                  {loading ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Invoice Drawer */}
      <SlideOverDrawer
        isOpen={editInvoiceDrawer}
        onClose={() => setEditInvoiceDrawer(false)}
        title={editingInvoice ? `Edit Invoice #${editingInvoice.invoiceNumber}` : 'Edit Invoice'}
        subtitle="Update buyer's order details and delivery remarks"
        footer={
          <>
            <button
              type="button"
              onClick={() => setEditInvoiceDrawer(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="edit-invoice-form"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-semibold hover:bg-slate-50 hover:border-slate-400 disabled:opacity-50 active:scale-95 transition-all shadow-2xs whitespace-nowrap"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        }
      >
        <form id="edit-invoice-form" onSubmit={handleUpdateInvoiceSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Buyer's Order / PO Reference</label>
            <input
              type="text"
              value={editOrderNo}
              onChange={(e) => setEditOrderNo(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 font-mono font-normal outline-none focus:border-slate-300"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Buyer's Order Date</label>
            <CustomDatePicker
              value={editOrderDate}
              onChange={(dateStr) => setEditOrderDate(dateStr)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">General Remarks / Notes</label>
            <textarea
              rows={4}
              value={editRemarks}
              onChange={(e) => setEditRemarks(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 font-normal outline-none focus:border-slate-300"
            />
          </div>
        </form>
      </SlideOverDrawer>

      {/* Printable Invoice Modal Component */}
      {selectedInvoiceForPrint && (
        <InvoicePrintView
          invoice={selectedInvoiceForPrint}
          amountInWords={selectedInvoiceForPrint.amountInWords}
          taxInWords={selectedInvoiceForPrint.taxInWords}
          onClose={() => setSelectedInvoiceForPrint(null)}
        />
      )}
    </div>
  );
}

