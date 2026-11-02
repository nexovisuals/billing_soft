import { API_BASE_URL } from '../config';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Boxes,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  FileCode,
  Tag,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { UserSession } from '../types';
import SlideOverDrawer from './common/SlideOverDrawer';
import CustomUnitSelect from './common/CustomUnitSelect';

interface Material {
  id: string;
  productName: string;
  drawingNumber?: string | null;
  partNumber?: string | null;
  description?: string | null;
  rate: string | number;
  uom: string;
  hsnSacCode: string;
  gstRate: string | number;
  isActive: boolean;
  _count?: {
    dcItems: number;
    invoiceItems: number;
    dailyWork: number;
  };
}

interface MaterialManagerProps {
  session: UserSession;
}

export default function MaterialManager({ session }: MaterialManagerProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    productName: string;
    drawingNumber: string;
    partNumber: string;
    description: string;
    rate: number | '';
    uom: string;
    hsnSacCode: string;
    gstRate: number | '';
    isActive: boolean;
  }>({
    productName: '',
    drawingNumber: '',
    partNumber: '',
    description: '',
    rate: '',
    uom: '',
    hsnSacCode: '',
    gstRate: 18.0,
    isActive: true,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/materials`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const data = await res.json();
      if (res.ok && data.materials) {
        setMaterials(data.materials);
      }
    } catch (err) {
      console.error('Failed to fetch materials:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const openAddModal = () => {
    setEditingMaterial(null);
    setFormData({
      productName: '',
      drawingNumber: '',
      partNumber: '',
      description: '',
      rate: '',
      uom: '',
      hsnSacCode: '',
      gstRate: 18.0,
      isActive: true,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (material: Material) => {
    setEditingMaterial(material);
    setFormData({
      productName: material.productName,
      drawingNumber: material.drawingNumber || '',
      partNumber: material.partNumber || '',
      description: material.description || '',
      rate: material.rate !== undefined && material.rate !== null && material.rate !== '' ? Number(material.rate) : '',
      uom: material.uom || '',
      hsnSacCode: material.hsnSacCode || '',
      gstRate: material.gstRate !== undefined && material.gstRate !== null && material.gstRate !== '' ? Number(material.gstRate) : 18.0,
      isActive: material.isActive,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productName.trim()) {
      setFormError('Product / component name is required.');
      return;
    }

    try {
      setFormError(null);
      const url = editingMaterial
        ? `${API_BASE_URL}/api/materials/${editingMaterial.id}`
        : `${API_BASE_URL}/api/materials`;
      const method = editingMaterial ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          ...formData,
          rate: formData.rate === '' ? 0 : Number(formData.rate),
          gstRate: formData.gstRate === '' ? 18.0 : Number(formData.gstRate),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save material');
      }

      setNotification({
        type: 'success',
        message: editingMaterial ? 'Part updated successfully!' : 'Part registered successfully!',
      });
      setTimeout(() => setNotification(null), 3500);

      setModalOpen(false);
      fetchMaterials();
    } catch (err: any) {
      setFormError(err.message || 'Operation failed');
    }
  };

  const handleDelete = async (material: Material) => {
    const confirmMsg = material._count && (material._count.dcItems > 0 || material._count.invoiceItems > 0)
      ? `This part is referenced in existing Delivery Challans or Invoices. It will be marked Inactive. Continue?`
      : `Are you sure you want to delete ${material.productName}?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/materials/${material.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setNotification({ type: 'success', message: data.message });
        setTimeout(() => setNotification(null), 3500);
        fetchMaterials();
      } else {
        alert(data.error || 'Delete failed');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredMaterials = materials.filter((m) => {
    const matchesSearch =
      m.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.partNumber && m.partNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (m.drawingNumber && m.drawingNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    if (statusFilter === 'active') return matchesSearch && m.isActive;
    if (statusFilter === 'inactive') return matchesSearch && !m.isActive;
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
          <h2 className="text-base font-semibold text-slate-900 tracking-tight">Products & Machining Parts</h2>
          <p className="text-xs text-slate-500 font-normal">
            Component catalog with drawing numbers, default rates, and GST SAC 998898 pre-sets
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-slate-300 text-slate-900 text-xs font-semibold hover:bg-slate-50 hover:border-slate-400 active:scale-[0.99] transition-all shadow-2xs whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Add Part / Material</span>
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
            placeholder="Search part name, part number, drawing..."
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

      {/* Materials Table */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-400 font-medium">
                <th className="py-3.5 px-6 font-medium whitespace-nowrap text-left">PRODUCT & PART NO</th>
                <th className="py-3.5 px-4 font-medium whitespace-nowrap text-left">DRAWING NO</th>
                <th className="py-3.5 px-4 font-medium whitespace-nowrap text-left">MACHINING RATE</th>
                <th className="py-3.5 px-4 font-medium whitespace-nowrap text-left">TAXATION (SAC / GST)</th>
                <th className="py-3.5 px-4 font-medium whitespace-nowrap text-left">STATUS</th>
                <th className="py-3.5 px-6 text-left font-medium whitespace-nowrap">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 whitespace-nowrap">
                    Loading components catalog...
                  </td>
                </tr>
              ) : filteredMaterials.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 whitespace-nowrap">
                    No components match your search.
                  </td>
                </tr>
              ) : (
                filteredMaterials.map((mat) => (
                  <tr key={mat.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Name & Part Number */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0 mt-0.5">
                          <Boxes className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 text-xs">{mat.productName}</div>
                          {mat.partNumber && (
                            <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono mt-0.5">
                              <Tag className="w-3 h-3 text-slate-400" />
                              <span>Part: {mat.partNumber}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Drawing Number */}
                    <td className="py-4 px-4 font-medium text-slate-700 whitespace-nowrap">
                      {mat.drawingNumber ? (
                        <div className="flex items-center gap-1 font-mono text-[11px] text-slate-800">
                          <FileCode className="w-3.5 h-3.5 text-slate-400" />
                          <span>{mat.drawingNumber}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">-</span>
                      )}
                    </td>

                    {/* Rate & UOM */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-900 text-xs">
                        ₹{Number(mat.rate).toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase font-medium">per {mat.uom}</div>
                    </td>

                    {/* SAC & GST */}
                    <td className="py-4 px-4 text-slate-600 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-[11px]">
                        <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">
                          SAC {mat.hsnSacCode}
                        </span>
                        <span className="text-emerald-700 font-medium">@{mat.gstRate}% GST</span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                          mat.isActive
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            mat.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        {mat.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-left whitespace-nowrap">
                      {session.role === 'ADMIN' ? (
                        <div className="flex items-center justify-start gap-1">
                          <button
                            onClick={() => openEditModal(mat)}
                            title="Edit Part Details"
                            className="w-7 h-7 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors whitespace-nowrap"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(mat)}
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
          <span>Total {filteredMaterials.length} components listed</span>
          <span className="font-medium text-slate-700">Pre-configured SAC 998898 (CNC Job Work)</span>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* ADD / EDIT MATERIAL SLIDE-OVER DRAWER                        */}
      {/* ──────────────────────────────────────────────────────────── */}
      <SlideOverDrawer
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingMaterial ? 'Edit Component / Part' : 'Register New Component / Part'}
        subtitle="Pre-fills default rates, drawing numbers, and SAC for Invoices and DCs"
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
              form="material-form"
              className="px-5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-semibold hover:bg-slate-50 hover:border-slate-400 active:scale-95 transition-all shadow-2xs whitespace-nowrap"
            >
              {editingMaterial ? 'Save Changes' : 'Register Part'}
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

        <form id="material-form" onSubmit={handleFormSubmit} className="space-y-4">
          {/* Product Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Product / Component Name *</label>
            <input
              type="text"
              required
              value={formData.productName}
              onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 outline-none focus:border-slate-300 font-normal"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Drawing Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Engineering Drawing No</label>
              <input
                type="text"
                value={formData.drawingNumber}
                onChange={(e) => setFormData({ ...formData, drawingNumber: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 font-mono font-normal outline-none focus:border-slate-300"
              />
            </div>

            {/* Part Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Part Identification No</label>
              <input
                type="text"
                value={formData.partNumber}
                onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 font-mono font-normal outline-none focus:border-slate-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Default Rate */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Default Machining Rate (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.rate}
                onChange={(e) => setFormData({ ...formData, rate: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 font-normal outline-none focus:border-slate-300"
              />
            </div>

            {/* UOM with CustomUnitSelect */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Unit of Measurement (UOM)</label>
              <CustomUnitSelect
                value={formData.uom}
                onChange={(val) => setFormData({ ...formData, uom: val })}
                placeholder="-- Select Unit --"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* HSN/SAC */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">HSN/SAC Code</label>
              <input
                type="text"
                value={formData.hsnSacCode}
                onChange={(e) => setFormData({ ...formData, hsnSacCode: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 font-mono font-normal outline-none focus:border-slate-300"
              />
            </div>

            {/* GST Rate */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">GST Rate (%)</label>
              <input
                type="number"
                step="0.5"
                value={formData.gstRate}
                onChange={(e) => setFormData({ ...formData, gstRate: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 font-normal outline-none focus:border-slate-300"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Description (Optional)</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 outline-none focus:border-slate-300"
            />
          </div>

          {/* Status Toggle */}
          <div className="pt-2 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-900">Active Component</div>
              <div className="text-[11px] text-slate-400">Available in DC selection and Invoicing</div>
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

