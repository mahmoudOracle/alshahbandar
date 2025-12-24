
import React, { useState, useEffect } from 'react';
import { Company, CompanyStats } from '../../../types';
import { getCompanyCounts } from '../../../services/dataService';
import { XMarkIcon, UserGroupIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { Badge } from '../../../components/ui/Badge';
import { Card } from '../../../components/ui/Card';
import { Spinner } from '../../../components/Spinner';

interface CompanyDetailPanelProps {
    company: Company | null;
    onClose: () => void;
}

const StatCard: React.FC<{ title: string, value: number | string, icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
        <div className="bg-primary-100 dark:bg-primary-900/50 p-3 rounded-full">
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
        </div>
    </div>
);

const CompanyDetailPanel: React.FC<CompanyDetailPanelProps> = ({ company, onClose }) => {
    const [stats, setStats] = useState<CompanyStats | null>(null);
    const [loadingStats, setLoadingStats] = useState(false);

    useEffect(() => {
        if (company) {
            setLoadingStats(true);
            setStats(null);
            getCompanyCounts(company.id)
                .then(setStats)
                .catch(err => console.error("Failed to fetch company stats", err))
                .finally(() => setLoadingStats(false));
        }
    }, [company]);

    if (!company) return null;

    return (
        <>
            <div 
                className="fixed inset-0 bg-black bg-opacity-60 z-40 transition-opacity"
                onClick={onClose}
            />
            <div className="fixed top-0 end-0 h-full w-full max-w-lg bg-white dark:bg-gray-800 shadow-xl z-50 transform transition-transform duration-300 ease-in-out">
                <div className="flex flex-col h-full">
                    <header className="flex justify-between items-center p-4 border-b dark:border-gray-700">
                        <h2 className="text-xl font-bold">{company.name}</h2>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </header>
                    <div className="flex-1 p-6 overflow-y-auto space-y-6">
                        <Card>
                            <h3 className="font-bold mb-4">المعلومات الأساسية</h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">معرف الشركة:</span>
                                    <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{company.id}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">بريد المالك:</span>
                                    <span className="font-semibold">{company.ownerEmail}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">UID المالك:</span>
                                    <span className="font-mono text-xs">{company.ownerUid || 'لم يسجل الدخول بعد'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500">الحالة:</span>
                                    <Badge variant={company.isActive ? 'success' : 'default'}>
                                        {company.isActive ? 'نشطة' : 'موقوفة'}
                                    </Badge>
                                </div>
                                 <div className="flex justify-between items-center">
                                    <span className="text-gray-500">الخطة:</span>
                                    <span className="font-semibold capitalize">{company.plan}</span>
                                </div>
                            </div>
                        </Card>

                        <Card>
                            <h3 className="font-bold mb-4">إحصائيات</h3>
                            {loadingStats && (
                                <div className="flex justify-center items-center h-24">
                                    <Spinner />
                                </div>
                            )}
                            {!loadingStats && stats && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <StatCard 
                                        title="عدد المستخدمين" 
                                        value={stats.userCount} 
                                        icon={<UserGroupIcon className="h-6 w-6 text-primary-600" />}
                                    />
                                    <StatCard 
                                        title="عدد الفواتير (تقريبي)" 
                                        value={stats.invoiceCount} 
                                        icon={<DocumentTextIcon className="h-6 w-6 text-primary-600" />}
                                    />
                                </div>
                            )}
                             {!loadingStats && !stats && <p className="text-gray-500 text-center">لا يمكن تحميل الإحصائيات.</p>}
                        </Card>
                    </div>
                </div>
            </div>
        </>
    );
};

export default CompanyDetailPanel;