
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getCustomerById, getInvoices, getPaymentsByCustomerId } from '../services/dataService';
import { Customer, Invoice, Payment } from '../types';
import { PencilIcon, WalletIcon } from '@heroicons/react/24/outline';
import PaymentForm from './PaymentForm';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth, useCanWrite } from '../contexts/AuthContext';
import { mapFirestoreError } from '../services/firebaseErrors';
import { useNotification } from '../contexts/NotificationContext';
import { Modal } from '../components/ui/Modal';

const StatCard: React.FC<{ title: string; value: string; }> = ({ title, value }) => (
    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow-sm text-center">
      <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
);

const CustomerDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { activeCompanyId } = useAuth();
    const canWrite = useCanWrite('customers');
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const { settings, loading: settingsLoading } = useSettings();
    const { addNotification } = useNotification();

    const fetchData = async () => {
        if (!id || !activeCompanyId) return;
        setLoading(true);
        try {
            const [customerResult, allInvoicesResult, paymentsResult] = await Promise.all([
                getCustomerById(activeCompanyId, id),
                getInvoices(activeCompanyId, { filters: [['customerId', '==', id]] }),
                getPaymentsByCustomerId(activeCompanyId, id)
            ]);
            setCustomer(customerResult || null);
            setInvoices(allInvoicesResult.data || []);
            setPayments(paymentsResult.data || []);
        } catch (error: any) {
            addNotification(mapFirestoreError(error), 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id, activeCompanyId]);

    const handlePaymentSaved = () => {
        setIsPaymentModalOpen(false);
        fetchData();
    };

    const financialSummary = useMemo(() => {
        const totalBilled = invoices.reduce((sum, inv) => sum + inv.total, 0);
        const totalPaid = payments.reduce((sum, pay) => sum + pay.amount, 0);
        return {
            totalBilled,
            totalPaid,
            balanceDue: totalBilled - totalPaid
        };
    }, [invoices, payments]);

    if (loading || settingsLoading) return <div>جاري التحميل...</div>;
    if (!customer) return <div>لم يتم العثور على العميل.</div>;

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold">{customer.name}</h1>
                        <p className="text-gray-500 dark:text-gray-400">{customer.email} | {customer.mobilePhone}</p>
                        <p className="text-gray-500 dark:text-gray-400">{customer.address}</p>
                    </div>
                    {canWrite && (
                        <div className="flex">
                            <Link to={`/customers/edit/${customer.id}`} className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 me-2">
                                <PencilIcon className="h-4 w-4 me-2" /> تعديل
                            </Link>
                            <button
                                onClick={() => setIsPaymentModalOpen(true)}
                                disabled={financialSummary.balanceDue <= 0}
                                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                <WalletIcon className="h-4 w-4 me-2" /> إضافة دفعة
                            </button>
                        </div>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <StatCard title="إجمالي الفواتير" value={`${financialSummary.totalBilled.toFixed(2)} ${settings?.currency}`} />
                    <StatCard title="إجمالي المدفوعات" value={`${financialSummary.totalPaid.toFixed(2)} ${settings?.currency}`} />
                    <StatCard title="الرصيد المستحق" value={`${financialSummary.balanceDue.toFixed(2)} ${settings?.currency}`} />
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">سجل الفواتير</h2>
                 <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                           <tr>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">رقم الفاتورة</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">التاريخ</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الإجمالي</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الحالة</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {invoices.map(invoice => (
                                <tr key={invoice.id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors" onClick={() => navigate(`/invoices/${invoice.id}`)}>
                                    <td className="px-6 py-4">{invoice.invoiceNumber}</td>
                                    <td className="px-6 py-4">{new Date(invoice.date).toLocaleDateString('ar-EG')}</td>
                                    <td className="px-6 py-4">{invoice.total.toFixed(2)} ${settings?.currency}</td>
                                    <td className="px-6 py-4"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${invoice.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{invoice.status}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
             <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">سجل المدفوعات</h2>
                 <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                           <tr>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">تاريخ الدفع</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">رقم الفاتورة المرتبط</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">المبلغ</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {payments.map(payment => (
                                <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="px-6 py-4">{new Date(payment.date).toLocaleDateString('ar-EG')}</td>
                                    <td className="px-6 py-4">{invoices.find(i => i.id === payment.invoiceId)?.invoiceNumber || 'N/A'}</td>
                                    <td className="px-6 py-4">{payment.amount.toFixed(2)} ${settings?.currency}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title={`إضافة دفعة لـ ${customer?.name}`}>
                {customer && (
                    <PaymentForm
                        customer={customer}
                        onPaymentSaved={handlePaymentSaved}
                        onClose={() => setIsPaymentModalOpen(false)}
                    />
                )}
            </Modal>
        </div>
    );
};

export default CustomerDetail;
