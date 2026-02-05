import React, { useEffect, useState, useMemo } from 'react';
import { PlusIcon, ArrowDownTrayIcon, TrashIcon } from '@heroicons/react/24/outline';
import { getReceiptsByDateRange, deleteReceipt } from '../services/receiptsService';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { mapFirestoreError } from '../services/firebaseErrors';
import { Receipt } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { t } from '../src/i18n/t';
import { ReceiptForm } from '../components/ReceiptForm';
import { Modal } from '../components/ui/Modal';

const toLocalDate = (date: Date | string) => {
  if (typeof date === 'string') return date;
  return date.toISOString().split('T')[0];
};

const DailyCollection: React.FC = () => {
  const { companyId } = useAuth();
  const { addNotification } = useNotification();

  const [date, setDate] = useState(toLocalDate(new Date()));
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchReceipts = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const data = await getReceiptsByDateRange(companyId, date, date);
      setReceipts(data || []);
    } catch (error) {
      addNotification(mapFirestoreError(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, [date, companyId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Arrow Down = Previous day
      if (e.key === 'ArrowDown' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const d = new Date(date);
        d.setDate(d.getDate() - 1);
        setDate(toLocalDate(d));
      }
      // Arrow Up = Next day
      if (e.key === 'ArrowUp' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const d = new Date(date);
        d.setDate(d.getDate() + 1);
        setDate(toLocalDate(d));
      }
      // 'T' = Today
      if ((e.key === 't' || e.key === 'T') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setDate(toLocalDate(new Date()));
      }
      // 'N' = New payment
      if ((e.key === 'n' || e.key === 'N') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShowPaymentModal(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [date]);

  const summary = useMemo(() => {
    const cash = receipts
      .filter((r) => r.method === 'cash')
      .reduce((sum, r) => sum + r.amount, 0);

    const nonCash = receipts
      .filter((r) => r.method !== 'cash')
      .reduce((sum, r) => sum + r.amount, 0);

    return { cash, nonCash, total: cash + nonCash };
  }, [receipts]);

  const switchDate = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(toLocalDate(d));
  };

  const handlePaymentSaved = () => {
    setShowPaymentModal(false);
    fetchReceipts();
  };

  const handleDeleteReceipt = async (receiptId: string) => {
    if (!companyId) return;
    if (!confirm('Are you sure you want to delete this receipt?')) return;

    setDeletingId(receiptId);
    try {
      await deleteReceipt(companyId, receiptId);
      setReceipts(receipts.filter((r) => r.id !== receiptId));
      addNotification(t('receiptDeleted') || 'Receipt deleted', 'success');
    } catch (error) {
      addNotification(mapFirestoreError(error), 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const exportDaily = () => {
    const formattedDate = new Date(date).toLocaleDateString('ar-SA');
    const content = `التحصيل اليومي - ${formattedDate}\n\n`;
    const body = `
كاش: ${summary.cash.toFixed(2)} ج
غير كاش: ${summary.nonCash.toFixed(2)} ج
الإجمالي: ${summary.total.toFixed(2)} ج

المدفوعات:
${receipts.map((r) => `${r.customerName} - ${r.amount.toFixed(2)} ج (${r.method})${r.note ? ` - ${r.note}` : ''}`).join('\n')}
    `;
    
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content + body));
    element.setAttribute('download', `daily-collection-${date}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('dailyCollectionTitle')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t('dailyCollectionSubtitle')}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-3">
            💡 Shortcuts: ↓ prev day | ↑ next day | T = today | N = new payment
          </p>
        </div>

        {/* Date Switcher */}
        <div className="flex items-center gap-4 justify-center flex-wrap">
          <Button variant="secondary" size="sm" onClick={() => switchDate(-1)}>
            {t('commonPrev')}
          </Button>

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
          />

          <Button variant="secondary" size="sm" onClick={() => switchDate(1)}>
            {t('commonNext')}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDate(toLocalDate(new Date()))}
          >
            {t('dailyCollectionToday')}
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('dailyCollectionCash')}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
              {summary.cash.toFixed(2)} ج
            </p>
          </Card>

          <Card className="p-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('dailyCollectionNonCash')}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
              {summary.nonCash.toFixed(2)} ج
            </p>
          </Card>

          <Card className="p-6 text-center bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('dailyCollectionTotal')}
            </p>
            <p className="text-2xl font-bold text-primary-600 dark:text-primary-400 mt-2">
              {summary.total.toFixed(2)} ج
            </p>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-2 flex-wrap">
          <Button onClick={() => setShowPaymentModal(true)} size="lg">
            <PlusIcon className="h-5 w-5 me-2" />
            {t('dailyCollectionNewPayment')}
          </Button>
          {receipts.length > 0 && (
            <Button onClick={exportDaily} variant="secondary" size="lg">
              <ArrowDownTrayIcon className="h-5 w-5 me-2" />
              Export
            </Button>
          )}
        </div>

        {/* Receipts List */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">
            {t('commonLoading')}
          </div>
        ) : receipts.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              {t('dailyCollectionEmpty')}
            </p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {receipts.map((receipt) => (
                <div
                  key={receipt.id}
                  className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition group"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {receipt.customerName}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {receipt.method}
                      {receipt.note && ` • ${receipt.note}`}
                      {receipt.invoiceNumber && ` • Invoice #${receipt.invoiceNumber}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-bold text-gray-900 dark:text-white text-lg">
                      {receipt.amount.toFixed(2)} ج
                    </p>
                    <button
                      onClick={() => handleDeleteReceipt(receipt.id)}
                      disabled={deletingId === receipt.id}
                      className="p-2 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition"
                      title="Delete receipt"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <Modal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          title={t('dailyCollectionNewPayment') || 'New Receipt'}
        >
          <ReceiptForm
            defaultDate={date}
            onClose={() => setShowPaymentModal(false)}
            onReceiptSaved={handlePaymentSaved}
          />
        </Modal>
      )}
    </div>
  );
};

export default DailyCollection;
