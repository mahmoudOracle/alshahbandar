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
  getSupplierPayments,
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
import { t } from '../src/i18n/t';
import { getTodayISO, toISODateCairo } from '../src/utils/date';

const PAYMENT_METHODS = [
  'cash',
  'wallet',
  'instapay',
  'bank_transfer',
  'other',
] as const;

const getSupplierPaymentMethodLabel = (method: typeof PAYMENT_METHODS[number] | ''): string => {
  if (!method) return '';
  const methodMap: Record<typeof PAYMENT_METHODS[number], string> = {
    'cash': t('suppliersPaymentCash'),
    'wallet': t('suppliersPaymentWallet'),
    'instapay': t('suppliersPaymentInstapay'),
    'bank_transfer': t('suppliersPaymentBank'),
    'other': t('suppliersPaymentOther'),
  };
  return methodMap[method] || '';
};

const STATEMENT_PAGE_SIZE = 50;
const SUPPLIERS_PAGE_SIZE = 50;

const toIsoDate = (date: Date) => toISODateCairo(date);

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
  const [nextCursor, setNextCursor] = useState<unknown | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Supplier> | null>(null);
  const [saving, setSaving] = useState(false);
  const [statementOpen, setStatementOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [purchaseCursor, setPurchaseCursor] = useState<unknown | null>(null);
  const [paymentCursor, setPaymentCursor] = useState<unknown | null>(null);
  const [statementLoading, setStatementLoading] = useState(false);
  const [statementLoadingMore, setStatementLoadingMore] = useState(false);
  const [includeOpeningBalance, setIncludeOpeningBalance] = useState(true);
  const [dateRange, setDateRange] = useState(() => ({
    start: toIsoDate(new Date(new Date().setDate(new Date().getDate() - 90))),
    end: toIsoDate(new Date()),
  }));
  const printableRef = useRef<HTMLDivElement | null>(null);

  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentDate, setPaymentDate] = useState(getTodayISO());
  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_METHODS)[number] | ''>('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentSaving, setPaymentSaving] = useState(false);

  const fetchSuppliers = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await getSuppliers(companyId, { limit: SUPPLIERS_PAGE_SIZE });
      setSuppliers(res.data || []);
      setNextCursor(res.nextCursor ?? null);
    } catch (err: unknown) {
      addNotification(mapFirestoreError(err), 'error');
      setSuppliers([]);
      setNextCursor(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [companyId]);

  const loadMoreSuppliers = async () => {
    if (!companyId || !nextCursor) return;
    setLoadingMore(true);
    try {
      const res = await getSuppliers(companyId, {
        limit: SUPPLIERS_PAGE_SIZE,
        startAfter: nextCursor as any,
      });
      setSuppliers((prev) => [...prev, ...(res.data || [])]);
      setNextCursor(res.nextCursor ?? null);
    } catch (err: unknown) {
      addNotification(mapFirestoreError(err), 'error');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!companyId || !editing) return;
    setSaving(true);
    try {
      await saveSupplier(companyId, editing as Record<string, unknown>);
      addNotification(t('suppliersSaveSuccess'), 'success');
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
      addNotification(t('suppliersDeleteSuccess'), 'success');
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
    setStatementLoading(true);
    setPurchaseCursor(null);
    setPaymentCursor(null);
    try {
      const [purchaseRes, paymentRes] = await Promise.all([
        getPurchases(companyId, { filters: [['supplierId', '==', supplier.id]], limit: STATEMENT_PAGE_SIZE }),
        getSupplierPayments(companyId, { filters: [['supplierId', '==', supplier.id]], limit: STATEMENT_PAGE_SIZE }),
      ]);
      setPurchases((purchaseRes as any).data || []);
      setSupplierPayments(paymentRes.data || []);
      setPurchaseCursor((purchaseRes as any).nextCursor ?? null);
      setPaymentCursor(paymentRes.nextCursor ?? null);
    } catch (err: unknown) {
      addNotification(mapFirestoreError(err), 'error');
    } finally {
      setStatementLoading(false);
    }
  };

  const loadMoreStatement = async () => {
    if (!companyId || !selectedSupplier) return;
    if (!purchaseCursor && !paymentCursor) return;
    setStatementLoadingMore(true);
    try {
      const [purchaseRes, paymentRes] = await Promise.all([
        purchaseCursor
          ? getPurchases(companyId, {
              filters: [['supplierId', '==', selectedSupplier.id]],
              limit: STATEMENT_PAGE_SIZE,
              startAfter: purchaseCursor,
            })
          : Promise.resolve(null),
        paymentCursor
          ? getSupplierPayments(companyId, {
              filters: [['supplierId', '==', selectedSupplier.id]],
              limit: STATEMENT_PAGE_SIZE,
              startAfter: paymentCursor,
            })
          : Promise.resolve(null),
      ]);
      if (purchaseRes) {
        setPurchases((prev) => [...prev, ...(purchaseRes as any).data || []]);
        setPurchaseCursor((purchaseRes as any).nextCursor ?? null);
      }
      if (paymentRes) {
        setSupplierPayments((prev) => [...prev, ...(paymentRes.data || [])]);
        setPaymentCursor(paymentRes.nextCursor ?? null);
      }
    } catch (err: unknown) {
      addNotification(mapFirestoreError(err), 'error');
    } finally {
      setStatementLoadingMore(false);
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
        description: t('suppliersPurchaseDesc', { invoice: p.invoiceNumber ? ` #${p.invoiceNumber}` : '' }),
        debit: Number(p.totalAmount || p.total || 0),
        credit: 0,
      })),
      ...paymentRows.map((p) => ({
        date: toDateValue(p.date) || new Date(),
        description: t('suppliersPaymentDesc', { method: p.method || t('suppliersPaymentOther'), notes: p.notes ? ` - ${p.notes}` : '' }),
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
      addNotification(t('suppliersPaymentSelectMethod'), 'error');
      return;
    }
    if (paymentAmount <= 0) {
      addNotification(t('suppliersPaymentEnterAmount'), 'error');
      return;
    }
    const parsed = new Date(paymentDate);
    if (Number.isNaN(parsed.getTime())) {
      addNotification(t('suppliersPaymentInvalidDate'), 'error');
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
      const paymentRes = await getSupplierPayments(companyId, {
        filters: [['supplierId', '==', selectedSupplier.id]],
        limit: STATEMENT_PAGE_SIZE,
      });
      setSupplierPayments(paymentRes.data || []);
      setPaymentCursor(paymentRes.nextCursor ?? null);
      addNotification(t('suppliersPaymentSaved'), 'success');
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
        <h2 className="text-xl font-bold">{t('suppliersTitle')}</h2>
        <div className="flex gap-2">
          <Input placeholder={t('suppliersSearch')} value={search} onChange={(e) => setSearch(e.target.value)} />
          {canWriteSuppliers && (
            <Button
              onClick={() => {
                setEditing({});
                setFormOpen(true);
              }}
            >
              {t('suppliersAdd')}
            </Button>
          )}
        </div>
      </div>

      {filtered.length === 0 && (
        <EmptyState
          title={t('suppliersEmptyTitle')}
          message={t('suppliersEmptyMessage')}
          action={
            canWriteSuppliers
              ? {
                  text: t('suppliersAdd'),
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
                <th className="px-4 py-2 text-right">{t('customerFormName')}</th>
                <th className="px-4 py-2 text-right">{t('suppliersCompanyLabel')}</th>
                <th className="px-4 py-2 text-right">{t('suppliersPhoneLabel')}</th>
                <th className="px-4 py-2 text-right">{t('suppliersEmailLabel')}</th>
                <th className="px-4 py-2 text-right">{t('suppliersActionsLabel')}</th>
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
                        {t('suppliersAccountStatement')}
                      </Button>
                      {canWriteSuppliers && (
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setEditing(s);
                            setFormOpen(true);
                          }}
                        >
                          {t('suppliersEdit')}
                        </Button>
                      )}
                      {canWriteSuppliers && (
                        <Button variant="danger" onClick={() => handleDelete(String(s.id))}>
                          {t('suppliersDelete')}
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
      {nextCursor && filtered.length > 0 && (
        <div className="flex justify-center mt-4">
          <Button variant="secondary" onClick={loadMoreSuppliers} loading={loadingMore}>
            {t('suppliersLoadMore')}
          </Button>
        </div>
      )}
      {formOpen && (
        <form onSubmit={handleSave} className="mt-4 space-y-3">
          <Input
            placeholder={t('suppliersNamePlaceholder')}
            value={editing?.supplierName || ''}
            onChange={(e) => setEditing({ ...editing, supplierName: e.target.value })}
            required
          />
          <Input
            placeholder={t('suppliersCompanyPlaceholder')}
            value={editing?.companyName || ''}
            onChange={(e) => setEditing({ ...editing, companyName: e.target.value })}
          />
          <Input
            placeholder={t('suppliersPhonePlaceholder')}
            value={editing?.phone || ''}
            onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
          />
          <Input
            placeholder={t('suppliersEmailPlaceholder')}
            value={editing?.email || ''}
            onChange={(e) => setEditing({ ...editing, email: e.target.value })}
          />
          <Input
            placeholder={t('suppliersAddressPlaceholder')}
            value={editing?.address || ''}
            onChange={(e) => setEditing({ ...editing, address: e.target.value })}
          />
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? t('suppliersSaving') : t('commonSave')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setFormOpen(false);
                setEditing(null);
              }}
            >
              {t('commonCancel')}
            </Button>
          </div>
        </form>
      )}

      <Modal
        isOpen={statementOpen}
        onClose={() => setStatementOpen(false)}
        title={t('suppliersStatementTitle', { name: selectedSupplier?.supplierName || '' })}
      >
        {selectedSupplier && (
          <div className="space-y-4">
            {statementLoading && (
              <div className="text-center text-sm text-gray-500">
                {t('suppliersStatementLoading')}
              </div>
            )}
            <div className="flex flex-col md:flex-row gap-3">
              <DateInput
                label={t('suppliersStatementFrom')}
                name="supplierStart"
                value={dateRange.start}
                onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
              />
              <DateInput
                label={t('suppliersStatementTo')}
                name="supplierEnd"
                value={dateRange.end}
                onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
              />
              <div className="flex gap-2 items-end">
                <Button variant="secondary" onClick={() => exportStatement('pdf')}>
                  {t('suppliersStatementPdf')}
                </Button>
                <Button variant="secondary" onClick={() => exportStatement('png')}>
                  {t('suppliersStatementPng')}
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
                {t('suppliersStatementOnlyPeriod')}
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="openingBalance"
                  checked={includeOpeningBalance}
                  onChange={() => setIncludeOpeningBalance(true)}
                />
                {t('suppliersStatementWithOpening')}
              </label>
              {includeOpeningBalance && (
                <span className="text-gray-600">
                  {t('suppliersOpeningBalance')}: {openingBalance.toFixed(2)} {settings?.currency || ''}
                </span>
              )}
            </div>

            {canManagePayments && (
              <div className="border border-gray-200 rounded p-3">
                <h4 className="font-semibold mb-2">{t('suppliersPaymentTitle')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    label={t('suppliersPaymentAmount')}
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  />
                  <DateInput
                    label={t('suppliersPaymentDate')}
                    name="supplierPayDate"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                  <Select
                    label={t('suppliersPaymentMethod')}
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as (typeof PAYMENT_METHODS)[number])}
                    options={PAYMENT_METHODS.map((m) => ({ value: m, label: getSupplierPaymentMethodLabel(m) }))}
                  />
                  <Input
                    label={t('suppliersPaymentRef')}
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                  />
                  <Input
                    label={t('suppliersPaymentNotes')}
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                  />
                </div>
                <div className="flex justify-end mt-3">
                  <Button onClick={saveSupplierPay} loading={paymentSaving}>
                    {t('suppliersPaymentSave')}
                  </Button>
                </div>
              </div>
            )}

            {!canManagePayments && (
              <div className="text-sm text-warning-700 bg-warning-50 border border-warning-200 rounded p-3">
                {t('suppliersNoPermissionPayments')}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-center">
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="text-xs text-gray-500">{t('suppliersTotalPurchases')}</div>
                <div className="text-lg font-semibold">
                  {statement.totalPurchases.toFixed(2)} {settings?.currency || ''}
                </div>
              </div>
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="text-xs text-gray-500">{t('suppliersTotalPaid')}</div>
                <div className="text-lg font-semibold">
                  {statement.totalPaid.toFixed(2)} {settings?.currency || ''}
                </div>
              </div>
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="text-xs text-gray-500">{t('suppliersRemaining')}</div>
                <div className="text-lg font-semibold">
                  {statement.remaining.toFixed(2)} {settings?.currency || ''}
                </div>
              </div>
            </div>

            <div ref={printableRef}>
              <PrintableReport
                reportTitle={t('suppliersAccountStatement')}
                companyName={settings?.businessName || t('appName')}
                logoUrl={settings?.logo}
                address={settings?.address}
                phone={settings?.contactInfo}
                dateRangeLabel={`${t('reportsFrom')} ${dateRange.start} ${t('reportsTo')} ${dateRange.end}`}
                summaryItems={[
                  {
                    label: t('suppliersOpeningBalance'),
                    value: `${openingBalance.toFixed(2)} ${settings?.currency || ''}`,
                  },
                  {
                    label: t('suppliersTotalPurchases'),
                    value: `${statement.totalPurchases.toFixed(2)} ${settings?.currency || ''}`,
                  },
                  {
                    label: t('suppliersTotalPaid'),
                    value: `${statement.totalPaid.toFixed(2)} ${settings?.currency || ''}`,
                  },
                  {
                    label: t('suppliersRemaining'),
                    value: `${statement.remaining.toFixed(2)} ${settings?.currency || ''}`,
                  },
                ]}
              >
                {statement.rows.length === 0 ? (
                  <p className="text-gray-600 text-center py-6">
                    {t('suppliersNoActivity')}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-right text-sm font-semibold text-gray-600">
                            {t('suppliersTableDate')}
                          </th>
                          <th className="px-4 py-2 text-right text-sm font-semibold text-gray-600">
                            {t('suppliersTableDesc')}
                          </th>
                          <th className="px-4 py-2 text-right text-sm font-semibold text-gray-600">
                            {t('suppliersTableDebit')}
                          </th>
                          <th className="px-4 py-2 text-right text-sm font-semibold text-gray-600">
                            {t('suppliersTableCredit')}
                          </th>
                          <th className="px-4 py-2 text-right text-sm font-semibold text-gray-600">
                            {t('suppliersTableBalance')}
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
              {(purchaseCursor || paymentCursor) && (
                <div className="flex justify-center mt-4">
                  <Button
                    variant="secondary"
                    onClick={loadMoreStatement}
                    loading={statementLoadingMore}
                  >
                    {t('suppliersLoadMore')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
};

export default SuppliersPage;






