
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getInvoices, getCustomers, getPayments, getExpenses, generateInvoicesFromRecurring, getProducts } from '../services/dataService';
import { Invoice, Customer, Payment, InvoiceStatus, Expense, Product } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { UsersIcon, BanknotesIcon, ExclamationTriangleIcon, CurrencyDollarIcon, ArrowPathIcon, DocumentPlusIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth, useCanWrite } from '../contexts/AuthContext';
import { mapFirestoreError } from '../services/firebaseErrors';
import { Card } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { Button } from '../components/ui/Button';
import { CardSkeleton } from '../components/ui/CardSkeleton';

const LOW_STOCK_THRESHOLD = 10;

const Dashboard: React.FC = () => {
  const { activeCompanyId } = useAuth();
  const canWrite = useCanWrite('invoices');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { settings, loading: settingsLoading } = useSettings();
  const { addNotification } = useNotification();

  const fetchData = useCallback(async () => {
      if (!activeCompanyId) return;
      setLoading(true);
      try {
        const [invoicesRes, customersRes, paymentsRes, expensesRes, productsRes] = await Promise.all([
          getInvoices(activeCompanyId),
          getCustomers(activeCompanyId),
          getPayments(activeCompanyId),
          getExpenses(activeCompanyId),
          getProducts(activeCompanyId),
        ]);
        setInvoices(invoicesRes.data || []);
        setCustomers(customersRes.data || []);
        setPayments(paymentsRes.data || []);
        setExpenses(expensesRes.data || []);
        setProducts(productsRes.data || []);
      } catch (error: any) {
        console.error("Failed to fetch dashboard data:", { message: error.message, code: error.code });
        addNotification("فشل تحميل بيانات الملخص.", "error");
      } finally {
        setLoading(false);
      }
    }, [activeCompanyId, addNotification]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGenerateRecurring = async () => {
    if (!activeCompanyId || !canWrite) return;
    setGenerating(true);
    try {
        const generated = await generateInvoicesFromRecurring(activeCompanyId);
        if (generated.length > 0) {
            addNotification(`تم إنشاء ${generated.length} فاتورة متكررة بنجاح!`, 'success');
            fetchData();
        } else {
            addNotification('لا توجد فواتير متكررة مستحقة للإنشاء اليوم.', 'info');
        }
    } catch (error) {
        addNotification(mapFirestoreError(error), 'error');
    } finally {
        setGenerating(false);
    }
  }

  const { overdueInvoices, lowStockProducts, totalRevenue, totalExpenses, newCustomersCount } = useMemo(() => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const newCustomersCount = customers.filter(c => c.createdAt && new Date(c.createdAt) >= thirtyDaysAgo).length;
      const overdueInvoices = invoices
        .filter(inv => inv.status === InvoiceStatus.Due && new Date(inv.dueDate) < new Date())
        .sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      const lowStockProducts = products
        .filter(p => p.stock <= LOW_STOCK_THRESHOLD)
        .sort((a,b) => a.stock - b.stock);

      const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);
      const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

      return { overdueInvoices, lowStockProducts, totalRevenue, totalExpenses, newCustomersCount };
  }, [invoices, products, payments, expenses, customers]);

  const cashFlowData = useMemo(() => {
    const data = Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        return { name: d.toLocaleString('default', { month: 'short', year: '2-digit' }), moneyIn: 0, moneyOut: 0 };
    }).reverse();

    payments.forEach(payment => {
        const monthName = new Date(payment.date).toLocaleString('default', { month: 'short', year: '2-digit' });
        const monthData = data.find(d => d.name === monthName);
        if (monthData) monthData.moneyIn += payment.amount;
    });

    expenses.forEach(expense => {
        const monthName = new Date(expense.date).toLocaleString('default', { month: 'short', year: '2-digit' });
        const monthData = data.find(d => d.name === monthName);
        if (monthData) monthData.moneyOut += expense.amount;
    });

    return data;
  }, [payments, expenses]);


  const [Recharts, setRecharts] = useState<any | null>(null);

  useEffect(() => {
    let mounted = true;
    import('recharts').then(mod => { if (mounted) setRecharts(mod); }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  if (loading || settingsLoading) {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CardSkeleton />
                <CardSkeleton />
            </div>
        </div>
    );
  }
  
  return (
    <div className="space-y-6">
        {canWrite && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Link to="/invoices/new" className="bg-primary-600 text-white rounded-lg shadow-lg hover:bg-primary-700 transition-colors p-6 flex items-center justify-center">
                    <DocumentPlusIcon className="h-8 w-8 me-4" />
                    <span className="text-xl font-bold">إنشاء فاتورة جديدة</span>
                </Link>
                <Link to="/customers/new" className="bg-success-600 text-white rounded-lg shadow-lg hover:bg-success-700 transition-colors p-6 flex items-center justify-center">
                    <UserPlusIcon className="h-8 w-8 me-4" />
                    <span className="text-xl font-bold">إضافة عميل جديد</span>
                </Link>
            </div>
        )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="إجمالي الإيرادات" value={`${totalRevenue.toFixed(2)} ${settings?.currency}`} icon={<BanknotesIcon className="h-6 w-6 text-primary-600" />} />
        <StatCard title="إجمالي المصروفات" value={`${totalExpenses.toFixed(2)} ${settings?.currency}`} icon={<CurrencyDollarIcon className="h-6 w-6 text-primary-600" />} />
        <StatCard title="العملاء الجدد (آخر 30 يوم)" value={String(newCustomersCount)} icon={<UsersIcon className="h-6 w-6 text-primary-600" />} />
        <StatCard title="الفواتير المتأخرة" value={String(overdueInvoices.length)} icon={<ExclamationTriangleIcon className="h-6 w-6 text-primary-600" />} />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card header={<h3 className="font-bold text-xl">الفواتير المتأخرة</h3>}>
            <div className="space-y-3">
                {overdueInvoices.length > 0 ? overdueInvoices.slice(0, 5).map(inv => (
                    <Link to={`/invoices/${inv.id}`} key={inv.id} className="flex justify-between items-center p-3 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <div>
                            <p className="font-semibold">{inv.customerName}</p>
                            <p className="text-sm text-gray-500">{inv.invoiceNumber}</p>
                        </div>
                        <div className="text-left">
                             <p className="font-bold text-danger-600">{inv.total.toFixed(2)} {settings?.currency}</p>
                             <p className="text-xs text-gray-400">مستحقة منذ {Math.floor((new Date().getTime() - new Date(inv.dueDate).getTime()) / (1000 * 3600 * 24))} يوم</p>
                        </div>
                    </Link>
                )) : <p className="text-center text-gray-500 py-4">لا توجد فواتير متأخرة. عمل رائع!</p>}
            </div>
        </Card>
         <Card header={<h3 className="font-bold text-xl">المنتجات ذات المخزون المنخفض</h3>}>
             <div className="space-y-3">
                {lowStockProducts.length > 0 ? lowStockProducts.slice(0, 5).map(product => (
                    <Link to={`/products/edit/${product.id}`} key={product.id} className="flex justify-between items-center p-3 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <p className="font-semibold">{product.name}</p>
                        <span className="font-bold text-warning-700 bg-warning-100 dark:bg-warning-900/50 px-2 py-1 text-xs rounded-full">{product.stock} متبقي</span>
                    </Link>
                )) : <p className="text-gray-500 dark:text-gray-400 text-center py-4">لا توجد منتجات منخفضة المخزون.</p>}
            </div>
        </Card>
      </div>

      {canWrite && (
        <Card>
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold">الفواتير المتكررة</h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        انقر على الزر لإنشاء أي فواتير متكررة حان موعد إصدارها اليوم.
                    </p>
                </div>
                <Button onClick={handleGenerateRecurring} loading={generating} size="md">
                    <ArrowPathIcon className={`h-5 w-5 me-2 ${generating ? 'animate-spin' : ''}`} />
                    {generating ? 'جاري الإنشاء...' : 'إنشاء الفواتير المستحقة'}
                </Button>
            </div>
        </Card>
      )}

      <Card header={<h2 className="text-xl font-bold">ملخص التدفق النقدي (آخر 6 أشهر)</h2>}>
        <div style={{ width: '100%', height: 300 }}>
            {Recharts ? (
              (() => {
                const { ResponsiveContainer: RC, LineChart: LC, CartesianGrid: CG, XAxis: X, YAxis: Y, Tooltip: T, Legend: L, Line: LN } = Recharts;
                return (
                  <RC>
                    <LC data={cashFlowData}>
                      <CG strokeDasharray="3 3" strokeOpacity={0.2} />
                      <X dataKey="name" />
                      <Y />
                      <T formatter={(value: number) => `${value.toFixed(2)} ${settings?.currency}`} />
                      <L />
                      <LN type="monotone" dataKey="moneyIn" name="الأموال الداخلة" stroke="#16a34a" strokeWidth={2} />
                      <LN type="monotone" dataKey="moneyOut" name="الأموال الخارجة" stroke="#dc2626" strokeWidth={2} />
                    </LC>
                  </RC>
                );
              })()
            ) : (
              <div className="flex items-center justify-center h-full"><CardSkeleton /></div>
            )}
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;
