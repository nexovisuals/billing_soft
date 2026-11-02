import { API_BASE_URL } from '../config';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Receipt,
  CreditCard,
  ShoppingBag,
  Download,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  FileSpreadsheet
} from 'lucide-react';
import { UserSession } from '../types';

interface AnalyticsData {
  financials: {
    totalInvoiced: number;
    totalCollected: number;
    outstandingDue: number;
    unpaidInvoicesCount: number;
    totalPurchases: number;
    totalOperating: number;
    totalPayroll: number;
    totalOutflow: number;
    netCashFlow: number;
  };
  production: {
    totalFinishedPieces: number;
    totalScrapPieces: number;
    scrapRatePercent: number;
    pendingApprovalsCount: number;
  };
  stock: {
    totalInwardWeightKg: number;
    totalInwardReceiptsCount: number;
    companyBalances: Array<{
      id: string;
      name: string;
      gstin?: string | null;
      currentBalance: number;
      uom: string;
    }>;
    negativeStockProtected: boolean;
  };
  recentActivity: {
    invoices: Array<{
      id: string;
      invoiceNumber: string;
      invoiceDate: string;
      totalAmount: number | string;
      status: string;
      company: { name: string };
    }>;
    challans: Array<{
      id: string;
      dcNumber: number;
      dcDate: string;
      status: string;
      company: { name: string };
      items: Array<{ description: string; quantity: number | string; uom: string }>;
    }>;
    payments: Array<{
      id: string;
      paymentDate: string;
      amount: number | string;
      paymentMode: string;
      referenceNo?: string | null;
      company: { name: string };
    }>;
  };
}

interface AnalyticsDashboardProps {
  session: UserSession;
  onNavigateTab: (tabId: string) => void;
}

export default function AnalyticsDashboard({ session, onNavigateTab }: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFeed, setActiveFeed] = useState<'invoices' | 'challans' | 'payments'>('invoices');

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/analytics/dashboard`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load dashboard analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [session.token]);

  const handleExportInvoices = () => {
    window.open(`${API_BASE_URL}/api/analytics/export/invoices-csv`, '_blank');
  };

  const handleExportStock = () => {
    window.open(`${API_BASE_URL}/api/analytics/export/stock-csv`, '_blank');
  };

  if (loading && !data) {
    return (
      <div className="py-24 text-center text-slate-400 text-xs">
        Loading real-time executive workshop analytics...
      </div>
    );
  }

  const financials = data?.financials || {
    totalInvoiced: 0,
    totalCollected: 0,
    outstandingDue: 0,
    unpaidInvoicesCount: 0,
    totalPurchases: 0,
    totalOperating: 0,
    totalPayroll: 0,
    totalOutflow: 0,
    netCashFlow: 0,
  };

  const production = data?.production || {
    totalFinishedPieces: 0,
    totalScrapPieces: 0,
    scrapRatePercent: 0,
    pendingApprovalsCount: 0,
  };

  const stock = data?.stock || {
    totalInwardWeightKg: 0,
    totalInwardReceiptsCount: 0,
    companyBalances: [],
    negativeStockProtected: true,
  };

  const recent = data?.recentActivity || {
    invoices: [],
    challans: [],
    payments: [],
  };

  return (
    <div className="space-y-6">
      {/* Clean Unboxed Header Row with Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-slate-100">
        <div>
          <h2 className="text-base font-semibold text-slate-900 tracking-tight">
            Executive Analytics
          </h2>
          <p className="text-xs text-slate-500 font-normal mt-0.5">
            Real-time cashflow, customer raw stock, and shop floor production overview
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportInvoices}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-semibold hover:bg-slate-50 hover:border-slate-400 transition-all shadow-2xs whitespace-nowrap"
            title="Download Invoices CSV Report"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Invoices</span>
            <Download className="w-3 h-3 text-slate-400" />
          </button>

          <button
            onClick={handleExportStock}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-semibold hover:bg-slate-50 hover:border-slate-400 transition-all shadow-2xs whitespace-nowrap"
            title="Download Customer Stock Balances CSV Report"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-700" />
            <span>Export Stock</span>
            <Download className="w-3 h-3 text-slate-400" />
          </button>
        </div>
      </div>

      {/* 4 PRIMARY EXECUTIVE KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1: Total Invoiced */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-3xl border border-slate-200 bg-white hover:border-slate-300 transition-colors shadow-subtle flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Billed Invoices</span>
            <span className="w-8 h-8 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700">
              <Receipt className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-semibold text-slate-900 tracking-tight">
              ₹{financials.totalInvoiced.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1 font-normal">
              <span className="inline-flex items-center text-emerald-600 font-medium">
                <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> SAC 998898
              </span>
              <span>18% GST Apportioned</span>
            </div>
          </div>
        </motion.div>

        {/* Metric 2: Realized Collections */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.03 }}
          className="p-6 rounded-3xl border border-slate-200 bg-white hover:border-slate-300 transition-colors shadow-subtle flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Realized Collections</span>
            <span className="w-8 h-8 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CreditCard className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-semibold text-emerald-700 tracking-tight">
              ₹{financials.totalCollected.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1 font-normal">
              <span className="text-slate-700 font-medium">
                Bank & UPI Remittances
              </span>
            </div>
          </div>
        </motion.div>

        {/* Metric 3: Outstanding Receivables */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="p-6 rounded-3xl border border-slate-200 bg-white hover:border-slate-300 transition-colors shadow-subtle flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Outstanding Receivables</span>
            <span className="w-8 h-8 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-semibold text-slate-900 tracking-tight">
              ₹{financials.outstandingDue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1 font-normal">
              <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full text-[11px] font-medium border border-amber-200">
                {financials.unpaidInvoicesCount} Invoices Due
              </span>
            </div>
          </div>
        </motion.div>

        {/* Metric 4: Total Workshop Outflow */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.09 }}
          className="p-6 rounded-3xl border border-slate-200 bg-white hover:border-slate-300 transition-colors shadow-subtle flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Workshop Outflow</span>
            <span className="w-8 h-8 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700">
              <ShoppingBag className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-semibold text-slate-900 tracking-tight">
              ₹{financials.totalOutflow.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1 font-normal">
              <span className="text-slate-600">
                Tooling + Utilities + Payroll
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* SPLIT SECTION 1: Cash Flow & Outflows vs Machine Production Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Cash Outflow Breakdown Card */}
        <div className="p-6 rounded-3xl border border-slate-200 bg-white shadow-subtle flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-sm text-slate-950">Workshop Expense Breakdown</h3>
                <p className="text-xs text-slate-500">Distribution of operational spending</p>
              </div>
              <button
                onClick={() => onNavigateTab('purchases')}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1 whitespace-nowrap"
              >
                <span>View Purchases</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3 pt-2 text-xs">
              <div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">1. Tooling, Inserts & Machine Spares:</span>
                  <span className="font-semibold text-slate-900">
                    ₹{financials.totalPurchases.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-slate-900 h-full rounded-full"
                    style={{ width: `${financials.totalOutflow > 0 ? (financials.totalPurchases / financials.totalOutflow) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">2. Electricity (EB Power) & Workshop Utilities:</span>
                  <span className="font-semibold text-slate-900">
                    ₹{financials.totalOperating.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-slate-700 h-full rounded-full"
                    style={{ width: `${financials.totalOutflow > 0 ? (financials.totalOperating / financials.totalOutflow) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">3. Worker Payroll (26-Day Standard):</span>
                  <span className="font-semibold text-slate-900">
                    ₹{financials.totalPayroll.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-slate-500 h-full rounded-full"
                    style={{ width: `${financials.totalOutflow > 0 ? (financials.totalPayroll / financials.totalOutflow) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="font-medium text-slate-600">Net Realized Operating Cash:</span>
            <span className={`font-semibold text-sm ${financials.netCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {financials.netCashFlow >= 0 ? '+' : ''}₹{financials.netCashFlow.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Right: Production & Scrap Quality Card */}
        <div className="p-6 rounded-3xl border border-slate-200 bg-white shadow-subtle flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-sm text-slate-950">Shop Floor Production & Quality</h3>
                <p className="text-xs text-slate-500">Finished pieces output vs scrap rejection</p>
              </div>
              <button
                onClick={() => onNavigateTab('workers')}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1 whitespace-nowrap"
              >
                <span>Production Hub</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2 text-center">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider block mb-1">
                  Finished Output
                </span>
                <span className="text-xl font-semibold text-slate-900">
                  {production.totalFinishedPieces.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">pieces</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider block mb-1">
                  Defect Rate
                </span>
                <span className="text-xl font-semibold text-slate-900">
                  {production.scrapRatePercent}%
                </span>
                <span className="text-[10px] text-rose-600 block mt-0.5">
                  {production.totalScrapPieces} pcs scrap
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider block mb-1">
                  Approval Queue
                </span>
                <span className="text-xl font-semibold text-amber-700">
                  {production.pendingApprovalsCount}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">awaiting admin</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>CNC Turning & Milling Quality Standard</span>
            </span>
            <span className="text-slate-400">Within 2.0% Tolerance</span>
          </div>
        </div>
      </div>

      {/* SPLIT SECTION 2: Customer Stock Balances vs Live Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 1 Col: Customer Stock Ledgers */}
        <div className="p-6 rounded-3xl border border-slate-200 bg-white shadow-subtle flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-sm text-slate-950">Customer Raw Stock</h3>
                <p className="text-xs text-slate-500 font-normal">Job-work material balances</p>
              </div>
              <button
                onClick={() => onNavigateTab('stock')}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1 whitespace-nowrap"
              >
                <span>Full Ledger</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {stock.companyBalances.map(c => (
                <div key={c.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-900">{c.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      GSTIN: {c.gstin || 'Unregistered'}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-slate-950 text-xs">
                      {c.currentBalance.toLocaleString('en-IN')} {c.uom}
                    </span>
                    <span className="text-[10px] text-emerald-700 block font-medium">In Balance</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50/60 p-2.5 rounded-2xl border border-emerald-100">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-[11px] font-medium">
              Negative Stock Protection: <strong>ACTIVE</strong> (Over-dispatch rejected)
            </span>
          </div>
        </div>

        {/* Right 2 Cols: Live Activity Feed */}
        <div className="lg:col-span-2 p-6 rounded-3xl border border-slate-200 bg-white shadow-subtle flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-semibold text-sm text-slate-950">Recent Workshop Activity Feed</h3>
                <p className="text-xs text-slate-500 font-normal">Live chronological dispatches and billing audit</p>
              </div>

              {/* Feed Selector Pills */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs">
                <button
                  onClick={() => setActiveFeed('invoices')}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                    activeFeed === 'invoices' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  } whitespace-nowrap`}
                >
                  Invoices
                </button>
                <button
                  onClick={() => setActiveFeed('challans')}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                    activeFeed === 'challans' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  } whitespace-nowrap`}
                >
                  Delivery Challans
                </button>
                <button
                  onClick={() => setActiveFeed('payments')}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                    activeFeed === 'payments' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  } whitespace-nowrap`}
                >
                  Payments
                </button>
              </div>
            </div>

            {/* Feed Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-medium text-[11px]">
                    <th className="pb-2.5 font-medium whitespace-nowrap text-left">REFERENCE</th>
                    <th className="pb-2.5 font-medium whitespace-nowrap text-left">DATE</th>
                    <th className="pb-2.5 font-medium whitespace-nowrap text-left">CUSTOMER</th>
                    <th className="pb-2.5 font-medium text-left whitespace-nowrap">DETAILS</th>
                    <th className="pb-2.5 font-medium text-left whitespace-nowrap">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeFeed === 'invoices' ? (
                    recent.invoices.map((inv, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 font-semibold text-slate-900 whitespace-nowrap">{inv.invoiceNumber}</td>
                        <td className="py-2.5 text-slate-500 font-medium whitespace-nowrap">
                          {new Date(inv.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </td>
                        <td className="py-2.5 font-medium text-slate-800 whitespace-nowrap">{inv.company.name}</td>
                        <td className="py-2.5 text-left font-semibold text-slate-950 whitespace-nowrap">
                          ₹{parseFloat(inv.totalAmount.toString()).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 text-left whitespace-nowrap">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                            inv.status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : activeFeed === 'challans' ? (
                    recent.challans.map((dc, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 font-semibold text-slate-900 whitespace-nowrap">DC #{dc.dcNumber}</td>
                        <td className="py-2.5 text-slate-500 font-medium whitespace-nowrap">
                          {new Date(dc.dcDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </td>
                        <td className="py-2.5 font-medium text-slate-800 whitespace-nowrap">{dc.company.name}</td>
                        <td className="py-2.5 text-left text-slate-600 font-medium whitespace-nowrap">
                          {dc.items.map(it => `${it.quantity} ${it.uom}`).join(', ')}
                        </td>
                        <td className="py-2.5 text-left whitespace-nowrap">
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700">
                            {dc.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    recent.payments.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 font-mono text-slate-900 whitespace-nowrap">{p.referenceNo || 'Remittance'}</td>
                        <td className="py-2.5 text-slate-500 font-medium whitespace-nowrap">
                          {new Date(p.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </td>
                        <td className="py-2.5 font-medium text-slate-800 whitespace-nowrap">{p.company.name}</td>
                        <td className="py-2.5 text-left font-semibold text-emerald-700 whitespace-nowrap">
                          +₹{parseFloat(p.amount.toString()).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 text-left whitespace-nowrap">
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {p.paymentMode}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-start text-xs text-slate-500">
            <button
              onClick={() => onNavigateTab('dcs')}
              className="text-xs font-semibold text-slate-800 hover:text-slate-900 hover:underline whitespace-nowrap"
            >
              Manage Delivery Challans →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
