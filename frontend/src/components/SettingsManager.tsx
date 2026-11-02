import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  Receipt,
  Landmark,
  Clock,
  Save,
  CheckCircle2,
  RotateCcw,
  ShieldCheck
} from 'lucide-react';
import { UserSession } from '../types';

interface SettingsManagerProps {
  session: UserSession;
}

interface WorkshopSettings {
  // Workshop Profile
  workshopName: string;
  tradeName: string;
  gstin: string;
  address: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  phoneNumber: string;
  email: string;

  // Billing Rules
  defaultSacCode: string;
  defaultGstRate: string;
  invoicePrefix: string;
  startingDcNumber: string;

  // Bank Details for Invoices
  bankName: string;
  branchName: string;
  accountNumber: string;
  ifscCode: string;

  // Workshop Shift & Payroll Policies
  salaryMonthDays: string;
  standardShiftHours: string;
  negativeStockEnforced: boolean;
}

const DEFAULT_SETTINGS: WorkshopSettings = {
  workshopName: 'Shri Varshini Technologies',
  tradeName: 'SVT CNC Machining Works',
  gstin: '33AGSFS0004K1Z8',
  address: '3/176, SF No 372/2, Saravanampatti to Thudiyalur Road, Vellakinar Village',
  city: 'Saravanampatti, Coimbatore',
  state: 'Tamil Nadu',
  stateCode: '33',
  pincode: '641035',
  phoneNumber: '98422 66085',
  email: 'shrivarshinitech@gmail.com',

  defaultSacCode: '998898',
  defaultGstRate: '18.0',
  invoicePrefix: '2026-27',
  startingDcNumber: '368',

  bankName: 'Axis Bank',
  branchName: 'Saravanampatti Branch, Coimbatore',
  accountNumber: '376700060000060',
  ifscCode: 'UTIB0000376',

  salaryMonthDays: '26',
  standardShiftHours: '8.0',
  negativeStockEnforced: true,
};

export default function SettingsManager({ }: SettingsManagerProps) {
  const [settings, setSettings] = useState<WorkshopSettings>(DEFAULT_SETTINGS);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('svt_workshop_settings');
    if (saved) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
      } catch (e) {
        // use defaults
      }
    }
  }, []);

  const handleChange = (field: keyof WorkshopSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setSavedSuccess(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('svt_workshop_settings', JSON.stringify(settings));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  const handleReset = () => {
    if (window.confirm('Reset all workshop settings to default values?')) {
      setSettings(DEFAULT_SETTINGS);
      localStorage.setItem('svt_workshop_settings', JSON.stringify(DEFAULT_SETTINGS));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Workshop & Billing Settings</h2>
          <p className="text-xs text-slate-500 font-normal mt-0.5">
            Configure company details, GST presets, bank details for bill printing, and payroll rules
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 text-xs font-medium active:scale-95 transition-all whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 hover:bg-slate-50 hover:border-slate-400 text-xs font-semibold active:scale-95 transition-all shadow-2xs whitespace-nowrap"
          >
            <Save className="w-3.5 h-3.5 text-slate-800" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Settings saved successfully. Invoices and Delivery Challans will reflect these updated presets.</span>
        </motion.div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Workshop & GST Profile */}
        <div className="p-6 rounded-3xl border border-slate-200 bg-white shadow-subtle space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Workshop & Business Profile</h3>
              <p className="text-[11px] text-slate-500 font-normal">Legal name and address printed on invoice letterheads</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Workshop Legal Name</label>
              <input
                type="text"
                value={settings.workshopName}
                onChange={(e) => handleChange('workshopName', e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:border-slate-400 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Trade / Display Name</label>
              <input
                type="text"
                value={settings.tradeName}
                onChange={(e) => handleChange('tradeName', e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:border-slate-400 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">GSTIN Number</label>
              <input
                type="text"
                value={settings.gstin}
                onChange={(e) => handleChange('gstin', e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 font-mono font-semibold focus:border-slate-400 outline-none"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-medium text-slate-700">Workshop Address</label>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => handleChange('address', e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:border-slate-400 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">City / Location</label>
              <input
                type="text"
                value={settings.city}
                onChange={(e) => handleChange('city', e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:border-slate-400 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">State & State Code</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={settings.state}
                  onChange={(e) => handleChange('state', e.target.value)}
                  className="w-3/4 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:border-slate-400 outline-none"
                />
                <input
                  type="text"
                  value={settings.stateCode}
                  onChange={(e) => handleChange('stateCode', e.target.value)}
                  className="w-1/4 px-2 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 text-center font-mono font-semibold focus:border-slate-400 outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Contact Phone Number</label>
              <input
                type="text"
                value={settings.phoneNumber}
                onChange={(e) => handleChange('phoneNumber', e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:border-slate-400 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Official Email</label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:border-slate-400 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Billing & Tax Presets */}
        <div className="p-6 rounded-3xl border border-slate-200 bg-white shadow-subtle space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Billing & GST Rules</h3>
              <p className="text-[11px] text-slate-500 font-normal">Continuous number sequences and SAC presets</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Default Job Work SAC</label>
              <input
                type="text"
                value={settings.defaultSacCode}
                onChange={(e) => handleChange('defaultSacCode', e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 font-mono font-semibold focus:border-slate-400 outline-none"
              />
              <p className="text-[10px] text-slate-400">998898: CNC Machining</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Default GST Rate (%)</label>
              <input
                type="text"
                value={settings.defaultGstRate}
                onChange={(e) => handleChange('defaultGstRate', e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 font-semibold focus:border-slate-400 outline-none"
              />
              <p className="text-[10px] text-slate-400">18% (9% CGST + 9% SGST)</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Invoice FY Format</label>
              <input
                type="text"
                value={settings.invoicePrefix}
                onChange={(e) => handleChange('invoicePrefix', e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 font-mono focus:border-slate-400 outline-none"
              />
              <p className="text-[10px] text-slate-400">Continuous: 069/2026-27</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Starting DC Sequence</label>
              <input
                type="text"
                value={settings.startingDcNumber}
                onChange={(e) => handleChange('startingDcNumber', e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 font-mono focus:border-slate-400 outline-none"
              />
              <p className="text-[10px] text-slate-400">Starts sequence from #368</p>
            </div>
          </div>
        </div>

        {/* Section 3: Bank Details for Bill Printing */}
        <div className="p-6 rounded-3xl border border-slate-200 bg-white shadow-subtle space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 flex items-center justify-center">
              <Landmark className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Bank Details for Invoices</h3>
              <p className="text-[11px] text-slate-500 font-normal">Customer remittance bank information printed on tax invoice footers</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Bank Name</label>
              <input
                type="text"
                value={settings.bankName}
                onChange={(e) => handleChange('bankName', e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:border-slate-400 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Branch Name</label>
              <input
                type="text"
                value={settings.branchName}
                onChange={(e) => handleChange('branchName', e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:border-slate-400 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Current Account Number</label>
              <input
                type="text"
                value={settings.accountNumber}
                onChange={(e) => handleChange('accountNumber', e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 font-mono font-semibold focus:border-slate-400 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">IFSC Code</label>
              <input
                type="text"
                value={settings.ifscCode}
                onChange={(e) => handleChange('ifscCode', e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 font-mono font-semibold focus:border-slate-400 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Workshop Shift & Stock Policies */}
        <div className="p-6 rounded-3xl border border-slate-200 bg-white shadow-subtle space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Shift & Stock Control Policies</h3>
              <p className="text-[11px] text-slate-500 font-normal">Standard 26-day basis and customer raw material protection</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Standard Working Month Days</label>
              <input
                type="number"
                value={settings.salaryMonthDays}
                onChange={(e) => handleChange('salaryMonthDays', e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 font-semibold focus:border-slate-400 outline-none"
              />
              <p className="text-[10px] text-slate-400">Daily wage rate: Base / 26 days</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Standard Daily Shift Hours</label>
              <input
                type="text"
                value={settings.standardShiftHours}
                onChange={(e) => handleChange('standardShiftHours', e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 font-semibold focus:border-slate-400 outline-none"
              />
              <p className="text-[10px] text-slate-400">Regular shift duration: 8.0 hrs</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Negative Stock Protection</label>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="negStock"
                  checked={settings.negativeStockEnforced}
                  onChange={(e) => handleChange('negativeStockEnforced', e.target.checked)}
                  className="w-4 h-4 rounded text-slate-900 border-slate-300 focus:ring-0"
                />
                <label htmlFor="negStock" className="text-xs text-slate-800 font-medium cursor-pointer flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Strictly Enforce Stock Limits</span>
                </label>
              </div>
              <p className="text-[10px] text-slate-400">Prevents dispatching more raw stock than inward</p>
            </div>
          </div>
        </div>

        {/* Bottom Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 hover:bg-slate-50 hover:border-slate-400 text-xs font-semibold active:scale-95 transition-all shadow-2xs whitespace-nowrap"
          >
            <Save className="w-4 h-4 text-slate-800" />
            <span>Save All Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
}

