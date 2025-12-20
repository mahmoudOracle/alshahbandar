
import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { getInvoices, getExpenses } from '../services/dataService';
// FIX: Removed unused ExpenseCategory import that was causing an error.
import { Invoice, Expense, InvoiceStatus } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { mapFirestoreError } from '../services/firebaseErrors';
import { useNotification } from '../contexts/NotificationContext';

const Reports: React.FC = () => {
    const { activeCompanyId } = useAuth();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const { settings, loading: settingsLoading } = useSettings();
    const { addNotification } = useNotification();
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
    });

    useEffect(() => {
        const fetchData = async () => {
            if (!activeCompanyId) return;
            setLoading(true);
            try {
                const [invoicesData, expensesData] = await Promise.all([getInvoices(activeCompanyId), getExpenses(activeCompanyId)]);
                // FIX: Handle PaginatedData response
                setInvoices(invoicesData.data || []);
                setExpenses(expensesData.data || []);
            } catch (error: any) {
                addNotification(mapFirestoreError(error), 'error');
            }
            setLoading(false);
        };
        fetchData();
    }, [activeCompanyId, addNotification]);

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDateRange(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const financialSummary = useMemo(() => {
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);

        const filteredInvoices = invoices.filter(inv => {
            const invDate = new Date(inv.date);
            return inv.status === InvoiceStatus.Paid && invDate >= start && invDate <= end;
        });

        const filteredExpenses = expenses.filter(exp => {
            const expDate = new Date(exp.date);
            return expDate >= start && expDate <= end;
        });

        const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + inv.total, 0);
        const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        const netProfit = totalRevenue - totalExpenses;

        const expenseByCategory = filteredExpenses.reduce((acc, exp) => {
            const category = exp.category || 'Other';
            acc[category] = (acc[category] || 0) + exp.amount;
            return acc;
        }, {} as Record<string, number>);

        const expenseChartData = Object.entries(expenseByCategory).map(([name, value]) => ({ name, value }));
        
        return { totalRevenue, totalExpenses, netProfit, expenseChartData };
    }, [invoices, expenses, dateRange]);

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1943'];
    
    if (loading || settingsLoading) return <div>جاري تحميل البيانات...</div>;

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold mb-4">تقرير الأرباح والخسائر</h2>
                <div className="flex flex-col md:flex-row gap-4 mb-6 items-center">
                    <div>
                        <label htmlFor="start" className="block text-sm font-medium">من تاريخ</label>
                        <input type="date" name="start" id="start" value={dateRange.start} onChange={handleDateChange} className="mt-1 block px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600" />
                    </div>
                     <div>
                        <label htmlFor="end" className="block text-sm font-medium">إلى تاريخ</label>
                        <input type="date" name="end" id="end" value={dateRange.end} onChange={handleDateChange} className="mt-1 block px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                    <div className="p-4 bg-green-50 dark:bg-green-900/50 rounded-lg">
                        <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">إجمالي الإيرادات</h3>
                        <p className="text-3xl font-bold mt-2 text-green-600">{financialSummary.totalRevenue.toFixed(2)} {settings?.currency}</p>
                    </div>
                     <div className="p-4 bg-red-50 dark:bg-red-900/50 rounded-lg">
                        <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">إجمالي المصروفات</h3>
                        <p className="text-3xl font-bold mt-2 text-red-600">{financialSummary.totalExpenses.toFixed(2)} {settings?.currency}</p>
                    </div>
                     <div className={`p-4 rounded-lg ${financialSummary.netProfit >= 0 ? 'bg-blue-50 dark:bg-blue-900/50' : 'bg-yellow-50 dark:bg-yellow-900/50'}`}>
                        <h3 className={`text-lg font-semibold ${financialSummary.netProfit >= 0 ? 'text-blue-800 dark:text-blue-200' : 'text-yellow-800 dark:text-yellow-200'}`}>صافي الربح</h3>
                        <p className={`text-3xl font-bold mt-2 ${financialSummary.netProfit >= 0 ? 'text-blue-600' : 'text-yellow-600'}`}>{financialSummary.netProfit.toFixed(2)} {settings?.currency}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-bold mb-4">تفاصيل المصروفات حسب الفئة</h3>
                {financialSummary.expenseChartData.length > 0 ? (
                    <div style={{ width: '100%', height: 300 }}>
                        <Suspense fallback={<div className="flex items-center justify-center h-full">جاري تحميل المخطط...</div>}>
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie
                                        data={financialSummary.expenseChartData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        dataKey="value"
                                        nameKey="name"
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {financialSummary.expenseChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => `${value.toFixed(2)} ${settings?.currency}`} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </Suspense>
                    </div>
                ) : (
                    <p className="text-center text-gray-500 py-8">لا توجد مصروفات في هذا النطاق الزمني.</p>
                )}
            </div>
        </div>
    );
};

export default Reports;
