import React from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onConfirm?: () => void;
}

const keys = ['7','8','9','4','5','6','1','2','3','0','.','←'];

const MobileNumericKeypad: React.FC<Props> = ({ value, onChange, onConfirm }) => {
  const press = (k: string) => {
    if (k === '←') return onChange(value.slice(0, -1));
    // Prevent multiple decimals
    if (k === '.' && value.includes('.')) return;
    // Limit length to reasonable number
    if (value.length >= 12) return;
    // Prevent leading zeros like "00"
    if (value === '0' && k === '0') return;
    // If current is '0' and user types digit, replace
    if (value === '0' && k !== '.') return onChange(k);
    onChange(value + k);
  };

  return (
    <div className="bg-gray-100 dark:bg-gray-900 p-2 rounded">
      <div className="grid grid-cols-3 gap-2">
        {keys.map(k => (
          <button key={k} onClick={() => press(k)} className="p-4 bg-white dark:bg-gray-800 rounded text-xl">
            {k}
          </button>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <button onClick={onConfirm} className="flex-1 p-3 bg-primary-600 text-white rounded">تأكيد</button>
      </div>
    </div>
  );
};

export default MobileNumericKeypad;
