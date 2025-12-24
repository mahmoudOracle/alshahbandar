import React, { useEffect, useRef, useState } from 'react';

interface Props {
  label?: string;
  name?: string;
  value?: string; // expected to be ISO date: YYYY-MM-DD or empty
  onChange?: (e: { target: { name?: string; value: string } }) => void;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  placeholder?: string;
}

const pad = (v: number | string, len = 2) => String(v).padStart(len, '0');

function isoToParts(iso?: string) {
  if (!iso) return { d: '', m: '', y: '' };
  const parts = iso.split('-');
  if (parts.length !== 3) return { d: '', m: '', y: '' };
  const [y, m, d] = parts;
  return { d: d.padStart(2, '0'), m: m.padStart(2, '0'), y };
}

function partsToIso(d: string, m: string, y: string) {
  if (!d && !m && !y) return '';
  const day = parseInt(d || '0', 10);
  const month = parseInt(m || '0', 10);
  const year = parseInt(y || '0', 10);
  if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) return '';
  const dt = new Date(year, month - 1, day);
  if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) return '';
  return `${year}-${pad(month)}-${pad(day)}`;
}

const tryParseAny = (s: string) => {
  if (!s) return null;
  s = s.trim();
  // yyyy-mm-dd
  const isoMatch = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch) return `${isoMatch[1]}-${pad(isoMatch[2])}-${pad(isoMatch[3])}`;
  // dd/mm/yyyy or ddmmyyyy
  const dm = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dm) return `${dm[3]}-${pad(dm[2])}-${pad(dm[1])}`;
  const compact = s.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (compact) return `${compact[3]}-${compact[2]}-${compact[1]}`;
  return null;
};

const DateInput: React.FC<Props> = ({ label, name, value, onChange, required, disabled, error, className }) => {
  const initial = isoToParts(value);
  const [day, setDay] = useState(initial.d);
  const [month, setMonth] = useState(initial.m);
  const [year, setYear] = useState(initial.y);

  const dayRef = useRef<HTMLInputElement | null>(null);
  const monthRef = useRef<HTMLInputElement | null>(null);
  const yearRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const p = isoToParts(value);
    setDay(p.d);
    setMonth(p.m);
    setYear(p.y);
  }, [value]);

  const commitIfValid = (source?: string) => {
    const iso = partsToIso(day, month, year);
    if (iso) {
      onChange && onChange({ target: { name, value: iso } });
    } else if (source === 'blur') {
      // if invalid on blur, we clear
      onChange && onChange({ target: { name, value: '' } });
    }
  };

  const setAndMaybeAdvance = (which: 'd' | 'm' | 'y', val: string) => {
    // If user typed separators (e.g. 12/03/2025) parse entire string
    if (/[\/.\-]/.test(val)) {
      const iso = tryParseAny(val);
      if (iso) {
        const p = isoToParts(iso);
        setDay(p.d);
        setMonth(p.m);
        setYear(p.y);
        // commit after parsing
        setTimeout(() => commitIfValid(), 0);
        return;
      }
    }
    // keep only digits
    let digits = val.replace(/[^0-9]/g, '');
    if (which === 'd') {
      // distribute overflow: if user typed more than 2 digits, push to month/year
      const dayPart = digits.slice(0, 2);
      const rest = digits.slice(2);
      setDay(dayPart);
      if (rest.length > 0) {
        // fill month from rest
        const mPart = rest.slice(0, 2);
        const yPart = rest.slice(2, 6);
        setMonth(mPart);
        if (yPart) setYear(yPart.slice(0, 4));
        if (mPart.length === 2) yearRef.current?.focus();
        else monthRef.current?.focus();
      } else {
        if (dayPart.length === 2) monthRef.current?.focus();
      }
    } else if (which === 'm') {
      const mPart = digits.slice(0, 2);
      const rest = digits.slice(2);
      setMonth(mPart);
      if (rest.length > 0) {
        setYear(rest.slice(0, 4));
        yearRef.current?.focus();
      } else {
        if (mPart.length === 2) yearRef.current?.focus();
      }
    } else {
      const v = digits.slice(0, 4);
      setYear(v);
      // don't auto-focus after year
    }
  };

  const onKeyDownPart = (e: React.KeyboardEvent<HTMLInputElement>, part: 'd' | 'm' | 'y') => {
    const k = e.key;
    if (k === 'ArrowUp' || k === 'ArrowDown') {
      e.preventDefault();
      const delta = k === 'ArrowUp' ? 1 : -1;
      if (part === 'd') {
        const n = Math.max(1, Math.min(31, (parseInt(day || '0', 10) || 0) + delta));
        setDay(pad(n));
      } else if (part === 'm') {
        const n = Math.max(1, Math.min(12, (parseInt(month || '0', 10) || 0) + delta));
        setMonth(pad(n));
      } else {
        const n = Math.max(1, (parseInt(year || '0', 10) || 0) + delta);
        setYear(String(n));
      }
      return;
    }

    if (k === 'Backspace') {
      const target = e.currentTarget as HTMLInputElement;
      if (!target.value) {
        // move focus to previous
        if (part === 'm') { dayRef.current?.focus(); }
        if (part === 'y') { monthRef.current?.focus(); }
      }
    }
    if (k === 'Enter') {
      // advance or commit
      if (part === 'd') { monthRef.current?.focus(); }
      else if (part === 'm') { yearRef.current?.focus(); }
      else { commitIfValid(); }
      e.preventDefault();
      return;
    }

    // Allow Tab default behavior to move focus naturally
  };

  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const txt = e.clipboardData.getData('text');
    const iso = tryParseAny(txt);
    if (iso) {
      e.preventDefault();
      const p = isoToParts(iso);
      setDay(p.d);
      setMonth(p.m);
      setYear(p.y);
      // commit after paste
      setTimeout(() => commitIfValid(), 0);
    }
  };

  return (
    <div className={`w-full ${className || ''}`}>
      {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}{required && <span className="text-danger-600 ms-1">*</span>}</label>}
      <div role="group" aria-label={label || 'Date'} className={`inline-flex items-center gap-2 px-2 py-1 border rounded-md ${error ? 'border-danger-600' : 'border-gray-300'} bg-white dark:bg-gray-700`}> 
        <input
          ref={dayRef}
          name={name ? `${name}-day` : undefined}
          inputMode="numeric"
          aria-label="day"
          value={day}
          disabled={disabled}
          onChange={(e) => setAndMaybeAdvance('d', e.target.value)}
          onBlur={() => commitIfValid('blur')}
          onKeyDown={(e) => onKeyDownPart(e, 'd')}
          onPaste={onPaste}
          placeholder="DD"
          maxLength={2}
          pattern="\d{1,2}"
          className="w-14 text-center px-3 py-2 border rounded-md bg-transparent focus:outline-none touch-manipulation"
        />
        <span className="select-none">/</span>
        <input
          ref={monthRef}
          name={name ? `${name}-month` : undefined}
          inputMode="numeric"
          aria-label="month"
          value={month}
          disabled={disabled}
          onChange={(e) => setAndMaybeAdvance('m', e.target.value)}
          onBlur={() => commitIfValid('blur')}
          onKeyDown={(e) => onKeyDownPart(e, 'm')}
          onPaste={onPaste}
          placeholder="MM"
          maxLength={2}
          pattern="\d{1,2}"
          className="w-14 text-center px-3 py-2 border rounded-md bg-transparent focus:outline-none touch-manipulation"
        />
        <span className="select-none">/</span>
        <input
          ref={yearRef}
          name={name ? `${name}-year` : undefined}
          inputMode="numeric"
          aria-label="year"
          value={year}
          disabled={disabled}
          onChange={(e) => setAndMaybeAdvance('y', e.target.value)}
          onBlur={() => commitIfValid('blur')}
          onKeyDown={(e) => onKeyDownPart(e, 'y')}
          onPaste={onPaste}
          placeholder="YYYY"
          maxLength={4}
          pattern="\d{4}"
          className="w-24 text-center px-3 py-2 border rounded-md bg-transparent focus:outline-none touch-manipulation"
        />
      </div>
      {error && <p className="mt-1 text-sm text-danger-600" role="alert">{error}</p>}
    </div>
  );
};

export default DateInput;
