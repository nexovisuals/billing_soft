import { API_BASE_URL } from '../config';
import { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  FileSpreadsheet,
  Printer,
  Search,
  Filter,
  Layers,
  Truck,
  Receipt,
  ShoppingBag,
  Zap,
  Users,
  Clock,
  IndianRupee,
  Loader2
} from 'lucide-react';
import { UserSession } from '../types';
import CustomDatePicker from './common/CustomDatePicker';
import CustomSelect from './common/CustomSelect';

interface ReportsManagerProps {
  session: UserSession;
}

export default function ReportsManager({ session: _session }: ReportsManagerProps) {
  const [activeReport, setActiveReport] = useState<
    'finance' | 'stock' | 'dcs' | 'invoices' | 'purchases' | 'expenses' | 'production' | 'salary'
  >('finance');

  // Filter States
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('ALL');
  const [selectedWorkerId, setSelectedWorkerId] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Raw data from APIs
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [workers, setWorkers] = useState<Array<{ id: string; user: { fullName: string } }>>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [dcs, setDcs] = useState<any[]>([]);
  const [_payments, setPayments] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [productionLogs, setProductionLogs] = useState<any[]>([]);
  const [stockLedger, setStockLedger] = useState<any[]>([]);
  const [salaryRecords, setSalaryRecords] = useState<any[]>([]);

  // Fetch all necessary data
  useEffect(() => {
    fetchAllReportData();
  }, []);

  const fetchAllReportData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('svt_token');
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
        fetch(`${API_BASE_URL}/api/companies`, { credentials: 'include', headers }).catch(() => null),
        fetch(`${API_BASE_URL}/api/workers`, { credentials: 'include', headers }).catch(() => null),
        fetch(`${API_BASE_URL}/api/invoices`, { credentials: 'include', headers }).catch(() => null),
        fetch(`${API_BASE_URL}/api/dcs`, { credentials: 'include', headers }).catch(() => null),
        fetch(`${API_BASE_URL}/api/payments`, { credentials: 'include', headers }).catch(() => null),
        fetch(`${API_BASE_URL}/api/expenses/purchases`, { credentials: 'include', headers }).catch(() => null),
        fetch(`${API_BASE_URL}/api/expenses/operating`, { credentials: 'include', headers }).catch(() => null),
        fetch(`${API_BASE_URL}/api/workers/daily-work`, { credentials: 'include', headers }).catch(() => null),
        fetch(`${API_BASE_URL}/api/stock/ledger`, { credentials: 'include', headers }).catch(() => null),
        fetch(`${API_BASE_URL}/api/salary/records`, { credentials: 'include', headers }).catch(() => null),
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
        setProductionLogs(d.logs || []);
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

  // Quick Preset Helper
  const applyPreset = (preset: 'THIS_MONTH' | 'LAST_MONTH' | 'ALL_TIME') => {
    const today = new Date();
    if (preset === 'ALL_TIME') {
      setDateFrom('');
      setDateTo('');
    } else if (preset === 'THIS_MONTH') {
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      setDateFrom(`${year}-${month}-01`);
      setDateTo(today.toISOString().split('T')[0]);
    } else if (preset === 'LAST_MONTH') {
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const year = lastMonth.getFullYear();
      const month = String(lastMonth.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
      setDateFrom(`${year}-${month}-01`);
      setDateTo(`${year}-${month}-${lastDay}`);
    }
  };

  // 1. Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (!isDateInRange(inv.invoiceDate)) return false;
      if (selectedCompanyId !== 'ALL' && inv.companyId !== selectedCompanyId) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchNo = inv.invoiceNumber?.toLowerCase().includes(q);
        const matchComp = inv.company?.name?.toLowerCase().includes(q);
        if (!matchNo && !matchComp) return false;
      }
      return true;
    });
  }, [invoices, dateFrom, dateTo, selectedCompanyId, searchQuery]);

  // 2. Filtered DCs
  const filteredDCs = useMemo(() => {
    return dcs.filter((dc) => {
      if (!isDateInRange(dc.dcDate)) return false;
      if (selectedCompanyId !== 'ALL' && dc.companyId !== selectedCompanyId) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchNo = dc.dcNumber?.toString().includes(q);
        const matchComp = dc.company?.name?.toLowerCase().includes(q);
        if (!matchNo && !matchComp) return false;
      }
      return true;
    });
  }, [dcs, dateFrom, dateTo, selectedCompanyId, searchQuery]);

  // 3. Filtered Purchases
  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      if (!isDateInRange(p.purchaseDate)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchItem = p.itemName?.toLowerCase().includes(q);
        const matchCat = p.category?.toLowerCase().includes(q);
        const matchSup = p.supplierName?.toLowerCase().includes(q);
        if (!matchItem && !matchCat && !matchSup) return false;
      }
      return true;
    });
  }, [purchases, dateFrom, dateTo, searchQuery]);

  // 4. Filtered Operating Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (!isDateInRange(e.expenseDate)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchCat = e.category?.toLowerCase().includes(q);
        const matchDesc = e.description?.toLowerCase().includes(q);
        if (!matchCat && !matchDesc) return false;
      }
      return true;
    });
  }, [expenses, dateFrom, dateTo, searchQuery]);

  // 5. Filtered Production Logs
  const filteredProduction = useMemo(() => {
    return productionLogs.filter((log) => {
      if (!isDateInRange(log.workDate)) return false;
      if (selectedCompanyId !== 'ALL' && log.companyId !== selectedCompanyId) return false;
      if (selectedWorkerId !== 'ALL' && log.workerId !== selectedWorkerId) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchDesc = log.description?.toLowerCase().includes(q);
        const matchWorker = log.worker?.user?.fullName?.toLowerCase().includes(q);
        const matchComp = log.company?.name?.toLowerCase().includes(q);
        if (!matchDesc && !matchWorker && !matchComp) return false;
      }
      return true;
    });
  }, [productionLogs, dateFrom, dateTo, selectedCompanyId, selectedWorkerId, searchQuery]);

  // 6. Filtered Stock Ledger
  const filteredStock = useMemo(() => {
    return stockLedger.filter((entry) => {
      if (!isDateInRange(entry.createdAt)) return false;
      if (selectedCompanyId !== 'ALL' && entry.companyId !== selectedCompanyId) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchComp = entry.company?.name?.toLowerCase().includes(q);
        const matchMat = entry.materialName?.toLowerCase().includes(q);
        if (!matchComp && !matchMat) return false;
      }
      return true;
    });
  }, [stockLedger, dateFrom, dateTo, selectedCompanyId, searchQuery]);

  // 7. Filtered Salary Records
  const filteredSalaries = useMemo(() => {
    return salaryRecords.filter((sal) => {
      if (selectedWorkerId !== 'ALL' && sal.workerId !== selectedWorkerId) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = sal.worker?.user?.fullName?.toLowerCase().includes(q);
        const matchEmpId = sal.worker?.employeeId?.toLowerCase().includes(q);
        if (!matchName && !matchEmpId) return false;
      }
      return true;
    });
  }, [salaryRecords, selectedWorkerId, searchQuery]);

  // Financial Aggregates
  const totalBilled = filteredInvoices.reduce((s, i) => s + Number(i.totalAmount || 0), 0);
  const totalTaxable = filteredInvoices.reduce((s, i) => s + Number(i.taxableAmount || 0), 0);
  const totalCollected = filteredInvoices.reduce((s, i) => s + Number(i.paidAmount || 0), 0);
  const totalBalanceDue = filteredInvoices.reduce((s, i) => s + Number(i.balanceDue || 0), 0);
  const totalPurchasesCost = filteredPurchases.reduce((s, p) => s + Number(p.totalAmount || 0), 0);
  const totalExpensesCost = filteredExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalWorkshopOutflow = totalPurchasesCost + totalExpensesCost;
  const netRealizedOperatingCash = totalCollected - totalWorkshopOutflow;

  // Generic CSV Export function
  const exportToCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((x) => `"${String(x ?? '').replace(/"/g, '""')}"`).join(','))].join(
        '\n'
      );
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Report Specific Exporters
  const handleExport = () => {
    if (activeReport === 'finance' || activeReport === 'invoices') {
      const headers = ['Invoice Number', 'Invoice Date', 'Company', 'Taxable Value', 'GST Amount', 'Invoice Total', 'Paid Amount', 'Balance Due', 'Status'];
      const rows = filteredInvoices.map((inv) => [
        inv.invoiceNumber,
        new Date(inv.invoiceDate).toLocaleDateString('en-GB'),
        inv.company?.name || 'N/A',
        Number(inv.taxableAmount || 0).toFixed(2),
        (Number(inv.cgstAmount || 0) + Number(inv.sgstAmount || 0) + Number(inv.igstAmount || 0)).toFixed(2),
        Number(inv.totalAmount || 0).toFixed(2),
        Number(inv.paidAmount || 0).toFixed(2),
        Number(inv.balanceDue || 0).toFixed(2),
        inv.status,
      ]);
      exportToCSV('SVT_Invoices_Tax_Report', headers, rows);
    } else if (activeReport === 'dcs') {
      const headers = ['DC Number', 'DC Date', 'Company Name', 'Items Count', 'Material Value', 'Status'];
      const rows = filteredDCs.map((dc) => [
        `DC #${dc.dcNumber}`,
        new Date(dc.dcDate).toLocaleDateString('en-GB'),
        dc.company?.name || 'N/A',
        dc.items?.length || 0,
        dc.materialValue || '0.00',
        dc.status,
      ]);
      exportToCSV('SVT_Delivery_Challan_Report', headers, rows);
    } else if (activeReport === 'purchases') {
      const headers = ['Purchase Date', 'Item Name', 'Category', 'Supplier', 'Quantity', 'UOM', 'Unit Price', 'Total Amount', 'Payment Status'];
      const rows = filteredPurchases.map((p) => [
        new Date(p.purchaseDate).toLocaleDateString('en-GB'),
        p.itemName,
        p.category,
        p.supplierName || '—',
        p.quantity,
        p.uom,
        Number(p.unitPrice || 0).toFixed(2),
        Number(p.totalAmount || 0).toFixed(2),
        p.paymentStatus,
      ]);
      exportToCSV('SVT_Workshop_Purchases_Report', headers, rows);
    } else if (activeReport === 'expenses') {
      const headers = ['Expense Date', 'Category', 'Description', 'Amount', 'Payment Mode', 'Reference No'];
      const rows = filteredExpenses.map((e) => [
        new Date(e.expenseDate).toLocaleDateString('en-GB'),
        e.category,
        e.description,
        Number(e.amount || 0).toFixed(2),
        e.paymentMode || 'Cash',
        e.referenceNo || '—',
      ]);
      exportToCSV('SVT_Operating_Expenses_Report', headers, rows);
    } else if (activeReport === 'production') {
      const headers = ['Date', 'Worker Name', 'Company Name', 'Work Description', 'Completed Qty', 'Scrap Qty', 'Hours', 'Status'];
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
    } else if (activeReport === 'stock') {
      const headers = ['Date', 'Company Name', 'Type', 'Quantity', 'UOM', 'Balance', 'Reference'];
      const rows = filteredStock.map((s) => [
        new Date(s.createdAt).toLocaleDateString('en-GB'),
        s.company?.name || '—',
        s.transactionType,
        s.quantity,
        s.uom,
        s.balance,
        s.referenceNumber || '—',
      ]);
      exportToCSV('SVT_Stock_Ledger_Report', headers, rows);
    } else if (activeReport === 'salary') {
      const headers = ['Month', 'Worker Name', 'Employee ID', 'Base Salary', 'Absence Deduct', 'Overtime Pay', 'Extra Shifts', 'Net Salary', 'Payment Status'];
      const rows = filteredSalaries.map((sal) => [
        sal.monthYear,
        sal.worker?.user?.fullName || 'Worker',
        sal.worker?.employeeId || '—',
        Number(sal.baseSalary || 0).toFixed(2),
        Number(sal.absenceDeduct || 0).toFixed(2),
        Number(sal.approvedOtAmt || 0).toFixed(2),
        Number(sal.approvedShiftAmt || 0).toFixed(2),
        Number(sal.netSalary || 0).toFixed(2),
        sal.isPaid ? 'PAID' : 'UNPAID',
      ]);
      exportToCSV('SVT_Payroll_Salary_Report', headers, rows);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* ──────────────────────────────────────────────────────────── */}
      {/* HEADER SECTION                                               */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-slate-800" />
            <span>Reports & Business Intelligence</span>
          </h2>
          <p className="text-xs text-slate-500 font-normal mt-0.5">
            Audit-ready reporting for billing, stock, purchases, operating expenses, production, and payroll
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400 mr-2" />}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-2xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* REPORT TYPE SELECTOR TABS                                    */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-100 scrollbar-none text-xs">
        {[
          { id: 'finance', label: 'Finance & Cash Flow', icon: IndianRupee },
          { id: 'stock', label: 'Company Raw Stock', icon: Layers },
          { id: 'dcs', label: 'Delivery Challans (DC)', icon: Truck },
          { id: 'invoices', label: 'Tax Invoices & GST', icon: Receipt },
          { id: 'purchases', label: 'Workshop Purchases', icon: ShoppingBag },
          { id: 'expenses', label: 'Other Operating Expenses', icon: Zap },
          { id: 'production', label: 'Daily Machining Work', icon: Users },
          { id: 'salary', label: '26-Day Attendance & Payroll', icon: Clock },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeReport === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveReport(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl whitespace-nowrap transition-all font-medium ${
                isActive
                  ? 'bg-slate-900 text-white font-semibold shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* GLOBAL FILTER BAR                                            */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <Filter className="w-4 h-4 text-slate-500" />
            <span>Report Filters</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => applyPreset('THIS_MONTH')}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              This Month
            </button>
            <button
              onClick={() => applyPreset('LAST_MONTH')}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Last Month
            </button>
            <button
              onClick={() => applyPreset('ALL_TIME')}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              All Time
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">From Date</label>
            <CustomDatePicker value={dateFrom} onChange={setDateFrom} />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">To Date</label>
            <CustomDatePicker value={dateTo} onChange={setDateTo} />
          </div>

          {['finance', 'stock', 'dcs', 'invoices', 'production'].includes(activeReport) && (
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Filter by Customer</label>
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

          {['production', 'salary'].includes(activeReport) && (
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Filter by Worker</label>
              <CustomSelect
                value={selectedWorkerId}
                onChange={setSelectedWorkerId}
                options={[
                  { value: 'ALL', label: 'All Operators & Staff' },
                  ...workers.map((w) => ({ value: w.id, label: w.user.fullName })),
                ]}
              />
            </div>
          )}

          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Search Keywords</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search report..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-slate-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* REPORT CONTENT VIEW                                          */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeReport === 'finance' && (
        <div className="space-y-6">
          {/* Finance Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Billed Invoices</span>
              <p className="text-xl font-bold text-slate-900 mt-1">₹{totalBilled.toLocaleString('en-IN')}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Taxable: ₹{totalTaxable.toLocaleString('en-IN')}</p>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200">
              <span className="text-[11px] font-semibold text-emerald-700 uppercase">Realized Collections</span>
              <p className="text-xl font-bold text-emerald-800 mt-1">₹{totalCollected.toLocaleString('en-IN')}</p>
              <p className="text-[11px] text-emerald-600 mt-0.5">Received from clients</p>
            </div>
            <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200">
              <span className="text-[11px] font-semibold text-amber-700 uppercase">Outstanding Receivables</span>
              <p className="text-xl font-bold text-amber-800 mt-1">₹{totalBalanceDue.toLocaleString('en-IN')}</p>
              <p className="text-[11px] text-amber-600 mt-0.5">Pending client payments</p>
            </div>
            <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200">
              <span className="text-[11px] font-semibold text-rose-700 uppercase">Workshop Expenses Outflow</span>
              <p className="text-xl font-bold text-rose-800 mt-1">₹{totalWorkshopOutflow.toLocaleString('en-IN')}</p>
              <p className="text-[11px] text-rose-600 mt-0.5">Tooling + Power + Operating</p>
            </div>
          </div>

          {/* Cashflow Summary Banner */}
          <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-300">Net Realized Workshop Cash (Collections − Total Expenses)</p>
              <p className="text-2xl font-bold mt-0.5">
                {netRealizedOperatingCash >= 0 ? '+' : ''}₹{netRealizedOperatingCash.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="text-right text-xs text-slate-400">
              <p>Purchases: ₹{totalPurchasesCost.toLocaleString('en-IN')}</p>
              <p>Operating: ₹{totalExpensesCost.toLocaleString('en-IN')}</p>
            </div>
          </div>

          {/* Finance Transaction List */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                Invoice & Billing Register ({filteredInvoices.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/60 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase">
                  <tr>
                    <th className="px-5 py-3">Invoice No</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Customer Company</th>
                    <th className="px-4 py-3 text-right">Taxable (₹)</th>
                    <th className="px-4 py-3 text-right">Total Amount (₹)</th>
                    <th className="px-4 py-3 text-right">Paid (₹)</th>
                    <th className="px-4 py-3 text-right">Balance Due (₹)</th>
                    <th className="px-5 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-8 text-center text-slate-400 font-normal">
                        No invoices match the selected filter range.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/80">
                        <td className="px-5 py-3 font-semibold text-slate-900">{inv.invoiceNumber}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {new Date(inv.invoiceDate).toLocaleDateString('en-GB')}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">{inv.company?.name || '—'}</td>
                        <td className="px-4 py-3 text-right font-mono">
                          {Number(inv.taxableAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900 font-mono">
                          {Number(inv.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-700">
                          {Number(inv.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-rose-700">
                          {Number(inv.balanceDue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              inv.status === 'PAID'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : inv.status === 'PARTIALLY_PAID'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. Customer Stock Balance Report */}
      {activeReport === 'stock' && (
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200">
            <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
              Company-Wise Raw Stock & Ledger Log ({filteredStock.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/60 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-4 py-3">Customer Company</th>
                  <th className="px-4 py-3">Material Grade / Name</th>
                  <th className="px-4 py-3">Transaction</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3 text-right">Closing Balance</th>
                  <th className="px-5 py-3">Reference / DC No</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredStock.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-slate-400 font-normal">
                      No stock transactions found for the selected period.
                    </td>
                  </tr>
                ) : (
                  filteredStock.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/80">
                      <td className="px-5 py-3">{new Date(s.createdAt).toLocaleDateString('en-GB')}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{s.company?.name || '—'}</td>
                      <td className="px-4 py-3">{s.materialName || 'Raw Steel'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            s.transactionType === 'INWARD_RECEIPT'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {s.transactionType === 'INWARD_RECEIPT' ? 'Inward Receipt' : 'Outward Returned'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">{s.quantity}</td>
                      <td className="px-4 py-3 text-slate-500">{s.uom}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">{s.balance}</td>
                      <td className="px-5 py-3 font-mono text-slate-500">{s.referenceNumber || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Delivery Challans Report */}
      {activeReport === 'dcs' && (
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200">
            <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
              Dispatched Delivery Challans ({filteredDCs.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/60 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-3">DC Number</th>
                  <th className="px-4 py-3">Dispatch Date</th>
                  <th className="px-4 py-3">Customer Company</th>
                  <th className="px-4 py-3 text-center">Items Dispatched</th>
                  <th className="px-4 py-3">Buyer's Order / Ref</th>
                  <th className="px-4 py-3 text-right">Declared Value (₹)</th>
                  <th className="px-5 py-3 text-center">Billing Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredDCs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-slate-400 font-normal">
                      No delivery challans found for the selected period.
                    </td>
                  </tr>
                ) : (
                  filteredDCs.map((dc) => (
                    <tr key={dc.id} className="hover:bg-slate-50/80">
                      <td className="px-5 py-3 font-bold text-slate-900">DC #{dc.dcNumber}</td>
                      <td className="px-4 py-3 text-slate-600">{new Date(dc.dcDate).toLocaleDateString('en-GB')}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{dc.company?.name || '—'}</td>
                      <td className="px-4 py-3 text-center font-mono">{dc.items?.length || 0} line items</td>
                      <td className="px-4 py-3 text-slate-500 font-mono">{dc.yourOrderNo || '—'}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-800">
                        ₹{Number(dc.materialValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            dc.status === 'INVOICED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
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

      {/* 4. Tax Invoices & GST Report */}
      {activeReport === 'invoices' && (
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
              Tax Invoices & GST Audit ({filteredInvoices.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/60 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-3">Invoice No</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">GSTIN</th>
                  <th className="px-4 py-3 text-right">Taxable Value</th>
                  <th className="px-4 py-3 text-right">CGST (9%)</th>
                  <th className="px-4 py-3 text-right">SGST (9%)</th>
                  <th className="px-4 py-3 text-right">Total Amount</th>
                  <th className="px-5 py-3 text-center">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-8 text-center text-slate-400 font-normal">
                      No invoices found.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/80">
                      <td className="px-5 py-3 font-semibold text-slate-900">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3 text-slate-600">{new Date(inv.invoiceDate).toLocaleDateString('en-GB')}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{inv.company?.name || '—'}</td>
                      <td className="px-4 py-3 font-mono text-slate-500">{inv.company?.gstin || 'Unregistered'}</td>
                      <td className="px-4 py-3 text-right font-mono">
                        ₹{Number(inv.taxableAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-600">
                        ₹{Number(inv.cgstAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-600">
                        ₹{Number(inv.sgstAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                        ₹{Number(inv.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            inv.status === 'PAID'
                              ? 'bg-emerald-50 text-emerald-700'
                              : inv.status === 'PARTIALLY_PAID'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {inv.status}
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

      {/* 5. Workshop Purchases Report */}
      {activeReport === 'purchases' && (
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
              Internal Workshop Purchases Register ({filteredPurchases.length})
            </h3>
            <span className="text-xs font-bold text-slate-900">
              Total: ₹{totalPurchasesCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/60 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-4 py-3">Item / Tool Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                  <th className="px-4 py-3 text-right">Unit Price</th>
                  <th className="px-4 py-3 text-right">Total Cost</th>
                  <th className="px-5 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-slate-400 font-normal">
                      No workshop purchases logged for this range.
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80">
                      <td className="px-5 py-3">{new Date(p.purchaseDate).toLocaleDateString('en-GB')}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{p.itemName}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">
                          {p.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{p.supplierName || '—'}</td>
                      <td className="px-4 py-3 text-right font-mono">
                        {p.quantity} {p.uom}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">₹{Number(p.unitPrice || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                        ₹{Number(p.totalAmount || 0).toFixed(2)}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            p.paymentStatus === 'PAID'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {p.paymentStatus}
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

      {/* 6. Other Operating Expenses Report */}
      {activeReport === 'expenses' && (
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
              Other Business & Workshop Expenses ({filteredExpenses.length})
            </h3>
            <span className="text-xs font-bold text-slate-900">
              Total: ₹{totalExpensesCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/60 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-4 py-3">Expense Category</th>
                  <th className="px-4 py-3">Description / Purpose</th>
                  <th className="px-4 py-3">Payment Mode</th>
                  <th className="px-4 py-3">Reference / Bill No</th>
                  <th className="px-5 py-3 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-400 font-normal">
                      No operating expenses recorded for this range.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/80">
                      <td className="px-5 py-3">{new Date(e.expenseDate).toLocaleDateString('en-GB')}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{e.category}</td>
                      <td className="px-4 py-3 text-slate-600">{e.description}</td>
                      <td className="px-4 py-3 text-slate-500">{e.paymentMode || 'Cash'}</td>
                      <td className="px-4 py-3 font-mono text-slate-500">{e.referenceNo || '—'}</td>
                      <td className="px-5 py-3 text-right font-mono font-bold text-slate-900">
                        ₹{Number(e.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. Daily Production Report */}
      {activeReport === 'production' && (
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200">
            <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
              Worker Daily Machining Output Register ({filteredProduction.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/60 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-4 py-3">Machine Operator</th>
                  <th className="px-4 py-3">Customer Company</th>
                  <th className="px-4 py-3">Work Performed</th>
                  <th className="px-4 py-3 text-right">Completed Qty</th>
                  <th className="px-4 py-3 text-right">Scrap Qty</th>
                  <th className="px-4 py-3 text-right">Hours</th>
                  <th className="px-5 py-3 text-center">Approval Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredProduction.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-slate-400 font-normal">
                      No production logs recorded for this period.
                    </td>
                  </tr>
                ) : (
                  filteredProduction.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80">
                      <td className="px-5 py-3">{new Date(log.workDate).toLocaleDateString('en-GB')}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {log.worker?.user?.fullName || 'Operator'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{log.company?.name || '—'}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{log.description}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">
                        {log.quantityDone}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-rose-600">{log.quantityScrap || 0}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-500">{log.workingHours || '—'} hrs</td>
                      <td className="px-5 py-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            log.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-700'
                              : log.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {log.status}
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

      {/* 8. 26-Day Attendance & Payroll Report */}
      {activeReport === 'salary' && (
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200">
            <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
              26-Day Standard Payroll & Worker Salary Register ({filteredSalaries.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/60 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-3">Cycle</th>
                  <th className="px-4 py-3">Operator Name</th>
                  <th className="px-4 py-3">Employee ID</th>
                  <th className="px-4 py-3 text-right">Base Salary</th>
                  <th className="px-4 py-3 text-right">Absence Deduct</th>
                  <th className="px-4 py-3 text-right">Approved OT</th>
                  <th className="px-4 py-3 text-right">Extra Shifts</th>
                  <th className="px-4 py-3 text-right">Net Payable</th>
                  <th className="px-5 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredSalaries.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-8 text-center text-slate-400 font-normal">
                      No salary records generated yet.
                    </td>
                  </tr>
                ) : (
                  filteredSalaries.map((sal) => (
                    <tr key={sal.id} className="hover:bg-slate-50/80">
                      <td className="px-5 py-3 font-medium text-slate-600">{sal.monthYear}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {sal.worker?.user?.fullName || 'Worker'}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500">{sal.worker?.employeeId || '—'}</td>
                      <td className="px-4 py-3 text-right font-mono">
                        ₹{Number(sal.baseSalary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-rose-600">
                        -₹{Number(sal.absenceDeduct || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-600">
                        +₹{Number(sal.approvedOtAmt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-blue-600">
                        +₹{Number(sal.approvedShiftAmt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                        ₹{Number(sal.netSalary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            sal.isPaid
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {sal.isPaid ? 'PAID' : 'UNPAID'}
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
    </div>
  );
}
