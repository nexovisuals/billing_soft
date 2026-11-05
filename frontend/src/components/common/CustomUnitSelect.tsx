import React, { useState, useEffect } from 'react';
import { CustomSelect } from './CustomSelect';
import { Check, X } from 'lucide-react';

interface CustomUnitSelectProps {
  value: string;
  onChange: (unit: string) => void;
  placeholder?: string;
  className?: string;
}

const STORAGE_KEY_CUSTOM_UNITS = 'svt_custom_units';

export const getSavedCustomUnits = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_UNITS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveCustomUnit = (unit: string) => {
  if (!unit || !unit.trim()) return;
  const clean = unit.trim().toLowerCase();
  const defaults = ['kg', 'nos', 'pcs', 'sets', 'meters', 'tonnes', 'others'];
  if (defaults.includes(clean)) return;
  try {
    const existing = getSavedCustomUnits();
    if (!existing.some((u) => u.toLowerCase() === clean)) {
      const updated = [...existing, clean];
      localStorage.setItem(STORAGE_KEY_CUSTOM_UNITS, JSON.stringify(updated));
      window.dispatchEvent(new Event('svt_custom_units_updated'));
    }
  } catch (e) {
    console.error('Failed to save custom unit', e);
  }
};

const DEFAULT_UNITS = [
  { value: 'kg', label: 'kg' },
  { value: 'nos', label: 'nos' },
  { value: 'pcs', label: 'pcs' },
  { value: 'sets', label: 'sets' },
  { value: 'meters', label: 'meters' },
  { value: 'tonnes', label: 'tonnes' },
];

export const CustomUnitSelect: React.FC<CustomUnitSelectProps> = ({
  value,
  onChange,
  placeholder = '-- Select Unit --',
  className = '',
}) => {
  const [savedUnits, setSavedUnits] = useState<string[]>(() => getSavedCustomUnits());
  const [isTypingCustom, setIsTypingCustom] = useState(false);
  const [customInput, setCustomInput] = useState('');

  // Sync custom units from other components or updates
  useEffect(() => {
    const handleUpdate = () => {
      setSavedUnits(getSavedCustomUnits());
    };
    window.addEventListener('svt_custom_units_updated', handleUpdate);
    return () => window.removeEventListener('svt_custom_units_updated', handleUpdate);
  }, []);

  const handleSelectChange = (selected: string) => {
    if (selected === 'OTHERS') {
      setIsTypingCustom(true);
      setCustomInput('');
    } else {
      setIsTypingCustom(false);
      onChange(selected);
    }
  };

  const handleConfirmCustom = () => {
    const clean = customInput.trim().toLowerCase();
    if (clean) {
      saveCustomUnit(clean);
      setSavedUnits(getSavedCustomUnits());
      setIsTypingCustom(false);
      onChange(clean);
    }
  };

  if (isTypingCustom) {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <input
          type="text"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleConfirmCustom();
            }
          }}
          autoFocus
          placeholder="Type custom unit..."
          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 font-normal focus:border-slate-400 outline-none shadow-xs"
        />
        <button
          type="button"
          onClick={handleConfirmCustom}
          disabled={!customInput.trim()}
          title="Save Unit"
          className="px-2.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 disabled:opacity-40 transition-colors shrink-0 flex items-center gap-1"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Save</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setIsTypingCustom(false);
            setCustomInput('');
            onChange('');
          }}
          title="Cancel and choose from list"
          className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // Combine default units + saved custom units (without any duplicates)
  const isDefault = DEFAULT_UNITS.some((u) => u.value.toLowerCase() === (value || '').toLowerCase());
  const isSavedCustom = savedUnits.some((u) => u.toLowerCase() === (value || '').toLowerCase());
  const isAdhocCustom = Boolean(value && !isDefault && !isSavedCustom && value !== 'OTHERS');

  const customOptions = savedUnits
    .filter((u) => !DEFAULT_UNITS.some((d) => d.value.toLowerCase() === u.toLowerCase()))
    .map((u) => ({ value: u, label: u }));

  const adhocOption = isAdhocCustom ? [{ value, label: value }] : [];

  const combinedOptions = [
    ...DEFAULT_UNITS,
    ...customOptions,
    ...adhocOption,
    { value: 'OTHERS', label: 'Others' },
  ];

  return (
    <CustomSelect
      value={value}
      onChange={handleSelectChange}
      options={combinedOptions}
      placeholder={placeholder}
      className={className}
      searchable={false}
    />
  );
};

export default CustomUnitSelect;
