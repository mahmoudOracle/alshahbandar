import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRoutePath } from '../src/routes';
import { getExpenseById, saveExpense, getExpenseCategories, saveExpenseCategory } from '../services/dataService';
import { Expense, StoredExpenseCategory } from '../types';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth, useCanWrite } from '../contexts/AuthContext';
import { Card } from '../src/ui/Card';
import { Button } from '../src/ui/Button';
import { Input } from '../src/ui/Input';
import DateInput from '../components/ui/DateInput';
import { Select } from '../src/ui/Select';
import { Textarea } from '../src/ui/Textarea';
import { FormSkeleton } from '../components/ui/FormSkeleton';
import { mapFirestoreError } from '../services/firebaseErrors';
import { t } from '../src/i18n/t';

const ExpenseForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addNotification } = useNotification();
  const { companyId } = useAuth();
  const canWrite = useCanWrite('expenses');

  const [expense, setExpense] = useState<Omit<Expense, 'id'>>({
    date: new Date().toISOString().split('T')[0],
    category: '',
    vendor: '',
    description: '',
    amount: 0,
  });

  const [categories, setCategories] = useState<StoredExpenseCategory[]>([]);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!canWrite && id) {
      // allow viewing
    } else if (!canWrite) {
      addNotification(t('expenseNoPermissionAdd'), 'error');
      navigate(getRoutePath('expenses'));
    }
  }, [canWrite, id, navigate, addNotification]);

  // Load categories from Firestore
  const fetchCategories = async () => {
    if (!companyId) return;
    try {
      const result = await getExpenseCategories(companyId);
      setCategories(result.data || []);
    } catch (error: any) {
      addNotification(mapFirestoreError(error), 'error');
    }
  };

  // Load or create expense
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await fetchCategories();
        if (id && companyId) {
          const expenseData = await getExpenseById(companyId, id);
          if (expenseData) setExpense(expenseData);
          else addNotification(t('expenseNotFound'), 'error');
        }
      } catch (error) {
        addNotification(mapFirestoreError(error), 'error');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, companyId, addNotification]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setExpense((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!expense.date) newErrors.date = t('expenseValidateDate');
    if (!expense.category) newErrors.category = t('expenseValidateCategory');
    if (expense.amount <= 0) newErrors.amount = t('expenseValidateAmount');

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddNewCategory = async () => {
    if (!companyId || !newCategory.trim()) return;
    try {
      const result = await saveExpenseCategory(companyId, { name: newCategory.trim() });
      if (result) {
        addNotification(t('expenseCategoryAddSuccess'), 'success');
        setNewCategory('');
        setIsAddingCategory(false);
        await fetchCategories();
        setExpense((prev) => ({ ...prev, category: result.name }));
      } else {
        addNotification(t('expenseCategoryAddFailed'), 'error');
      }
    } catch (error: any) {
      addNotification(mapFirestoreError(error), 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) {
      addNotification(t('expenseNoPermissionSave'), 'error');
      return;
    }
    if (!validateForm()) {
      addNotification(t('expenseFillRequired'), 'error');
      return;
    }
    if (!companyId) return;
    setSaving(true);
    try {
      const result = id
        ? await saveExpense(companyId, { ...expense, id })
        : await saveExpense(companyId, expense);

      if (result) {
        addNotification(t('expenseSaveSuccess'), 'success');
        navigate(getRoutePath('expenses'));
      } else {
        addNotification(t('expenseSaveError'), 'error');
      }
    } catch (error: unknown) {
      addNotification(mapFirestoreError(error), 'error');
    }
    setSaving(false);
  };

  if (loading && id)
    return (
      <Card>
        <FormSkeleton />
      </Card>
    );

  return (
    <div className="form-page">
      <div>
        <div className="form-title">{id ? t('expenseFormTitleEdit') : t('expenseFormTitleNew')}</div>
        <div className="form-subtitle">{t('expenseFormSubtitle')}</div>
      </div>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <fieldset disabled={!canWrite} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DateInput
                label={t('expenseFormDate')}
                name="date"
                value={expense.date}
                onChange={handleInputChange}
                required
                error={errors.date}
              />
              <Input
                label={t('expenseFormAmount')}
                type="number"
                inputMode="decimal"
                name="amount"
                value={expense.amount}
                onChange={handleInputChange}
                step="0.01"
                required
                error={errors.amount}
              />
            </div>
            <div>
              <Select
                label={t('expenseFormCategory')}
                name="category"
                value={expense.category}
                onChange={handleInputChange}
                required
                error={errors.category}
                options={categories.map((c) => ({ value: c.name, label: c.name }))}
                placeholder={t('expenseFormCategory')}
              />
              {canWrite && !isAddingCategory ? (
                <button
                  type="button"
                  onClick={() => setIsAddingCategory(true)}
                  className="text-sm text-primary-600 hover:underline mt-2"
                >
                  ➕ {t('expenseCategoryAddNew')}
                </button>
              ) : (
                canWrite && (
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder={t('expenseCategoryNamePlaceholder')}
                    />
                    <Button type="button" onClick={handleAddNewCategory} size="sm">
                      {t('commonSave')}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setIsAddingCategory(false)}
                      variant="secondary"
                      size="sm"
                    >
                      {t('commonCancel')}
                    </Button>
                  </div>
                )
              )}
            </div>
            <div>
              <Input
                label={t('expenseFormVendor')}
                name="vendor"
                value={expense.vendor}
                onChange={handleInputChange}
              />
            </div>
            <Textarea
              label={t('expenseFormNote')}
              name="description"
              value={expense.description}
              onChange={handleInputChange}
              rows={3}
            />
          </fieldset>

          {canWrite && (
            <div className="form-actions">
              <Button type="submit" loading={saving} size="lg">
                {t('expenseFormSave')}
              </Button>
            </div>
          )}
        </form>
      </Card>
    </div>
  );
};

export default ExpenseForm;
