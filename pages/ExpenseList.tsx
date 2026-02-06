import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getRoutePath } from '../src/routes';
import { getExpenses, deleteExpense, undeleteDocument } from '../services/dataService';
import { Expense } from '../types';
import { CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { useSettings } from '../contexts/SettingsContext';
import TableSkeleton from '../components/TableSkeleton';
import EmptyState from '../components/EmptyState';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth, useCanWrite } from '../contexts/AuthContext';
import { Card } from '../src/ui/Card';
import { Select } from '../src/ui/Select';
import { Button } from '../src/ui/Button';
import { Modal } from '../components/ui/Modal';
import { mapFirestoreError } from '../services/firebaseErrors';
import { t } from '../src/i18n/t';

const PAGE_SIZE = 15;

const ExpenseList: React.FC = () => {
  const { companyId } = useAuth();
  const canWrite = useCanWrite('expenses');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [allExpensesForSummary, setAllExpensesForSummary] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string | 'All'>('All');
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const [nextCursor, setNextCursor] = useState<unknown | null>(null);
  const [prevCursors, setPrevCursors] = useState<unknown[]>([]);
  const [isLastPage, setIsLastPage] = useState(false);

  const { settings, loading: settingsLoading } = useSettings();
  const navigate = useNavigate();
  const { addNotification } = useNotification();

  const fetchExpenses = useCallback(
    async (cursor?: unknown, direction: 'next' | 'prev' = 'next') => {
      if (!companyId) return;
      setLoading(true);
      try {
        const result = await getExpenses(companyId, {
          limit: PAGE_SIZE,
          startAfter: cursor as any,
        });

        setExpenses(result.data);
        setNextCursor(result.nextCursor);
        setIsLastPage(!result.nextCursor || result.data.length < PAGE_SIZE);

        if (direction === 'next') {
          if (cursor) setPrevCursors((prev) => [...prev, cursor]);
        } else {
          setPrevCursors((prev) => prev.slice(0, prev.length - 1));
        }
      } catch (error: unknown) {
        addNotification(mapFirestoreError(error), 'error');
        setExpenses([]);
      } finally {
        setLoading(false);
      }
    },
    [companyId, addNotification]
  );

  useEffect(() => {
    fetchExpenses();
    if (companyId) {
      getExpenses(companyId).then((res) => {
        setAllExpensesForSummary(res.data || []);
      });
    }
  }, [companyId, fetchExpenses]);

  const handleNextPage = () => {
    if (nextCursor) fetchExpenses(nextCursor, 'next');
  };
  const handlePrevPage = () => {
    if (prevCursors.length > 0) {
      fetchExpenses(prevCursors[prevCursors.length - 2], 'prev');
    } else {
      fetchExpenses(undefined, 'prev');
    }
  };

  const confirmDelete = async () => {
    if (expenseToDelete && companyId) {
      try {
        const result = await deleteExpense(companyId, expenseToDelete.id);
        if (result) {
          addNotification(t('expenseDeleteSuccess'), 'success', {
            label: t('commonUndo'),
            onClick: async () => {
              try {
                const ok = await undeleteDocument(companyId, 'expenses', expenseToDelete.id);
                if (ok) await fetchExpenses(prevCursors[prevCursors.length - 1] || undefined);
              } catch (e) {
                console.error(e);
              }
            },
          });
          fetchExpenses(prevCursors[prevCursors.length - 1] || undefined);
        } else {
          addNotification(t('expenseDeleteFail'), 'error');
        }
      } catch (error: unknown) {
        addNotification(mapFirestoreError(error), 'error');
      }
    }
    setExpenseToDelete(null);
  };

  const { filteredExpenses, availableCategories } = useMemo(() => {
    const availableCategories = [...new Set(allExpensesForSummary.map((e) => e.category))];
    const filteredExpenses = expenses
      .filter((expense) => categoryFilter === 'All' || expense.category === categoryFilter)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return { filteredExpenses, availableCategories };
  }, [expenses, allExpensesForSummary, categoryFilter]);

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat('ar-EG', {
        style: 'currency',
        currency: settings?.currency || 'EGP',
        maximumFractionDigits: 2,
      }),
    [settings?.currency]
  );

  const formatMoney = (value: number) => formatter.format(value || 0);

  if (loading || settingsLoading) return <TableSkeleton cols={4} rows={PAGE_SIZE} />;

  if (allExpensesForSummary.length === 0 && !loading) {
    return (
      <EmptyState
        icon={<CurrencyDollarIcon className="h-8 w-8" />}
        title={t('expensesEmptyTitle')}
        message={t('expensesEmptyMessage')}
        action={
          canWrite ? { text: t('expensesAdd'), onClick: () => navigate(getRoutePath('expenseForm')) } : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="page-title">{t('expensesTitle')}</div>
        <div className="page-subtitle">{t('expensesSubtitle')}</div>
      </div>

      <Card>
        <div className="list-toolbar">
          <div className="page-subtitle">{t('expensesLastHint')}</div>
          <div className="list-toolbar-actions">
            <Button type="button" variant="secondary" onClick={() => setShowFilters((s) => !s)}>
              {t('commonFilter')}
            </Button>
            {canWrite && (
              <Link to="/app/expenses/new" className="ui-button primary">
                {t('expensesAdd')}
              </Link>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="filter-panel">
            <Select
              label={t('expensesCategory')}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={[
                { value: 'All', label: t('expensesAllCategories') },
                ...availableCategories.map((cat) => ({ value: cat, label: cat })),
              ]}
            />
          </div>
        )}

        {filteredExpenses.length > 0 ? (
          <div className="invoice-list">
            {filteredExpenses.map((expense) => (
              <div key={expense.id} className="invoice-row">
                <div className="invoice-main">
                  <div className="invoice-title">
                    {expense.vendor || expense.category || t('commonExpense')}
                  </div>
                  <div className="invoice-meta">
                    {new Date(expense.date).toLocaleDateString('ar-EG')} · {expense.category}
                  </div>
                </div>
                <div className="invoice-side">
                  <div className="invoice-total">{formatMoney(expense.amount)}</div>
                  <div className="invoice-status warning">{t('commonExpense')}</div>
                </div>
                <div className="invoice-menu">
                  <button
                    type="button"
                    className="menu-button"
                    onClick={() =>
                      setActiveMenuId((prev) => (prev === expense.id ? null : expense.id))
                    }
                    aria-label={t('commonActionsMenu')}
                  >
                    ⋯
                  </button>
                  {activeMenuId === expense.id && (
                    <div className="menu-panel">
                      <Link to={`/app/expenses/edit/${expense.id}`} className="menu-item">
                        {t('commonEdit')}
                      </Link>
                      {canWrite && (
                        <button
                          type="button"
                          className="menu-item danger"
                          onClick={() => setExpenseToDelete(expense)}
                        >
                          {t('commonDelete')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10">{t('expensesNoResults')}</div>
        )}

        <div className="pagination-row">
          <Button
            onClick={handlePrevPage}
            disabled={prevCursors.length === 0}
            variant="secondary"
            size="sm"
          >
            {t('commonPrev')}
          </Button>
          <Button
            onClick={handleNextPage}
            disabled={isLastPage}
            variant="secondary"
            size="sm"
          >
            {t('commonNext')}
          </Button>
        </div>

        <Modal
          isOpen={!!expenseToDelete}
          onClose={() => setExpenseToDelete(null)}
          title={t('commonDelete')}
        >
          <p>{t('expenseDeleteConfirm')}</p>
          <div className="flex justify-end gap-4 mt-6">
            <Button variant="secondary" onClick={() => setExpenseToDelete(null)}>
              {t('commonCancel')}
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              {t('commonDelete')}
            </Button>
          </div>
        </Modal>
      </Card>
    </div>
  );
};

export default ExpenseList;
