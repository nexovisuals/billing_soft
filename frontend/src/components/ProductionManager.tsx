import { API_BASE_URL } from '../config';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Search,
  Trash2,
  Edit2,
  X,
  AlertCircle,
  Phone,
  IndianRupee
} from 'lucide-react';
import { UserSession } from '../types';
import SlideOverDrawer from './common/SlideOverDrawer';
import CustomSelect from './common/CustomSelect';

interface DailyWorkItem {
  id: string;
  workDate: string;
  workerId: string;
  companyId: string;
  materialId?: string | null;
  description: string;
  drawingNumber?: string | null;
  partNumber?: string | null;
  quantityDone: string | number;
  quantityScrap: string | number;
  workingHours?: string | number | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DRAFT';
  remarks?: string | null;
  company: {
    id: string;
    name: string;
  };
  material?: {
    id: string;
    productName: string;
    partNumber?: string | null;
  } | null;
  worker: {
    id: string;
    employeeId: string;
    user: {
      fullName: string;
      username: string;
    };
  };
}

interface WorkerProfileItem {
  id: string;
  employeeId: string;
  phoneNumber?: string | null;
  monthlySalary: string | number;
  user: {
    id: string;
    username: string;
    fullName: string;
    isActive: boolean;
  };
  _count?: {
    dailyWork: number;
  };
}

interface ProductionManagerProps {
  session: UserSession;
}

export default function ProductionManager({ session }: ProductionManagerProps) {
  const [activeTab, setActiveTab] = useState<'queue' | 'workers'>('queue');
  const [entries, setEntries] = useState<DailyWorkItem[]>([]);
  const [workers, setWorkers] = useState<WorkerProfileItem[]>([]);
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [materials, setMaterials] = useState<Array<{ id: string; productName: string; partNumber?: string | null }>>([]);
  
  const [summary, setSummary] = useState({
    totalFinishedPieces: 0,
    totalScrapPieces: 0,
    scrapRatePercent: 0,
    pendingApprovals: 0,
    approvedEntries: 0,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'APPROVED' | 'PENDING' | 'REJECTED'>('ALL');
  const [loading, setLoading] = useState(false);

  // Modals & Notifications
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [rejectModalItem, setRejectModalItem] = useState<DailyWorkItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [newWorkerModal, setNewWorkerModal] = useState(false);
  const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // New Worker Form
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerEmpId, setNewWorkerEmpId] = useState('');
  const [newWorkerUsername, setNewWorkerUsername] = useState('');
  const [newWorkerPassword, setNewWorkerPassword] = useState('');
  const [newWorkerPhone, setNewWorkerPhone] = useState('');
  const [newWorkerSalary, setNewWorkerSalary] = useState<number | ''>('');

  // Manual Work Log Drawer & Form State
  const [manualDrawerOpen, setManualDrawerOpen] = useState(false);
  const [editingDailyWork, setEditingDailyWork] = useState<DailyWorkItem | null>(null);
  const [manWorkerId, setManWorkerId] = useState('');
  const [manCompanyId, setManCompanyId] = useState('');
  const [manMaterialId, setManMaterialId] = useState('');
  const [manDesc, setManDesc] = useState('');
  const [manQtyDone, setManQtyDone] = useState<number | ''>('');
  const [manQtyScrap, setManQtyScrap] = useState<number | ''>('');
  const [manHours, setManHours] = useState<number | ''>('');
  const [manRemarks, setManRemarks] = useState('');

  const openCreateManualWork = () => {
    setEditingDailyWork(null);
    setManWorkerId('');
    setManCompanyId('');
    setManMaterialId('');
    setManDesc('');
    setManQtyDone('');
    setManQtyScrap('');
    setManHours('');
    setManRemarks('');
    setFormError(null);
    setManualDrawerOpen(true);
  };

  const openEditDailyWork = (item: DailyWorkItem) => {
    setEditingDailyWork(item);
    setManWorkerId(item.workerId);
    setManCompanyId(item.companyId);
    setManMaterialId(item.materialId || '');
    setManDesc(item.description);
    setManQtyDone(Number(item.quantityDone));
    setManQtyScrap(Number(item.quantityScrap));
    setManHours(item.workingHours ? Number(item.workingHours) : '');
    setManRemarks(item.remarks || '');
    setFormError(null);
    setManualDrawerOpen(true);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [workRes, workerRes, sumRes, compRes, matRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/worker/daily-work`, {
          headers: { Authorization: `Bearer ${session.token}` },
        }),
        fetch(`${API_BASE_URL}/api/worker/profiles`, {
          headers: { Authorization: `Bearer ${session.token}` },
        }),
        fetch(`${API_BASE_URL}/api/worker/production/summary`, {
          headers: { Authorization: `Bearer ${session.token}` },
        }),
        fetch(`${API_BASE_URL}/api/companies`, {
          headers: { Authorization: `Bearer ${session.token}` },
        }),
        fetch(`${API_BASE_URL}/api/materials`, {
          headers: { Authorization: `Bearer ${session.token}` },
        }),
      ]);

      if (workRes.ok) {
        const data = await workRes.json();
        setEntries(data.entries || []);
      }
      if (workerRes.ok) {
        const data = await workerRes.json();
        setWorkers(data.workers || []);
      }
      if (sumRes.ok) {
        const data = await sumRes.json();
        setSummary(data);
      }
      if (compRes.ok) {
        const data = await compRes.json();
        setCompanies(data.companies || []);
      }
      if (matRes.ok) {
        const data = await matRes.json();
        setMaterials(data.materials || []);
      }
    } catch (err) {
      console.error('Failed to load production data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [session.token]);

  // One-Click Approve Work
  const handleApprove = async (id: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/worker/daily-work/${id}/approve`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${session.token}` },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to approve production entry');
      }

      setNotification({
        type: 'success',
        message: data.message || 'Production entry approved',
      });
      fetchData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to approve entry',
      });
    } finally {
      setLoading(false);
    }
  };

  // Confirm Reject Work
  const handleRejectConfirm = async () => {
    if (!rejectModalItem) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/worker/daily-work/${rejectModalItem.id}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ reason: rejectReason }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reject production entry');
      }

      setNotification({
        type: 'success',
        message: data.message || 'Production entry returned with revision remarks',
      });
      setRejectModalItem(null);
      setRejectReason('');
      fetchData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to reject entry',
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditWorker = (w: WorkerProfileItem) => {
    setEditingWorkerId(w.id);
    setNewWorkerName(w.user.fullName);
    setNewWorkerEmpId(w.employeeId);
    setNewWorkerUsername(w.user.username);
    setNewWorkerPassword('');
    setNewWorkerPhone(w.phoneNumber || '');
    setNewWorkerSalary(Number(w.monthlySalary));
    setFormError(null);
    setNewWorkerModal(true);
  };

  const handleDeleteWorker = async (id: string) => {
    if (!confirm('Are you sure you want to delete this worker profile? This will also remove the login account and work entries.')) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/worker/profiles/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete worker');
      setNotification({ type: 'success', message: data.message });
      fetchData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDailyWork = async (id: string) => {
    if (!confirm('Are you sure you want to delete this production work entry?')) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/worker/daily-work/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete daily work entry');
      setNotification({ type: 'success', message: data.message });
      fetchData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Register / Edit Worker
  const handleCreateWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!editingWorkerId && (!newWorkerName || !newWorkerEmpId || !newWorkerUsername || !newWorkerPassword)) {
      setFormError('Please fill in all mandatory worker credentials');
      return;
    }
    if (editingWorkerId && (!newWorkerName || !newWorkerEmpId)) {
      setFormError('Operator name and Employee ID are required');
      return;
    }

    try {
      setLoading(true);
      const url = editingWorkerId
        ? `${API_BASE_URL}/api/worker/profiles/${editingWorkerId}`
        : `${API_BASE_URL}/api/worker/profiles`;
      const method = editingWorkerId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          fullName: newWorkerName,
          employeeId: newWorkerEmpId,
          username: newWorkerUsername,
          password: newWorkerPassword || undefined,
          phoneNumber: newWorkerPhone || undefined,
          monthlySalary: Number(newWorkerSalary) || 18000,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save worker');
      }

      setNotification({
        type: 'success',
        message: data.message || (editingWorkerId ? 'Operator profile updated' : 'New operator registered successfully'),
      });
      setNewWorkerModal(false);
      setEditingWorkerId(null);
      setNewWorkerName('');
      setNewWorkerEmpId('');
      setNewWorkerUsername('');
      setNewWorkerPassword('');
      setNewWorkerPhone('');
      fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save worker');
    } finally {
      setLoading(false);
    }
  };

  // Manual Work Submission & Editing by Admin
  const handleManualWorkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!manWorkerId || !manCompanyId || !manQtyDone) {
      setFormError('Please select operator, customer company, and quantity done');
      return;
    }

    try {
      setLoading(true);
      const chosenPart = materials.find(m => m.id === manMaterialId);
      const url = editingDailyWork
        ? `${API_BASE_URL}/api/worker/daily-work/${editingDailyWork.id}`
        : `${API_BASE_URL}/api/worker/daily-work`;
      const method = editingDailyWork ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          workerId: manWorkerId,
          companyId: manCompanyId,
          materialId: manMaterialId || undefined,
          description: manDesc || `CNC machining operation on ${chosenPart?.productName || 'component'}`,
          drawingNumber: chosenPart?.partNumber || undefined,
          partNumber: chosenPart?.partNumber || undefined,
          quantityDone: Number(manQtyDone),
          quantityScrap: Number(manQtyScrap) || 0,
          workingHours: manHours ? Number(manHours) : 8,
          remarks: manRemarks || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to record work entry');
      }

      setNotification({
        type: 'success',
        message: editingDailyWork ? 'Daily production entry updated successfully' : 'Daily production entry recorded and approved',
      });
      setTimeout(() => setNotification(null), 3500);
      setManualDrawerOpen(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit production entry');
    } finally {
      setLoading(false);
    }
  };

  // Filter queue entries
  const filteredEntries = entries.filter(item => {
    const matchesSearch =
      item.worker.user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.worker.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.partNumber && item.partNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' || item.status === statusFilter;

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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Approved Output
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-semibold text-slate-900 tracking-tight">
              {summary.totalFinishedPieces.toLocaleString('en-IN')}
            </span>
            <span className="text-xs text-slate-500 ml-2">pieces finished</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Pending Approvals
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-semibold text-slate-900 tracking-tight">
              {summary.pendingApprovals}
            </span>
            <span className="text-xs text-amber-700 font-medium ml-2">awaiting review</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Defect / Scrap Rate
            </span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-semibold text-slate-900 tracking-tight">
              {summary.scrapRatePercent}%
            </span>
            <span className="text-xs text-slate-500 ml-2">
              ({summary.totalScrapPieces} pcs rejected)
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Machine Operators
            </span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-semibold text-slate-900 tracking-tight">
              {workers.length}
            </span>
            <span className="text-xs text-slate-500 ml-2">active workers</span>
          </div>
        </div>
      </div>

      {/* Sub-Tabs Switcher & Control Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Module Switcher Tabs */}
        <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-100 border border-slate-200/80">
          <button
            onClick={() => setActiveTab('queue')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'queue'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-950'
            } whitespace-nowrap`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Daily Production Queue</span>
            {summary.pendingApprovals > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-semibold">
                {summary.pendingApprovals}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('workers')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'workers'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-950'
            } whitespace-nowrap`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Worker Roster</span>
          </button>
        </div>

        {/* Right Action Bar */}
        <div className="flex flex-wrap items-center gap-3">
          {(session.role === 'ADMIN' || session.role === 'STAFF') && (
            <button
              onClick={openCreateManualWork}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-slate-300 text-slate-900 text-xs font-semibold hover:bg-slate-50 hover:border-slate-400 active:scale-95 transition-all shadow-2xs whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Log Manual Work</span>
            </button>
          )}

          {activeTab === 'queue' ? (
            <>
              {/* Status Filter Ribbon (Ordered: All, Approved, Pending, Rejected) */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200">
                {(['ALL', 'APPROVED', 'PENDING', 'REJECTED'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      statusFilter === st
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    } whitespace-nowrap`}
                  >
                    {st === 'ALL' ? 'All' : st === 'APPROVED' ? 'Approved' : st === 'PENDING' ? 'Pending' : 'Rejected'}
                  </button>
                ))}
              </div>

              {/* Search Input */}
              <div className="relative md:w-56">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search operator, company, part..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-2xl bg-white border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-300 shadow-sm"
                />
              </div>
            </>
          ) : activeTab === 'workers' ? (
            <button
              onClick={() => {
                setEditingWorkerId(null);
                setNewWorkerName('');
                setNewWorkerEmpId('');
                setNewWorkerUsername('');
                setNewWorkerPassword('');
                setNewWorkerPhone('');
                setNewWorkerSalary('');
                setFormError(null);
                setNewWorkerModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-slate-300 text-slate-900 text-xs font-semibold hover:bg-slate-50 hover:border-slate-400 transition-all shadow-2xs whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Register New Operator</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Sub-View 1: Production Approval Queue Table */}
      {activeTab === 'queue' ? (
        <div className="bg-white border border-slate-200/80 rounded-3xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 whitespace-nowrap text-left">Date</th>
                  <th className="py-3.5 px-4 whitespace-nowrap text-left">Machine Operator</th>
                  <th className="py-3.5 px-4 whitespace-nowrap text-left">Customer Company</th>
                  <th className="py-3.5 px-4 whitespace-nowrap text-left">Part & Operation</th>
                  <th className="py-3.5 px-4 text-left whitespace-nowrap">Finished Qty</th>
                  <th className="py-3.5 px-4 text-left whitespace-nowrap">Scrap Qty</th>
                  <th className="py-3.5 px-4 text-left whitespace-nowrap">Status</th>
                  <th className="py-3.5 px-4 text-left whitespace-nowrap">Admin Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 whitespace-nowrap">
                      Loading production entries...
                    </td>
                  </tr>
                ) : filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 whitespace-nowrap">
                      <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      No daily work submissions match this filter. Mobile workers can log entries from their phones.
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map(e => (
                    <tr key={e.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 text-slate-600 font-medium whitespace-nowrap">
                        {new Date(e.workDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{e.worker.user.fullName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          ID: {e.worker.employeeId}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                        {e.company.name}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-900">{e.description}</div>
                        {e.partNumber && (
                          <div className="text-[10px] text-slate-500 font-mono">
                            Part: {e.partNumber}
                          </div>
                        )}
                        {e.remarks && (
                          <div className="text-[10px] text-slate-600 italic mt-0.5">
                            "{e.remarks}"
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-left font-semibold text-slate-950 text-xs whitespace-nowrap">
                        {parseFloat(e.quantityDone.toString())} pcs
                      </td>
                      <td className="py-3 px-4 text-left text-rose-600 font-medium whitespace-nowrap">
                        {parseFloat(e.quantityScrap.toString()) > 0
                          ? `${parseFloat(e.quantityScrap.toString())} pcs`
                          : '—'}
                      </td>
                      <td className="py-3 px-4 text-left whitespace-nowrap">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${
                            e.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : e.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {e.status === 'APPROVED' ? 'Approved' : e.status === 'REJECTED' ? 'Returned' : 'Pending Review'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-left whitespace-nowrap">
                        <div className="flex items-center justify-start gap-1.5">
                          {e.status === 'PENDING' ? (
                            <>
                              <button
                                onClick={() => handleApprove(e.id)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-medium transition-colors whitespace-nowrap"
                                title="Approve Entry"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => {
                                  setRejectModalItem(e);
                                  setRejectReason('');
                                }}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-medium border border-rose-200 transition-colors whitespace-nowrap"
                                title="Reject / Return Entry"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Return</span>
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium mr-1">
                              Reviewed
                            </span>
                          )}
                          {session.role === 'ADMIN' && (
                            <>
                              <button
                                onClick={() => openEditDailyWork(e)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors whitespace-nowrap"
                                title="Edit Production Entry"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteDailyWork(e.id)}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors whitespace-nowrap"
                                title="Delete Entry"
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
      ) : activeTab === 'workers' ? (
        /* Sub-View 2: Worker Roster Table */
        <div className="bg-white border border-slate-200/80 rounded-3xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 whitespace-nowrap text-left">Employee ID</th>
                  <th className="py-3.5 px-4 whitespace-nowrap text-left">Operator Full Name</th>
                  <th className="py-3.5 px-4 whitespace-nowrap text-left">Portal Username</th>
                  <th className="py-3.5 px-4 whitespace-nowrap text-left">Contact Phone</th>
                  <th className="py-3.5 px-4 text-left whitespace-nowrap">Monthly Base Salary</th>
                  <th className="py-3.5 px-4 text-left whitespace-nowrap">Daily Work Submissions</th>
                  <th className="py-3.5 px-4 text-left whitespace-nowrap">Status</th>
                  <th className="py-3.5 px-4 text-left whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {workers.map(w => (
                  <tr key={w.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900 whitespace-nowrap">
                      {w.employeeId}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">
                      {w.user.fullName}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                      @{w.user.username}
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {w.phoneNumber || '—'}
                    </td>
                    <td className="py-3 px-4 text-left font-semibold text-slate-900 whitespace-nowrap">
                      ₹{parseFloat(w.monthlySalary.toString()).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-left whitespace-nowrap">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700">
                        {w._count?.dailyWork || 0} entries
                      </span>
                    </td>
                    <td className="py-3 px-4 text-left whitespace-nowrap">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active
                      </span>
                    </td>
                    <td className="py-3 px-4 text-left whitespace-nowrap">
                      {session.role === 'ADMIN' ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditWorker(w)}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors whitespace-nowrap"
                            title="Edit Operator Profile"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteWorker(w.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors whitespace-nowrap"
                            title="Delete Operator"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">View Only</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Manual Floor Production Entry Slide-Over Drawer */}
      <SlideOverDrawer
        isOpen={manualDrawerOpen}
        onClose={() => setManualDrawerOpen(false)}
        title={editingDailyWork ? 'Edit Daily Production Entry' : 'Log Manual Floor Production Entry'}
        subtitle="Record finished output and scrap on behalf of floor machine operators"
        footer={
          <>
            <button
              type="button"
              onClick={() => setManualDrawerOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="manual-work-form"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-semibold hover:bg-slate-50 hover:border-slate-400 disabled:opacity-50 active:scale-95 transition-all shadow-2xs whitespace-nowrap"
            >
              {loading ? 'Saving...' : editingDailyWork ? 'Save Changes' : 'Record & Approve'}
            </button>
          </>
        }
      >
        {formError && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{formError}</span>
          </div>
        )}

        <form id="manual-work-form" onSubmit={handleManualWorkSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Select Machine Operator *
              </label>
              <CustomSelect
                value={manWorkerId}
                onChange={(val) => setManWorkerId(val)}
                options={workers.map((w) => ({
                  value: w.id,
                  label: w.user.fullName,
                  sublabel: `ID: ${w.employeeId}`,
                }))}
                placeholder="-- Select Machine Operator --"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Customer Company *
              </label>
              <CustomSelect
                value={manCompanyId}
                onChange={(val) => setManCompanyId(val)}
                options={companies.map((c) => ({
                  value: c.id,
                  label: c.name,
                }))}
                placeholder="-- Select Customer Company --"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Component / Part (Optional Link)
            </label>
            <CustomSelect
              value={manMaterialId}
              onChange={(val) => setManMaterialId(val)}
              options={[
                { value: '', label: '-- Select Component / Part (Optional) --' },
                ...materials.map((m) => ({
                  value: m.id,
                  label: m.productName,
                  sublabel: m.partNumber ? `Part: ${m.partNumber}` : undefined,
                })),
              ]}
              placeholder="-- Select Component / Part (Optional) --"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Operation & Work Description
            </label>
            <input
              type="text"
              value={manDesc}
              onChange={e => setManDesc(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 font-normal focus:outline-none focus:border-slate-300"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Finished Pieces *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={manQtyDone}
                onChange={e => setManQtyDone(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-normal text-slate-900 focus:outline-none focus:border-slate-300"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Scrap / Rejected
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={manQtyScrap}
                onChange={e => setManQtyScrap(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-rose-600 font-normal focus:outline-none focus:border-slate-300"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Shift Hours
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                value={manHours}
                onChange={e => setManHours(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 font-normal focus:outline-none focus:border-slate-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Remarks / Machine Notes
            </label>
            <input
              type="text"
              value={manRemarks}
              onChange={e => setManRemarks(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 font-normal focus:outline-none focus:border-slate-300"
            />
          </div>
        </form>
      </SlideOverDrawer>

      {/* Reject Slide-Over Drawer with Reason Input */}
      <SlideOverDrawer
        isOpen={!!rejectModalItem}
        onClose={() => setRejectModalItem(null)}
        title={rejectModalItem ? `Return Work: ${rejectModalItem.worker.user.fullName}` : 'Return Entry'}
        subtitle="Operator will see revision feedback in their mobile portal"
        footer={
          <>
            <button
              type="button"
              onClick={() => setRejectModalItem(null)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading || !rejectReason.trim()}
              onClick={handleRejectConfirm}
              className="px-5 py-2.5 rounded-xl bg-white border border-rose-300 text-rose-700 text-xs font-semibold hover:bg-rose-50 hover:border-rose-400 active:scale-95 disabled:opacity-40 transition-all shadow-2xs whitespace-nowrap"
            >
              Confirm & Return Entry
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-rose-600 p-3 bg-rose-50 border border-rose-200 rounded-xl">
            <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <p className="text-xs text-rose-800">
              Returning this production entry for revision by operator.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Reason for Return / Correction *
            </label>
            <textarea
              rows={4}
              required
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:border-slate-300 outline-none"
            />
          </div>
        </div>
      </SlideOverDrawer>

      {/* New / Edit Worker Registration Slide-Over Drawer */}
      <SlideOverDrawer
        isOpen={newWorkerModal}
        onClose={() => setNewWorkerModal(false)}
        title={editingWorkerId ? "Edit Operator Profile" : "Register New Machine Operator"}
        subtitle="Manage worker profile with mobile portal login credentials"
        footer={
          <>
            <button
              type="button"
              onClick={() => setNewWorkerModal(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="create-worker-form"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-semibold hover:bg-slate-50 hover:border-slate-400 disabled:opacity-50 active:scale-95 transition-all shadow-2xs whitespace-nowrap"
            >
              {loading ? 'Saving...' : editingWorkerId ? 'Update Operator' : 'Register Operator'}
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

        <form id="create-worker-form" onSubmit={handleCreateWorker} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={newWorkerName}
                onChange={(e) => setNewWorkerName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:border-slate-300 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Employee ID *
              </label>
              <input
                type="text"
                required
                value={newWorkerEmpId}
                onChange={(e) => setNewWorkerEmpId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 font-mono focus:border-slate-300 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Portal Username *
              </label>
              <input
                type="text"
                required
                disabled={!!editingWorkerId}
                value={newWorkerUsername}
                onChange={(e) => setNewWorkerUsername(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 font-mono focus:border-slate-300 outline-none ${
                  editingWorkerId ? 'opacity-60 bg-slate-50 cursor-not-allowed' : ''
                }`}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                {editingWorkerId ? 'New Password (Optional)' : 'Password *'}
              </label>
              <input
                type="password"
                required={!editingWorkerId}
                value={newWorkerPassword}
                onChange={(e) => setNewWorkerPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:border-slate-300 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-500" />
                <span>Phone Number</span>
              </label>
              <input
                type="tel"
                value={newWorkerPhone}
                onChange={(e) => setNewWorkerPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:border-slate-300 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                <IndianRupee className="w-3 h-3 text-slate-500" />
                <span>Monthly Base Salary (₹) *</span>
              </label>
              <input
                type="number"
                step="500"
                min="0"
                required
                value={newWorkerSalary}
                onChange={(e) => setNewWorkerSalary(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 font-normal focus:border-slate-300 outline-none"
              />
            </div>
          </div>
        </form>
      </SlideOverDrawer>
    </div>
  );
}

