import React, { useState } from 'react';
import { BeakerIcon, TrashIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { populateDummyData, deleteAllCompanyData } from '../services/dataService';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

interface DevActionsProps {
    hasData: boolean;
    onDataChange: () => void;
}

const DevActions: React.FC<DevActionsProps> = ({ hasData, onDataChange }) => {
    const { companyId } = useAuth();
    const { addNotification } = useNotification();
    const [loading, setLoading] = useState(false);

    const handlePopulate = async () => {
        if (!companyId) return;
        setLoading(true);
        addNotification('Populating database with dummy data...', 'success');
        const success = await populateDummyData(companyId);
        if (success) {
            addNotification('Dummy data populated successfully!', 'success');
            onDataChange();
        } else {
            addNotification('Failed to populate dummy data.', 'error');
        }
        setLoading(false);
    };

    const handleClear = async () => {
        if (!companyId || !window.confirm('ARE YOU SURE you want to delete ALL data for this company? This cannot be undone.')) return;
        setLoading(true);
        addNotification('Clearing all company data...', 'success');
        try {
            await deleteAllCompanyData(companyId);
            addNotification('All data cleared successfully.', 'success');
            onDataChange();
        } catch (e) {
            console.error(e);
            addNotification('Failed to clear data.', 'error');
        }
        setLoading(false);
    };

    return (
        <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 p-4 rounded-lg shadow-md mb-6">
            <div className="flex items-center mb-3">
                <BeakerIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400 me-3" />
                <h3 className="text-lg font-bold text-yellow-800 dark:text-yellow-200">Developer Tools</h3>
            </div>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4">
                These actions are for development purposes only and work in MOCK mode.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
                <button
                    onClick={handlePopulate}
                    disabled={loading || hasData}
                    className="btn-primary flex-1 flex items-center justify-center bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
                >
                    <SparklesIcon className="h-5 w-5 me-2" />
                    Populate Dummy Data
                </button>
                <button
                    onClick={handleClear}
                    disabled={loading || !hasData}
                    className="btn-primary flex-1 flex items-center justify-center bg-red-600 hover:bg-red-700 disabled:bg-gray-400"
                >
                    <TrashIcon className="h-5 w-5 me-2" />
                    Clear All Data
                </button>
            </div>
             {hasData && <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2 text-center">Database already contains data. Clear it first to re-populate.</p>}
        </div>
    );
};

export default DevActions;
