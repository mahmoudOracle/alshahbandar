import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BuildingOffice2Icon } from '@heroicons/react/24/outline';
import { Button } from '../components/ui/Button';

const CompanySelectionPage: React.FC = () => {
  const { user, companyMemberships, setActiveCompanyId, signOutUser } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">
          \u0645\u0631\u062d\u0628\u0627 {user?.displayName || user?.email}!
        </h1>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
          \u0644\u062f\u064a\u0643\u0020\u0623\u0643\u062b\u0631\u0020\u0645\u0646\u0020\u0634\u0631\u0643\u0629\u0020\u0645\u0631\u062a\u0628\u0637\u0629\u0020\u0628\u062d\u0633\u0627\u0628\u0643\u002e\u0020\u0627\u062e\u062a\u0631\u0020\u0627\u0644\u0634\u0631\u0643\u0629\u0020\u0627\u0644\u062a\u064a\u0020\u062a\u0631\u064a\u062f\u0020\u0627\u0644\u062f\u062e\u0648\u0644\u0020\u0625\u0644\u064a\u0647\u0627\u0020\u0627\u0644\u0622\u0646\u002e
        </p>

        <div className="mt-8 space-y-4">
          {companyMemberships.map((membership) => (
            <button
              key={membership.companyId}
              onClick={() => setActiveCompanyId(membership.companyId)}
              className="w-full flex items-center text-left p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:bg-primary-50 dark:hover:bg-gray-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <BuildingOffice2Icon className="h-8 w-8 text-primary-600 dark:text-primary-400 me-4 flex-shrink-0" />
              <div>
                <p className="font-bold text-lg text-gray-900 dark:text-white">
                  {membership.companyName}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">\u0627\u0644\u062f\u0648\u0631: {membership.role}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-8">
          <Button variant="secondary" onClick={signOutUser}>
            \u062a\u0633\u062c\u064a\u0644\u0020\u0627\u0644\u062e\u0631\u0648\u062c
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CompanySelectionPage;
