import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getExpenseById, saveExpense } from '../services/dataService';
import { Expense } from '../types';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth, useCanWrite } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import DateInput from '../components/ui/DateInput';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { FormSkeleton } from '../components/ui/FormSkeleton';
import { mapFirestoreError } from '../services/firebaseErrors';

const CATEGORY_OPTIONS = [
  { value: 'إيجار', label: 'إيجار' },
  { value: 'مرافق', label: 'مرافق' },
  { value: 'مواصلات', label: 'مواصلات' },
  { value: 'مشتريات', label: 'مشتريات' },
  { value: 'رواتب', label: 'رواتب' },
  { value: 'تسويق', label: 'تسويق' },
  { value: 'أخرى', label: 'أخرى' },
];

const ExpenseForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addNotification } = useNotification();
  const { companyId } = useAuth();
  const canWrite = useCanWrite('expenses');

  const [expense, setExpense] = useState<Omit<Expense, 'id'>>({
    date: new Date().toISOString().split('T')[0],
    category: 'أخرى',
    vendor: '',
    description: '',
    amount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!canWrite && id) {
      // allow viewing
    } else if (!canWrite) {
      addNotification('لا تملك صلاحية إضافة مصروفات جديدة.', 'error');
      navigate('/app/expenses');
    }
  }, [canWrite, id, navigate, addNotification]);

  useEffect(() => {
    if (id && companyId) {
      setLoading(true);
      getExpenseById(companyId, id)
        .then((expenseData) => {
          if (expenseData) setExpense(expenseData);
          else addNotification('لم يتم العثور على المصروف.', 'error');
          setLoading(false);
        })
        .catch((error) => {
          addNotification(mapFirestoreError(error), 'error');
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
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
    if (!expense.date) newErrors.date = 'الرجاء إدخال التاريخ.';
    if (!expense.category) newErrors.category = 'الرجاء اختيار الفئة.';
    if (expense.amount <= 0) newErrors.amount = 'المبلغ يجب أن يكون أكبر من صفر.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) {
      addNotification('لا تملك صلاحية حفظ المصروفات.', 'error');
      return;
    }
    if (!validateForm()) {
      addNotification('يرجى تعبئة الحقول المطلوبة.', 'error');
      return;
    }
    if (!companyId) return;
    setSaving(true);
    try {
      const result = id
        ? await saveExpense(companyId, { ...expense, id })
        : await saveExpense(companyId, expense);

      if (result) {
        addNotification('تم حفظ المصروف بنجاح.', 'success');
        navigate('/app/expenses');
      } else {
        addNotification('حدث خطأ أثناء حفظ المصروف.', 'error');
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
    <Card header={<h2 className="text-xl font-bold">{id ? 'تعديل مصروف' : 'مصروف جديد'}</h2>}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <fieldset disabled={!canWrite} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DateInput
              label="التاريخ"
              name="date"
              value={expense.date}
              onChange={handleInputChange}
              required
              error={errors.date}
            />
            <Input
              label="المبلغ"
              type="number"
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
              label="الفئة"
              name="category"
              value={expense.category}
              onChange={handleInputChange}
              required
              error={errors.category}
              options={CATEGORY_OPTIONS}
              placeholder="اختر فئة"
            />
          </div>
          <div>
            <Input
              label="الجهة / المورد (اختياري)"
              name="vendor"
              value={expense.vendor}
              onChange={handleInputChange}
            />
          </div>
          <Textarea
            label="ملاحظة (اختياري)"
            name="description"
            value={expense.description}
            onChange={handleInputChange}
            rows={3}
          />
        </fieldset>

        {canWrite && (
          <div className="flex justify-start pt-4 border-t dark:border-gray-700">
            <Button type="submit" loading={saving} size="lg">
              حفظ المصروف
            </Button>
          </div>
        )}
      </form>
    </Card>
  );
};

export default ExpenseForm;
