
import React from 'react';
import { ShieldExclamationIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';

const NoAccessPage: React.FC = () => {
    const { user, signOutUser } = useAuth();

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-danger-100 dark:bg-danger-900/50">
                    <ShieldExclamationIcon className="h-7 w-7 text-danger-600 dark:text-danger-400" />
                </div>
                <h1 className="mt-5 text-2xl font-bold text-gray-900 dark:text-white">
                    لا يوجد صلاحية وصول
                </h1>
                <div className="mt-3 text-gray-600 dark:text-gray-400">
                     <p>مرحباً، {user?.email}.</p>
                     <p className="mt-2">
                        لم يتم العثور على شركة مرتبطة بحسابك. يرجى التأكد من استخدامك لرابط دعوة صحيح أو التواصل مع إدارة النظام.
                    </p>
                </div>
                <div className="mt-6">
                    <Button
                        variant="secondary"
                        onClick={signOutUser}
                        className="w-full"
                    >
                        تسجيل الخروج
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default NoAccessPage;
