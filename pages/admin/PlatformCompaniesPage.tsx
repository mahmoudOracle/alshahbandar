import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getCompanies, updateCompanyStatus } from '../../services/dataService';
import { Company, PaginatedData } from '../../types';
import { Card } from '../../components/ui/Card';
import ApproveCompanyModal from './components/ApproveCompanyModal';
import AdminAuditPage from './AdminAuditPage';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import TableSkeleton from '../../components/TableSkeleton';
import { useNotification } from '../../contexts/NotificationContext';
import { PlusIcon, BuildingOffice2Icon, ChevronLeftIcon, ChevronRightIcon, ArrowLeftOnRectangleIcon } from '@heroicons/react/24/outline';
import CreateCompanyModal from './components/CreateCompanyModal';
import CompanyDetailPanel from './components/CompanyDetailPanel';
import EmptyState from '../../components/EmptyState';
import { useAuth } from '../../contexts/AuthContext';

const PAGE_SIZE = 10;

const PlatformCompaniesPage: React.FC = () => {
    const [companiesData, setCompaniesData] = useState<PaginatedData<Company>>({ data: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [searchTerm, setSearchTerm] = useState('');

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [cursors, setCursors] = useState<any[]>([undefined]);

    const { addNotification } = useNotification();
    const { firebaseUser, signOutUser } = useAuth();

    const fetchCompanies = useCallback(async (page: number) => {
        setLoading(true);
        setError(null);
        try {
            const statusFilter = filter === 'all' ? undefined : filter === 'active';
            const result = await getCompanies({ 
                limit: PAGE_SIZE, 
                startAfter: cursors[page - 1],
                status: statusFilter 
            });
            setCompaniesData(result);
            if (result.nextCursor) {
                setCursors(prev => {
                    const newCursors = [...prev];
                    newCursors[page] = result.nextCursor;
                    return newCursors;
                });
            }
        } catch (err) {
            setError('Failed to fetch companies.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [filter, cursors]);

    useEffect(() => {
        setCurrentPage(1);
        setCursors([undefined]);
        fetchCompanies(1);
    }, [filter]);
    
    useEffect(() => {
      fetchCompanies(currentPage);
    }, [currentPage]);

    const handleNextPage = () => {
        if (companiesData.nextCursor) {
            setCurrentPage(p => p + 1);
        }
    };

    const handlePrevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(p => p - 1);
        }
    };
    
    const [approvalModalOpen, setApprovalModalOpen] = useState(false);
    const [approvalCompany, setApprovalCompany] = useState<Company | null>(null);
    const [showAudit, setShowAudit] = useState(false);

    const openApprovalModal = (company: Company) => {
        setApprovalCompany(company);
        setApprovalModalOpen(true);
    };

    const handleApprovalComplete = () => {
        setApprovalModalOpen(false);
        setApprovalCompany(null);
        fetchCompanies(currentPage);
    };

    const handleSignOut = () => {
        console.log("[Auth][SignOut] Platform admin signed out");
        signOutUser();
    };

    const filteredCompanies = useMemo(() => {
        return companiesData.data.filter(c => 
            (c.companyName || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
            (c.email || '').toLowerCase().includes((searchTerm || '').toLowerCase())
        );
    }, [companiesData.data, searchTerm]);
    
    const totalCompanies = 0; // These would require extra reads, keep simple for now
    const activeCompanies = 0;
    
    const summaryStats = useMemo(() => {
        // This is a client-side calculation based on the current page, not a total count.
        // For total counts, a separate backend function or count query would be needed.
        const active = companiesData.data.filter(c => (c as any).status === 'approved').length;
        return {
            total: companiesData.data.length,
            active: active,
            inactive: companiesData.data.length - active
        };
    }, [companiesData.data]);


    return (
        <div className="bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 min-h-screen p-4 md:p-6 space-y-6">
            <header className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-bold">لوحة تحكم النظام - الشركات</h1>
                <div className="flex items-center gap-4">
                    <Button onClick={() => setIsCreateModalOpen(true)}>
                        <PlusIcon className="h-5 w-5 me-2" />
                        إضافة شركة جديدة
                    </Button>
                    <Button variant="ghost" onClick={() => setShowAudit(s => !s)}>
                        سجلات المشرف
                    </Button>
                    <div className="flex items-center gap-2 border-s border-gray-300 dark:border-gray-600 ps-4">
                         <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:inline">{firebaseUser?.email}</span>
                         <Button variant="secondary" onClick={handleSignOut} aria-label="تسجيل الخروج">
                            <ArrowLeftOnRectangleIcon className="h-5 w-5 me-2" />
                            تسجيل الخروج
                        </Button>
                    </div>
                </div>
            </header>

            {showAudit && (
                <div className="mb-6">
                    <AdminAuditPage />
                </div>
            )}

            <Card>
                <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4 flex-wrap">
                    <Input 
                        type="text" 
                        placeholder="ابحث بالاسم أو البريد..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full md:w-auto"
                    />
                    <Select
                        value={filter}
                        onChange={e => setFilter(e.target.value as any)}
                        options={[
                            { value: 'all', label: 'كل الحالات' },
                            { value: 'active', label: 'نشطة' },
                            { value: 'inactive', label: 'موقوفة' },
                        ]}
                        className="w-full md:w-auto"
                    />
                </div>
                
                {loading && <TableSkeleton cols={6} rows={PAGE_SIZE} />}
                {!loading && error && <p className="text-center text-danger-600">{error}</p>}
                {!loading && !error && filteredCompanies.length === 0 && (
                     <EmptyState 
                        icon={<BuildingOffice2Icon className="h-8 w-8" />}
                        title="لا توجد شركات"
                        message="ابدأ بإضافة أول شركة عميلة لك في النظام."
                    />
                )}

                {!loading && !error && filteredCompanies.length > 0 && (
                    <>
                        <div className="hidden md:block overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">اسم الشركة</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">بريد المالك</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الحالة</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">تاريخ الإنشاء</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {filteredCompanies.map(company => (
                                        <tr key={company.id}>
                                            <td className="px-6 py-4 whitespace-nowrap font-medium">{company.companyName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{company.email}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Badge variant={(company as any).status === 'approved' ? 'success' : 'default'}>
                                                    {(company as any).status === 'approved' ? 'معتمدة' : ((company as any).status === 'pending' ? 'قيد المراجعة' : 'مرفوضة')}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {company.createdAt?.toDate ? company.createdAt.toDate().toLocaleDateString('ar-EG') : 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex items-center gap-2">
                                                    <Button variant="ghost" size="sm" onClick={() => setSelectedCompany(company)}>عرض التفاصيل</Button>
                                                    <Button variant="secondary" size="sm" onClick={() => openApprovalModal(company)}>
                                                        {(company as any).status === 'approved' ? 'رفض' : 'موافقة'}
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        <div className="md:hidden space-y-4">
                            {filteredCompanies.map(company => (
                                <Card key={company.id} padding="sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-lg">{company.companyName}</h3>
                                        <Badge variant={(company as any).status === 'approved' ? 'success' : 'default'}>
                                            {(company as any).status === 'approved' ? 'معتمدة' : ((company as any).status === 'pending' ? 'قيد المراجعة' : 'مرفوضة')}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-gray-500">{company.email}</p>
                                    <div className="flex gap-2 mt-3 border-t border-gray-200 dark:border-gray-700 pt-3">
                                        <Button variant="secondary" size="sm" className="flex-1" onClick={() => setSelectedCompany(company)}>تفاصيل</Button>
                                        <Button variant="ghost" size="sm" className="flex-1" onClick={() => openApprovalModal(company)}>
                                            {(company as any).status === 'approved' ? 'رفض' : 'موافقة'}
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                        </div>

                         <div className="flex justify-center items-center mt-6 gap-2">
                            <Button onClick={handlePrevPage} disabled={currentPage === 1} variant="secondary" size="sm" aria-label="الصفحة السابقة">
                                <ChevronRightIcon className="h-5 w-5" />
                            </Button>
                            <Button onClick={handleNextPage} disabled={!companiesData.nextCursor} variant="secondary" size="sm" aria-label="الصفحة التالية">
                                <ChevronLeftIcon className="h-5 w-5" />
                            </Button>
                        </div>
                    </>
                )}
            </Card>

            <CreateCompanyModal 
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCompanyCreated={() => {
                    setIsCreateModalOpen(false);
                    fetchCompanies(1); // Refresh list
                }}
            />

            <ApproveCompanyModal
                isOpen={approvalModalOpen}
                companyId={approvalCompany?.id || ''}
                companyName={approvalCompany?.companyName || ''}
                onClose={() => setApprovalModalOpen(false)}
                onComplete={handleApprovalComplete}
            />

            <CompanyDetailPanel
                company={selectedCompany}
                onClose={() => setSelectedCompany(null)}
            />
        </div>
    );
};

export default PlatformCompaniesPage;