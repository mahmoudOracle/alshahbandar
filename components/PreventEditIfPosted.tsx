import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { canEditEntry } from '../services/accountingSafety';
import { UserRole } from '../types';

interface Props {
  doc: any;
  companySettings?: any;
  children: React.ReactNode;
}

const PreventEditIfPosted: React.FC<Props> = ({ doc, companySettings, children }) => {
  const { role } = useAuth();
  const result = canEditEntry(role as UserRole | null, doc, companySettings);
  if (!result.allowed) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
        <strong className="block">Action restricted</strong>
        <p className="text-sm">
          This record is locked ({result.reason}). To modify, contact an administrator or unlock the
          period.
        </p>
      </div>
    );
  }
  return <>{children}</>;
};

export default PreventEditIfPosted;
