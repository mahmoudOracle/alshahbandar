
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
                    مرحباً، {user?.displayName || user?.email}!
                </h1>
                <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
                    أنت عضو في عدة شركات. يرجى اختيار الشركة التي تود العمل عليها.
                </p>

                <div className="mt-8 space-y-4">
                    {companyMemberships.map(membership => (
                        <button
                            key={membership.companyId}
                            onClick={() => setActiveCompanyId(membership.companyId)}
                            className="w-full flex items-center text-left p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:bg-primary-50 dark:hover:bg-gray-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            <BuildingOffice2Icon className="h-8 w-8 text-primary-600 dark:text-primary-400 me-4 flex-shrink-0" />
                            <div>
                                <p className="font-bold text-lg text-gray-900 dark:text-white">{membership.companyName}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">دورك: {membership.role}</p>
                            </div>
                        </button>
                    ))}
                </div>
                
                <div className="mt-8">
                     <Button variant="secondary" onClick={signOutUser}>
                        تسجيل الخروج
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default CompanySelectionPage;
