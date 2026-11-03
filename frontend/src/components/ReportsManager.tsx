import { API_BASE_URL } from '../config';
import { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  FileSpreadsheet,
  Printer,
  Search,
  Layers,
  Truck,
  Receipt,
  ShoppingBag,
  Zap,
  Users,
  Clock,
  Loader2,
  Share2,
  ArrowLeft,
  ChevronRight,
  CreditCard,
  Copy,
  Check,
  MessageCircle,
  RefreshCw,
  X
} from 'lucide-react';
import { UserSession } from '../types';
import CustomDatePicker from './common/CustomDatePicker';
import CustomSelect from './common/CustomSelect';

interface ReportsManagerProps {
  session: UserSession;
}

export type ReportType =
  | 'invoices'
  | 'payments'
  | 'stock'
  | 'dcs'
  | 'purchases'
  | 'expenses'
  | 'production'
  | 'salary';

interface ReportMeta {
  id: ReportType;
  title: string;
  category: string;
  description: string;
  icon: any;
  color: string;
  bgColor: string;
}

const REPORT_CATALOG: ReportMeta[] = [
  {
    id: 'invoices',
    title: 'Tax Invoices & GST',
    category: 'Billing & Tax',
    description: 'Detailed GST registers with taxable value, CGST, SGST, IGST, paid & balance due',
    icon: Receipt,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
  },
  {
    id: 'payments',
    title: 'Customer Payments',
    category: 'Collections',
    description: 'All customer payments, payment modes, UTR reference numbers, and remaining dues',
    icon: CreditCard,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 border-emerald-200',
  },
  {
    id: 'dcs',
    title: 'Delivery Challans (DC)',
    category: 'Dispatches',
    description: 'All delivery challans, customer PO numbers, dispatches, and invoicing status',
    icon: Truck,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 border-indigo-200',
  },
  {
    id: 'stock',
    title: 'Customer Raw Stock',
    category: 'Inventory',
    description: 'Material receipts from clients, consumption during CNC jobs, and balance stock',
    icon: Layers,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 border-amber-200',
  },
  {
    id: 'purchases',
    title: 'Workshop Purchases',
    category: 'Expenses',
    description: 'Workshop tooling, carbide inserts, coolant, oil, and spare parts procurement',
    icon: ShoppingBag,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 border-purple-200',
  },
  {
    id: 'expenses',
    title: 'Other Operating Expenses',
    category: 'Expenses',
    description: 'Factory electricity, workshop rent, repairs, transport, and administrative costs',
    icon: Zap,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50 border-rose-200',
  },
  {
    id: 'production',
    title: 'Daily Production & Scrap',
    category: 'Operations',
    description: 'Machine operator outputs, completed job parts, scrap counts, and working hours',
    icon: Users,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50 border-cyan-200',
  },
  {
    id: 'salary',
    title: 'Salary & Attendance Register',
    category: 'Payroll',
    description: '26-day monthly payroll calculations, present/absent days, overtime, and net payout',
    icon: Clock,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50 border-teal-200',
  },
];

export default function ReportsManager({ session }: ReportsManagerProps) {
  // If null, show the clean Report Selector Hub; otherwise show that report alone
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);

  // Filter States
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('ALL');
  const [selectedWorkerId, setSelectedWorkerId] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Share Modal State
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);

  // Raw data from APIs
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [workers, setWorkers] = useState<Array<{ id: string; user: { fullName: string } }>>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [dcs, setDcs] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [productionLogs, setProductionLogs] = useState<any[]>([]);
  const [stockLedger, setStockLedger] = useState<any[]>([]);
  const [salaryRecords, setSalaryRecords] = useState<any[]>([]);

  // Fetch all necessary data
  useEffect(() => {
    fetchAllReportData();
  }, [session?.token]);

  const fetchAllReportData = async () => {
    setLoading(true);
    try {
      const token =
        session?.token ||
        (() => {
          try {
            const s = localStorage.getItem('svt_session');
            return s ? JSON.parse(s).token : null;
          } catch {
            return null;
          }
        })();

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const [
        compRes,
        workRes,
        invRes,
        dcRes,
        payRes,
        purRes,
        expRes,
        prodRes,
        stockRes,
        salRes,
      ] = await Promise.all([
        fetch(`${API_BASE_URL}/api/companies`, { headers }).catch(() => null),
        fetch(`${API_BASE_URL}/api/worker/profiles`, { headers }).catch(() => null),
        fetch(`${API_BASE_URL}/api/invoices`, { headers }).catch(() => null),
        fetch(`${API_BASE_URL}/api/dcs`, { headers }).catch(() => null),
        fetch(`${API_BASE_URL}/api/payments`, { headers }).catch(() => null),
        fetch(`${API_BASE_URL}/api/expenses/purchases`, { headers }).catch(() => null),
        fetch(`${API_BASE_URL}/api/expenses/operating`, { headers }).catch(() => null),
        fetch(`${API_BASE_URL}/api/worker/daily-work`, { headers }).catch(() => null),
        fetch(`${API_BASE_URL}/api/stock/ledger`, { headers }).catch(() => null),
        fetch(`${API_BASE_URL}/api/salary/records`, { headers }).catch(() => null),
      ]);

      if (compRes?.ok) {
        const d = await compRes.json();
        setCompanies(d.companies || []);
      }
      if (workRes?.ok) {
        const d = await workRes.json();
        setWorkers(d.workers || []);
      }
      if (invRes?.ok) {
        const d = await invRes.json();
        setInvoices(d.invoices || []);
      }
      if (dcRes?.ok) {
        const d = await dcRes.json();
        setDcs(d.dcs || []);
      }
      if (payRes?.ok) {
        const d = await payRes.json();
        setPayments(d.payments || []);
      }
      if (purRes?.ok) {
        const d = await purRes.json();
        setPurchases(d.purchases || []);
      }
      if (expRes?.ok) {
        const d = await expRes.json();
        setExpenses(d.expenses || []);
      }
      if (prodRes?.ok) {
        const d = await prodRes.json();
        setProductionLogs(d.entries || d.logs || []);
      }
      if (stockRes?.ok) {
        const d = await stockRes.json();
        setStockLedger(d.ledger || []);
      }
      if (salRes?.ok) {
        const d = await salRes.json();
        setSalaryRecords(d.records || []);
      }
    } catch (e) {
      console.error('Failed to load reports data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Helper date checker
  const isDateInRange = (dateStr?: string | null) => {
    if (!dateStr) return true;
    const d = new Date(dateStr).toISOString().split('T')[0];
    if (dateFrom && d < dateFrom) return false;
    if (dateTo && d > dateTo) return false;
    return true;
  };

  // Open single report
  const handleOpenReport = (type: ReportType) => {
    setSelectedReport(type);
    // Reset filters
    setDateFrom('');
    setDateTo('');
    setSelectedCompanyId('ALL');
    setSelectedWorkerId('ALL');
    setSelectedCategory('ALL');
    setSearchQuery('');
    fetchAllReportData();
  };

  // ────────────────────────────────────────────────────────────
  // FILTERED DATASETS
  // ────────────────────────────────────────────────────────────
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (!isDateInRange(inv.invoiceDate)) return false;
      if (selectedCompanyId !== 'ALL' && inv.companyId !== selectedCompanyId) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const num = (inv.invoiceNumber || '').toLowerCase();
        const comp = (inv.company?.name || '').toLowerCase();
        if (!num.includes(q) && !comp.includes(q)) return false;
      }
      return true;
    });
  }, [invoices, dateFrom, dateTo, selectedCompanyId, searchQuery]);

  const filteredPayments = useMemo(() => {
    return payments.filter((pay) => {
      if (!isDateInRange(pay.paymentDate)) return false;
      if (selectedCompanyId !== 'ALL' && pay.companyId !== selectedCompanyId) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const comp = (pay.company?.name || '').toLowerCase();
        const ref = (pay.referenceNo || '').toLowerCase();
        const inv = (pay.invoice?.invoiceNumber || '').toLowerCase();
        if (!comp.includes(q) && !ref.includes(q) && !inv.includes(q)) return false;
      }
      return true;
    });
  }, [payments, dateFrom, dateTo, selectedCompanyId, searchQuery]);

  const filteredDCs = useMemo(() => {
    return dcs.filter((dc) => {
      if (!isDateInRange(dc.dcDate)) return false;
      if (selectedCompanyId !== 'ALL' && dc.companyId !== selectedCompanyId) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const num = String(dc.dcNumber || '').toLowerCase();
        const comp = (dc.company?.name || '').toLowerCase();
        const po = (dc.yourOrderNo || '').toLowerCase();
        if (!num.includes(q) && !comp.includes(q) && !po.includes(q)) return false;
      }
      return true;
    });
  }, [dcs, dateFrom, dateTo, selectedCompanyId, searchQuery]);

  const filteredStock = useMemo(() => {
    return stockLedger.filter((s) => {
      if (!isDateInRange(s.transactionDate || s.createdAt)) return false;
      if (selectedCompanyId !== 'ALL' && s.companyId !== selectedCompanyId) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const comp = (s.company?.name || '').toLowerCase();
        const mat = (s.material?.productName || '').toLowerCase();
        if (!comp.includes(q) && !mat.includes(q)) return false;
      }
      return true;
    });
  }, [stockLedger, dateFrom, dateTo, selectedCompanyId, searchQuery]);

  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      if (!isDateInRange(p.purchaseDate || p.createdAt)) return false;
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const item = (p.itemName || '').toLowerCase();
        const supp = (p.supplierName || '').toLowerCase();
        if (!item.includes(q) && !supp.includes(q)) return false;
      }
      return true;
    });
  }, [purchases, dateFrom, dateTo, selectedCategory, searchQuery]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (!isDateInRange(e.expenseDate || e.createdAt)) return false;
      if (selectedCategory !== 'ALL' && e.category !== selectedCategory) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const desc = (e.description || '').toLowerCase();
        const cat = (e.category || '').toLowerCase();
        if (!desc.includes(q) && !cat.includes(q)) return false;
      }
      return true;
    });
  }, [expenses, dateFrom, dateTo, selectedCategory, searchQuery]);

  const filteredProduction = useMemo(() => {
    return productionLogs.filter((log) => {
      if (!isDateInRange(log.workDate)) return false;
      if (selectedWorkerId !== 'ALL' && log.workerId !== selectedWorkerId) return false;
      if (selectedCompanyId !== 'ALL' && log.companyId !== selectedCompanyId) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const desc = (log.description || '').toLowerCase();
        const worker = (log.worker?.user?.fullName || '').toLowerCase();
        const comp = (log.company?.name || '').toLowerCase();
        if (!desc.includes(q) && !worker.includes(q) && !comp.includes(q)) return false;
      }
      return true;
    });
  }, [productionLogs, dateFrom, dateTo, selectedWorkerId, selectedCompanyId, searchQuery]);

  const filteredSalaries = useMemo(() => {
    return salaryRecords.filter((sal) => {
      if (selectedWorkerId !== 'ALL' && sal.workerId !== selectedWorkerId) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const worker = (sal.worker?.user?.fullName || '').toLowerCase();
        const empId = (sal.worker?.employeeId || '').toLowerCase();
        if (!worker.includes(q) && !empId.includes(q)) return false;
      }
      return true;
    });
  }, [salaryRecords, selectedWorkerId, searchQuery]);

  // CSV Exporter helper
  const exportToCSV = (filename: string, headers: string[], rows: any[][]) => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${String(val ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExport = () => {
    if (selectedReport === 'invoices') {
      const headers = ['Invoice No', 'Date', 'Customer Company', 'Taxable Value', 'GST Amount', 'Total Amount', 'Paid', 'Balance Due', 'Status'];
      const rows = filteredInvoices.map((inv) => [
        inv.invoiceNumber,
        new Date(inv.invoiceDate).toLocaleDateString('en-GB'),
        inv.company?.name || 'N/A',
        Number(inv.taxableValue || inv.taxableAmount || 0).toFixed(2),
        (Number(inv.cgstAmount || 0) + Number(inv.sgstAmount || 0) + Number(inv.igstAmount || 0)).toFixed(2),
        Number(inv.totalAmount || 0).toFixed(2),
        Number(inv.paidAmount || 0).toFixed(2),
        Number(inv.balanceDue || 0).toFixed(2),
        inv.status,
      ]);
      exportToCSV('SVT_Invoices_GST_Report', headers, rows);
    } else if (selectedReport === 'payments') {
      const headers = ['Date', 'Customer Company', 'Linked Invoice', 'Payment Mode', 'Reference No', 'Amount Paid', 'Remaining Balance'];
      const rows = filteredPayments.map((p) => [
        new Date(p.paymentDate).toLocaleDateString('en-GB'),
        p.company?.name || 'N/A',
        p.invoice?.invoiceNumber || 'Advance',
        p.paymentMode,
        p.referenceNo || '—',
        Number(p.amount || 0).toFixed(2),
        p.invoice ? Number(p.invoice.balanceDue || 0).toFixed(2) : '—',
      ]);
      exportToCSV('SVT_Customer_Payments_Report', headers, rows);
    } else if (selectedReport === 'dcs') {
      const headers = ['DC Number', 'Date', 'Customer Company', 'Order / PO Ref', 'E-Way Bill', 'Status'];
      const rows = filteredDCs.map((dc) => [
        `DC #${dc.dcNumber}`,
        new Date(dc.dcDate).toLocaleDateString('en-GB'),
        dc.company?.name || 'N/A',
        dc.yourOrderNo || '—',
        dc.ewayBillNumber || '—',
        dc.status,
      ]);
      exportToCSV('SVT_Delivery_Challan_Report', headers, rows);
    } else if (selectedReport === 'stock') {
      const headers = ['Date', 'Customer Company', 'Product / Material', 'Movement Type', 'Qty In', 'Qty Out', 'Balance'];
      const rows = filteredStock.map((s) => [
        new Date(s.transactionDate || s.createdAt).toLocaleDateString('en-GB'),
        s.company?.name || '—',
        s.material?.productName || 'Raw Material',
        s.movementType || 'ADJUSTMENT',
        s.quantityIn || '0',
        s.quantityOut || '0',
        s.balance || '0',
      ]);
      exportToCSV('SVT_Customer_Stock_Report', headers, rows);
    } else if (selectedReport === 'purchases') {
      const headers = ['Date', 'Item Description', 'Category', 'Quantity', 'Unit Price', 'Total Amount', 'Bill No'];
      const rows = filteredPurchases.map((p) => [
        new Date(p.purchaseDate || p.createdAt).toLocaleDateString('en-GB'),
        p.itemName,
        p.category,
        `${p.quantity} ${p.uom || 'pcs'}`,
        Number(p.unitPrice || 0).toFixed(2),
        Number(p.totalAmount || 0).toFixed(2),
        p.supplierBillNo || '—',
      ]);
      exportToCSV('SVT_Workshop_Purchases_Report', headers, rows);
    } else if (selectedReport === 'expenses') {
      const headers = ['Date', 'Category', 'Description', 'Amount', 'Payment Mode', 'Reference No'];
      const rows = filteredExpenses.map((e) => [
        new Date(e.expenseDate || e.createdAt).toLocaleDateString('en-GB'),
        e.category,
        e.description,
        Number(e.amount || 0).toFixed(2),
        e.paymentMode || 'Cash',
        e.referenceNo || '—',
      ]);
      exportToCSV('SVT_Operating_Expenses_Report', headers, rows);
    } else if (selectedReport === 'production') {
      const headers = ['Date', 'Worker Name', 'Company', 'Work Description', 'Finished Qty', 'Scrap Qty', 'Hours', 'Status'];
      const rows = filteredProduction.map((log) => [
        new Date(log.workDate).toLocaleDateString('en-GB'),
        log.worker?.user?.fullName || 'Worker',
        log.company?.name || '—',
        log.description,
        log.quantityDone,
        log.quantityScrap || 0,
        log.workingHours || '—',
        log.status,
      ]);
      exportToCSV('SVT_Daily_Production_Report', headers, rows);
    } else if (selectedReport === 'salary') {
      const headers = ['Month', 'Worker Name', 'Employee ID', 'Base Salary', 'Absence Deduct', 'Overtime Pay', 'Extra Shifts', 'Net Salary', 'Status'];
      const rows = filteredSalaries.map((sal) => [
        sal.monthYear,
        sal.worker?.user?.fullName || 'Worker',
        sal.worker?.employeeId || '—',
        Number(sal.baseSalary || 0).toFixed(2),
        Number(sal.absenceDeduct || 0).toFixed(2),
        Number(sal.approvedOtAmt || 0).toFixed(2),
        Number(sal.approvedShiftAmt || 0).toFixed(2),
        Number(sal.netSalary || 0).toFixed(2),
        sal.isPaid ? 'PAID' : 'PENDING',
      ]);
      exportToCSV('SVT_Salary_Payroll_Report', headers, rows);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Generate share summary text
  const generateShareSummary = () => {
    const meta = REPORT_CATALOG.find((r) => r.id === selectedReport);
    const dateRangeStr =
      dateFrom && dateTo
        ? ` (${dateFrom} to ${dateTo})`
        : dateFrom
        ? ` (From ${dateFrom})`
        : ' (All Time)';

    let summaryText = `*Shri Varshini Technologies*\n📊 *${meta?.title || 'Report'}*${dateRangeStr}\n\n`;

    if (selectedReport === 'invoices') {
      const totalAmount = filteredInvoices.reduce((acc, i) => acc + Number(i.totalAmount || 0), 0);
      const totalBalance = filteredInvoices.reduce((acc, i) => acc + Number(i.balanceDue || 0), 0);
      summaryText += `• Invoices Count: ${filteredInvoices.length}\n• Total Invoiced: ₹${totalAmount.toLocaleString('en-IN')}\n• Total Balance Due: ₹${totalBalance.toLocaleString('en-IN')}`;
    } else if (selectedReport === 'payments') {
      const totalAmount = filteredPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
      summaryText += `• Collections Count: ${filteredPayments.length}\n• Total Realized: ₹${totalAmount.toLocaleString('en-IN')}`;
    } else if (selectedReport === 'dcs') {
      summaryText += `• Delivery Challans Count: ${filteredDCs.length}\n• Invoiced: ${filteredDCs.filter((d) => d.status === 'INVOICED').length}\n• Pending Invoicing: ${filteredDCs.filter((d) => d.status !== 'INVOICED').length}`;
    } else if (selectedReport === 'purchases') {
      const totalAmount = filteredPurchases.reduce((acc, p) => acc + Number(p.totalAmount || 0), 0);
      summaryText += `• Purchases Count: ${filteredPurchases.length}\n• Total Expenditure: ₹${totalAmount.toLocaleString('en-IN')}`;
    } else if (selectedReport === 'expenses') {
      const totalAmount = filteredExpenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);
      summaryText += `• Expenses Count: ${filteredExpenses.length}\n• Total Operating Cost: ₹${totalAmount.toLocaleString('en-IN')}`;
    } else if (selectedReport === 'production') {
      const totalDone = filteredProduction.reduce((acc, l) => acc + Number(l.quantityDone || 0), 0);
      const totalScrap = filteredProduction.reduce((acc, l) => acc + Number(l.quantityScrap || 0), 0);
      summaryText += `• Total Output: ${totalDone.toLocaleString('en-IN')} pcs\n• Total Scrap: ${totalScrap.toLocaleString('en-IN')} pcs`;
    } else if (selectedReport === 'salary') {
      const totalPayout = filteredSalaries.reduce((acc, s) => acc + Number(s.netSalary || 0), 0);
      summaryText += `• Workers Evaluated: ${filteredSalaries.length}\n• Total Net Payout: ₹${totalPayout.toLocaleString('en-IN')}`;
    } else {
      summaryText += `• Total Records: ${filteredStock.length}`;
    }

    summaryText += `\n\nGenerated via SVT Workshop Control on ${new Date().toLocaleDateString('en-IN')}`;
    return summaryText;
  };

  const handleCopyShare = async () => {
    try {
      const text = generateShareSummary();
      await navigator.clipboard.writeText(text);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(generateShareSummary());
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `SVT Report - ${selectedReport}`,
          text: generateShareSummary(),
        });
      } catch (e) {
        // user cancelled
      }
    } else {
      handleCopyShare();
    }
  };

  // ────────────────────────────────────────────────────────────
  // VIEW 1: REPORT CATALOG HUB (Initial state)
  // ────────────────────────────────────────────────────────────
  if (!selectedReport) {
    return (
      <div className="space-y-6">
        {/* Hub Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-slate-800" />
              <span>Reports Center</span>
            </h2>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              Select a report below to view full details, apply filters, download, or share
            </p>
          </div>
          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
              <span>Syncing workshop records...</span>
            </div>
          )}
        </div>

        {/* 8 Clean Report Cards in 2x2 matrix on mobile */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {REPORT_CATALOG.map((rep) => {
            const Icon = rep.icon;

            return (
              <button
                key={rep.id}
                onClick={() => handleOpenReport(rep.id)}
                className="group relative p-3.5 sm:p-5 rounded-2xl bg-slate-50/70 hover:bg-white hover:shadow-card transition-all text-left flex flex-col justify-between"
              >
                <div>
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${rep.bgColor} mb-2.5 sm:mb-3.5 shrink-0`}>
                    <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${rep.color}`} />
                  </div>

                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                    {rep.title}
                  </h3>
                  <p className="hidden sm:block text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {rep.description}
                  </p>
                </div>

                <div className="mt-2.5 sm:mt-4 flex items-center justify-between text-[11px] sm:text-xs font-semibold text-slate-700 group-hover:text-blue-600">
                  <span className="whitespace-nowrap">Open Report</span>
                  <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform group-hover:translate-x-1 shrink-0" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────
  // VIEW 2: SINGLE REPORT VIEW (Dedicated, Clear Filters, Actions)
  // ────────────────────────────────────────────────────────────
  const currentMeta = REPORT_CATALOG.find((r) => r.id === selectedReport)!;

  return (
    <div className="space-y-6">
      {/* Top Action Bar with Back Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedReport(null)}
            title="Back to Reports"
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              {currentMeta.title}
            </h2>
            <p className="text-xs text-slate-500">{currentMeta.description}</p>
          </div>
        </div>

        {/* Action Buttons: Export, Print, Share, Refresh */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchAllReportData}
            title="Refresh Report Data"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-all shadow-2xs whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 shrink-0 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-semibold hover:bg-slate-50 transition-all shadow-2xs whitespace-nowrap shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-semibold hover:bg-slate-50 transition-all shadow-2xs whitespace-nowrap shrink-0"
          >
            <Printer className="w-4 h-4 text-slate-600 shrink-0" />
            <span>Print Report</span>
          </button>

          <button
            onClick={() => setShareModalOpen(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs font-semibold hover:bg-slate-50 transition-all shadow-2xs whitespace-nowrap shrink-0"
          >
            <Share2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Share Report</span>
          </button>
        </div>
      </div>

      {/* Clear, Focused Filters for This Report Alone */}
      <div className="p-4 rounded-2xl bg-slate-50/70">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs items-end">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">From Date</label>
            <CustomDatePicker value={dateFrom} onChange={setDateFrom} />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">To Date</label>
            <CustomDatePicker value={dateTo} onChange={setDateTo} />
          </div>

          {/* Conditional Dropdown Filter based on Report Type */}
          {(selectedReport === 'invoices' ||
            selectedReport === 'payments' ||
            selectedReport === 'dcs' ||
            selectedReport === 'stock' ||
            selectedReport === 'production') && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Customer Company
              </label>
              <CustomSelect
                value={selectedCompanyId}
                onChange={setSelectedCompanyId}
                options={[
                  { value: 'ALL', label: 'All Customer Companies' },
                  ...companies.map((c) => ({ value: c.id, label: c.name })),
                ]}
              />
            </div>
          )}

          {(selectedReport === 'production' || selectedReport === 'salary') && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Worker</label>
              <CustomSelect
                value={selectedWorkerId}
                onChange={setSelectedWorkerId}
                options={[
                  { value: 'ALL', label: 'All Workers' },
                  ...workers.map((w) => ({ value: w.id, label: w.user.fullName })),
                ]}
              />
            </div>
          )}

          {(selectedReport === 'purchases' || selectedReport === 'expenses') && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Category</label>
              <CustomSelect
                value={selectedCategory}
                onChange={setSelectedCategory}
                options={[
                  { value: 'ALL', label: 'All Categories' },
                  ...(selectedReport === 'purchases'
                    ? [
                        { value: 'Tooling', label: 'Tooling' },
                        { value: 'Inserts', label: 'Carbide Inserts' },
                        { value: 'Oil', label: 'Coolant & Oil' },
                        { value: 'Spares', label: 'Machine Spares' },
                        { value: 'Consumables', label: 'Consumables' },
                      ]
                    : [
                        { value: 'Electricity', label: 'Electricity' },
                        { value: 'Rent', label: 'Factory Rent' },
                        { value: 'Maintenance', label: 'Maintenance' },
                        { value: 'Transport', label: 'Transport' },
                        { value: 'Admin', label: 'Admin & Office' },
                      ]),
                ]}
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Search Keywords</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 outline-none focus:border-slate-300"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* REPORT CONTENT TABLES                                        */}
      {/* ──────────────────────────────────────────────────────────── */}

      {/* 1. Invoices & GST Report */}
      {selectedReport === 'invoices' && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Invoice No</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Customer Company</th>
                  <th className="py-3 px-4 text-right">Taxable Value</th>
                  <th className="py-3 px-4 text-right">GST Amount</th>
                  <th className="py-3 px-4 text-right">Grand Total</th>
                  <th className="py-3 px-4 text-right">Paid</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-400">
                      No invoices found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">{inv.invoiceNumber}</td>
                      <td className="py-3 px-4 text-slate-600">{new Date(inv.invoiceDate).toLocaleDateString('en-IN')}</td>
                      <td className="py-3 px-4 font-medium text-slate-900">{inv.company?.name || '—'}</td>
                      <td className="py-3 px-4 text-right font-mono">₹{Number(inv.taxableValue || inv.taxableAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">₹{(Number(inv.cgstAmount || 0) + Number(inv.sgstAmount || 0) + Number(inv.igstAmount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900 font-mono">₹{Number(inv.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 px-4 text-right text-emerald-700 font-medium font-mono">₹{Number(inv.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 px-4 text-right font-semibold font-mono text-rose-700">₹{Number(inv.balanceDue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          inv.status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : inv.status === 'PARTIALLY_PAID' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-50/90 border-t border-slate-200 font-semibold text-slate-900 text-xs">
                <tr>
                  <td colSpan={3} className="py-3 px-4 text-right">Totals:</td>
                  <td className="py-3 px-4 text-right font-mono">₹{filteredInvoices.reduce((acc, i) => acc + Number(i.taxableValue || i.taxableAmount || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="py-3 px-4 text-right font-mono">₹{filteredInvoices.reduce((acc, i) => acc + (Number(i.cgstAmount || 0) + Number(i.sgstAmount || 0) + Number(i.igstAmount || 0)), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="py-3 px-4 text-right font-mono">₹{filteredInvoices.reduce((acc, i) => acc + Number(i.totalAmount || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-700">₹{filteredInvoices.reduce((acc, i) => acc + Number(i.paidAmount || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="py-3 px-4 text-right font-mono text-rose-700">₹{filteredInvoices.reduce((acc, i) => acc + Number(i.balanceDue || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* 2. Customer Payments Report */}
      {selectedReport === 'payments' && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Customer Company</th>
                  <th className="py-3 px-4">Linked Invoice</th>
                  <th className="py-3 px-4">Payment Mode</th>
                  <th className="py-3 px-4">Reference No</th>
                  <th className="py-3 px-4 text-right">Amount Paid</th>
                  <th className="py-3 px-4 text-right">Remaining Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      No payment records found.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 text-slate-600">{new Date(p.paymentDate).toLocaleDateString('en-IN')}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{p.company?.name || '—'}</td>
                      <td className="py-3 px-4 font-mono">{p.invoice?.invoiceNumber || <span className="text-slate-400 italic">Advance</span>}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {p.paymentMode}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{p.referenceNo || '—'}</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-700 font-mono">+₹{Number(p.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 px-4 text-right font-semibold font-mono text-slate-900">
                        {p.invoice ? `₹${Number(p.invoice.balanceDue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-50/90 border-t border-slate-200 font-semibold text-slate-900 text-xs">
                <tr>
                  <td colSpan={5} className="py-3 px-4 text-right">Total Collections:</td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-700 font-bold">₹{filteredPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* 3. Delivery Challans (DC) Report */}
      {selectedReport === 'dcs' && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">DC No</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Customer Company</th>
                  <th className="py-3 px-4">Order / PO Ref</th>
                  <th className="py-3 px-4">E-Way Bill</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDCs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400">
                      No delivery challans found.
                    </td>
                  </tr>
                ) : (
                  filteredDCs.map((dc) => (
                    <tr key={dc.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">DC #{dc.dcNumber}</td>
                      <td className="py-3 px-4 text-slate-600">{new Date(dc.dcDate).toLocaleDateString('en-IN')}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{dc.company?.name || '—'}</td>
                      <td className="py-3 px-4 text-slate-600">{dc.yourOrderNo || '—'}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{dc.ewayBillNumber || '—'}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          dc.status === 'INVOICED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {dc.status === 'INVOICED' ? 'Invoiced' : 'Pending Invoicing'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Customer Raw Stock Report */}
      {selectedReport === 'stock' && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Customer Company</th>
                  <th className="py-3 px-4">Product / Material</th>
                  <th className="py-3 px-4">Movement Type</th>
                  <th className="py-3 px-4 text-right">Inward Qty</th>
                  <th className="py-3 px-4 text-right">Consumed Qty</th>
                  <th className="py-3 px-4 text-right">Balance Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStock.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      No stock movement entries found.
                    </td>
                  </tr>
                ) : (
                  filteredStock.map((s) => {
                    const match = (s.remarks || '').match(/(?:\[|\(|\s)(kg|nos|pcs|sets|meters|tonnes)(?:\]|\)|\s|$)/i);
                    const uom = match ? ` ${match[1].toLowerCase()}` : '';
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4 text-slate-600">{new Date(s.transactionDate || s.createdAt).toLocaleDateString('en-IN')}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{s.company?.name || '—'}</td>
                        <td className="py-3 px-4">{s.material?.productName || 'Customer Raw Material'}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium border ${
                            s.movementType === 'RECEIPT' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {s.movementType}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-700">{Number(s.quantityIn || 0) > 0 ? `+${s.quantityIn}${uom}` : '—'}</td>
                        <td className="py-3 px-4 text-right font-mono text-rose-700">{Number(s.quantityOut || 0) > 0 ? `-${s.quantityOut}${uom}` : '—'}</td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono">{s.balance}{uom}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Workshop Purchases Report */}
      {selectedReport === 'purchases' && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Item Description</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                  <th className="py-3 px-4 text-right">Unit Price</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4">Supplier Bill No</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      No workshop purchases found.
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 text-slate-600">{new Date(p.purchaseDate || p.createdAt).toLocaleDateString('en-IN')}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{p.itemName}</td>
                      <td className="py-3 px-4 text-slate-600">{p.category}</td>
                      <td className="py-3 px-4 text-right font-mono">{p.quantity} {p.uom || 'pcs'}</td>
                      <td className="py-3 px-4 text-right font-mono">₹{Number(p.unitPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono">₹{Number(p.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{p.supplierBillNo || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-50/90 border-t border-slate-200 font-semibold text-slate-900 text-xs">
                <tr>
                  <td colSpan={5} className="py-3 px-4 text-right">Total Purchases:</td>
                  <td className="py-3 px-4 text-right font-mono font-bold">₹{filteredPurchases.reduce((acc, p) => acc + Number(p.totalAmount || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* 6. Other Operating Expenses Report */}
      {selectedReport === 'expenses' && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Payment Mode</th>
                  <th className="py-3 px-4">Reference No</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400">
                      No operating expenses recorded.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 text-slate-600">{new Date(e.expenseDate || e.createdAt).toLocaleDateString('en-IN')}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{e.category}</td>
                      <td className="py-3 px-4 text-slate-700">{e.description}</td>
                      <td className="py-3 px-4">{e.paymentMode || 'Cash'}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{e.referenceNo || '—'}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono">₹{Number(e.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-50/90 border-t border-slate-200 font-semibold text-slate-900 text-xs">
                <tr>
                  <td colSpan={5} className="py-3 px-4 text-right">Total Expenses:</td>
                  <td className="py-3 px-4 text-right font-mono font-bold">₹{filteredExpenses.reduce((acc, e) => acc + Number(e.amount || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* 7. Daily Production & Scrap Report */}
      {selectedReport === 'production' && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Worker Name</th>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Work Description</th>
                  <th className="py-3 px-4 text-right">Completed Qty</th>
                  <th className="py-3 px-4 text-right">Scrap Qty</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProduction.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      No production logs match the filters.
                    </td>
                  </tr>
                ) : (
                  filteredProduction.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 text-slate-600">{new Date(log.workDate).toLocaleDateString('en-IN')}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{log.worker?.user?.fullName || 'Worker'}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">{log.company?.name || '—'}</td>
                      <td className="py-3 px-4 text-slate-700">{log.description}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono">{log.quantityDone} pcs</td>
                      <td className="py-3 px-4 text-right text-rose-600 font-mono">{Number(log.quantityScrap || 0) > 0 ? `${log.quantityScrap} pcs` : '—'}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          log.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-50/90 border-t border-slate-200 font-semibold text-slate-900 text-xs">
                <tr>
                  <td colSpan={4} className="py-3 px-4 text-right">Total Finished & Scrap:</td>
                  <td className="py-3 px-4 text-right font-mono font-bold">{filteredProduction.reduce((acc, l) => acc + Number(l.quantityDone || 0), 0)} pcs</td>
                  <td className="py-3 px-4 text-right font-mono text-rose-600">{filteredProduction.reduce((acc, l) => acc + Number(l.quantityScrap || 0), 0)} pcs</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* 8. Salary & Attendance Register */}
      {selectedReport === 'salary' && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Month</th>
                  <th className="py-3 px-4">Worker Name</th>
                  <th className="py-3 px-4">Employee ID</th>
                  <th className="py-3 px-4 text-right">Base Salary</th>
                  <th className="py-3 px-4 text-right">Absence Deduct</th>
                  <th className="py-3 px-4 text-right">Overtime Pay</th>
                  <th className="py-3 px-4 text-right">Extra Shifts</th>
                  <th className="py-3 px-4 text-right">Net Payout</th>
                  <th className="py-3 px-4 text-center">Payment Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSalaries.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-400">
                      No salary records generated yet.
                    </td>
                  </tr>
                ) : (
                  filteredSalaries.map((sal) => (
                    <tr key={sal.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{sal.monthYear}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{sal.worker?.user?.fullName || 'Worker'}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{sal.worker?.employeeId || '—'}</td>
                      <td className="py-3 px-4 text-right font-mono">₹{Number(sal.baseSalary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 px-4 text-right font-mono text-rose-600">-₹{Number(sal.absenceDeduct || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-700">+₹{Number(sal.approvedOtAmt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-700">+₹{Number(sal.approvedShiftAmt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono">₹{Number(sal.netSalary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          sal.isPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {sal.isPaid ? 'Paid' : 'Unpaid'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-50/90 border-t border-slate-200 font-semibold text-slate-900 text-xs">
                <tr>
                  <td colSpan={7} className="py-3 px-4 text-right">Total Net Payroll:</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">₹{filteredSalaries.reduce((acc, s) => acc + Number(s.netSalary || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* SHARE MODAL                                                  */}
      {/* ──────────────────────────────────────────────────────────── */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Share {currentMeta.title}</h3>
                  <p className="text-[11px] text-slate-500">Send formatted report via WhatsApp or copy summary</p>
                </div>
              </div>
              <button
                onClick={() => setShareModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Formatted Preview Box */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-700 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
              {generateShareSummary()}
            </div>

            {/* Share Options */}
            <div className="space-y-2 pt-1">
              <button
                onClick={handleWhatsAppShare}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-2xs"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Share via WhatsApp</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleCopyShare}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  {copiedToast ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedToast ? 'Copied!' : 'Copy Summary'}</span>
                </button>

                <button
                  onClick={handleNativeShare}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Other Apps</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
