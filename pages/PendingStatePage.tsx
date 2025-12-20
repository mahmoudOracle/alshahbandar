import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { InformationCircleIcon, ArrowLeftOnRectangleIcon } from '@heroicons/react/24/outline';

const PendingStatePage: React.FC = () => {
    const { user, signOutUser } = useAuth();

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
            <div className="p-8 bg-white dark:bg-gray-800 rounded-lg shadow-xl text-center max-w-md w-full">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-800">
                    <InformationCircleIcon className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                </div>
                <h1 className="text-2xl font-bold mt-4 text-gray-800 dark:text-gray-200">Account Pending</h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                    Welcome, <span className="font-semibold">{user?.displayName || user?.email}</span>!
                </p>
                <p className="mt-4 text-gray-600 dark:text-gray-400">
                    Your account has been successfully created but is not yet associated with a company. To access the dashboard, please use an invitation link provided by a sales representative or your company administrator.
                </p>
                <div className="mt-6 space-y-2">
                    <a href="/#/complete-setup">
                        <button className="w-full px-4 py-2 bg-primary-600 text-white rounded-md">إكمال بيانات الشركة</button>
                    </a>
                    <button
                        onClick={signOutUser}
                        className="flex w-full items-center justify-center px-4 py-2 text-white bg-gray-600 rounded-md hover:bg-gray-700"
                    >
                        <ArrowLeftOnRectangleIcon className="h-5 w-5 me-2" />
                        تسجيل الخروج
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PendingStatePage;
