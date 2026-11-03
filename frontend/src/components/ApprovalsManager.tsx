import { API_BASE_URL } from '../config';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Clock,
  Layers,
  Users,
  TrendingUp,
  Check,
  X,
  Search,
  RefreshCw,
  Zap
} from 'lucide-react';
import { UserSession } from '../types';

interface ApprovalsManagerProps {
  session: UserSession;
}

export default function ApprovalsManager({ session }: ApprovalsManagerProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'dailyWork' | 'attendance' | 'overtime' | 'shifts'>('all');
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState({
    total: 0,
    dailyWork: 0,
    attendance: 0,
    overtime: 0,
    shifts: 0,
  });
  const [items, setItems] = useState<{
    dailyWork: any[];
    attendance: any[];
    overtime: any[];
    shifts: any[];
  }>({
    dailyWork: [],
    attendance: [],
    overtime: [],
    shifts: [],
  });

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchPending = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/approvals/pending`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCounts(data.counts || { total: 0, dailyWork: 0, attendance: 0, overtime: 0, shifts: 0 });
        setItems(data.items || { dailyWork: [], attendance: [], overtime: [], shifts: [] });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, [session.token]);

  // Approve Daily Work
  const handleApproveDailyWork = async (id: string, workerName: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/worker/daily-work/${id}/approve`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (res.ok) {
        setNotification({ type: 'success', message: `Daily work entry for ${workerName} approved!` });
        setTimeout(() => setNotification(null), 3000);
        fetchPending();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Reject Daily Work
  const handleRejectDailyWork = async (id: string) => {
    const reason = prompt('Please enter a rejection reason (e.g. Quantity mismatch):');
    if (reason === null) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/worker/daily-work/${id}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        setNotification({ type: 'success', message: 'Daily work entry rejected with reason' });
        setTimeout(() => setNotification(null), 3000);
        fetchPending();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Approve Attendance
  const handleApproveAttendance = async (id: string, workerName: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/approvals/attendance/${id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setNotification({ type: 'success', message: data.message || `Attendance for ${workerName} approved!` });
        setTimeout(() => setNotification(null), 3500);
        fetchPending();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Reject Attendance
  const handleRejectAttendance = async (id: string) => {
    const reason = prompt('Please enter rejection reason:');
    if (reason === null) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/approvals/attendance/${id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        setNotification({ type: 'success', message: 'Attendance entry rejected' });
        setTimeout(() => setNotification(null), 3000);
        fetchPending();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Approve Overtime
  const handleApproveOvertime = async (id: string, workerName: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/salary/overtime/${id}/approve`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (res.ok) {
        setNotification({ type: 'success', message: `Overtime for ${workerName} approved!` });
        setTimeout(() => setNotification(null), 3000);
        fetchPending();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Reject Overtime
  const handleRejectOvertime = async (id: string) => {
    const reason = prompt('Please enter rejection reason:');
    if (reason === null) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/salary/overtime/${id}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        setNotification({ type: 'success', message: 'Overtime entry rejected' });
        setTimeout(() => setNotification(null), 3000);
        fetchPending();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Approve Shift
  const handleApproveShift = async (id: string, workerName: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/salary/extra-shifts/${id}/approve`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (res.ok) {
        setNotification({ type: 'success', message: `Shift allowance for ${workerName} approved!` });
        setTimeout(() => setNotification(null), 3000);
        fetchPending();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Reject Shift
  const handleRejectShift = async (id: string) => {
    const reason = prompt('Please enter rejection reason:');
    if (reason === null) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/salary/extra-shifts/${id}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        setNotification({ type: 'success', message: 'Shift allowance entry rejected' });
        setTimeout(() => setNotification(null), 3000);
        fetchPending();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Approve All Pending
  const handleApproveAll = async () => {
    if (!confirm('Are you sure you want to approve all pending items in this category?')) return;
    try {
      const cat =
        activeTab === 'dailyWork'
          ? 'DAILY_WORK'
          : activeTab === 'attendance'
          ? 'ATTENDANCE'
          : activeTab === 'overtime'
          ? 'OVERTIME'
          : activeTab === 'shifts'
          ? 'SHIFTS'
          : 'ALL';

      const res = await fetch(`${API_BASE_URL}/api/approvals/approve-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ category: cat }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotification({ type: 'success', message: data.message });
        setTimeout(() => setNotification(null), 3500);
        fetchPending();
      }
    } catch (e) {
      console.error(e);
    }
  };

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
            <div className="flex items-center gap-2 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-700">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            <span>Approvals Center</span>
            {counts.total > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                {counts.total} Pending
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-500 font-normal mt-0.5">
            Review and approve worker attendance, machine daily work, overtime hours, and extra shift allowances
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchPending}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {counts.total > 0 && session.role === 'ADMIN' && (
            <button
              onClick={handleApproveAll}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-2xs"
            >
              <Check className="w-4 h-4" />
              <span>Approve All Pending ({activeTab === 'all' ? counts.total : activeTab === 'dailyWork' ? counts.dailyWork : activeTab === 'attendance' ? counts.attendance : activeTab === 'overtime' ? counts.overtime : counts.shifts})</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold uppercase">
            <span>Daily Work</span>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{counts.dailyWork}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">job submissions</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold uppercase">
            <span>Attendance</span>
            <Users className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{counts.attendance}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">clock-in requests</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold uppercase">
            <span>Overtime (OT)</span>
            <TrendingUp className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{counts.overtime}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">extra hours logged</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold uppercase">
            <span>Extra Shifts</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{counts.shifts}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">holiday & night shifts</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Pending ({counts.total})
          </button>
          <button
            onClick={() => setActiveTab('dailyWork')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'dailyWork' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Daily Work ({counts.dailyWork})
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'attendance' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Attendance ({counts.attendance})
          </button>
          <button
            onClick={() => setActiveTab('overtime')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'overtime' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Overtime ({counts.overtime})
          </button>
          <button
            onClick={() => setActiveTab('shifts')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'shifts' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Shifts ({counts.shifts})
          </button>
        </div>

        <div className="relative w-64 text-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search worker or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 outline-none focus:border-slate-300"
          />
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 1. DAILY WORK SUBMISSIONS TABLE                              */}
      {/* ──────────────────────────────────────────────────────────── */}
      {(activeTab === 'all' || activeTab === 'dailyWork') && items.dailyWork.length > 0 && (
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-bold text-xs text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Pending Daily Production Work ({items.dailyWork.length})</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Worker</th>
                  <th className="py-3 px-4">Customer Company</th>
                  <th className="py-3 px-4">Part Description</th>
                  <th className="py-3 px-4 text-right">Finished Qty</th>
                  <th className="py-3 px-4 text-right">Scrap Qty</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.dailyWork.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-mono text-slate-600">{new Date(item.workDate).toLocaleDateString('en-IN')}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div>{item.worker?.user?.fullName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">ID: {item.worker?.employeeId}</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">{item.company?.name}</td>
                    <td className="py-3 px-4 text-slate-700">
                      <div>{item.description}</div>
                      {item.material && <div className="text-[10px] text-slate-400">{item.material.productName}</div>}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono">{item.quantityDone} pcs</td>
                    <td className="py-3 px-4 text-right text-rose-600 font-mono">{Number(item.quantityScrap || 0) > 0 ? `${item.quantityScrap} pcs` : '—'}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleApproveDailyWork(item.id, item.worker?.user?.fullName)}
                          className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center gap-1 shadow-2xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => handleRejectDailyWork(item.id)}
                          className="px-3 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs border border-rose-200 transition-colors flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 2. WORKER ATTENDANCE SUBMISSIONS TABLE                       */}
      {/* ──────────────────────────────────────────────────────────── */}
      {(activeTab === 'all' || activeTab === 'attendance') && items.attendance.length > 0 && (
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-bold text-xs text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-600" />
              <span>Pending Worker Attendance ({items.attendance.length})</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Worker Name</th>
                  <th className="py-3 px-4">Employee ID</th>
                  <th className="py-3 px-4">Attendance Status</th>
                  <th className="py-3 px-4">Remarks</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.attendance.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-mono text-slate-600">{new Date(item.date).toLocaleDateString('en-IN')}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{item.worker?.user?.fullName}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{item.worker?.employeeId}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${
                        item.status === 'PRESENT' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : item.status === 'HALF_DAY' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {item.status === 'PRESENT' ? 'Full Day Present' : item.status === 'HALF_DAY' ? 'Half Day' : 'On Leave'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 italic">{item.remarks || '—'}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleApproveAttendance(item.id, item.worker?.user?.fullName)}
                          className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center gap-1 shadow-2xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve & Sync Register</span>
                        </button>
                        <button
                          onClick={() => handleRejectAttendance(item.id)}
                          className="px-3 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs border border-rose-200 transition-colors flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 3. OVERTIME (OT) REQUESTS TABLE                              */}
      {/* ──────────────────────────────────────────────────────────── */}
      {(activeTab === 'all' || activeTab === 'overtime') && items.overtime.length > 0 && (
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-bold text-xs text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              <span>Pending Overtime (OT) Hours ({items.overtime.length})</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">OT Date</th>
                  <th className="py-3 px-4">Worker</th>
                  <th className="py-3 px-4 text-right">OT Hours</th>
                  <th className="py-3 px-4 text-right">Calculated Pay</th>
                  <th className="py-3 px-4">Remarks</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.overtime.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-mono text-slate-600">{new Date(item.otDate).toLocaleDateString('en-IN')}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{item.worker?.user?.fullName}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono">{item.hours} hrs</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-700 font-mono">₹{Number(item.calculatedAmt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4 text-slate-500 italic">{item.remarks || '—'}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleApproveOvertime(item.id, item.worker?.user?.fullName)}
                          className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors inline-flex items-center gap-1 shadow-2xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => handleRejectOvertime(item.id)}
                          className="px-3 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs border border-rose-200 transition-colors inline-flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* 4. EXTRA SHIFTS TABLE                                        */}
      {/* ──────────────────────────────────────────────────────────── */}
      {(activeTab === 'all' || activeTab === 'shifts') && items.shifts.length > 0 && (
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-bold text-xs text-slate-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-600" />
              <span>Pending Shift Allowances ({items.shifts.length})</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Shift Date</th>
                  <th className="py-3 px-4">Worker</th>
                  <th className="py-3 px-4">Shift Type</th>
                  <th className="py-3 px-4 text-right">Allowance Amount</th>
                  <th className="py-3 px-4">Remarks</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.shifts.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-mono text-slate-600">{new Date(item.shiftDate).toLocaleDateString('en-IN')}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{item.worker?.user?.fullName}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{item.shiftType || 'Night Shift'}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-700 font-mono">₹{Number(item.calculatedAmt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="py-3 px-4 text-slate-500 italic">{item.remarks || '—'}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleApproveShift(item.id, item.worker?.user?.fullName)}
                          className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors inline-flex items-center gap-1 shadow-2xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => handleRejectShift(item.id)}
                          className="px-3 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs border border-rose-200 transition-colors inline-flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {counts.total === 0 && !loading && (
        <div className="py-16 text-center bg-white rounded-3xl border border-slate-200/80 p-8 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">All Caught Up!</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            There are no pending submissions awaiting approval. Whenever machine operators or staff log daily work, mark attendance, or enter overtime, they will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
