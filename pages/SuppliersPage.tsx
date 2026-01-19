import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import TableSkeleton from '../components/TableSkeleton';
import EmptyState from '../components/EmptyState';
import { useAuth, useCanWrite } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import {
  getSuppliers,
  saveSupplier,
  deleteSupplier,
  getPurchases,
  getSupplierPaymentsBySupplierId,
  saveSupplierPayment,
} from '../services/dataService';
import { Supplier, SupplierPayment } from '../types';
import { mapFirestoreError } from '../services/firebaseErrors';
import { Modal } from '../components/ui/Modal';
import DateInput from '../components/ui/DateInput';
import { Select } from '../components/ui/Select';
import PrintableReport from '../components/PrintableReport';
import { exportElementAs } from '../services/exportUtils';
import { Timestamp } from 'firebase/firestore';
import { useSettings } from '../contexts/SettingsContext';

const PAYMENT_METHODS = [
  'كاش',
  'محفظة',
  'إنستاباي',
  'تحويل بنكي',
  'أخرى',
] as const;

const toIsoDate = (date: Date) => date.toISOString().split('T')[0];

const toDateValue = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const maybe = value as { toDate?: () => Date };
  if (typeof maybe.toDate === 'function') return maybe.toDate();
  return null;
};

const SuppliersPage: React.FC = () => {
  const { companyId } = useAuth();
  const canWriteSuppliers = useCanWrite('settings');
  const canManagePayments = useCanWrite('expenses');
  const { settings } = useSettings();
  const { addNotification } = useNotification();
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Supplier> | null>(null);
  const [saving, setSaving] = useState(false);
  const [statementOpen, setStatementOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [includeOpeningBalance, setIncludeOpeningBalance] = useState(true);
  const [dateRange, setDateRange] = useState(() => ({
    start: toIsoDate(new Date(new Date().setDate(new Date().getDate() - 90))),
    end: toIsoDate(new Date()),
  }));
  const printableRef = useRef<HTMLDivElement | null>(null);

  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_METHODS)[number] | ''>('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentSaving, setPaymentSaving] = useState(false);

  const fetchSuppliers = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await getSuppliers(companyId, { limit: 200 });
      setSuppliers(res.data || []);
    } catch (err: unknown) {
      addNotification(mapFirestoreError(err), 'error');
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [companyId]);

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!companyId || !editing) return;
    setSaving(true);
    try {
      await saveSupplier(companyId, editing as Record<string, unknown>);
      addNotification('تم حفظ بيانات المورد.', 'success');
      setFormOpen(false);
      setEditing(null);
      await fetchSuppliers();
    } catch (err: unknown) {
      addNotification(mapFirestoreError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!companyId) return;
    try {
      await deleteSupplier(companyId, id);
      addNotification('تم حذف المورد.', 'success');
      await fetchSuppliers();
    } catch (err: unknown) {
      addNotification(mapFirestoreError(err), 'error');
    }
  };

  const filtered = suppliers.filter((s) =>
    String(s.supplierName || '').toLowerCase().includes(search.toLowerCase())
  );

  const openStatement = async (supplier: Supplier) => {
    if (!companyId) return;
    setSelectedSupplier(supplier);
    setStatementOpen(true);
    try {
      const [purchaseRes, paymentRes] = await Promise.all([
        getPurchases(companyId, { filters: [['supplierId', '==', supplier.id]] }),
        getSupplierPaymentsBySupplierId(companyId, supplier.id),
      ]);
      setPurchases((purchaseRes as any).data || []);
      setSupplierPayments(paymentRes.data || []);
    } catch (err: unknown) {
      addNotification(mapFirestoreError(err), 'error');
    }
  };

  const openingBalance = useMemo(() => {
    const start = new Date(dateRange.start);
    start.setHours(0, 0, 0, 0);

    const purchasesBefore = purchases
      .map((p) => ({ p, date: toDateValue(p.createdAt) }))
      .filter((item) => item.date && item.date < start)
      .reduce((sum, item) => sum + Number(item.p.totalAmount || item.p.total || 0), 0);

    const paymentsBefore = supplierPayments
      .map((p) => ({ p, date: toDateValue(p.date) }))
      .filter((item) => item.date && item.date < start)
      .reduce((sum, item) => sum + Number(item.p.amount || 0), 0);

    return purchasesBefore - paymentsBefore;
  }, [purchases, supplierPayments, dateRange.start]);

  const statement = useMemo(() => {
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    end.setHours(23, 59, 59, 999);

    const purchaseRows = purchases
      .map((p) => ({ p, date: toDateValue(p.createdAt) }))
      .filter((item) => item.date && item.date >= start && item.date <= end)
      .map((item) => item.p);

    const paymentRows = supplierPayments
      .map((p) => ({ p, date: toDateValue(p.date) }))
      .filter((item) => item.date && item.date >= start && item.date <= end)
      .map((item) => item.p);

    const rows = [
      ...purchaseRows.map((p) => ({
        date: toDateValue(p.createdAt) || new Date(),
        description: `مشتريات${p.invoiceNumber ? ` #${p.invoiceNumber}` : ''}`,
        debit: Number(p.totalAmount || p.total || 0),
        credit: 0,
      })),
      ...paymentRows.map((p) => ({
        date: toDateValue(p.date) || new Date(),
        description: `دفعة (${p.method || 'أخرى'})${p.notes ? ` - ${p.notes}` : ''}`,
        debit: 0,
        credit: Number(p.amount || 0),
      })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    let running = includeOpeningBalance ? openingBalance : 0;
    const withBalance = rows.map((row) => {
      running += row.debit - row.credit;
      return { ...row, balance: running };
    });

    const totalPurchases = purchaseRows.reduce(
      (sum, p) => sum + Number(p.totalAmount || p.total || 0),
      0
    );
    const totalPaid = paymentRows.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    return {
      rows: withBalance,
      totalPurchases,
      totalPaid,
      remaining: totalPurchases - totalPaid,
    };
  }, [purchases, supplierPayments, dateRange, includeOpeningBalance, openingBalance]);

  const exportStatement = async (format: 'pdf' | 'png') => {
    if (!printableRef.current || !selectedSupplier) return;
    await exportElementAs(
      printableRef.current,
      `supplier-statement-${selectedSupplier.id}-${dateRange.start}-${dateRange.end}`,
      format
    );
  };

  const saveSupplierPay = async () => {
    if (!companyId || !selectedSupplier) return;
    if (!paymentMethod) {
      addNotification('اختر طريقة الدفع.', 'error');
      return;
    }
    if (paymentAmount <= 0) {
      addNotification('أدخل مبلغًا صحيحًا.', 'error');
      return;
    }
    const parsed = new Date(paymentDate);
    if (Number.isNaN(parsed.getTime())) {
      addNotification('تاريخ الدفع غير صحيح.', 'error');
      return;
    }
    setPaymentSaving(true);
    try {
      await saveSupplierPayment(companyId, {
        supplierId: selectedSupplier.id,
        supplierName: selectedSupplier.supplierName,
        amount: Number(paymentAmount),
        method: paymentMethod,
        date: Timestamp.fromDate(parsed),
        notes: paymentNotes || undefined,
        reference: paymentReference || undefined,
      });
      setPaymentAmount(0);
      setPaymentNotes('');
      setPaymentReference('');
      setPaymentMethod('');
      const paymentRes = await getSupplierPaymentsBySupplierId(companyId, selectedSupplier.id);
      setSupplierPayments(paymentRes.data || []);
      addNotification('تم تسجيل دفعة المورد.', 'success');
    } catch (err: unknown) {
      addNotification(mapFirestoreError(err), 'error');
    } finally {
      setPaymentSaving(false);
    }
  };

  if (loading) return <TableSkeleton cols={4} rows={8} />;

  return (
    <Card>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">الموردون</h2>
        <div className="flex gap-2">
          <Input placeholder="ابحث..." value={search} onChange={(e) => setSearch(e.target.value)} />
          {canWriteSuppliers && (
            <Button
              onClick={() => {
                setEditing({});
                setFormOpen(true);
              }}
            >
              إضافة مورد
            </Button>
          )}
        </div>
      </div>

      {filtered.length === 0 && (
        <EmptyState
          title="لا يوجد موردون بعد"
          message="ابدأ بإضافة مورد لإدارة المشتريات والمدفوعات."
          action={
            canWriteSuppliers
              ? {
                  text: 'إضافة مورد',
                  onClick: () => {
                    setEditing({});
                    setFormOpen(true);
                  },
                }
              : undefined
          }
        />
      )}

      {filtered.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-right">الاسم</th>
                <th className="px-4 py-2 text-right">الشركة</th>
                <th className="px-4 py-2 text-right">الهاتف</th>
                <th className="px-4 py-2 text-right">البريد</th>
                <th className="px-4 py-2 text-right">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={String(s.id)} className="hover:bg-gray-50">
                  <td className="px-4 py-2">{String(s.supplierName || '')}</td>
                  <td className="px-4 py-2">{String(s.companyName || '')}</td>
                  <td className="px-4 py-2">{String(s.phone || '')}</td>
                  <td className="px-4 py-2">{String(s.email || '')}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => openStatement(s)}>
                        كشف حساب
                      </Button>
                      {canWriteSuppliers && (
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setEditing(s);
                            setFormOpen(true);
                          }}
                        >
                          تعديل
                        </Button>
                      )}
                      {canWriteSuppliers && (
                        <Button variant="danger" onClick={() => handleDelete(String(s.id))}>
                          حذف
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && (
        <form onSubmit={handleSave} className="mt-4 space-y-3">
          <Input
            placeholder="اسم المورد"
            value={editing?.supplierName || ''}
            onChange={(e) => setEditing({ ...editing, supplierName: e.target.value })}
            required
          />
          <Input
            placeholder="اسم الشركة"
            value={editing?.companyName || ''}
            onChange={(e) => setEditing({ ...editing, companyName: e.target.value })}
          />
          <Input
            placeholder="رقم الهاتف"
            value={editing?.phone || ''}
            onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
          />
          <Input
            placeholder="البريد الإلكتروني"
            value={editing?.email || ''}
            onChange={(e) => setEditing({ ...editing, email: e.target.value })}
          />
          <Input
            placeholder="العنوان"
            value={editing?.address || ''}
            onChange={(e) => setEditing({ ...editing, address: e.target.value })}
          />
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setFormOpen(false);
                setEditing(null);
              }}
            >
              إلغاء
            </Button>
          </div>
        </form>
      )}

      <Modal
        isOpen={statementOpen}
        onClose={() => setStatementOpen(false)}
        title={`كشف حساب المورد - ${selectedSupplier?.supplierName || ''}`}
      >
        {selectedSupplier && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <DateInput
                label="من"
                name="supplierStart"
                value={dateRange.start}
                onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
              />
              <DateInput
                label="إلى"
                name="supplierEnd"
                value={dateRange.end}
                onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
              />
              <div className="flex gap-2 items-end">
                <Button variant="secondary" onClick={() => exportStatement('pdf')}>
                  تصدير PDF
                </Button>
                <Button variant="secondary" onClick={() => exportStatement('png')}>
                  تصدير PNG
                </Button>
              </div>
            </div>

            <div className="flex gap-4 items-center text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="openingBalance"
                  checked={!includeOpeningBalance}
                  onChange={() => setIncludeOpeningBalance(false)}
                />
                حركات الفترة فقط
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="openingBalance"
                  checked={includeOpeningBalance}
                  onChange={() => setIncludeOpeningBalance(true)}
                />
                مع رصيد افتتاحي
              </label>
              {includeOpeningBalance && (
                <span className="text-gray-600">
                  الرصيد الافتتاحي: {openingBalance.toFixed(2)} {settings?.currency || ''}
                </span>
              )}
            </div>

            {canManagePayments && (
              <div className="border border-gray-200 rounded p-3">
                <h4 className="font-semibold mb-2">تسجيل دفعة للمورد</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    label="المبلغ"
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  />
                  <DateInput
                    label="تاريخ الدفع"
                    name="supplierPayDate"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                  <Select
                    label="طريقة الدفع"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as (typeof PAYMENT_METHODS)[number])}
                    options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))}
                  />
                  <Input
                    label="مرجع التحويل (اختياري)"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                  />
                  <Input
                    label="ملاحظات (اختياري)"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                  />
                </div>
                <div className="flex justify-end mt-3">
                  <Button onClick={saveSupplierPay} loading={paymentSaving}>
                    حفظ الدفعة
                  </Button>
                </div>
              </div>
            )}

            {!canManagePayments && (
              <div className="text-sm text-warning-700 bg-warning-50 border border-warning-200 rounded p-3">
                لا تملك صلاحية تسجيل دفعات الموردين.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-center">
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="text-xs text-gray-500">إجمالي المشتريات</div>
                <div className="text-lg font-semibold">
                  {statement.totalPurchases.toFixed(2)} {settings?.currency || ''}
                </div>
              </div>
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="text-xs text-gray-500">إجمالي المدفوع</div>
                <div className="text-lg font-semibold">
                  {statement.totalPaid.toFixed(2)} {settings?.currency || ''}
                </div>
              </div>
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="text-xs text-gray-500">المتبقي</div>
                <div className="text-lg font-semibold">
                  {statement.remaining.toFixed(2)} {settings?.currency || ''}
                </div>
              </div>
            </div>

            <div ref={printableRef}>
              <PrintableReport
                reportTitle="كشف حساب مورد"
                companyName={settings?.businessName || 'الشركة'}
                logoUrl={settings?.logo}
                address={settings?.address}
                phone={settings?.contactInfo}
                dateRangeLabel={`الفترة من ${dateRange.start} إلى ${dateRange.end}`}
                summaryItems={[
                  {
                    label: 'الرصيد الافتتاحي',
                    value: `${openingBalance.toFixed(2)} ${settings?.currency || ''}`,
                  },
                  {
                    label: 'إجمالي المشتريات',
                    value: `${statement.totalPurchases.toFixed(2)} ${settings?.currency || ''}`,
                  },
                  {
                    label: 'إجمالي المدفوع',
                    value: `${statement.totalPaid.toFixed(2)} ${settings?.currency || ''}`,
                  },
                  {
                    label: 'المتبقي',
                    value: `${statement.remaining.toFixed(2)} ${settings?.currency || ''}`,
                  },
                ]}
              >
                {statement.rows.length === 0 ? (
                  <p className="text-gray-600 text-center py-6">
                    لا توجد حركات خلال هذه الفترة.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-right text-sm font-semibold text-gray-600">
                            التاريخ
                          </th>
                          <th className="px-4 py-2 text-right text-sm font-semibold text-gray-600">
                            البيان
                          </th>
                          <th className="px-4 py-2 text-right text-sm font-semibold text-gray-600">
                            مدين
                          </th>
                          <th className="px-4 py-2 text-right text-sm font-semibold text-gray-600">
                            دائن
                          </th>
                          <th className="px-4 py-2 text-right text-sm font-semibold text-gray-600">
                            الرصيد
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {statement.rows.map((row, idx) => (
                          <tr key={`${row.description}-${idx}`}>
                            <td className="px-4 py-2 text-right">
                              {row.date.toLocaleDateString('ar-EG')}
                            </td>
                            <td className="px-4 py-2 text-right">{row.description}</td>
                            <td className="px-4 py-2 text-right">
                              {row.debit ? row.debit.toFixed(2) : '-'}
                            </td>
                            <td className="px-4 py-2 text-right">
                              {row.credit ? row.credit.toFixed(2) : '-'}
                            </td>
                            <td className="px-4 py-2 text-right">{row.balance.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </PrintableReport>
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
};

export default SuppliersPage;
