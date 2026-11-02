import { API_BASE_URL } from '../config';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Truck,
  Plus,
  Search,
  Printer,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  Edit2
} from 'lucide-react';
import { UserSession } from '../types';
import DCPrintView, { DeliveryChallanData } from './DCPrintView';
import SlideOverDrawer from './common/SlideOverDrawer';
import CustomSelect from './common/CustomSelect';
import CustomUnitSelect from './common/CustomUnitSelect';
import CustomDatePicker from './common/CustomDatePicker';

interface DeliveryChallan extends DeliveryChallanData {
  companyId?: string;
  status: 'PENDING_INVOICING' | 'INVOICED' | 'CANCELLED';
  materialValue?: string | number | null;
  invoice?: {
    id: string;
    invoiceNumber: string;
    invoiceDate: string;
  } | null;
}

interface MaterialOption {
  id: string;
  productName: string;
  drawingNumber?: string | null;
  partNumber?: string | null;
  uom: string;
}

interface DeliveryChallanManagerProps {
  session: UserSession;
}

export default function DeliveryChallanManager({ session }: DeliveryChallanManagerProps) {
  const [dcs, setDcs] = useState<DeliveryChallan[]>([]);
  const [companies, setCompanies] = useState<Array<{ id: string; name: string; address: string; gstin?: string | null }>>([]);
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [nextDcNumber, setNextDcNumber] = useState<number | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING_INVOICING' | 'INVOICED' | 'CANCELLED'>('ALL');
  const [loading, setLoading] = useState(false);

  // Print view state
  const [selectedDcForPrint, setSelectedDcForPrint] = useState<DeliveryChallan | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDc, setEditingDc] = useState<DeliveryChallan | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    companyId: '',
    dcDate: new Date().toISOString().split('T')[0],
    yourOrderNo: '',
    yourOrderDate: '',
    ewayBillNumber: '',
    remarks: '',
    items: [
      {
        materialId: '',
        description: '',
        drawingNumber: '',
        partNumber: '',
        quantity: 1,
        uom: 'nos',
        remarks: '',
      },
    ],
  });

  useEffect(() => {
    fetchDcs();
    fetchMetadata();
  }, []);

  const fetchDcs = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/dcs`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const data = await res.json();
      if (res.ok && data.dcs) {
        setDcs(data.dcs);
      }
    } catch (err) {
      console.error('Failed to fetch DCs:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      // Companies
      const compRes = await fetch(`${API_BASE_URL}/api/companies`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const compData = await compRes.json();
      if (compRes.ok && compData.companies) {
        setCompanies(compData.companies);
      }

      // Materials
      const matRes = await fetch(`${API_BASE_URL}/api/materials`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const matData = await matRes.json();
      if (matRes.ok && matData.materials) {
        setMaterials(matData.materials);
      }

      // Next DC Number
      const nextRes = await fetch(`${API_BASE_URL}/api/dcs/next-number`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const nextData = await nextRes.json();
      if (nextRes.ok && nextData.nextDcNumber) {
        setNextDcNumber(nextData.nextDcNumber);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openCreateModal = () => {
    fetchMetadata();
    setEditingDc(null);
    setFormData({
      companyId: '',
      dcDate: new Date().toISOString().split('T')[0],
      yourOrderNo: '',
      yourOrderDate: '',
      ewayBillNumber: '',
      remarks: '',
      items: [
        {
          materialId: '',
          description: '',
          drawingNumber: '',
          partNumber: '',
          quantity: 1,
          uom: 'nos',
          remarks: '',
        },
      ],
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleMaterialSelect = (index: number, materialId: string) => {
    const selectedMat = materials.find((m) => m.id === materialId);
    if (!selectedMat) return;

    const newItems = [...formData.items];
    newItems[index] = {
      ...newItems[index],
      materialId: selectedMat.id,
      description: `${selectedMat.productName} - Part No: ${selectedMat.partNumber || selectedMat.productName}`,
      drawingNumber: selectedMat.drawingNumber || '',
      partNumber: selectedMat.partNumber || '',
      uom: selectedMat.uom || 'nos',
    };
    setFormData({ ...formData, items: newItems });
  };

  const addItemRow = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          materialId: '',
          description: '',
          drawingNumber: '',
          partNumber: '',
          quantity: 1,
          uom: 'nos',
          remarks: '',
        },
      ],
    });
  };

  const removeItemRow = (index: number) => {
    if (formData.items.length <= 1) return;
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const updateItemField = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const openEditModal = (dc: DeliveryChallan) => {
    setEditingDc(dc);
    setFormData({
      companyId: (dc as any).companyId || (dc.company as any)?.id || '',
      dcDate: dc.dcDate ? dc.dcDate.split('T')[0] : new Date().toISOString().split('T')[0],
      yourOrderNo: dc.yourOrderNo || '',
      yourOrderDate: dc.yourOrderDate ? dc.yourOrderDate.split('T')[0] : '',
      ewayBillNumber: dc.ewayBillNumber || '',
      remarks: dc.remarks || '',
      items: dc.items && dc.items.length > 0 ? dc.items.map((it: any) => ({
        materialId: it.materialId || '',
        description: it.description || '',
        drawingNumber: it.drawingNumber || '',
        partNumber: it.partNumber || '',
        quantity: it.quantity,
        uom: it.uom || 'nos',
        remarks: it.remarks || '',
      })) : [
        {
          materialId: '',
          description: '',
          drawingNumber: '',
          partNumber: '',
          quantity: 1,
          uom: 'nos',
          remarks: '',
        },
      ],
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyId) {
      setFormError('Please select a customer company');
      return;
    }

    if (formData.items.some((item) => !item.description || Number(item.quantity) <= 0)) {
      setFormError('Each item must have a description and valid quantity (> 0).');
      return;
    }

    try {
      setFormError(null);
      const url = editingDc
        ? `${API_BASE_URL}/api/dcs/${editingDc.id}`
        : `${API_BASE_URL}/api/dcs`;
      const method = editingDc ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          ...formData,
          items: formData.items.map((item) => ({
            ...item,
            quantity: Number(item.quantity),
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save Delivery Challan');
      }

      setNotification({
        type: 'success',
        message: data.message || `Delivery Challan ${editingDc ? 'updated' : 'generated'} successfully!`,
      });
      setTimeout(() => setNotification(null), 3500);

      setModalOpen(false);
      setEditingDc(null);
      fetchDcs();
      fetchMetadata();
    } catch (err: any) {
      setFormError(err.message || 'Operation failed');
    }
  };

  const handleCancelDc = async (dc: DeliveryChallan) => {
    if (dc.status === 'INVOICED') {
      alert(`Cannot cancel DC #${dc.dcNumber} because it is already invoiced.`);
      return;
    }

    const reason = window.prompt(`Enter reason for cancelling DC #${dc.dcNumber}:`);
    if (reason === null) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/dcs/${dc.id}/cancel`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotification({ type: 'success', message: data.message });
        setTimeout(() => setNotification(null), 3500);
        fetchDcs();
      } else {
        alert(data.error || 'Cancellation failed');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredDcs = dcs.filter((dc) => {
    const matchesSearch =
      `dc-${dc.dcNumber}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dc.company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (dc.yourOrderNo && dc.yourOrderNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
      dc.items.some((item) => item.description.toLowerCase().includes(searchTerm.toLowerCase()));

    if (statusFilter === 'ALL') return matchesSearch;
    return matchesSearch && dc.status === statusFilter;
  });

  const selectedCompany = companies.find((c) => c.id === formData.companyId);

  const pendingDcsCount = dcs.filter((d) => d.status === 'PENDING_INVOICING').length;
  const invoicedDcsCount = dcs.filter((d) => d.status === 'INVOICED').length;

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
          <h2 className="text-base font-semibold text-slate-900 tracking-tight">Delivery Challans (Dispatches)</h2>
          <p className="text-xs text-slate-500 font-normal">
            Generate continuous sequential delivery slips for finished parts dispatched to customer companies
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-slate-300 text-slate-900 text-xs font-semibold hover:bg-slate-50 hover:border-slate-400 active:scale-[0.99] transition-all shadow-2xs whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>New Delivery Challan</span>
        </button>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-6 rounded-3xl border border-slate-200 bg-white shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Challans Created</span>
            <span className="w-8 h-8 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700">
              <Truck className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-semibold text-slate-900 tracking-tight">{dcs.length} Challans</div>
            <div className="text-xs text-slate-500 font-normal mt-1">Continuous sequence starting from #368</div>
          </div>
        </div>

        <div className="p-6 rounded-3xl border border-slate-200 bg-white shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Pending Invoicing</span>
            <span className="w-8 h-8 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-semibold text-slate-900 tracking-tight">{pendingDcsCount} Ready</div>
            <div className="text-xs text-slate-500 font-normal mt-1">Available for consolidated monthly billing</div>
          </div>
        </div>

        <div className="p-6 rounded-3xl border border-slate-200 bg-white shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Invoiced Challans</span>
            <span className="w-8 h-8 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-semibold text-slate-900 tracking-tight">{invoicedDcsCount} Billed</div>
            <div className="text-xs text-slate-500 font-normal mt-1">Locked against duplicate invoicing</div>
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="p-4 rounded-3xl border border-slate-200 bg-white shadow-subtle flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 text-xs w-full sm:w-80 focus-within:border-slate-400 focus-within:bg-white transition-all">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search DC no, company, part..."
            className="bg-transparent border-none outline-none w-full placeholder:text-slate-400 font-normal"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto py-1">
          {(
            [
              { key: 'ALL', label: 'All Dispatches' },
              { key: 'PENDING_INVOICING', label: 'Pending Invoicing' },
              { key: 'INVOICED', label: 'Invoiced' },
              { key: 'CANCELLED', label: 'Cancelled' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                statusFilter === tab.key
                  ? 'bg-slate-100 border border-slate-300 text-slate-900 font-semibold shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
              } whitespace-nowrap`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Delivery Challans Table */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-400 font-medium">
                <th className="py-3.5 px-6 font-medium whitespace-nowrap text-left">DC NUMBER</th>
                <th className="py-3.5 px-4 font-medium whitespace-nowrap text-left">DATE</th>
                <th className="py-3.5 px-4 font-medium whitespace-nowrap text-left">CUSTOMER COMPANY</th>
                <th className="py-3.5 px-4 font-medium whitespace-nowrap text-left">DISPATCHED ITEMS & QTY</th>
                <th className="py-3.5 px-4 font-medium whitespace-nowrap text-left">ORDER REF</th>
                <th className="py-3.5 px-4 font-medium whitespace-nowrap text-left">INVOICE STATUS</th>
                <th className="py-3.5 px-6 text-left font-medium whitespace-nowrap">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 whitespace-nowrap">
                    Loading Delivery Challans...
                  </td>
                </tr>
              ) : filteredDcs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 whitespace-nowrap">
                    No Delivery Challans found. Click "+ New Delivery Challan" above.
                  </td>
                </tr>
              ) : (
                filteredDcs.map((dc) => (
                  <tr key={dc.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* DC Number */}
                    <td className="py-4 px-6 font-semibold text-slate-900 font-mono text-xs whitespace-nowrap">
                      DC - {dc.dcNumber}
                    </td>

                    {/* Date */}
                    <td className="py-4 px-4 text-slate-500 font-normal whitespace-nowrap">
                      {new Date(dc.dcDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    {/* Company */}
                    <td className="py-4 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      {dc.company.name}
                    </td>

                    {/* Items */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {dc.items.map((item, idx) => (
                          <div key={idx} className="text-slate-800">
                            <span className="font-semibold text-slate-900">
                              {Number(item.quantity).toLocaleString('en-IN')} {item.uom}
                            </span>
                            <span className="text-slate-500 ml-1.5">• {item.description}</span>
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* Order Ref */}
                    <td className="py-4 px-4 font-mono text-slate-600 whitespace-nowrap">
                      {dc.yourOrderNo || '-'}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                          dc.status === 'PENDING_INVOICING'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : dc.status === 'INVOICED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        {dc.status === 'PENDING_INVOICING' ? (
                          <>
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Pending Invoicing</span>
                          </>
                        ) : dc.status === 'INVOICED' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Invoiced {dc.invoice ? `(#${dc.invoice.invoiceNumber})` : ''}</span>
                          </>
                        ) : (
                          <span>Cancelled</span>
                        )}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-left whitespace-nowrap">
                      <div className="flex items-center justify-start gap-1.5">
                        <button
                          onClick={() => setSelectedDcForPrint(dc)}
                          title="Print / View Delivery Challan"
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-medium transition-colors whitespace-nowrap"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-500" />
                          <span>Print</span>
                        </button>

                        {session.role === 'ADMIN' && dc.status === 'PENDING_INVOICING' && (
                          <>
                            <button
                              onClick={() => openEditModal(dc)}
                              title="Edit Delivery Challan"
                              className="w-7 h-7 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors whitespace-nowrap"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleCancelDc(dc)}
                              title="Cancel / Delete Delivery Challan"
                              className="w-7 h-7 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors whitespace-nowrap"
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

        <div className="p-4 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {filteredDcs.length} Delivery Challans</span>
          <span className="font-medium text-slate-700">Next Available Serial: DC-{nextDcNumber || '...'}</span>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* PRINT VIEW MODAL                                             */}
      {/* ──────────────────────────────────────────────────────────── */}
      {selectedDcForPrint && (
        <DCPrintView dc={selectedDcForPrint} onClose={() => setSelectedDcForPrint(null)} />
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* CREATE DELIVERY CHALLAN SLIDE-OVER DRAWER                    */}
      {/* ──────────────────────────────────────────────────────────── */}
      <SlideOverDrawer
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingDc ? 'Edit Delivery Challan' : 'Create Delivery Challan'}
        subtitle={editingDc ? 'Update challan items, PO reference, or remarks' : 'Continuous sequential numbering starting from 1'}
        badge={editingDc ? `DC - ${editingDc.dcNumber}` : `DC - ${nextDcNumber || '...'}`}
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
              form="dc-form"
              className="px-5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-semibold hover:bg-slate-50 hover:border-slate-400 active:scale-95 transition-all shadow-2xs whitespace-nowrap"
            >
              {editingDc ? 'Update Delivery Challan' : 'Generate Delivery Challan'}
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

        <form id="dc-form" onSubmit={handleCreateSubmit} className="space-y-5">
          {/* Company & Date Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Customer Company *</label>
              <CustomSelect
                value={formData.companyId}
                onChange={(val) => setFormData({ ...formData, companyId: val })}
                options={companies.map((c) => ({
                  value: c.id,
                  label: c.name,
                  sublabel: c.gstin ? `GSTIN: ${c.gstin}` : undefined,
                }))}
                placeholder="-- Select Customer Company --"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Dispatch Date *</label>
              <CustomDatePicker
                value={formData.dcDate}
                onChange={(dateStr) => setFormData({ ...formData, dcDate: dateStr })}
                required
              />
            </div>
          </div>

          {/* Selected Company Preview Box */}
          {selectedCompany && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
              <div className="font-semibold text-slate-900">Consignee Billing Details:</div>
              <div>{selectedCompany.address}</div>
              {selectedCompany.gstin && (
                <div className="font-mono text-slate-800">GSTIN: {selectedCompany.gstin}</div>
              )}
            </div>
          )}

          {/* Customer Order No & E-Way Bill */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Customer Order No / PO Ref</label>
              <input
                type="text"
                value={formData.yourOrderNo}
                onChange={(e) => setFormData({ ...formData, yourOrderNo: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 font-mono outline-none focus:border-slate-300"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">E-Way Bill Number (Optional)</label>
              <input
                type="text"
                value={formData.ewayBillNumber}
                onChange={(e) => setFormData({ ...formData, ewayBillNumber: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 font-mono outline-none focus:border-slate-300"
              />
            </div>
          </div>

          {/* Dispatched Items Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Dispatched Parts / Components
              </label>
              <button
                type="button"
                onClick={addItemRow}
                className="flex items-center gap-1 text-xs font-semibold text-slate-900 hover:text-slate-700 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Another Part</span>
              </button>
            </div>

            {formData.items.map((item, index) => (
              <div
                key={index}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">
                    Item #{index + 1}
                  </span>
                  {formData.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItemRow(index)}
                      className="text-rose-500 hover:text-rose-700 text-xs font-semibold whitespace-nowrap"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {/* Part Selector Dropdown with CustomSelect */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-600">
                    Select from Parts Catalog (Optional)
                  </label>
                  <CustomSelect
                    value={item.materialId || ''}
                    onChange={(val) => handleMaterialSelect(index, val)}
                    options={[
                      { value: '', label: '-- Choose registered component or type below --' },
                      ...materials.map((m) => ({
                        value: m.id,
                        label: m.productName,
                        sublabel: m.partNumber ? `Part No: ${m.partNumber}` : undefined,
                      })),
                    ]}
                    placeholder="-- Choose registered component or type below --"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-600">
                    Description of Goods / Part Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={item.description}
                    onChange={(e) => updateItemField(index, 'description', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 font-normal outline-none focus:border-slate-300"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-600">Quantity *</label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      required
                      value={item.quantity}
                      onChange={(e) => updateItemField(index, 'quantity', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 font-normal outline-none focus:border-slate-300"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-600">Unit</label>
                    <CustomUnitSelect
                      value={item.uom}
                      onChange={(val) => updateItemField(index, 'uom', val)}
                      placeholder="-- Select Unit --"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-600">Item Remarks</label>
                    <input
                      type="text"
                      value={item.remarks || ''}
                      onChange={(e) => updateItemField(index, 'remarks', e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 outline-none focus:border-slate-300"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Overall Remarks */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">General Remarks / Delivery Notes</label>
            <input
              type="text"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 outline-none focus:border-slate-300"
            />
          </div>
        </form>
      </SlideOverDrawer>
    </div>
  );
}
