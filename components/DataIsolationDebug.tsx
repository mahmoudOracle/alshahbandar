import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getIsolationStateSummary, validateUserDataIsolation } from '../services/dataTenantUtils';
import { DEBUG_MODE } from '../config';

/**
 * Component to display multi-tenant data isolation information
 * Only shown in development mode for debugging purposes
 */
export const DataIsolationDebug: React.FC = () => {
  const { firebaseUser, activeCompanyId, companyMemberships } = useAuth();

  if (!DEBUG_MODE) return null;

  const isolationCheck = firebaseUser && activeCompanyId
    ? validateUserDataIsolation(firebaseUser, activeCompanyId)
    : null;

  const stateSummary = getIsolationStateSummary();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-gray-100 text-xs p-2 max-h-40 overflow-y-auto border-t border-gray-700 z-50">
      <details className="cursor-pointer">
        <summary className="font-bold text-green-400">🔒 Data Isolation Debug</summary>
        
        <div className="mt-2 space-y-1 font-mono text-gray-300">
          <div>👤 User ID: <span className="text-yellow-300">{firebaseUser?.uid.slice(0, 8)}...</span></div>
          <div>🏢 Active Company: <span className="text-yellow-300">{activeCompanyId?.slice(0, 8) || 'None'}...</span></div>
          <div>🔑 Role: <span className="text-yellow-300">{companyMemberships[0]?.role || 'None'}</span></div>
          
          {isolationCheck && (
            <>
              <div className={isolationCheck.isValid ? 'text-green-400' : 'text-red-400'}>
                ✓ Isolation Valid: {isolationCheck.isValid ? 'YES' : 'NO'}
              </div>
              
              {isolationCheck.errors.length > 0 && (
                <div className="text-red-400">
                  ❌ Errors:
                  {isolationCheck.errors.map((err, i) => (
                    <div key={i} className="ml-2">- {err}</div>
                  ))}
                </div>
              )}
              
              {isolationCheck.warnings.length > 0 && (
                <div className="text-orange-400">
                  ⚠️ Warnings:
                  {isolationCheck.warnings.map((warn, i) => (
                    <div key={i} className="ml-2">- {warn}</div>
                  ))}
                </div>
              )}
            </>
          )}
          
          <div className="text-gray-500 text-xs mt-2">
            Time: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </details>
    </div>
  );
};
