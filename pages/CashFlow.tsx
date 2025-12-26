import React, { useEffect, useState } from 'react';
import { getCashFlow } from '../services/reportsService';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { useNotification } from '../contexts/NotificationContext';

const CashFlow: React.FC = () => {
  const { activeCompanyId } = useAuth();
  const { settings } = useSettings();
  const { addNotification } = useNotification();

  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    const fetch = async () => {
      if (!activeCompanyId) return;
      setLoading(true);
      try {
        const res = await getCashFlow(activeCompanyId, dateRange.start, dateRange.end);
        setResult(res);
      } catch (err: any) {
        addNotification(err?.message || 'فشل في تحميل التقرير', 'error');
      }
      setLoading(false);
    };
    fetch();
  }, [activeCompanyId, dateRange.start, dateRange.end, addNotification]);

  if (loading) return <div>جاري تحميل تقرير التدفقات النقدية...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">قائمة التدفقات النقدية (Direct)</h2>
        <div className="flex gap-4 mb-4">
          <div>
            <label className="block text-sm">من</label>
            <input type="date" value={dateRange.start} onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))} className="mt-1" />
          </div>
          <div>
            <label className="block text-sm">إلى</label>
            <input type="date" value={dateRange.end} onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))} className="mt-1" />
          </div>
        </div>

        {result ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white dark:bg-gray-900 border rounded">
              <h3 className="font-semibold">التدفقات التشغيلية</h3>
              <p>الواردات: <strong>{result.operatingIn.toFixed(2)} {settings?.currency}</strong></p>
              <p>المصروفات: <strong>-{result.operatingOut.toFixed(2)} {settings?.currency}</strong></p>
            </div>

            <div className="p-4 bg-white dark:bg-gray-900 border rounded">
              <h3 className="font-semibold">التدفقات الاستثمارية</h3>
              <p>المبيعات/تحويلات: <strong>{result.investingIn.toFixed(2)} {settings?.currency}</strong></p>
              <p>المشتريات: <strong>-{result.investingOut.toFixed(2)} {settings?.currency}</strong></p>
            </div>

            <div className="p-4 bg-white dark:bg-gray-900 border rounded">
              <h3 className="font-semibold">التدفقات التمويلية</h3>
              <p>إضافات المالك: <strong>{result.financingIn.toFixed(2)} {settings?.currency}</strong></p>
              <p>سحوبات/قروض: <strong>-{result.financingOut.toFixed(2)} {settings?.currency}</strong></p>
            </div>

            <div className="md:col-span-3 p-4 bg-white dark:bg-gray-900 border rounded">
              <h3 className="font-semibold">ملخص</h3>
              <p>رصيد افتتاحي: <strong>{result.openingCash.toFixed(2)} {settings?.currency}</strong></p>
              <p>صافي التدفق النقدي: <strong>{result.netCashFlow.toFixed(2)} {settings?.currency}</strong></p>
              <p>رصيد اختتامي: <strong>{result.closingCash.toFixed(2)} {settings?.currency}</strong> {result.closingCash < 0 && <span className="text-yellow-600">⚠️ رصيد سلبي</span>}</p>
              {result.unclassifiedCount > 0 && <p className="text-sm text-red-600">تحذير: هناك {result.unclassifiedCount} معاملة غير مصنفة. راجع قيود اليومية.</p>}
            </div>
          </div>
        ) : (
          <p>لا توجد بيانات للتاريخ المحدد.</p>
        )}
      </div>
    </div>
  );
};

export default CashFlow;
