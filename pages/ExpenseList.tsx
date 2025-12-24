

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getExpenses, deleteExpense, undeleteDocument } from '../services/dataService';
import { Expense } from '../types';
import { PlusIcon, PencilIcon, TrashIcon, CurrencyDollarIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useSettings } from '../contexts/SettingsContext';
import TableSkeleton from '../components/TableSkeleton';
import EmptyState from '../components/EmptyState';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth, useCanWrite } from '../contexts/AuthContext';
// Dynamically load Recharts to reduce bundle size
type ChartDatum = { name: string; value: number };
function ExpenseChartLoader({ data, colors, currency }: { data: ChartDatum[]; colors: string[]; currency?: string }) {
    const [R, setR] = useState<any | null>(null);
    useEffect(() => {
        let mounted = true;
        import('recharts')
            .then(mod => { if (mounted) setR(mod); })
            .catch(() => {});
        return () => { mounted = false; };
    }, []);

    if (!R) return <CardSkeleton />;
    const { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } = R;
    return (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie data={data} cx="50%" cy="50%" labelLine={false} outerRadius={70} fill="#8884d8" dataKey="value">
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value.toFixed(2)} ${currency}`} />
                <Legend />
            </PieChart>
        </ResponsiveContainer>
    );
}
import { Card } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { CardSkeleton } from '../components/ui/CardSkeleton';
import { mapFirestoreError } from '../services/firebaseErrors';

const ExpenseSummary: React.FC<{ expenses: Expense[] }> = ({ expenses }) => {
    const { settings } = useSettings();
    const { totalThisMonth, chartData } = useMemo(() => {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisMonthExpenses = expenses.filter(e => new Date(e.date) >= firstDayOfMonth);
        
        // FIX: Explicitly typed the `acc` parameter in `reduce` to be `Record<string, number>`
        // to resolve the implicit 'any' type error on the accumulator.
        const expensesByCategory = thisMonthExpenses.reduce((acc: Record<string, number>, expense) => {
            const category = expense.category || 'غير مصنف';
            acc[category] = (acc[category] || 0) + (Number(expense.amount) || 0);
            return acc;
        }, {});

        const totalThisMonth = thisMonthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        const chartData = Object.entries(expensesByCategory)
            .map(([name, value]) => ({ name, value: Number(value) }))
            .sort((a,b) => Number(b.value) - Number(a.value));

        return { totalThisMonth, chartData };
    }, [expenses]);
    
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1943'];

    return (
        <Card header={<h2 className="text-xl font-bold">ملخص المصروفات (هذا الشهر)</h2>}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 flex flex-col items-center justify-center bg-danger-50 dark:bg-danger-900/30 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-danger-800 dark:text-danger-200">إجمالي المصروفات</h3>
                    <p className="text-3xl font-bold mt-2 text-danger-600">{totalThisMonth.toFixed(2)} {settings?.currency}</p>
                </div>
                <div className="md:col-span-2 h-48">
                    {chartData.length > 0 ? (
                        <ExpenseChartLoader data={chartData} colors={COLORS} currency={settings?.currency} />
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">لا توجد مصروفات هذا الشهر.</div>
                    )}
                </div>
            </div>
        </Card>
    )
}

const ExpenseCard: React.FC<{ expense: Expense, currency?: string, canWrite: boolean, onDelete: (id: string) => void }> = ({ expense, currency, canWrite, onDelete }) => (
    <Card padding="sm" className="md:hidden">
        <div className="flex justify-between items-start mb-2">
            <div>
                <h3 className="font-bold text-lg">{expense.vendor}</h3>
                <p className="text-sm text-gray-500">{expense.category}</p>
            </div>
            <p className="font-semibold text-danger-600">{expense.amount.toFixed(2)} {currency}</p>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 truncate">{expense.description}</p>
        {canWrite && (
             <div className="flex gap-2 mt-3 border-t border-gray-200 dark:border-gray-700 pt-3">
                <Link to={`/expenses/edit/${expense.id}`} className="flex-1">
                    <Button variant="secondary" size="sm" className="w-full">
                        <PencilIcon className="h-4 w-4 me-2" /> تعديل
                    </Button>
                </Link>
                <Button variant="danger" size="sm" className="flex-1" onClick={() => onDelete(expense.id)}>
                    <TrashIcon className="h-4 w-4 me-2" /> حذف
                </Button>
            </div>
        )}
    </Card>
);


const PAGE_SIZE = 15;

const ExpenseList: React.FC = () => {
  const { activeCompanyId } = useAuth();
  const canWrite = useCanWrite('expenses');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [allExpensesForSummary, setAllExpensesForSummary] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string | 'All'>('All');
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  const [nextCursor, setNextCursor] = useState<any | null>(null);
  const [prevCursors, setPrevCursors] = useState<any[]>([]);
  const [isLastPage, setIsLastPage] = useState(false);

  const { settings, loading: settingsLoading } = useSettings();
  const navigate = useNavigate();
  const { addNotification } = useNotification();

  const fetchExpenses = useCallback(async (cursor?: any, direction: 'next' | 'prev' = 'next') => {
      if (!activeCompanyId) return;
      setLoading(true);
      try {
        const result = await getExpenses(activeCompanyId, {
            limit: PAGE_SIZE,
            startAfter: cursor,
        });

        setExpenses(result.data);
        setNextCursor(result.nextCursor);
        setIsLastPage(!result.nextCursor || result.data.length < PAGE_SIZE);

        if (direction === 'next') {
            if (cursor) setPrevCursors(prev => [...prev, cursor]);
        } else {
            setPrevCursors(prev => prev.slice(0, prev.length - 1));
        }
      } catch (error: any) {
          addNotification(mapFirestoreError(error), "error");
          setExpenses([]);
      } finally {
          setLoading(false);
      }
  }, [activeCompanyId, addNotification]);

  useEffect(() => {
    fetchExpenses();
    if (activeCompanyId) {
        getExpenses(activeCompanyId).then(res => {
            setAllExpensesForSummary(res.data || []);
        });
    }
  }, [activeCompanyId, fetchExpenses]);

  const handleNextPage = () => { if (nextCursor) fetchExpenses(nextCursor, 'next'); };
  const handlePrevPage = () => {
    if (prevCursors.length > 0) {
      fetchExpenses(prevCursors[prevCursors.length - 2], 'prev');
    } else {
      fetchExpenses(undefined, 'prev');
    }
  };

  const confirmDelete = async () => {
    if (expenseToDelete && activeCompanyId) {
        try {
            const result = await deleteExpense(activeCompanyId, expenseToDelete.id);
                        if (result) {
                                addNotification('تم حذف المصروف بنجاح!', 'success', {
                                    label: 'تراجع',
                                    onClick: async () => {
                                        try {
                                            const ok = await undeleteDocument(activeCompanyId, 'expenses', expenseToDelete.id);
                                            if (ok) await fetchExpenses(prevCursors[prevCursors.length - 1] || undefined);
                                        } catch (e) { console.error(e); }
                                    }
                                });
                                fetchExpenses(prevCursors[prevCursors.length - 1] || undefined);
            } else {
                addNotification('فشل حذف المصروف.', 'error');
            }
        } catch (error: any) {
            addNotification(mapFirestoreError(error), 'error');
        }
    }
    setExpenseToDelete(null);
  }

  const { filteredExpenses, availableCategories } = useMemo(() => {
    const availableCategories = [...new Set(allExpensesForSummary.map(e => e.category))];
    const filteredExpenses = expenses
        .filter(expense => categoryFilter === 'All' || expense.category === categoryFilter)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return { filteredExpenses, availableCategories };
  }, [expenses, allExpensesForSummary, categoryFilter]);

  if (loading || settingsLoading) return <TableSkeleton cols={6} rows={PAGE_SIZE} />;

  if (allExpensesForSummary.length === 0 && !loading) {
    return (
      <EmptyState
        icon={<CurrencyDollarIcon className="h-8 w-8" />}
        title="لا توجد مصروفات بعد"
        message="ابدأ بتسجيل مصروفاتك لتتبع نفقات عملك."
        action={canWrite ? { text: 'إضافة مصروف', onClick: () => navigate('/expenses/new')} : undefined}
      />
    );
  }

  return (
    <div className="space-y-6">
      <ExpenseSummary expenses={allExpensesForSummary} />
      <Card>
        <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
          <Select 
              value={categoryFilter} 
              onChange={e => setCategoryFilter(e.target.value)}
              options={[{ value: 'All', label: 'كل الفئات' }, ...availableCategories.map(cat => ({ value: cat, label: cat }))]}
              className="w-full md:w-auto"
          />
          {canWrite && (
              <Link to="/expenses/new" className="w-full md:w-auto">
                <Button variant="primary" className="w-full">
                    <PlusIcon className="h-5 w-5 me-2" />
                    إضافة مصروف
                </Button>
              </Link>
          )}
        </div>
        
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">التاريخ</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">الفئة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">البائع</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">المبلغ</th>
                {canWrite && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">إجراءات</th>}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredExpenses.map(expense => (
                <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap">{new Date(expense.date).toLocaleDateString('ar-EG')}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{expense.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{expense.vendor}</td>
                  <td className="px-6 py-4 whitespace-nowrap font-semibold text-danger-600">{expense.amount.toFixed(2)} {settings?.currency}</td>
                  {canWrite && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                          <Link to={`/expenses/edit/${expense.id}`} className="text-gray-600 hover:text-gray-900 p-2" aria-label="تعديل المصروف"><PencilIcon className="h-5 w-5" /></Link>
                          <button onClick={() => setExpenseToDelete(expense)} className="text-danger-600 hover:text-danger-700 p-2" aria-label="حذف المصروف"><TrashIcon className="h-5 w-5" /></button>
                      </div>
                      </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="md:hidden space-y-4 mt-4">
            {filteredExpenses.map(expense => (
                <ExpenseCard key={expense.id} expense={expense} currency={settings?.currency} canWrite={canWrite} onDelete={() => setExpenseToDelete(expense)} />
            ))}
        </div>

        <div className="flex justify-center items-center mt-6 gap-2">
            <Button onClick={handlePrevPage} disabled={prevCursors.length === 0} variant="secondary" size="sm" aria-label="Previous Page"><ChevronRightIcon className="h-5 w-5" /></Button>
            <Button onClick={handleNextPage} disabled={isLastPage} variant="secondary" size="sm" aria-label="Next Page"><ChevronLeftIcon className="h-5 w-5" /></Button>
        </div>

        {filteredExpenses.length === 0 && (
            <div className="text-center py-10">
                <p>لا توجد مصروفات تطابق بحثك.</p>
            </div>
        )}

        <Modal isOpen={!!expenseToDelete} onClose={() => setExpenseToDelete(null)} title="تأكيد الحذف">
            <p>هل أنت متأكد من رغبتك في حذف هذا المصروف؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="flex justify-end gap-4 mt-6">
                <Button variant="secondary" onClick={() => setExpenseToDelete(null)}>إلغاء</Button>
                <Button variant="danger" onClick={confirmDelete}>حذف</Button>
            </div>
        </Modal>
      </Card>
    </div>
  );
};

export default ExpenseList;