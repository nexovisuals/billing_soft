import React, { useState, useEffect } from 'react';
import { CustomSelect } from './CustomSelect';
import { X } from 'lucide-react';

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
      onChange('');
    } else {
      setIsTypingCustom(false);
      onChange(selected);
    }
  };

  if (isTypingCustom) {
    return (
      <div className={`relative flex items-center ${className}`}>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
          placeholder="Enter custom unit..."
          className="w-full pl-3.5 pr-9 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:border-slate-300 outline-none"
        />
        <button
          type="button"
          onClick={() => {
            setIsTypingCustom(false);
            onChange('');
          }}
          title="Cancel and choose from list"
          className="absolute right-2 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
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
