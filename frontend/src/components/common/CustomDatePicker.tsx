import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export interface CustomDatePickerProps {
  value: string; // ISO date format "YYYY-MM-DD"
  onChange: (dateStr: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const WEEKDAY_NAMES = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

// Helpers
function parseDateString(str: string): Date {
  if (!str) return new Date();
  const [y, m, d] = str.split('-').map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

function formatDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onChange,
  placeholder = 'Select date',
  disabled = false,
  className = '',
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Current view (month & year)
  const initialDate = value ? parseDateString(value) : new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());
  const [mode, setMode] = useState<'days' | 'months'>('days');

  // Synchronize view when value changes from outside
  useEffect(() => {
    if (value) {
      const d = parseDateString(value);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setMode('days');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Selected date info
  const selectedDate = value ? parseDateString(value) : null;
  const today = new Date();
  const todayStr = formatDateString(today);

  // Quick preset shortcuts (fast UX!)
  const handleQuickSelect = (offsetDays: number) => {
    const target = new Date();
    target.setDate(target.getDate() + offsetDays);
    const dateStr = formatDateString(target);
    onChange(dateStr);
    setViewYear(target.getFullYear());
    setViewMonth(target.getMonth());
    setIsOpen(false);
  };

  const handleFirstOfMonth = () => {
    const target = new Date(viewYear, viewMonth, 1);
    const dateStr = formatDateString(target);
    onChange(dateStr);
    setIsOpen(false);
  };

  // Month navigation
  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  // Build calendar matrix (Monday = 0, Sunday = 6)
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  let startingDayOfWeek = firstDayOfMonth.getDay() - 1; // 0 = Monday
  if (startingDayOfWeek === -1) startingDayOfWeek = 6; // Sunday becomes 6

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  // Calendar cells: 42 cells (6 rows of 7)
  const cells: Array<{ day: number; currentMonth: boolean; dateStr: string }> = [];

  // Previous month overflow days
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const prevMonthIdx = viewMonth === 0 ? 11 : viewMonth - 1;
    const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
    const dateStr = formatDateString(new Date(prevYear, prevMonthIdx, day));
    cells.push({ day, currentMonth: false, dateStr });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatDateString(new Date(viewYear, viewMonth, day));
    cells.push({ day, currentMonth: true, dateStr });
  }

  // Next month overflow days
  const remaining = 42 - cells.length;
  for (let day = 1; day <= remaining; day++) {
    const nextMonthIdx = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    const dateStr = formatDateString(new Date(nextYear, nextMonthIdx, day));
    cells.push({ day, currentMonth: false, dateStr });
  }

  // Display label formatting
  let displayLabel = placeholder;
  let weekdayLabel = '';
  if (selectedDate) {
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const month = MONTH_SHORT[selectedDate.getMonth()];
    const year = selectedDate.getFullYear();
    displayLabel = `${day} ${month} ${year}`;
    weekdayLabel = selectedDate.toLocaleDateString('en-IN', { weekday: 'short' });
  }

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            setMode('days');
          }
        }}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs transition-all text-left bg-white ${
          disabled
            ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
            : isOpen
            ? 'border-slate-300 text-slate-900 bg-white'
            : 'border-slate-200 hover:border-slate-300 text-slate-800'
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <span className={`truncate ${selectedDate ? 'font-medium text-slate-900' : 'text-slate-400'}`}>
            {displayLabel}
          </span>
          {weekdayLabel && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 font-normal">
              {weekdayLabel}
            </span>
          )}
        </div>
        <CalendarIcon className="w-4 h-4 text-slate-400 shrink-0" />
      </button>

      {/* Floating Date Picker Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-3 w-72 text-xs select-none"
          >
            {/* Quick Presets Bar (Fast 1-click dates for job work / billing) */}
            <div className="flex items-center gap-1.5 pb-2.5 mb-2 border-b border-slate-100">
              <button
                type="button"
                onClick={() => handleQuickSelect(0)}
                className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  value === todayStr
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelect(-1)}
                className="px-2 py-1 rounded-lg text-[11px] font-medium bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={handleFirstOfMonth}
                className="px-2 py-1 rounded-lg text-[11px] font-medium bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors"
              >
                1st of Month
              </button>
            </div>

            {/* Header: Month/Year navigation */}
            <div className="flex items-center justify-between mb-2 px-1">
              <button
                type="button"
                onClick={prevMonth}
                className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors"
                title="Previous Month"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {/* Click Month/Year to toggle fast Month Grid View */}
              <button
                type="button"
                onClick={() => setMode(mode === 'days' ? 'months' : 'days')}
                className="px-2.5 py-1 rounded-lg hover:bg-slate-100 text-xs font-semibold text-slate-900 transition-colors flex items-center gap-1"
                title="Click to jump month or year"
              >
                <span>{MONTH_NAMES[viewMonth]} {viewYear}</span>
                <span className="text-[10px] text-slate-400">▾</span>
              </button>

              <button
                type="button"
                onClick={nextMonth}
                className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors"
                title="Next Month"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Fast Month Selection Grid */}
            {mode === 'months' ? (
              <div className="py-2">
                {/* Year Controller */}
                <div className="flex items-center justify-between mb-2.5 px-2">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Select Month & Year
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setViewYear(y => y - 1)}
                      className="w-6 h-6 rounded border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 text-[10px]"
                    >
                      -1
                    </button>
                    <span className="font-semibold text-slate-900 px-1 text-xs">{viewYear}</span>
                    <button
                      type="button"
                      onClick={() => setViewYear(y => y + 1)}
                      className="w-6 h-6 rounded border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 text-[10px]"
                    >
                      +1
                    </button>
                  </div>
                </div>

                {/* 12 Months Grid */}
                <div className="grid grid-cols-3 gap-1.5">
                  {MONTH_SHORT.map((mShort, idx) => {
                    const isCurrent = idx === viewMonth;
                    return (
                      <button
                        key={mShort}
                        type="button"
                        onClick={() => {
                          setViewMonth(idx);
                          setMode('days');
                        }}
                        className={`py-2 rounded-xl text-xs font-medium transition-colors ${
                          isCurrent
                            ? 'bg-slate-900 text-white'
                            : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        {mShort}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Days Grid View */
              <div>
                {/* Weekday Header */}
                <div className="grid grid-cols-7 mb-1 text-center">
                  {WEEKDAY_NAMES.map((wd) => (
                    <div key={wd} className="text-[10px] font-semibold text-slate-400 py-1">
                      {wd}
                    </div>
                  ))}
                </div>

                {/* Days Cells */}
                <div className="grid grid-cols-7 gap-1">
                  {cells.map((cell, idx) => {
                    const isSelected = cell.dateStr === value;
                    const isToday = cell.dateStr === todayStr;

                    return (
                      <button
                        key={`${cell.dateStr}-${idx}`}
                        type="button"
                        onClick={() => {
                          onChange(cell.dateStr);
                          setIsOpen(false);
                        }}
                        className={`h-7 w-full rounded-lg text-xs font-medium transition-all flex items-center justify-center relative ${
                          isSelected
                            ? 'bg-slate-900 text-white shadow-2xs font-semibold'
                            : !cell.currentMonth
                            ? 'text-slate-300 hover:bg-slate-50'
                            : isToday
                            ? 'text-slate-900 font-semibold bg-slate-100 hover:bg-slate-200'
                            : 'text-slate-750 hover:bg-slate-100'
                        }`}
                      >
                        <span>{cell.day}</span>
                        {isToday && !isSelected && (
                          <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-slate-900" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bottom Footer Details */}
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>{value ? value : 'No date chosen'}</span>
              <button
                type="button"
                onClick={() => {
                  const now = formatDateString(new Date());
                  onChange(now);
                  setIsOpen(false);
                }}
                className="text-slate-700 hover:text-slate-950 font-medium flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Today</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden input to maintain form compatibility & validation */}
      {required && (
        <input
          type="text"
          value={value}
          required={required}
          readOnly
          className="sr-only"
          tabIndex={-1}
        />
      )}
    </div>
  );
};

export default CustomDatePicker;

