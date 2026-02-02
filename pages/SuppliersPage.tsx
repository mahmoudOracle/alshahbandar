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

const PAYMENT_METHODS = [
  'ÙƒØ§Ø´',
  'Ù…Ø­ÙØ¸Ø©',
  'Ø¥Ù†Ø³ØªØ§Ø¨Ø§ÙŠ',
  'ØªØ­ÙˆÙŠÙ„ Ø¨Ù†ÙƒÙŠ',
  'Ø£Ø®Ø±Ù‰',
] as const;
const STATEMENT_PAGE_SIZE = 50;
const SUPPLIERS_PAGE_SIZE = 50;

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
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
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
      addNotification('ØªÙ… Ø­ÙØ¸ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…ÙˆØ±Ø¯.', 'success');
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
      addNotification('ØªÙ… Ø­Ø°Ù Ø§Ù„Ù…ÙˆØ±Ø¯.', 'success');
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
        description: `Ù…Ø´ØªØ±ÙŠØ§Øª${p.invoiceNumber ? ` #${p.invoiceNumber}` : ''}`,
        debit: Number(p.totalAmount || p.total || 0),
        credit: 0,
      })),
      ...paymentRows.map((p) => ({
        date: toDateValue(p.date) || new Date(),
        description: `Ø¯ÙØ¹Ø© (${p.method || 'Ø£Ø®Ø±Ù‰'})${p.notes ? ` - ${p.notes}` : ''}`,
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
      addNotification('Ø§Ø®ØªØ± Ø·Ø±ÙŠÙ‚Ø© Ø§Ù„Ø¯ÙØ¹.', 'error');
      return;
    }
    if (paymentAmount <= 0) {
      addNotification('Ø£Ø¯Ø®Ù„ Ù…Ø¨Ù„ØºÙ‹Ø§ ØµØ­ÙŠØ­Ù‹Ø§.', 'error');
      return;
    }
    const parsed = new Date(paymentDate);
    if (Number.isNaN(parsed.getTime())) {
      addNotification('ØªØ§Ø±ÙŠØ® Ø§Ù„Ø¯ÙØ¹ ØºÙŠØ± ØµØ­ÙŠØ­.', 'error');
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
      addNotification('ØªÙ… ØªØ³Ø¬ÙŠÙ„ Ø¯ÙØ¹Ø© Ø§Ù„Ù…ÙˆØ±Ø¯.', 'success');
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
        <h2 className="text-xl font-bold">Ø§Ù„Ù…ÙˆØ±Ø¯ÙˆÙ†</h2>
        <div className="flex gap-2">
          <Input placeholder="Ø§Ø¨Ø­Ø«..." value={search} onChange={(e) => setSearch(e.target.value)} />
          {canWriteSuppliers && (
            <Button
              onClick={() => {
                setEditing({});
                setFormOpen(true);
              }}
            >
              Ø¥Ø¶Ø§ÙØ© Ù…ÙˆØ±Ø¯
            </Button>
          )}
        </div>
      </div>

      {filtered.length === 0 && (
        <EmptyState
          title="Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ù…ÙˆØ±Ø¯ÙˆÙ† Ø¨Ø¹Ø¯"
          message="Ø§Ø¨Ø¯Ø£ Ø¨Ø¥Ø¶Ø§ÙØ© Ù…ÙˆØ±Ø¯ Ù„Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø´ØªØ±ÙŠØ§Øª ÙˆØ§Ù„Ù…Ø¯ÙÙˆØ¹Ø§Øª."
          action={
            canWriteSuppliers
              ? {
                  text: 'Ø¥Ø¶Ø§ÙØ© Ù…ÙˆØ±Ø¯',
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
                <th className="px-4 py-2 text-right">Ø§Ù„Ø§Ø³Ù…</th>
                <th className="px-4 py-2 text-right">Ø§Ù„Ø´Ø±ÙƒØ©</th>
                <th className="px-4 py-2 text-right">Ø§Ù„Ù‡Ø§ØªÙ</th>
                <th className="px-4 py-2 text-right">Ø§Ù„Ø¨Ø±ÙŠØ¯</th>
                <th className="px-4 py-2 text-right">Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª</th>
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
                        ÙƒØ´Ù Ø­Ø³Ø§Ø¨
                      </Button>
                      {canWriteSuppliers && (
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setEditing(s);
                            setFormOpen(true);
                          }}
                        >
                          ØªØ¹Ø¯ÙŠÙ„
                        </Button>
                      )}
                      {canWriteSuppliers && (
                        <Button variant="danger" onClick={() => handleDelete(String(s.id))}>
                          Ø­Ø°Ù
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
            تحميل المزيد
          </Button>
        </div>
      )}
      {formOpen && (
        <form onSubmit={handleSave} className="mt-4 space-y-3">
          <Input
            placeholder="Ø§Ø³Ù… Ø§Ù„Ù…ÙˆØ±Ø¯"
            value={editing?.supplierName || ''}
            onChange={(e) => setEditing({ ...editing, supplierName: e.target.value })}
            required
          />
          <Input
            placeholder="Ø§Ø³Ù… Ø§Ù„Ø´Ø±ÙƒØ©"
            value={editing?.companyName || ''}
            onChange={(e) => setEditing({ ...editing, companyName: e.target.value })}
          />
          <Input
            placeholder="Ø±Ù‚Ù… Ø§Ù„Ù‡Ø§ØªÙ"
            value={editing?.phone || ''}
            onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
          />
          <Input
            placeholder="Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ"
            value={editing?.email || ''}
            onChange={(e) => setEditing({ ...editing, email: e.target.value })}
          />
          <Input
            placeholder="Ø§Ù„Ø¹Ù†ÙˆØ§Ù†"
            value={editing?.address || ''}
            onChange={(e) => setEditing({ ...editing, address: e.target.value })}
          />
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø­ÙØ¸...' : 'Ø­ÙØ¸'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setFormOpen(false);
                setEditing(null);
              }}
            >
              Ø¥Ù„ØºØ§Ø¡
            </Button>
          </div>
        </form>
      )}

      <Modal
        isOpen={statementOpen}
        onClose={() => setStatementOpen(false)}
        title={`ÙƒØ´Ù Ø­Ø³Ø§Ø¨ Ø§Ù„Ù…ÙˆØ±Ø¯ - ${selectedSupplier?.supplierName || ''}`}
      >
        {selectedSupplier && (
          <div className="space-y-4">
            {statementLoading && (
              <div className="text-center text-sm text-gray-500">
                Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ ÙƒØ´Ù Ø§Ù„Ù…ÙˆØ±Ø¯...
              </div>
            )}
            <div className="flex flex-col md:flex-row gap-3">
              <DateInput
                label="Ù…Ù†"
                name="supplierStart"
                value={dateRange.start}
                onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
              />
              <DateInput
                label="Ø¥Ù„Ù‰"
                name="supplierEnd"
                value={dateRange.end}
                onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
              />
              <div className="flex gap-2 items-end">
                <Button variant="secondary" onClick={() => exportStatement('pdf')}>
                  ØªØµØ¯ÙŠØ± PDF
                </Button>
                <Button variant="secondary" onClick={() => exportStatement('png')}>
                  ØªØµØ¯ÙŠØ± PNG
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
                Ø­Ø±ÙƒØ§Øª Ø§Ù„ÙØªØ±Ø© ÙÙ‚Ø·
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="openingBalance"
                  checked={includeOpeningBalance}
                  onChange={() => setIncludeOpeningBalance(true)}
                />
                Ù…Ø¹ Ø±ØµÙŠØ¯ Ø§ÙØªØªØ§Ø­ÙŠ
              </label>
              {includeOpeningBalance && (
                <span className="text-gray-600">
                  Ø§Ù„Ø±ØµÙŠØ¯ Ø§Ù„Ø§ÙØªØªØ§Ø­ÙŠ: {openingBalance.toFixed(2)} {settings?.currency || ''}
                </span>
              )}
            </div>

            {canManagePayments && (
              <div className="border border-gray-200 rounded p-3">
                <h4 className="font-semibold mb-2">ØªØ³Ø¬ÙŠÙ„ Ø¯ÙØ¹Ø© Ù„Ù„Ù…ÙˆØ±Ø¯</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    label="Ø§Ù„Ù…Ø¨Ù„Øº"
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  />
                  <DateInput
                    label="ØªØ§Ø±ÙŠØ® Ø§Ù„Ø¯ÙØ¹"
                    name="supplierPayDate"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                  <Select
                    label="Ø·Ø±ÙŠÙ‚Ø© Ø§Ù„Ø¯ÙØ¹"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as (typeof PAYMENT_METHODS)[number])}
                    options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))}
                  />
                  <Input
                    label="Ù…Ø±Ø¬Ø¹ Ø§Ù„ØªØ­ÙˆÙŠÙ„ (Ø§Ø®ØªÙŠØ§Ø±ÙŠ)"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                  />
                  <Input
                    label="Ù…Ù„Ø§Ø­Ø¸Ø§Øª (Ø§Ø®ØªÙŠØ§Ø±ÙŠ)"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                  />
                </div>
                <div className="flex justify-end mt-3">
                  <Button onClick={saveSupplierPay} loading={paymentSaving}>
                    Ø­ÙØ¸ Ø§Ù„Ø¯ÙØ¹Ø©
                  </Button>
                </div>
              </div>
            )}

            {!canManagePayments && (
              <div className="text-sm text-warning-700 bg-warning-50 border border-warning-200 rounded p-3">
                Ù„Ø§ ØªÙ…Ù„Ùƒ ØµÙ„Ø§Ø­ÙŠØ© ØªØ³Ø¬ÙŠÙ„ Ø¯ÙØ¹Ø§Øª Ø§Ù„Ù…ÙˆØ±Ø¯ÙŠÙ†.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-center">
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="text-xs text-gray-500">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…Ø´ØªØ±ÙŠØ§Øª</div>
                <div className="text-lg font-semibold">
                  {statement.totalPurchases.toFixed(2)} {settings?.currency || ''}
                </div>
              </div>
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="text-xs text-gray-500">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…Ø¯ÙÙˆØ¹</div>
                <div className="text-lg font-semibold">
                  {statement.totalPaid.toFixed(2)} {settings?.currency || ''}
                </div>
              </div>
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="text-xs text-gray-500">Ø§Ù„Ù…ØªØ¨Ù‚ÙŠ</div>
                <div className="text-lg font-semibold">
                  {statement.remaining.toFixed(2)} {settings?.currency || ''}
                </div>
              </div>
            </div>

            <div ref={printableRef}>
              <PrintableReport
                reportTitle="ÙƒØ´Ù Ø­Ø³Ø§Ø¨ Ù…ÙˆØ±Ø¯"
                companyName={settings?.businessName || 'Ø§Ù„Ø´Ø±ÙƒØ©'}
                logoUrl={settings?.logo}
                address={settings?.address}
                phone={settings?.contactInfo}
                dateRangeLabel={`Ø§Ù„ÙØªØ±Ø© Ù…Ù† ${dateRange.start} Ø¥Ù„Ù‰ ${dateRange.end}`}
                summaryItems={[
                  {
                    label: 'Ø§Ù„Ø±ØµÙŠØ¯ Ø§Ù„Ø§ÙØªØªØ§Ø­ÙŠ',
                    value: `${openingBalance.toFixed(2)} ${settings?.currency || ''}`,
                  },
                  {
                    label: 'Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…Ø´ØªØ±ÙŠØ§Øª',
                    value: `${statement.totalPurchases.toFixed(2)} ${settings?.currency || ''}`,
                  },
                  {
                    label: 'Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…Ø¯ÙÙˆØ¹',
                    value: `${statement.totalPaid.toFixed(2)} ${settings?.currency || ''}`,
                  },
                  {
                    label: 'Ø§Ù„Ù…ØªØ¨Ù‚ÙŠ',
                    value: `${statement.remaining.toFixed(2)} ${settings?.currency || ''}`,
                  },
                ]}
              >
                {statement.rows.length === 0 ? (
                  <p className="text-gray-600 text-center py-6">
                    Ù„Ø§ ØªÙˆØ¬Ø¯ Ø­Ø±ÙƒØ§Øª Ø®Ù„Ø§Ù„ Ù‡Ø°Ù‡ Ø§Ù„ÙØªØ±Ø©.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-right text-sm font-semibold text-gray-600">
                            Ø§Ù„ØªØ§Ø±ÙŠØ®
                          </th>
                          <th className="px-4 py-2 text-right text-sm font-semibold text-gray-600">
                            Ø§Ù„Ø¨ÙŠØ§Ù†
                          </th>
                          <th className="px-4 py-2 text-right text-sm font-semibold text-gray-600">
                            Ù…Ø¯ÙŠÙ†
                          </th>
                          <th className="px-4 py-2 text-right text-sm font-semibold text-gray-600">
                            Ø¯Ø§Ø¦Ù†
                          </th>
                          <th className="px-4 py-2 text-right text-sm font-semibold text-gray-600">
                            Ø§Ù„Ø±ØµÙŠØ¯
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
                    ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ù…Ø²ÙŠØ¯
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






