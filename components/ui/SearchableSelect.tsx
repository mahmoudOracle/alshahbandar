import React, { useState, useEffect, useRef } from 'react';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';

interface Option { value: string; label: string }

interface Props {
  label?: string;
  options: Option[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  name?: string;
  className?: string;
}

export const SearchableSelect: React.FC<Props> = ({ label, options, value, onChange, placeholder, error, required, name, className }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  useEffect(() => {
    // Keep query in sync with selected value
    const current = options.find(o => o.value === value);
    setQuery(current ? current.label : '');
  }, [value, options]);

  const filtered = query ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase())) : options;

  useEffect(() => {
    // reset active index when filtered changes
    setActiveIndex(filtered.length > 0 ? 0 : null);
  }, [filtered.length]);

  useEffect(() => {
    if (activeIndex !== null && listRef.current) {
      const el = listRef.current.querySelectorAll('li')[activeIndex] as HTMLElement | undefined;
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      setActiveIndex(prev => {
        if (prev === null) return filtered.length > 0 ? 0 : null;
        return Math.min(prev + 1, filtered.length - 1);
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => {
        if (prev === null) return filtered.length > 0 ? filtered.length - 1 : null;
        return Math.max(prev - 1, 0);
      });
    } else if (e.key === 'Enter') {
      if (open && activeIndex !== null && filtered[activeIndex]) {
        e.preventDefault();
        onChange(filtered[activeIndex].value);
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={ref} className={`w-full relative ${className || ''}`}>
      {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}{required && <span className="text-danger-600 ms-1">*</span>}</label>}
      <input
        name={name}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`block w-full px-3 py-2 border rounded-md text-base md:text-sm bg-white dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 ${error ? 'border-danger-600' : 'border-gray-300'}`}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${name}-error` : undefined}
      />
      {error && <div className="absolute inset-y-0 end-0 pe-3 flex items-center pointer-events-none"><ExclamationCircleIcon className="h-5 w-5 text-danger-600" /></div>}

      {open && filtered.length > 0 && (
        <ul ref={listRef} role="listbox" className="absolute z-40 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md max-h-48 overflow-auto shadow-lg">
          {filtered.map((opt, idx) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={activeIndex === idx}
              className={`px-3 py-2 cursor-pointer ${activeIndex === idx ? 'bg-primary-100 dark:bg-primary-800' : 'hover:bg-gray-100 dark:hover:bg-gray-600'}`}
              onMouseEnter={() => setActiveIndex(idx)}
              onClick={() => { onChange(opt.value); setOpen(false); }}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
      {error && <p id={`${name}-error`} className="mt-1 text-sm text-danger-600" role="alert">{error}</p>}
    </div>
  );
};

export default SearchableSelect;
