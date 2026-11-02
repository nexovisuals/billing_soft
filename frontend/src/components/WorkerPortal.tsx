import { API_BASE_URL } from '../config';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Cpu, LogOut, CheckCircle, Clock, AlertCircle, Plus, Wrench, RotateCw } from 'lucide-react';
import { UserSession, DailyWorkEntry } from '../types';
import PwaInstallPrompt from './PwaInstallPrompt';
import CustomSelect from './common/CustomSelect';

interface WorkerPortalProps {
  session: UserSession;
  onLogout: () => void;
}

export default function WorkerPortal({ session, onLogout }: WorkerPortalProps) {
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [materials, setMaterials] = useState<Array<{ id: string; productName: string; partNumber?: string }>>([]);
  const [entries, setEntries] = useState<DailyWorkEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [companyId, setCompanyId] = useState('');
  const [materialId, setMaterialId] = useState('');
  const [description, setDescription] = useState('');
  const [quantityDone, setQuantityDone] = useState('');
  const [quantityScrap, setQuantityScrap] = useState('0');
  const [workingHours, setWorkingHours] = useState('8');
  const [remarks, setRemarks] = useState('');

  // Load companies & materials & work history
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/stats`)
      .then(res => res.json())
      .then(data => {
        if (data.companies) {
          setCompanies(data.companies);
        }
      })
      .catch(console.error);

    fetch(`${API_BASE_URL}/api/materials`, {
      headers: { Authorization: `Bearer ${session.token}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.materials) {
          setMaterials(data.materials);
        }
      })
      .catch(console.error);
    setMaterialId('');

    loadWorkHistory();
  }, [session.token]);

  const loadWorkHistory = async () => {
    if (!session.token) return;
    try {
      setRefreshing(true);
      const res = await fetch(`${API_BASE_URL}/api/worker/daily-work`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const data = await res.json();
      if (data.entries) {
        setEntries(data.entries);
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
      setMessage({ type: 'error', text: 'Please select company and enter completed quantity.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    const selectedPart = materials.find(m => m.id === materialId);

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

      setMessage({ type: 'success', text: 'Work submitted successfully! Pending admin approval.' });
      setQuantityDone('');
      setQuantityScrap('0');
      setRemarks('');
      setDescription('');
      loadWorkHistory();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Submission failed.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-slate-900 selection:text-white flex flex-col">
      {/* Top Mobile-First Header with safe area padding */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 flex items-center justify-center font-semibold shrink-0 shadow-2xs">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-semibold text-slate-900 leading-tight">
                {session.fullName}
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-800 uppercase tracking-wider">
                Operator
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-normal mt-0.5">
              Emp: {session.workerProfile?.employeeId || 'SVT-EMP'} • Shri Varshini Tech
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadWorkHistory}
            title="Refresh Status"
            className="w-10 h-10 rounded-2xl border border-slate-200 text-slate-600 hover:text-slate-900 active:scale-95 flex items-center justify-center transition-all whitespace-nowrap"
          >
            <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-slate-900' : ''}`} />
          </button>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl border border-slate-200 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-slate-50 active:scale-95 transition-all whitespace-nowrap"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Touch Optimized Container */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Banner Alert */}
        <div className="p-4 rounded-3xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-800 shrink-0 shadow-xs">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-900">Standard 26-Day Shift Output</p>
              <p className="text-[11px] text-slate-500 font-normal">
                Log completed machining pcs before shift end
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-700 bg-white px-3 py-1.5 rounded-full border border-slate-200 shrink-0">
            8.0 hrs
          </span>
        </div>

        {/* Work Submission Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 sm:p-7 rounded-3xl border border-slate-200 bg-white shadow-subtle space-y-5"
        >
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Log Machining Output</h2>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              Select customer job, part, and enter completed units
            </p>
          </div>

          {message && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-medium border ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleWorkSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Company Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Customer Company</label>
                <CustomSelect
                  value={companyId}
                  onChange={setCompanyId}
                  placeholder="-- Select Customer --"
                  options={companies.map((c) => ({
                    value: c.id,
                    label: c.name
                  }))}
                />
              </div>

              {/* Material / Part Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Part / Component</label>
                <CustomSelect
                  value={materialId}
                  onChange={setMaterialId}
                  placeholder="-- Select Part --"
                  options={materials.map((m) => ({
                    value: m.id,
                    label: `${m.productName}${m.partNumber ? ` (${m.partNumber})` : ''}`
                  }))}
                />
              </div>
            </div>

            {/* Completed Quantity with Mobile Quick-Add Buttons */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-700">Completed Quantity (Nos)</label>
                <div className="flex items-center gap-1.5">
                  {[10, 25, 50, 100].map(qty => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => handleQuickAddQty(qty)}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 text-[11px] font-medium text-slate-700 hover:bg-slate-200 active:scale-90 transition-all whitespace-nowrap"
                    >
                      +{qty}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="number"
                step="1"
                min="1"
                inputMode="numeric"
                required
                value={quantityDone}
                onChange={(e) => setQuantityDone(e.target.value)}
                className="w-full min-h-[48px] px-4 rounded-2xl border border-slate-200 bg-slate-50 text-base sm:text-sm text-slate-900 outline-none focus:bg-white focus:border-slate-400 font-semibold tracking-tight"
              />
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              {/* Scrap Quantity */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Scrap / Rejection (Nos)</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  inputMode="numeric"
                  value={quantityScrap}
                  onChange={(e) => setQuantityScrap(e.target.value)}
                  className="w-full min-h-[46px] px-3.5 rounded-2xl border border-slate-200 bg-slate-50 text-base sm:text-sm text-slate-900 outline-none focus:bg-white focus:border-slate-400 font-medium"
                />
              </div>

              {/* Working Hours */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Shift Hours</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  inputMode="decimal"
                  value={workingHours}
                  onChange={(e) => setWorkingHours(e.target.value)}
                  className="w-full min-h-[46px] px-3.5 rounded-2xl border border-slate-200 bg-slate-50 text-base sm:text-sm text-slate-900 outline-none focus:bg-white focus:border-slate-400 font-medium"
                />
              </div>
            </div>

            {/* Work Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Operation / Notes (Optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full min-h-[46px] px-3.5 rounded-2xl border border-slate-200 bg-slate-50 text-base sm:text-xs text-slate-900 outline-none focus:bg-white focus:border-slate-400"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[50px] rounded-2xl bg-white border border-slate-300 text-slate-900 text-xs font-semibold hover:bg-slate-50 hover:border-slate-400 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-2xs disabled:opacity-50 whitespace-nowrap"
            >
              <Plus className="w-4 h-4 text-slate-800" />
              <span>{loading ? 'Submitting Log...' : 'Submit Output for Admin Approval'}</span>
            </button>
          </form>
        </motion.div>

        {/* Worker's Past Submissions */}
        <div className="p-5 sm:p-7 rounded-3xl border border-slate-200 bg-white shadow-subtle space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Your Submitted Production Logs</h3>
              <p className="text-xs text-slate-500 font-normal">Track admin approval status</p>
            </div>
            <span className="text-xs font-medium text-slate-600 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
              {entries.length} Logs
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {entries.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No work logs found. Submit your first entry above.
              </div>
            ) : (
              entries.map((entry) => (
                <div key={entry.id} className="py-3.5 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-xs text-slate-900">
                      {entry.company?.name} — {entry.material?.productName || entry.description}
                    </div>
                    <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                      Completed: <span className="font-semibold text-slate-800">{entry.quantityDone} pcs</span>
                      {Number(entry.quantityScrap) > 0 && (
                        <span className="text-rose-600 font-medium ml-1.5">({entry.quantityScrap} scrap)</span>
                      )}
                      {entry.remarks && <span className="ml-2 text-slate-400">• {entry.remarks}</span>}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                        entry.status === 'PENDING'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : entry.status === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}
                    >
                      {entry.status === 'PENDING' ? (
                        <>
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>Pending</span>
                        </>
                      ) : entry.status === 'APPROVED' ? (
                        <>
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          <span>Approved</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3 h-3 text-rose-600" />
                          <span>Rejected</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* PWA Install Banner */}
      <PwaInstallPrompt />
    </div>
  );
}
