import { API_BASE_URL } from '../config';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  Printer,
  CheckCircle2,
  XCircle,
  Plus,
  RefreshCw,
  Trash2,
  Edit2,
  X,
  AlertCircle,
  IndianRupee,
  TrendingUp
} from 'lucide-react';
import { UserSession } from '../types';
import PayslipPrintView, { PayslipData } from './PayslipPrintView';
import SlideOverDrawer from './common/SlideOverDrawer';
import CustomSelect from './common/CustomSelect';
import CustomDatePicker from './common/CustomDatePicker';

interface SalaryRecordItem {
  id: string;
  workerId: string;
  monthYear: string;
  baseSalary: string | number;
  absenceDeduct: string | number;
  approvedOtAmt: string | number;
  approvedShiftAmt: string | number;
  netSalary: string | number;
  isPaid: boolean;
  worker: {
    id: string;
    employeeId: string;
    phoneNumber?: string | null;
    monthlySalary: string | number;
    user: {
      fullName: string;
      username: string;
    };
  };
}

interface OvertimeItem {
  id: string;
  workerId: string;
  otDate: string;
  hours: string | number;
  calculatedAmt: string | number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  remarks?: string | null;
  worker: {
    id: string;
    employeeId: string;
    user: {
      fullName: string;
    };
  };
}

interface ExtraShiftItem {
  id: string;
  workerId: string;
  shiftDate: string;
  shiftType?: string | null;
  calculatedAmt: string | number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  remarks?: string | null;
  worker: {
    id?: string;
    employeeId: string;
    user: {
      fullName: string;
    };
  };
}

interface WorkerOption {
  id: string;
  employeeId: string;
  monthlySalary: string | number;
  overtimeRate: string | number;
  extraShiftRate: string | number;
  user: {
    fullName: string;
  };
}

interface SalaryManagerProps {
  session: UserSession;
}

export default function SalaryManager({ session }: SalaryManagerProps) {
  const [activeTab, setActiveTab] = useState<'payroll' | 'overtime' | 'shifts'>('payroll');
  const [monthYear, setMonthYear] = useState('10-2026');
  const [records, setRecords] = useState<SalaryRecordItem[]>([]);
  const [otEntries, setOtEntries] = useState<OvertimeItem[]>([]);
  const [shiftEntries, setShiftEntries] = useState<ExtraShiftItem[]>([]);
  const [workers, setWorkers] = useState<WorkerOption[]>([]);

  const [summary, setSummary] = useState({
    totalWorkers: 0,
    totalPayout: 0,
    paidWorkers: 0,
    pendingWorkers: 0,
  });

  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Payslip Print State
  const [selectedPayslipData, setSelectedPayslipData] = useState<PayslipData | null>(null);

  // Modals & Editing states
  const [attendanceModal, setAttendanceModal] = useState(false);
  const [otModal, setOtModal] = useState(false);
  const [shiftModal, setShiftModal] = useState(false);
  const [editSalaryModal, setEditSalaryModal] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Editing items
  const [editingSalaryRecord, setEditingSalaryRecord] = useState<SalaryRecordItem | null>(null);
  const [editSalBase, setEditSalBase] = useState<number | ''>('');
  const [editSalAbsence, setEditSalAbsence] = useState<number | ''>('');
  const [editSalOt, setEditSalOt] = useState<number | ''>('');
  const [editSalShift, setEditSalShift] = useState<number | ''>('');
  const [editSalIsPaid, setEditSalIsPaid] = useState(false);

  const [editingOt, setEditingOt] = useState<OvertimeItem | null>(null);
  const [editingShift, setEditingShift] = useState<ExtraShiftItem | null>(null);

  // Attendance Form
  const [attWorkerId, setAttWorkerId] = useState('');
  const [attPresent, setAttPresent] = useState<number | ''>('');
  const [attAbsent, setAttAbsent] = useState<number | ''>('');

  // Overtime Form
  const [otWorkerId, setOtWorkerId] = useState('');
  const [otDate, setOtDate] = useState(new Date().toISOString().split('T')[0]);
  const [otHours, setOtHours] = useState<number | ''>('');
  const [otRate, setOtRate] = useState<number | ''>('');
  const [otRemarks, setOtRemarks] = useState('');

  // Extra Shift Form
  const [shiftWorkerId, setShiftWorkerId] = useState('');
  const [shiftDate, setShiftDate] = useState(new Date().toISOString().split('T')[0]);
  const [shiftType, setShiftType] = useState('Night Shift');
  const [shiftAmount, setShiftAmount] = useState<number | ''>('');
  const [shiftRemarks, setShiftRemarks] = useState('');

  const openAddOt = () => {
    setEditingOt(null);
    setOtWorkerId('');
    setOtDate(new Date().toISOString().split('T')[0]);
    setOtHours('');
    setOtRate('');
    setOtRemarks('');
    setFormError(null);
    setOtModal(true);
  };

  const openEditOt = (ot: OvertimeItem) => {
    setEditingOt(ot);
    setOtWorkerId(ot.workerId);
    setOtDate(ot.otDate ? ot.otDate.split('T')[0] : new Date().toISOString().split('T')[0]);
    setOtHours(Number(ot.hours));
    const calculatedRate = Number(ot.hours) > 0 ? Number(ot.calculatedAmt) / Number(ot.hours) : 100;
    setOtRate(calculatedRate);
    setOtRemarks(ot.remarks || '');
    setFormError(null);
    setOtModal(true);
  };

  const openAddShift = () => {
    setEditingShift(null);
    setShiftWorkerId('');
    setShiftDate(new Date().toISOString().split('T')[0]);
    setShiftType('Night Shift');
    setShiftAmount('');
    setShiftRemarks('');
    setFormError(null);
    setShiftModal(true);
  };

  const openEditShift = (shift: ExtraShiftItem) => {
    setEditingShift(shift);
    setShiftWorkerId(shift.workerId);
    setShiftDate(shift.shiftDate ? shift.shiftDate.split('T')[0] : new Date().toISOString().split('T')[0]);
    setShiftType(shift.shiftType || 'Night Shift');
    setShiftAmount(Number(shift.calculatedAmt));
    setShiftRemarks(shift.remarks || '');
    setFormError(null);
    setShiftModal(true);
  };

  const openEditSalaryRecord = (r: SalaryRecordItem) => {
    setEditingSalaryRecord(r);
    setEditSalBase(Number(r.baseSalary));
    setEditSalAbsence(Number(r.absenceDeduct));
    setEditSalOt(Number(r.approvedOtAmt));
    setEditSalShift(Number(r.approvedShiftAmt));
    setEditSalIsPaid(r.isPaid);
    setFormError(null);
    setEditSalaryModal(true);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [salRes, otRes, shiftRes, workerRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/salary/records?monthYear=${monthYear}`, {
          headers: { Authorization: `Bearer ${session.token}` },
        }),
        fetch(`${API_BASE_URL}/api/salary/overtime`, {
          headers: { Authorization: `Bearer ${session.token}` },
        }),
        fetch(`${API_BASE_URL}/api/salary/extra-shifts`, {
          headers: { Authorization: `Bearer ${session.token}` },
        }),
        fetch(`${API_BASE_URL}/api/worker/profiles`, {
          headers: { Authorization: `Bearer ${session.token}` },
        }),
      ]);

      if (salRes.ok) {
        const data = await salRes.json();
        setRecords(data.records || []);
        if (data.summary) {
          setSummary(data.summary);
        }
      }
      if (otRes.ok) {
        const data = await otRes.json();
        setOtEntries(data.entries || []);
      }
      if (shiftRes.ok) {
        const data = await shiftRes.json();
        setShiftEntries(data.entries || []);
      }
      if (workerRes.ok) {
        const data = await workerRes.json();
        setWorkers(data.workers || []);
      }
    } catch (err) {
      console.error('Failed to load salary data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [session.token, monthYear]);

  // Generate All Monthly Salaries
  const handleGenerateSalaries = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/salary/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ monthYear }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate salaries');
      }

      setNotification({
        type: 'success',
        message: data.message || `26-day salaries generated for ${monthYear}`,
      });
      fetchData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to generate salaries',
      });
    } finally {
      setLoading(false);
    }
  };

  // Mark Salary as Paid
  const handleMarkPaid = async (id: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/salary/records/${id}/pay`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${session.token}` },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update payment status');
      }

      setNotification({
        type: 'success',
        message: data.message || 'Salary marked as PAID',
      });
      fetchData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to update status',
      });
    } finally {
      setLoading(false);
    }
  };

  // View & Print Payslip
  const handleViewPayslip = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/salary/records/${id}/payslip`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedPayslipData(data);
      }
    } catch (err) {
      console.error('Failed to load payslip:', err);
    }
  };

  // Submit Attendance
  const handleAttendanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!attWorkerId) {
      setFormError('Select worker');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/salary/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          workerId: attWorkerId,
          monthYear,
          standardDays: 26,
          presentDays: Number(attPresent),
          absentDays: Number(attAbsent),
          unpaidLeaves: Number(attAbsent),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save attendance');
      }

      setNotification({
        type: 'success',
        message: data.message || 'Attendance logged successfully',
      });
      setAttendanceModal(false);
      // Auto-recalculate salary after attendance change
      handleGenerateSalaries();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save attendance');
    } finally {
      setLoading(false);
    }
  };

  // Submit Overtime (Create or Update)
  const handleOtSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!otWorkerId || !otHours || Number(otHours) <= 0) {
      setFormError('Please select operator and enter valid OT hours');
      return;
    }

    try {
      setLoading(true);
      const url = editingOt
        ? `${API_BASE_URL}/api/salary/overtime/${editingOt.id}`
        : `${API_BASE_URL}/api/salary/overtime`;
      const method = editingOt ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          workerId: otWorkerId,
          otDate,
          hours: Number(otHours),
          ratePerHour: Number(otRate) || 100,
          remarks: otRemarks || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to log overtime');
      }

      setNotification({
        type: 'success',
        message: data.message || (editingOt ? 'Overtime updated successfully' : 'Overtime recorded successfully'),
      });
      setOtModal(false);
      setEditingOt(null);
      setOtRemarks('');
      fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to log overtime');
    } finally {
      setLoading(false);
    }
  };

  // Approve Overtime
  const handleApproveOt = async (id: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/salary/overtime/${id}/approve`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (res.ok) {
        setNotification({ type: 'success', message: 'Overtime entry approved' });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Reject Overtime
  const handleRejectOt = async (id: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/salary/overtime/${id}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ reason: 'Admin rejected' }),
      });
      if (res.ok) {
        setNotification({ type: 'success', message: 'Overtime entry rejected' });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Submit Extra Shift (Create or Update)
  const handleShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!shiftWorkerId || !shiftAmount || Number(shiftAmount) <= 0) {
      setFormError('Please select operator and enter shift allowance');
      return;
    }

    try {
      setLoading(true);
      const url = editingShift
        ? `${API_BASE_URL}/api/salary/extra-shifts/${editingShift.id}`
        : `${API_BASE_URL}/api/salary/extra-shifts`;
      const method = editingShift ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          workerId: shiftWorkerId,
          shiftDate,
          shiftType,
          amount: Number(shiftAmount),
          remarks: shiftRemarks || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to log extra shift');
      }

      setNotification({
        type: 'success',
        message: data.message || (editingShift ? 'Extra shift updated successfully' : 'Extra shift recorded successfully'),
      });
      setShiftModal(false);
      setEditingShift(null);
      setShiftRemarks('');
      fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to log extra shift');
    } finally {
      setLoading(false);
    }
  };

  // Approve Extra Shift
  const handleApproveShift = async (id: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/salary/extra-shifts/${id}/approve`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (res.ok) {
        setNotification({ type: 'success', message: 'Extra shift approved' });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOt = async (id: string) => {
    if (!confirm('Are you sure you want to delete this overtime entry?')) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/salary/overtime/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete overtime');
      setNotification({ type: 'success', message: data.message });
      fetchData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteShift = async (id: string) => {
    if (!confirm('Are you sure you want to delete this extra shift entry?')) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/salary/extra-shifts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete extra shift');
      setNotification({ type: 'success', message: data.message });
      fetchData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSalaryRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSalaryRecord) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/salary/records/${editingSalaryRecord.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          baseSalary: editSalBase !== '' ? Number(editSalBase) : 0,
          absenceDeduct: editSalAbsence !== '' ? Number(editSalAbsence) : 0,
          approvedOtAmt: editSalOt !== '' ? Number(editSalOt) : 0,
          approvedShiftAmt: editSalShift !== '' ? Number(editSalShift) : 0,
          isPaid: editSalIsPaid,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update salary record');
      setNotification({ type: 'success', message: 'Salary record updated successfully' });
      setEditSalaryModal(false);
      setEditingSalaryRecord(null);
      fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update salary record');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSalaryRecord = async (id: string) => {
    if (!confirm('Are you sure you want to delete this salary record?')) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/salary/records/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete salary record');
      setNotification({ type: 'success', message: data.message || 'Salary record deleted' });
      fetchData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Aggregate metrics
  const totalOtPayout = otEntries
    .filter(o => o.status === 'APPROVED')
    .reduce((sum, o) => sum + parseFloat(o.calculatedAmt.toString()), 0);

  const totalShiftPayout = shiftEntries
    .filter(s => s.status === 'APPROVED')
    .reduce((sum, s) => sum + parseFloat(s.calculatedAmt.toString()), 0);

  const totalAbsenceDeductions = records.reduce(
    (sum, r) => sum + parseFloat(r.absenceDeduct.toString()),
    0
  );

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Net Payroll
            </span>
            <div className="w-9 h-9 rounded-xl bg-white border border-slate-300 text-slate-900 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-semibold text-slate-900 tracking-tight">
              ₹{summary.totalPayout.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
            <span className="text-xs text-slate-500 ml-2">26-day basis</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Approved Overtime (OT)
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-semibold text-slate-900 tracking-tight">
              ₹{totalOtPayout.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
            <span className="text-xs text-emerald-700 font-medium ml-2">approved pay</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Extra Shifts Allowance
            </span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-semibold text-slate-900 tracking-tight">
              ₹{totalShiftPayout.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
            <span className="text-xs text-slate-500 ml-2">night & special</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Absence Deductions
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-semibold text-slate-900 tracking-tight">
              -₹{totalAbsenceDeductions.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
            <span className="text-xs text-rose-700 font-medium ml-2">unpaid leave</span>
          </div>
        </div>
      </div>

      {/* Sub-Tabs Switcher & Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Module Switcher Tabs */}
        <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-100 border border-slate-200/80">
          <button
            onClick={() => setActiveTab('payroll')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${activeTab === 'payroll'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-950'
              } whitespace-nowrap`}
          >
            <IndianRupee className="w-3.5 h-3.5" />
            <span>Monthly 26-Day Payroll</span>
          </button>
          <button
            onClick={() => setActiveTab('overtime')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${activeTab === 'overtime'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-950'
              } whitespace-nowrap`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Overtime (OT) Log</span>
          </button>
          <button
            onClick={() => setActiveTab('shifts')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${activeTab === 'shifts'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-950'
              } whitespace-nowrap`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Extra Shifts</span>
          </button>
        </div>

        {/* Action Bar */}
        <div className="flex items-center gap-3">
          {/* Month Selector */}
          <div className="w-52">
            <CustomSelect
              value={monthYear}
              onChange={setMonthYear}
              options={[
                { value: '10-2026', label: 'Cycle: October 2026' },
                { value: '09-2026', label: 'Cycle: September 2026' },
                { value: '08-2026', label: 'Cycle: August 2026' },
                { value: '11-2026', label: 'Cycle: November 2026' },
              ]}
            />
          </div>

          {activeTab === 'payroll' ? (
            <>
              <button
                onClick={() => {
                  setFormError(null);
                  setAttendanceModal(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 shadow-sm whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Attendance</span>
              </button>
              <button
                onClick={handleGenerateSalaries}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white border border-slate-300 text-slate-900 text-xs font-semibold hover:bg-slate-50 hover:border-slate-400 disabled:opacity-50 transition-all shadow-2xs whitespace-nowrap"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>⚡ Calculate All Payslips</span>
              </button>
            </>
          ) : activeTab === 'overtime' ? (
            <button
              onClick={openAddOt}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-slate-300 text-slate-900 text-xs font-semibold hover:bg-slate-50 hover:border-slate-400 transition-all shadow-2xs whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Log Overtime Entry</span>
            </button>
          ) : (
            <button
              onClick={openAddShift}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-slate-300 text-slate-900 text-xs font-semibold hover:bg-slate-50 hover:border-slate-400 transition-all shadow-2xs whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Record Extra Shift</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-View 1: 26-Day Payroll Table */}
      {activeTab === 'payroll' ? (
        <div className="bg-white border border-slate-200/80 rounded-3xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 whitespace-nowrap text-left">Operator Name</th>
                  <th className="py-3.5 px-4 whitespace-nowrap text-left">Employee ID</th>
                  <th className="py-3.5 px-4 text-left whitespace-nowrap">Base Salary (₹)</th>
                  <th className="py-3.5 px-4 text-left whitespace-nowrap">Absence Deduct</th>
                  <th className="py-3.5 px-4 text-left whitespace-nowrap">Approved OT</th>
                  <th className="py-3.5 px-4 text-left whitespace-nowrap">Extra Shifts</th>
                  <th className="py-3.5 px-4 text-left whitespace-nowrap">Net Payable (₹)</th>
                  <th className="py-3.5 px-4 text-left whitespace-nowrap">Payment Status</th>
                  <th className="py-3.5 px-4 text-left whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 whitespace-nowrap">
                      Calculating payroll...
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 whitespace-nowrap">
                      <IndianRupee className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      No salary records generated for this cycle yet. Click "⚡ Calculate All Payslips" to run the 26-day salary engine.
                    </td>
                  </tr>
                ) : (
                  records.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        {r.worker.user.fullName}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                        {r.worker.employeeId}
                      </td>
                      <td className="py-3 px-4 text-left font-medium text-slate-800 whitespace-nowrap">
                        ₹{parseFloat(r.baseSalary.toString()).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-left text-rose-600 font-medium whitespace-nowrap">
                        {parseFloat(r.absenceDeduct.toString()) > 0
                          ? `-₹${parseFloat(r.absenceDeduct.toString()).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                          : '₹0.00'}
                      </td>
                      <td className="py-3 px-4 text-left text-emerald-700 font-medium whitespace-nowrap">
                        {parseFloat(r.approvedOtAmt.toString()) > 0
                          ? `+₹${parseFloat(r.approvedOtAmt.toString()).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                          : '₹0.00'}
                      </td>
                      <td className="py-3 px-4 text-left text-emerald-700 font-medium whitespace-nowrap">
                        {parseFloat(r.approvedShiftAmt.toString()) > 0
                          ? `+₹${parseFloat(r.approvedShiftAmt.toString()).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                          : '₹0.00'}
                      </td>
                      <td className="py-3 px-4 text-left font-semibold text-slate-950 text-xs whitespace-nowrap">
                        ₹{parseFloat(r.netSalary.toString()).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-left whitespace-nowrap">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${r.isPaid
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                        >
                          {r.isPaid ? 'Paid' : 'Unpaid Due'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-left whitespace-nowrap">
                        <div className="flex items-center justify-start gap-1.5">
                          <button
                            onClick={() => handleViewPayslip(r.id)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors whitespace-nowrap"
                            title="Print Payslip"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Payslip</span>
                          </button>
                          {!r.isPaid && (
                            <button
                              onClick={() => handleMarkPaid(r.id)}
                              className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-medium transition-colors whitespace-nowrap"
                              title="Mark as Paid"
                            >
                              Mark Paid
                            </button>
                          )}
                          {session.role === 'ADMIN' && (
                            <>
                              <button
                                onClick={() => openEditSalaryRecord(r)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors whitespace-nowrap"
                                title="Edit Salary Record"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteSalaryRecord(r.id)}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors whitespace-nowrap"
                                title="Delete Salary Record"
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
      ) : activeTab === 'overtime' ? (
        /* Sub-View 2: Overtime Table */
        <div className="bg-white border border-slate-200/80 rounded-3xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 whitespace-nowrap text-left">Date</th>
                  <th className="py-3.5 px-4 whitespace-nowrap text-left">Operator</th>
                  <th className="py-3.5 px-4 text-left whitespace-nowrap">OT Hours</th>
                  <th className="py-3.5 px-4 text-left whitespace-nowrap">Calculated Amount (₹)</th>
                  <th className="py-3.5 px-4 whitespace-nowrap text-left">Remarks / Purpose</th>
                  <th className="py-3.5 px-4 text-left whitespace-nowrap">Status</th>
                  <th className="py-3.5 px-4 text-left whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {otEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 whitespace-nowrap">
                      No overtime entries recorded yet. Click "+ Log Overtime Entry" to add overtime shifts.
                    </td>
                  </tr>
                ) : (
                  otEntries.map(ot => (
                    <tr key={ot.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 text-slate-600 font-medium whitespace-nowrap">
                        {new Date(ot.otDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        {ot.worker.user.fullName}
                      </td>
                      <td className="py-3 px-4 text-left font-medium text-slate-900 whitespace-nowrap">
                        {parseFloat(ot.hours.toString())} hrs
                      </td>
                      <td className="py-3 px-4 text-left font-semibold text-emerald-700 whitespace-nowrap">
                        ₹{parseFloat(ot.calculatedAmt.toString()).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {ot.remarks || '—'}
                      </td>
                      <td className="py-3 px-4 text-left whitespace-nowrap">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${ot.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : ot.status === 'REJECTED'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                        >
                          {ot.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-left whitespace-nowrap">
                        <div className="flex items-center justify-start gap-1.5">
                          {ot.status === 'PENDING' && session.role === 'ADMIN' && (
                            <>
                              <button
                                onClick={() => handleApproveOt(ot.id)}
                                className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-medium whitespace-nowrap"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectOt(ot.id)}
                                className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-medium whitespace-nowrap"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {session.role === 'ADMIN' ? (
                            <>
                              <button
                                onClick={() => openEditOt(ot)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors whitespace-nowrap"
                                title="Edit Overtime Entry"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteOt(ot.id)}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors whitespace-nowrap"
                                title="Delete Overtime Entry"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">View Only</span>
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
      ) : (
        /* Sub-View 3: Extra Shifts Table */
        <div className="bg-white border border-slate-200/80 rounded-3xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 whitespace-nowrap text-left">Date</th>
                  <th className="py-3.5 px-4 whitespace-nowrap text-left">Operator</th>
                  <th className="py-3.5 px-4 whitespace-nowrap text-left">Shift Type</th>
                  <th className="py-3.5 px-4 text-left whitespace-nowrap">Allowance Amount (₹)</th>
                  <th className="py-3.5 px-4 whitespace-nowrap text-left">Remarks</th>
                  <th className="py-3.5 px-4 text-left whitespace-nowrap">Status</th>
                  <th className="py-3.5 px-4 text-left whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shiftEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 whitespace-nowrap">
                      No extra shifts logged yet. Click "+ Record Extra Shift" to add night or holiday special shifts.
                    </td>
                  </tr>
                ) : (
                  shiftEntries.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 text-slate-600 font-medium whitespace-nowrap">
                        {new Date(s.shiftDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        {s.worker.user.fullName}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-800">
                          {s.shiftType || 'Night Shift'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-left font-semibold text-emerald-700 whitespace-nowrap">
                        ₹{parseFloat(s.calculatedAmt.toString()).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {s.remarks || '—'}
                      </td>
                      <td className="py-3 px-4 text-left whitespace-nowrap">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${s.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-left whitespace-nowrap">
                        <div className="flex items-center justify-start gap-1.5">
                          {s.status === 'PENDING' && session.role === 'ADMIN' && (
                            <button
                              onClick={() => handleApproveShift(s.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-medium whitespace-nowrap"
                            >
                              Approve
                            </button>
                          )}
                          {session.role === 'ADMIN' ? (
                            <>
                              <button
                                onClick={() => openEditShift(s)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors whitespace-nowrap"
                                title="Edit Extra Shift"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteShift(s.id)}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors whitespace-nowrap"
                                title="Delete Extra Shift"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">View Only</span>
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
      )}

      {/* Drawer: Log Monthly Attendance */}
      <SlideOverDrawer
        isOpen={attendanceModal}
        onClose={() => setAttendanceModal(false)}
        title="Log Monthly Attendance"
        subtitle={`26-Day Standard Basis for ${monthYear}`}
        badge="Attendance Log"
        widthClass="sm:max-w-xl"
        footer={
          <div className="flex items-center gap-3 w-full">
            <button
              type="button"
              onClick={() => setAttendanceModal(false)}
              className="flex-1 px-4 py-2.5 rounded-2xl bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="attendance-form"
              disabled={loading}
              className="flex-1 px-5 py-2.5 rounded-2xl bg-white border border-slate-300 text-slate-900 text-xs font-semibold hover:bg-slate-50 hover:border-slate-400 disabled:opacity-50 transition-all shadow-2xs whitespace-nowrap"
            >
              {loading ? 'Saving...' : 'Save & Recalculate'}
            </button>
          </div>
        }
      >
        <form id="attendance-form" onSubmit={handleAttendanceSubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Select Operator *
            </label>
            <CustomSelect
              value={attWorkerId}
              onChange={setAttWorkerId}
              placeholder="-- Select Operator --"
              options={workers.map(w => ({
                value: w.id,
                label: `${w.user.fullName} (${w.employeeId})`
              }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Present Days (Max 26) *
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="31"
                required
                value={attPresent}
                onChange={e => {
                  const val = parseFloat(e.target.value) || 0;
                  setAttPresent(val);
                  setAttAbsent(Math.max(0, 26 - val));
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-300"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Absent Days (Deducted) *
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="31"
                required
                value={attAbsent}
                onChange={e => setAttAbsent(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-rose-600 focus:outline-none focus:border-slate-300"
              />
            </div>
          </div>
        </form>
      </SlideOverDrawer>

      {/* Drawer: Log Overtime */}
      <SlideOverDrawer
        isOpen={otModal}
        onClose={() => setOtModal(false)}
        title={editingOt ? 'Edit Overtime (OT)' : 'Log Overtime (OT)'}
        subtitle={editingOt ? 'Update overtime hours and rate' : 'Optional extra hours with admin approval'}
        badge="Overtime"
        widthClass="sm:max-w-xl"
        footer={
          <div className="flex items-center gap-3 w-full">
            <button
              type="button"
              onClick={() => setOtModal(false)}
              className="flex-1 px-4 py-2.5 rounded-2xl bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="ot-form"
              disabled={loading}
              className="flex-1 px-5 py-2.5 rounded-2xl bg-white border border-slate-300 text-slate-900 text-xs font-semibold hover:bg-slate-50 hover:border-slate-400 disabled:opacity-50 transition-all shadow-2xs whitespace-nowrap"
            >
              {loading ? 'Saving...' : editingOt ? 'Save Changes' : 'Log Overtime'}
            </button>
          </div>
        }
      >
        <form id="ot-form" onSubmit={handleOtSubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Select Operator *
            </label>
            <CustomSelect
              value={otWorkerId}
              onChange={setOtWorkerId}
              placeholder="-- Select Operator --"
              options={
                editingOt && editingOt.worker && !workers.some(w => w.id === (editingOt.worker.id || editingOt.workerId))
                  ? [
                      {
                        value: editingOt.worker.id || editingOt.workerId,
                        label: `${editingOt.worker.user.fullName} (${editingOt.worker.employeeId})`
                      },
                      ...workers.map(w => ({
                        value: w.id,
                        label: `${w.user.fullName} (${w.employeeId})`
                      }))
                    ]
                  : workers.map(w => ({
                      value: w.id,
                      label: `${w.user.fullName} (${w.employeeId})`
                    }))
              }
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                OT Date *
              </label>
              <CustomDatePicker
                value={otDate}
                onChange={setOtDate}
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                OT Hours *
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                required
                value={otHours}
                onChange={e => setOtHours(parseFloat(e.target.value) || '')}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-300"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Rate / Hr (₹)
              </label>
              <input
                type="number"
                step="10"
                min="0"
                value={otRate}
                onChange={e => setOtRate(parseFloat(e.target.value) || '')}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-300"
              />
            </div>
          </div>

          {otHours && otRate ? (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between font-medium">
              <span className="text-slate-600">Calculated OT Amount:</span>
              <span className="font-semibold text-emerald-700">
                ₹{(Number(otHours) * Number(otRate)).toFixed(2)}
              </span>
            </div>
          ) : null}

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Remarks / Work Description
            </label>
            <input
              type="text"
              value={otRemarks}
              onChange={e => setOtRemarks(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-300"
            />
          </div>
        </form>
      </SlideOverDrawer>

      {/* Drawer: Record Extra Shift */}
      <SlideOverDrawer
        isOpen={shiftModal}
        onClose={() => setShiftModal(false)}
        title={editingShift ? 'Edit Extra Shift' : 'Record Extra Shift'}
        subtitle={editingShift ? 'Update shift allowance details' : 'Log night shift or special holiday allowance'}
        badge="Extra Shift"
        widthClass="sm:max-w-xl"
        footer={
          <div className="flex items-center gap-3 w-full">
            <button
              type="button"
              onClick={() => setShiftModal(false)}
              className="flex-1 px-4 py-2.5 rounded-2xl bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="shift-form"
              disabled={loading}
              className="flex-1 px-5 py-2.5 rounded-2xl bg-white border border-slate-300 text-slate-900 text-xs font-semibold hover:bg-slate-50 hover:border-slate-400 disabled:opacity-50 transition-all shadow-2xs whitespace-nowrap"
            >
              {loading ? 'Saving...' : editingShift ? 'Save Changes' : 'Log Extra Shift'}
            </button>
          </div>
        }
      >
        <form id="shift-form" onSubmit={handleShiftSubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Select Operator *
            </label>
            <CustomSelect
              value={shiftWorkerId}
              onChange={setShiftWorkerId}
              placeholder="-- Select Operator --"
              options={
                editingShift && editingShift.worker && !workers.some(w => w.id === (editingShift.worker.id || editingShift.workerId))
                  ? [
                      {
                        value: editingShift.worker.id || editingShift.workerId,
                        label: `${editingShift.worker.user.fullName} (${editingShift.worker.employeeId})`
                      },
                      ...workers.map(w => ({
                        value: w.id,
                        label: `${w.user.fullName} (${w.employeeId})`
                      }))
                    ]
                  : workers.map(w => ({
                      value: w.id,
                      label: `${w.user.fullName} (${w.employeeId})`
                    }))
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Shift Date *
              </label>
              <CustomDatePicker
                value={shiftDate}
                onChange={setShiftDate}
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Shift Type
              </label>
              <CustomSelect
                value={shiftType}
                onChange={setShiftType}
                options={[
                  { value: 'Night Shift', label: 'Night Shift' },
                  { value: 'Sunday / Holiday Shift', label: 'Sunday / Holiday Shift' },
                  { value: 'Double Shift', label: 'Double Shift' }
                ]}
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Shift Allowance Amount (₹) *
            </label>
            <input
              type="number"
              step="50"
              min="100"
              required
              value={shiftAmount}
              onChange={e => setShiftAmount(parseFloat(e.target.value) || '')}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-300"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Remarks
            </label>
            <input
              type="text"
              value={shiftRemarks}
              onChange={e => setShiftRemarks(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-300"
            />
          </div>
        </form>
      </SlideOverDrawer>

      {/* Drawer: Edit Payroll Record */}
      <SlideOverDrawer
        isOpen={editSalaryModal}
        onClose={() => setEditSalaryModal(false)}
        title="Edit Payroll Record"
        subtitle={`Update monthly payroll figures for ${editingSalaryRecord?.worker?.user?.fullName || 'Operator'}`}
        badge="Payroll"
        widthClass="sm:max-w-xl"
        footer={
          <div className="flex items-center gap-3 w-full">
            <button
              type="button"
              onClick={() => setEditSalaryModal(false)}
              className="flex-1 px-4 py-2.5 rounded-2xl bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="edit-salary-form"
              disabled={loading}
              className="flex-1 px-5 py-2.5 rounded-2xl bg-white border border-slate-300 text-slate-900 text-xs font-semibold hover:bg-slate-50 hover:border-slate-400 disabled:opacity-50 transition-all shadow-2xs whitespace-nowrap"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        }
      >
        <form id="edit-salary-form" onSubmit={handleUpdateSalaryRecordSubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Operator
            </label>
            <input
              type="text"
              disabled
              value={`${editingSalaryRecord?.worker?.user?.fullName || ''} (${editingSalaryRecord?.worker?.employeeId || ''})`}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-medium text-slate-600 cursor-not-allowed"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Base Salary (₹) *
              </label>
              <input
                type="number"
                step="100"
                required
                value={editSalBase}
                onChange={e => setEditSalBase(parseFloat(e.target.value) || '')}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-slate-300"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Absence Deduction (₹)
              </label>
              <input
                type="number"
                step="50"
                min="0"
                value={editSalAbsence}
                onChange={e => setEditSalAbsence(parseFloat(e.target.value) || '')}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-slate-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Approved OT Amount (₹)
              </label>
              <input
                type="number"
                step="50"
                min="0"
                value={editSalOt}
                onChange={e => setEditSalOt(parseFloat(e.target.value) || '')}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-slate-300"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Approved Extra Shift (₹)
              </label>
              <input
                type="number"
                step="50"
                min="0"
                value={editSalShift}
                onChange={e => setEditSalShift(parseFloat(e.target.value) || '')}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-slate-300"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center font-medium">
            <span className="text-slate-600">Calculated Net Payable:</span>
            <span className="font-semibold text-slate-950 text-sm">
              ₹{(
                (Number(editSalBase) || 0) -
                (Number(editSalAbsence) || 0) +
                (Number(editSalOt) || 0) +
                (Number(editSalShift) || 0)
              ).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={editSalIsPaid}
                onChange={e => setEditSalIsPaid(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <span className="text-xs font-semibold text-slate-800">
                Mark as Paid in Full
              </span>
            </label>
          </div>
        </form>
      </SlideOverDrawer>

      {/* Printable Payslip Modal */}
      {selectedPayslipData && (
        <PayslipPrintView
          data={selectedPayslipData}
          onClose={() => setSelectedPayslipData(null)}
        />
      )}
    </div>
  );
}

