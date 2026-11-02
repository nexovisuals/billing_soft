import React, { useState, useEffect } from 'react';
import { CustomSelect } from './CustomSelect';
import { Check, X } from 'lucide-react';

interface CustomUnitSelectProps {
  value: string;
  onChange: (unit: string) => void;
  placeholder?: string;
  className?: string;
}

const STANDARD_UNITS = [
  { value: 'kg', label: 'kg (Kilograms)' },
  { value: 'nos', label: 'nos (Numbers)' },
  { value: 'pcs', label: 'pcs (Pieces)' },
  { value: 'sets', label: 'sets (Sets)' },
  { value: 'meters', label: 'meters (Meters)' },
  { value: 'tonnes', label: 'tonnes (Tonnes)' },
  { value: 'OTHERS', label: '+ Others (Type Custom Unit...)' },
];

export const CustomUnitSelect: React.FC<CustomUnitSelectProps> = ({
  value,
  onChange,
  placeholder = '-- Select Unit --',
  className = '',
}) => {
  const isCustom = Boolean(
    value && !STANDARD_UNITS.some((u) => u.value.toLowerCase() === value.toLowerCase() && u.value !== 'OTHERS')
  );

  const [isTypingCustom, setIsTypingCustom] = useState(isCustom);
  const [customInput, setCustomInput] = useState(isCustom ? value : '');

  useEffect(() => {
    if (isCustom) {
      setIsTypingCustom(true);
      setCustomInput(value);
    }
  }, [value, isCustom]);

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
    if (customInput.trim()) {
      onChange(customInput.trim().toLowerCase());
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
          className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 font-normal focus:border-slate-400 outline-none shadow-xs"
        />
        <button
          type="button"
          onClick={handleConfirmCustom}
          disabled={!customInput.trim()}
          title="Confirm Unit"
          className="px-2.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 disabled:opacity-40 transition-colors shrink-0 flex items-center gap-1"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Set</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setIsTypingCustom(false);
            if (isCustom) {
              onChange('');
            }
          }}
          title="Cancel custom unit"
          className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // Ensure current value is displayed even if it was previously entered as a custom unit
  const optionsWithCustom = isCustom && value
    ? [{ value, label: `${value} (Custom)` }, ...STANDARD_UNITS]
    : STANDARD_UNITS;

  return (
    <CustomSelect
      value={value}
      onChange={handleSelectChange}
      options={optionsWithCustom}
      placeholder={placeholder}
      className={className}
      searchable={false}
    />
  );
};

export default CustomUnitSelect;
