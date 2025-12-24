
import React from 'react';
import { ShieldExclamationIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';

const NotAuthorizedPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="flex items-center justify-center h-full p-4">
            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-danger-100 dark:bg-danger-900/50">
                    <ShieldExclamationIcon className="h-7 w-7 text-danger-600 dark:text-danger-400" />
                </div>
                <h1 className="mt-5 text-2xl font-bold text-gray-900 dark:text-white">
                    وصول غير مصرح به
                </h1>
                <div className="mt-3 text-gray-600 dark:text-gray-400">
                     <p>
                        ليست لديك صلاحية الوصول إلى لوحة تحكم النظام.
                    </p>
                </div>
                <div className="mt-6">
                    <Button
                        variant="primary"
                        onClick={() => navigate('/')}
                        className="w-full"
                    >
                        العودة إلى الملخص
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default NotAuthorizedPage;
