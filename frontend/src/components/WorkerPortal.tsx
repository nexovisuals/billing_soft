import { API_BASE_URL } from '../config';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Cpu,
  LogOut,
  CheckCircle,
  AlertCircle,
  Plus,
  RotateCw,
  Layers,
  UserCheck
} from 'lucide-react';
import { UserSession, DailyWorkEntry } from '../types';
import PwaInstallPrompt from './PwaInstallPrompt';
import CustomSelect from './common/CustomSelect';
import CustomDatePicker from './common/CustomDatePicker';

interface WorkerPortalProps {
  session: UserSession;
  onLogout: () => void;
}

interface AttendanceEntry {
  id: string;
  date: string;
  status: string;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  remarks?: string | null;
  approvedBy?: string | null;
}

export default function WorkerPortal({ session, onLogout }: WorkerPortalProps) {
  const [activeTab, setActiveTab] = useState<'work' | 'attendance'>('work');
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [materials, setMaterials] = useState<Array<{ id: string; productName: string; partNumber?: string }>>([]);
  const [entries, setEntries] = useState<DailyWorkEntry[]>([]);
  const [attendanceList, setAttendanceList] = useState<AttendanceEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Daily Work Form State
  const [companyId, setCompanyId] = useState('');
  const [materialId, setMaterialId] = useState('');
  const [description, setDescription] = useState('');
  const [quantityDone, setQuantityDone] = useState('');
  const [quantityScrap, setQuantityScrap] = useState('0');
  const [workingHours, setWorkingHours] = useState('8');
  const [remarks, setRemarks] = useState('');

  // Attendance Form State
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceStatus, setAttendanceStatus] = useState<'PRESENT' | 'HALF_DAY' | 'ON_LEAVE'>('PRESENT');
  const [attendanceRemarks, setAttendanceRemarks] = useState('');

  // Load companies, materials, work history & attendance
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/stats`)
      .then((res) => res.json())
      .then((data) => {
        if (data.companies) setCompanies(data.companies);
      })
      .catch(console.error);

    fetch(`${API_BASE_URL}/api/materials`, {
      headers: { Authorization: `Bearer ${session.token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.materials) setMaterials(data.materials);
      })
      .catch(console.error);

    loadAllHistory();
  }, [session.token]);

  const loadAllHistory = async () => {
    if (!session.token) return;
    try {
      setRefreshing(true);
      const [workRes, attRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/worker/daily-work`, {
          headers: { Authorization: `Bearer ${session.token}` },
        }),
        fetch(`${API_BASE_URL}/api/worker/attendance`, {
          headers: { Authorization: `Bearer ${session.token}` },
        }),
      ]);

      if (workRes.ok) {
        const d = await workRes.json();
        setEntries(d.entries || d.workEntries || []);
      }
      if (attRes.ok) {
        const d = await attRes.json();
        setAttendanceList(d.attendance || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleQuickAddQty = (amount: number) => {
    const current = parseInt(quantityDone || '0', 10);
    setQuantityDone(String(Math.max(0, current + amount)));
  };

  const handleWorkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !quantityDone) {
      setMessage({ type: 'error', text: 'Please select customer and enter completed quantity.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    const selectedPart = materials.find((m) => m.id === materialId);

    try {
      const res = await fetch(`${API_BASE_URL}/api/worker/daily-work`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          companyId,
          materialId: materialId || undefined,
          description: description || `CNC machining operation on ${selectedPart?.productName || 'component'}`,
          drawingNumber: selectedPart?.partNumber || undefined,
          partNumber: selectedPart?.partNumber || undefined,
          quantityDone: parseFloat(quantityDone),
          quantityScrap: parseFloat(quantityScrap) || 0,
          workingHours: parseFloat(workingHours) || 8,
          remarks,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit work.');
      }

      setMessage({ type: 'success', text: 'Daily work submitted successfully! Awaiting admin approval.' });
      setQuantityDone('');
      setQuantityScrap('0');
      setRemarks('');
      loadAllHistory();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Submission failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleAttendanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/worker/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          date: attendanceDate,
          status: attendanceStatus,
          remarks: attendanceRemarks || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit attendance.');
      }

      setMessage({
        type: 'success',
        text: `Attendance for ${new Date(attendanceDate).toLocaleDateString('en-IN')} submitted! Awaiting admin approval.`,
      });
      setAttendanceRemarks('');
      loadAllHistory();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to submit attendance' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 leading-tight">
              {session.fullName}
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">Worker Portal • SVT Workshop</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadAllHistory}
            title="Refresh Status"
            className="w-9 h-9 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 active:scale-95 flex items-center justify-center transition-all bg-white"
          >
            <RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-slate-900' : ''}`} />
          </button>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-slate-50 active:scale-95 transition-all bg-white"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Touch Optimized Container */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* Module Switcher Tabs */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-200/80 border border-slate-300/80 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('work')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all ${
              activeTab === 'work' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Daily Work</span>
          </button>

          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all ${
              activeTab === 'attendance' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Mark Attendance</span>
          </button>
        </div>

        {/* Global Toast Message */}
        {message && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-semibold border flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────── */}
        {/* TAB 1: LOG DAILY WORK                                        */}
        {/* ──────────────────────────────────────────────────────────── */}
        {activeTab === 'work' && (
          <div className="space-y-5">
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 sm:p-6 rounded-3xl border border-slate-200 bg-white shadow-xs space-y-4"
            >
              <div>
                <h2 className="text-sm font-bold text-slate-900">Log Finished Machining Parts</h2>
                <p className="text-xs text-slate-500 font-normal mt-0.5">
                  Select customer job, product, and enter completed units
                </p>
              </div>

              <form onSubmit={handleWorkSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Customer Company *</label>
                    <CustomSelect
                      value={companyId}
                      onChange={setCompanyId}
                      placeholder="-- Select Customer --"
                      options={companies.map((c) => ({
                        value: c.id,
                        label: c.name,
                      }))}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Product / Part</label>
                    <CustomSelect
                      value={materialId}
                      onChange={setMaterialId}
                      placeholder="-- Select Part --"
                      options={materials.map((m) => ({
                        value: m.id,
                        label: `${m.productName}${m.partNumber ? ` (${m.partNumber})` : ''}`,
                      }))}
                    />
                  </div>
                </div>

                {/* Completed Quantity */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">Completed Quantity (Nos) *</label>
                    <div className="flex items-center gap-1">
                      {[10, 25, 50, 100].map((inc) => (
                        <button
                          key={inc}
                          type="button"
                          onClick={() => handleQuickAddQty(inc)}
                          className="px-2 py-0.5 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
                        >
                          +{inc}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    placeholder="Enter completed pieces count"
                    value={quantityDone}
                    onChange={(e) => setQuantityDone(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-base text-slate-900 outline-none focus:bg-white focus:border-slate-400 font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Scrap Pieces (Nos)</label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={quantityScrap}
                      onChange={(e) => setQuantityScrap(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 outline-none focus:bg-white focus:border-slate-400 font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Shift Working Hours</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={workingHours}
                      onChange={(e) => setWorkingHours(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 outline-none focus:bg-white focus:border-slate-400 font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Operation / Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Turning second side, bore machining"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 outline-none focus:bg-white focus:border-slate-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  <Plus className="w-4 h-4 text-white" />
                  <span>{loading ? 'Submitting...' : 'Submit Daily Work for Approval'}</span>
                </button>
              </form>
            </motion.div>

            {/* Daily Work Submissions History */}
            <div className="p-5 rounded-3xl border border-slate-200 bg-white shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Your Recent Work Logs ({entries.length})
                </h3>
              </div>

              <div className="divide-y divide-slate-100">
                {entries.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No work logs submitted yet.
                  </div>
                ) : (
                  entries.map((entry) => (
                    <div key={entry.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-bold text-slate-900">
                          {entry.company?.name} — {entry.material?.productName || entry.description}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Finished: <span className="font-semibold text-slate-800">{entry.quantityDone} pcs</span>
                          {Number(entry.quantityScrap) > 0 && (
                            <span className="text-rose-600 font-medium ml-1">({entry.quantityScrap} scrap)</span>
                          )}
                          <span className="ml-2 font-mono text-[10px] text-slate-400">{new Date(entry.workDate).toLocaleDateString('en-IN')}</span>
                        </div>
                      </div>

                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${
                          entry.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : entry.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        {entry.status === 'APPROVED' ? 'Approved' : entry.status === 'PENDING' ? 'Pending' : 'Rejected'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────── */}
        {/* TAB 2: MARK ATTENDANCE                                       */}
        {/* ──────────────────────────────────────────────────────────── */}
        {activeTab === 'attendance' && (
          <div className="space-y-5">
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 sm:p-6 rounded-3xl border border-slate-200 bg-white shadow-xs space-y-4"
            >
              <div>
                <h2 className="text-sm font-bold text-slate-900">Mark Daily Attendance</h2>
                <p className="text-xs text-slate-500 font-normal mt-0.5">
                  Submit your attendance for today. Admin will review and approve.
                </p>
              </div>

              <form onSubmit={handleAttendanceSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Attendance Date *</label>
                  <CustomDatePicker value={attendanceDate} onChange={setAttendanceDate} />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Attendance Status *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'PRESENT', label: 'Full Day (1.0)', color: 'border-emerald-500 bg-emerald-50 text-emerald-800' },
                      { id: 'HALF_DAY', label: 'Half Day (0.5)', color: 'border-amber-500 bg-amber-50 text-amber-800' },
                      { id: 'ON_LEAVE', label: 'On Leave (0.0)', color: 'border-rose-500 bg-rose-50 text-rose-800' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setAttendanceStatus(opt.id as any)}
                        className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                          attendanceStatus === opt.id
                            ? opt.color
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Notes / Remarks (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Regular CNC shift, morning in"
                    value={attendanceRemarks}
                    onChange={(e) => setAttendanceRemarks(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 outline-none focus:bg-white focus:border-slate-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  <UserCheck className="w-4 h-4 text-white" />
                  <span>{loading ? 'Submitting...' : 'Submit Attendance for Admin Approval'}</span>
                </button>
              </form>
            </motion.div>

            {/* Attendance History */}
            <div className="p-5 rounded-3xl border border-slate-200 bg-white shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Your Attendance Log ({attendanceList.length})
                </h3>
              </div>

              <div className="divide-y divide-slate-100">
                {attendanceList.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No attendance records logged yet.
                  </div>
                ) : (
                  attendanceList.map((att) => (
                    <div key={att.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-bold text-slate-900">
                          {new Date(att.date).toLocaleDateString('en-IN', {
                            weekday: 'short',
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Status: <span className="font-semibold text-slate-800">{att.status === 'PRESENT' ? 'Full Day' : att.status === 'HALF_DAY' ? 'Half Day' : 'Leave'}</span>
                          {att.remarks && <span className="ml-2 text-slate-400">• {att.remarks}</span>}
                        </div>
                      </div>

                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${
                          att.approvalStatus === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : att.approvalStatus === 'PENDING'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        {att.approvalStatus === 'APPROVED' ? 'Approved' : att.approvalStatus === 'PENDING' ? 'Pending Admin' : 'Rejected'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* PWA Install Banner */}
      <PwaInstallPrompt />
    </div>
  );
}
