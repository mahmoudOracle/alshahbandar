import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

export function DevRoleSwitcher() {
  const { role: currentRole } = useAuth();
  const [role, setRole] = useState<UserRole>(currentRole || UserRole.Viewer);
  
  const user = { name: 'Dev User', email: 'dev@example.com' };

  return (
    <div dir="rtl" className="fixed bottom-2 right-2 bg-white/90 dark:bg-slate-800/90 shadow p-2 rounded text-xs z-50 border dark:border-slate-700">
      <div>الدور الحالي: {role}</div>
      <select
        value={role}
        onChange={(e) => {
          const r = e.target.value as UserRole;
          setRole(r);
          localStorage.setItem('app:user', JSON.stringify({ ...user, role: r }));
          location.reload();
        }}
        className="border rounded px-1 py-0.5 mt-1 w-full bg-white dark:bg-slate-700 dark:border-slate-600"
      >
        <option value={UserRole.Manager}>مدير</option>
        <option value={UserRole.Employee}>موظف</option>
        <option value={UserRole.Viewer}>مستخدم عادي</option>
      </select>
    </div>
  );
}
