import { API_BASE_URL } from '../config';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { UserSession } from '../types';
import SlideOverDrawer from './common/SlideOverDrawer';

interface Company {
  id: string;
  name: string;
  address: string;
  gstin?: string | null;
  contactPerson?: string | null;
  phoneNumber?: string | null;
  emailAddress?: string | null;
  isActive: boolean;
  _count?: {
    challans: number;
    invoices: number;
    receipts: number;
  };
}

interface CompanyManagerProps {
  session: UserSession;
}

export default function CompanyManager({ session }: CompanyManagerProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    gstin: '',
    contactPerson: '',
    phoneNumber: '',
    emailAddress: '',
    openingBalance: 0,
    isActive: true,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/companies`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const data = await res.json();
      if (res.ok && data.companies) {
        setCompanies(data.companies);
      }
    } catch (err) {
      console.error('Failed to fetch companies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const openAddModal = () => {
    setEditingCompany(null);
    setFormData({
      name: '',
      address: '',
      gstin: '',
      contactPerson: '',
      phoneNumber: '',
      emailAddress: '',
      openingBalance: 0,
      isActive: true,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      address: company.address,
      gstin: company.gstin || '',
      contactPerson: company.contactPerson || '',
      phoneNumber: company.phoneNumber || '',
      emailAddress: company.emailAddress || '',
      openingBalance: 0,
      isActive: company.isActive,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.address.trim()) {
      setFormError('Company name and registered address are required.');
      return;
    }

    try {
      setFormError(null);
      const url = editingCompany
        ? `${API_BASE_URL}/api/companies/${editingCompany.id}`
        : `${API_BASE_URL}/api/companies`;
      const method = editingCompany ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save company');
      }

      setNotification({
        type: 'success',
        message: editingCompany ? 'Company updated successfully!' : 'Company registered successfully!',
      });
      setTimeout(() => setNotification(null), 3500);

      setModalOpen(false);
      fetchCompanies();
    } catch (err: any) {
      setFormError(err.message || 'Operation failed');
    }
  };

  const handleDelete = async (company: Company) => {
    const confirmMsg = company._count && (company._count.challans > 0 || company._count.invoices > 0)
      ? `This company has existing Delivery Challans or Invoices. It will be marked Inactive. Continue?`
      : `Are you sure you want to delete ${company.name}?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/companies/${company.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setNotification({ type: 'success', message: data.message });
        setTimeout(() => setNotification(null), 3500);
        fetchCompanies();
      } else {
        alert(data.error || 'Delete failed');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredCompanies = companies.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.gstin && c.gstin.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.contactPerson && c.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()));

    if (statusFilter === 'active') return matchesSearch && c.isActive;
    if (statusFilter === 'inactive') return matchesSearch && !c.isActive;
    return matchesSearch;
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
            className={`p-4 rounded-2xl border text-xs font-medium flex items-center justify-between ${
              notification.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600" />
              )}
              <span>{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600 whitespace-nowrap">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header & Action Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-base font-semibold text-slate-900 tracking-tight">Customer Companies</h2>
          <p className="text-xs text-slate-500 font-normal">
            Clients providing raw materials for CNC machining & consolidated billing
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-slate-300 text-slate-900 text-xs font-semibold hover:bg-slate-50 hover:border-slate-400 active:scale-[0.99] transition-all shadow-2xs whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Add Company</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="p-4 rounded-3xl border border-slate-200 bg-white shadow-subtle flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 text-xs w-full sm:w-80 focus-within:border-slate-400 focus-within:bg-white transition-all">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by company name, GSTIN..."
            className="bg-transparent border-none outline-none w-full placeholder:text-slate-400 font-normal"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {(['all', 'active', 'inactive'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all capitalize ${
                statusFilter === filter
                  ? 'bg-slate-100 border border-slate-300 text-slate-900 font-semibold shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
              } whitespace-nowrap`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Companies Table / Card Stack */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-400 font-medium">
                <th className="py-3.5 px-6 font-medium whitespace-nowrap text-left">COMPANY NAME</th>
                <th className="py-3.5 px-4 font-medium whitespace-nowrap text-left">GSTIN</th>
                <th className="py-3.5 px-4 font-medium whitespace-nowrap text-left">CONTACT DETAILS</th>
                <th className="py-3.5 px-4 font-medium whitespace-nowrap text-left">ACTIVITY STATS</th>
                <th className="py-3.5 px-4 font-medium whitespace-nowrap text-left">STATUS</th>
                <th className="py-3.5 px-6 text-left font-medium whitespace-nowrap">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 whitespace-nowrap">
                    Loading registered companies...
                  </td>
                </tr>
              ) : filteredCompanies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 whitespace-nowrap">
                    No customer companies match your filter.
                  </td>
                </tr>
              ) : (
                filteredCompanies.map((company) => (
                  <tr key={company.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Name & Address */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0 mt-0.5">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 text-xs">{company.name}</div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 font-normal mt-0.5 line-clamp-1 max-w-sm">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span>{company.address}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* GSTIN */}
                    <td className="py-4 px-4 font-medium text-slate-700 whitespace-nowrap">
                      {company.gstin ? (
                        <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          {company.gstin}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">Not Provided</span>
                      )}
                    </td>

                    {/* Contact Person & Phone */}
                    <td className="py-4 px-4 text-slate-600 whitespace-nowrap">
                      {company.contactPerson && (
                        <div className="font-medium text-slate-800">{company.contactPerson}</div>
                      )}
                      {company.phoneNumber && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                          <Phone className="w-3 h-3" />
                          <span>{company.phoneNumber}</span>
                        </div>
                      )}
                    </td>

                    {/* Stats (Challans & Invoices) */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                          {company._count?.challans || 0} DCs
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                          {company._count?.invoices || 0} Invoices
                        </span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                          company.isActive
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            company.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        {company.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-left whitespace-nowrap">
                      {session.role === 'ADMIN' ? (
                        <div className="flex items-center justify-start gap-1">
                          <button
                            onClick={() => openEditModal(company)}
                            title="Edit Company Details"
                            className="w-7 h-7 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors whitespace-nowrap"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(company)}
                            title="Delete / Deactivate"
                            className="w-7 h-7 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors whitespace-nowrap"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">View Only</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between text-xs text-slate-500">
          <span>Total {filteredCompanies.length} companies listed</span>
          <span className="font-medium text-slate-700">Company-wise Material Ledger Enabled</span>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* ADD / EDIT COMPANY SLIDE-OVER DRAWER                         */}
      {/* ──────────────────────────────────────────────────────────── */}
      <SlideOverDrawer
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCompany ? 'Edit Customer Company' : 'Register New Customer Company'}
        subtitle="Enter billing and GST details for Challans and Invoices"
        footer={
          <>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="company-form"
              className="px-5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-semibold hover:bg-slate-50 hover:border-slate-400 active:scale-95 transition-all shadow-2xs whitespace-nowrap"
            >
              {editingCompany ? 'Save Changes' : 'Register Company'}
            </button>
          </>
        }
      >
        {formError && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form id="company-form" onSubmit={handleFormSubmit} className="space-y-4">
          {/* Company Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Company Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 outline-none focus:border-slate-300 font-semibold"
            />
          </div>

          {/* Company Address */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Registered / Billing Address *</label>
            <textarea
              required
              rows={3}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 outline-none focus:border-slate-300"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* GSTIN */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">GSTIN / UIN</label>
              <input
                type="text"
                maxLength={15}
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 font-mono outline-none focus:border-slate-300"
              />
            </div>

            {/* Contact Person */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Contact Person</label>
              <input
                type="text"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 outline-none focus:border-slate-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Phone Number</label>
              <input
                type="text"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 outline-none focus:border-slate-300"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Email Address</label>
              <input
                type="email"
                value={formData.emailAddress}
                onChange={(e) => setFormData({ ...formData, emailAddress: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 outline-none focus:border-slate-300"
              />
            </div>
          </div>

          {/* Status Toggle */}
          <div className="pt-2 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-900">Active Customer Status</div>
              <div className="text-[11px] text-slate-400">Available for Delivery Challans and Invoicing</div>
            </div>
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 rounded text-slate-900 border-slate-300 focus:ring-0"
            />
          </div>
        </form>
      </SlideOverDrawer>
    </div>
  );
}
