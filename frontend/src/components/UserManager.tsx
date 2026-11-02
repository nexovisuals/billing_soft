import { API_BASE_URL } from '../config';
import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Briefcase,
  Wrench,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { UserSession } from '../types';
import SlideOverDrawer from './common/SlideOverDrawer';
import CustomSelect from './common/CustomSelect';

interface UserItem {
  id: string;
  username: string;
  fullName: string;
  role: 'ADMIN' | 'STAFF' | 'WORKER';
  isActive: boolean;
  createdAt: string;
  workerProfile?: {
    id: string;
    employeeId: string;
    phoneNumber?: string;
    monthlySalary: number;
    overtimeRate: number;
    extraShiftRate: number;
  } | null;
}

interface UserManagerProps {
  session: UserSession;
}

export const UserManager: React.FC<UserManagerProps> = ({ session }) => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'STAFF' | 'WORKER'>('ALL');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form states
  const [formUsername, setFormUsername] = useState('');
  const [formFullName, setFormFullName] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<'ADMIN' | 'STAFF' | 'WORKER'>('STAFF');
  const [formPhone, setFormPhone] = useState('');
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formMonthlySalary, setFormMonthlySalary] = useState<number | ''>('');
  const [formOvertimeRate, setFormOvertimeRate] = useState<number | ''>('');
  const [formExtraShiftRate, setFormExtraShiftRate] = useState<number | ''>('');
  const [formIsActive, setFormIsActive] = useState(true);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/users`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [session.token]);

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormUsername('');
    setFormFullName('');
    setFormPassword('');
    setFormRole('STAFF');
    setFormPhone('');
    setFormEmployeeId('');
    setFormMonthlySalary('');
    setFormOvertimeRate('');
    setFormExtraShiftRate('');
    setFormIsActive(true);
    setErrorMsg('');
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (user: UserItem) => {
    setEditingUser(user);
    setFormUsername(user.username);
    setFormFullName(user.fullName);
    setFormPassword('');
    setFormRole(user.role);
    setFormPhone(user.workerProfile?.phoneNumber || '');
    setFormEmployeeId(user.workerProfile?.employeeId || '');
    setFormMonthlySalary(user.workerProfile?.monthlySalary ? Number(user.workerProfile.monthlySalary) : '');
    setFormOvertimeRate(user.workerProfile?.overtimeRate ? Number(user.workerProfile.overtimeRate) : '');
    setFormExtraShiftRate(user.workerProfile?.extraShiftRate ? Number(user.workerProfile.extraShiftRate) : '');
    setFormIsActive(user.isActive);
    setErrorMsg('');
    setIsDrawerOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    try {
      if (editingUser) {
        // Update user
        const res = await fetch(`${API_BASE_URL}/api/users/${editingUser.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.token}`,
          },
          body: JSON.stringify({
            fullName: formFullName,
            role: formRole,
            isActive: formIsActive,
            password: formPassword.trim() ? formPassword.trim() : undefined,
            phoneNumber: formPhone,
            employeeId: formRole === 'WORKER' ? formEmployeeId : undefined,
            monthlySalary: formRole === 'WORKER' ? Number(formMonthlySalary) : undefined,
            overtimeRate: formRole === 'WORKER' ? Number(formOvertimeRate) : undefined,
            extraShiftRate: formRole === 'WORKER' ? Number(formExtraShiftRate) : undefined,
          }),
        });

        const json = await res.json();
        if (!res.ok) {
          setErrorMsg(json.error || 'Failed to update user account');
          return;
        }

        setSuccessMsg(`User ${formUsername} updated successfully`);
      } else {
        // Create user
        if (!formUsername.trim()) {
          setErrorMsg('Username is required');
          return;
        }
        if (!formPassword.trim() || formPassword.trim().length < 6) {
          setErrorMsg('Password must be at least 6 characters');
          return;
        }

        const res = await fetch(`${API_BASE_URL}/api/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.token}`,
          },
          body: JSON.stringify({
            username: formUsername.trim(),
            fullName: formFullName.trim(),
            password: formPassword.trim(),
            role: formRole,
            phoneNumber: formPhone,
            employeeId: formRole === 'WORKER' ? formEmployeeId : undefined,
            monthlySalary: formRole === 'WORKER' ? Number(formMonthlySalary) : undefined,
            overtimeRate: formRole === 'WORKER' ? Number(formOvertimeRate) : undefined,
            extraShiftRate: formRole === 'WORKER' ? Number(formExtraShiftRate) : undefined,
          }),
        });

        const json = await res.json();
        if (!res.ok) {
          setErrorMsg(json.error || 'Failed to create user account');
          return;
        }

        setSuccessMsg(`Account for ${formFullName} created! They can now log in.`);
      }

      setIsDrawerOpen(false);
      fetchUsers();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Connection error saving user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (user: UserItem) => {
    if (!window.confirm(`Are you sure you want to delete user "${user.username}"?`)) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${user.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || 'Failed to delete user');
        return;
      }
      fetchUsers();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesSearch =
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.workerProfile?.employeeId &&
        u.workerProfile.employeeId.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesRole && matchesSearch;
  });

  const roleOptions = [
    { value: 'STAFF', label: 'Company Staff / Billing Operator', sublabel: 'Manages DCs, stock, billing, attendance' },
    { value: 'WORKER', label: 'Shop Floor Worker / CNC Machinist', sublabel: 'Logs daily production, checks attendance & payslips' },
    { value: 'ADMIN', label: 'Administrator', sublabel: 'Full authority including settings and user creation' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-slate-100">
        <div>
          <h2 className="text-base font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-700" />
            Staff & User Management
          </h2>
          <p className="text-xs text-slate-500 font-normal mt-0.5">
            Admin portal to create and configure accounts for workshop staff, operators, and administrators
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-semibold hover:bg-slate-50 hover:border-slate-400 active:scale-95 transition-all shadow-2xs whitespace-nowrap self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4 text-slate-800" />
          <span>Add New Account</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs w-full sm:w-80 focus-within:border-slate-400 focus-within:bg-white transition-all">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by username, name, emp ID..."
            className="bg-transparent border-none outline-none w-full placeholder:text-slate-400 text-slate-800 font-normal"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'STAFF', 'WORKER', 'ADMIN'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                roleFilter === r
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {r === 'ALL' ? 'All Accounts' : r}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold tracking-wider uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4 text-left whitespace-nowrap">USER / FULL NAME</th>
                <th className="py-3 px-4 text-left whitespace-nowrap">ROLE</th>
                <th className="py-3 px-4 text-left whitespace-nowrap">STAFF / WORKER DETAILS</th>
                <th className="py-3 px-4 text-left whitespace-nowrap">STATUS</th>
                <th className="py-3 px-4 text-left whitespace-nowrap">CREATED</th>
                <th className="py-3 px-4 text-left whitespace-nowrap">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    Loading accounts...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    No accounts found. Click "+ Add New Account" above to create staff or worker logins.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isAdmin = user.role === 'ADMIN';
                  const isStaff = user.role === 'STAFF';
                  const isWorker = user.role === 'WORKER';

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 text-left whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            isAdmin
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : isStaff
                              ? 'bg-sky-100 text-sky-800 border border-sky-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            {user.fullName ? user.fullName.slice(0, 2).toUpperCase() : 'US'}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{user.fullName}</div>
                            <div className="text-[11px] text-slate-500 font-mono">@{user.username}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-left whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border ${
                          isAdmin
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : isStaff
                            ? 'bg-sky-50 text-sky-700 border-sky-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {isAdmin && <Shield className="w-3 h-3" />}
                          {isStaff && <Briefcase className="w-3 h-3" />}
                          {isWorker && <Wrench className="w-3 h-3" />}
                          {user.role}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-left whitespace-nowrap">
                        {isWorker && user.workerProfile ? (
                          <div className="space-y-0.5 text-slate-600">
                            <div className="font-mono text-slate-800 font-medium">ID: {user.workerProfile.employeeId}</div>
                            <div className="text-[11px] text-slate-500">
                              ₹{user.workerProfile.monthlySalary.toLocaleString('en-IN')}/mo (OT: ₹{user.workerProfile.overtimeRate}/h)
                            </div>
                          </div>
                        ) : isStaff ? (
                          <span className="text-slate-500 text-[11px]">Workshop & Billing Operations</span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Full System Administration</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-left whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          user.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {user.isActive ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-left whitespace-nowrap text-slate-500 text-[11px]">
                        {new Date(user.createdAt).toLocaleDateString('en-GB')}
                      </td>

                      <td className="py-3.5 px-4 text-left whitespace-nowrap">
                        <div className="flex items-center gap-1.5 justify-start">
                          <button
                            onClick={() => handleOpenEdit(user)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            title="Edit User & Permissions"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {user.username !== 'admin' && (
                            <button
                              onClick={() => handleDeleteUser(user)}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete User"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right-Side Slide-Over Drawer for Adding / Editing Users */}
      <SlideOverDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingUser ? `Edit Account: @${editingUser.username}` : 'Create Staff or Worker Login'}
        subtitle={
          editingUser
            ? 'Modify role, privileges, compensation, or reset credentials'
            : 'Register a new operator or staff member for SVT workshop access'
        }
        badge={formRole}
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="user-form"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-xs font-semibold hover:bg-slate-50 hover:border-slate-400 active:scale-95 transition-all shadow-2xs whitespace-nowrap"
            >
              {submitting ? 'Saving...' : editingUser ? 'Update Account' : 'Create Account'}
            </button>
          </>
        }
      >
        <form id="user-form" onSubmit={handleSaveUser} className="space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Role Selector with Clean CustomSelect */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Account Role *
            </label>
            <CustomSelect
              value={formRole}
              onChange={(val) => setFormRole(val as any)}
              options={roleOptions}
              searchable={false}
            />
            <p className="text-[11px] text-slate-400 mt-1">
              {formRole === 'WORKER'
                ? 'Workers get a mobile-optimized production portal to log daily turned/milled parts and view payslips.'
                : formRole === 'STAFF'
                ? 'Staff get full operational billing access (DCs, invoices, customer stock, attendance).'
                : 'Admins have master access to change settings, export ledgers, and manage logins.'}
            </p>
          </div>

          {/* Username & Full Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Username (Login ID) *
              </label>
              <input
                type="text"
                required
                disabled={!!editingUser}
                value={formUsername}
                onChange={(e) => setFormUsername(e.target.value.toLowerCase().trim())}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none transition-colors ${
                  editingUser
                    ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
                    : 'bg-white text-slate-800 border-slate-200 focus:border-slate-300'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Full Legal Name *
              </label>
              <input
                type="text"
                required
                value={formFullName}
                onChange={(e) => setFormFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:border-slate-300 outline-none transition-colors"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>{editingUser ? 'Reset Password (Leave blank to keep current)' : 'Password *'}</span>
              <span className="text-[10px] text-slate-400 font-normal">Min 6 characters</span>
            </label>
            <div className="relative">
              <input
                type="password"
                required={!editingUser}
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:border-slate-300 outline-none transition-colors"
              />
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Contact Phone Number
            </label>
            <input
              type="text"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:border-slate-300 outline-none transition-colors"
            />
          </div>

          {/* Worker Specific Fields */}
          {formRole === 'WORKER' && (
            <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-4">
              <div className="flex items-center gap-2 text-amber-900 font-semibold text-xs border-b border-amber-200/60 pb-2">
                <Wrench className="w-4 h-4 text-amber-700" />
                <span>Shop Floor Compensation & ID</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-amber-900 mb-1">
                    Employee ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={formEmployeeId}
                    onChange={(e) => setFormEmployeeId(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-xl border border-amber-200 text-xs bg-white text-slate-800 outline-none focus:border-amber-500 font-mono font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-amber-900 mb-1">
                    Base Salary (₹ / 26-Day Month)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={formMonthlySalary}
                    onChange={(e) => setFormMonthlySalary(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-amber-200 text-xs bg-white text-slate-800 outline-none focus:border-amber-500 font-normal"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-amber-900 mb-1">
                    Overtime Rate (₹ / Hour)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={formOvertimeRate}
                    onChange={(e) => setFormOvertimeRate(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-amber-200 text-xs bg-white text-slate-800 outline-none focus:border-amber-500 font-normal"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-amber-900 mb-1">
                    Extra Shift Allowance (₹ / Shift)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={formExtraShiftRate}
                    onChange={(e) => setFormExtraShiftRate(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-amber-200 text-xs bg-white text-slate-800 outline-none focus:border-amber-500 font-normal"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Active Status */}
          {editingUser && (
            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="formIsActive"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                className="w-4 h-4 rounded text-slate-900 focus:ring-0 border-slate-300"
              />
              <label htmlFor="formIsActive" className="text-xs font-medium text-slate-700 cursor-pointer">
                Account Active (Allowed to sign in)
              </label>
            </div>
          )}
        </form>
      </SlideOverDrawer>
    </div>
  );
};

export default UserManager;
